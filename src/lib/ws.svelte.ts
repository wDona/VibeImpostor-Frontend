import { WS_URL } from './config';
import { sound } from './sound';
import {
	BOTH_IMPOSTORS_ID,
	NOBODY_VOTE_ID,
	PUNISHMENT_PREFIX,
	WRONG_CLAIM_PREFIX,
	defaultRoomConfig,
	type ClientMessage,
	type RoomConfig,
	type PublicPlayer,
	type RoomSnapshot,
	type Role,
	type ServerMessage
} from './protocol';

// kotlinx.serialization usa el nombre completo cualificado de la clase Kotlin
// como discriminador "type" en el wire — no el nombre corto del sealed member.
const CLIENT_PREFIX = 'org.example.project.protocol.ClientMessage.';
const SERVER_PREFIX = 'org.example.project.protocol.ServerMessage.';

// Máquina de estados de pantalla explícita (igual que GameViewModel.kt) — NO se
// deriva reactivamente de room.state. Unirse a media partida siempre aterriza en
// LOBBY (banner "partida en curso") hasta que llega el próximo evento en vivo.
export type Screen =
	| 'HOME'
	| 'LOBBY'
	| 'GAME'
	| 'ASK_VOTE'
	| 'VOTING'
	| 'ROUND_RESULT'
	| 'IMPOSTOR_GUESSING'
	| 'IMPOSTOR_GUESSING_RESULT'
	| 'RESULT';

interface VotingInfo {
	candidateIds: string[];
	deadlineEpochMs: number;
}

interface VotingResultInfo {
	ejectedPlayerId: string | null;
	wasImpostor: boolean;
	votes: Record<string, string>;
	voteTypes: Record<string, boolean>;
	punishmentPlayerId: string | null;
}

interface EndGameProposal {
	agreedPlayerIds: string[];
	totalActive: number;
}

// kotlinx.serialization con encodeDefaults=false omite del wire cualquier campo
// que quede en su valor por defecto de Kotlin — hay que rellenarlos al recibir.
function normalizeConfig(raw: Partial<RoomConfig> | undefined): RoomConfig {
	return { ...defaultRoomConfig(), ...raw };
}

function normalizePlayer(raw: Partial<PublicPlayer> & Pick<PublicPlayer, 'id' | 'name' | 'score' | 'connected' | 'isHost' | 'waitingNextGame' | 'isSpectator'>): PublicPlayer {
	return {
		...raw,
		wantsRematch: raw.wantsRematch ?? false,
		colorIndex: raw.colorIndex ?? 0
	};
}

function normalizeRoom(raw: Partial<RoomSnapshot> & Pick<RoomSnapshot, 'code' | 'state' | 'players' | 'hostId' | 'turnOrder' | 'roundNumber'>): RoomSnapshot {
	return {
		...raw,
		players: (raw.players ?? []).map(normalizePlayer),
		config: normalizeConfig(raw.config),
		currentTurnPlayerId: raw.currentTurnPlayerId ?? null,
		impostorIds: raw.impostorIds ?? [],
		impostorGuesses: raw.impostorGuesses ?? {},
		pendingGuessImpostorId: raw.pendingGuessImpostorId ?? null,
		lastWinners: raw.lastWinners ?? [],
		continueResponses: raw.continueResponses ?? [],
		isInPunishmentRound: raw.isInPunishmentRound ?? false,
		punishmentPlayerId: raw.punishmentPlayerId ?? null,
		chosenVariant: raw.chosenVariant ?? null
	};
}

class GameStore {
	socket: WebSocket | null = $state(null);
	connected = $state(false);
	yourPlayerId = $state<string | null>(null);
	room = $state<RoomSnapshot | null>(null);
	screen = $state<Screen>('HOME');

	yourRole = $state<Role | null>(null);
	contentIsWord = $state(false);
	content = $state<string | null>(null);
	hintList = $state<string[]>([]);
	gameStartedAtMs = $state<number | null>(null);

	askVoteDeadline = $state<number | null>(null);
	voting = $state<VotingInfo | null>(null);
	votedPlayerIds = $state<string[]>([]);
	votingResult = $state<VotingResultInfo | null>(null);
	// jugador expulsado (o voterId si WRONG_CLAIM_PREFIX) -> mapa de votos de esa ronda.
	// Se acumula durante toda la partida, solo se resetea en GameStarted.
	eliminationVotes = $state<Record<string, Record<string, string>>>({});
	endGameProposal = $state<EndGameProposal | null>(null);
	lastWordPlayed = $state<{ playerId: string; word: string } | null>(null);

	error = $state<string | null>(null);
	removedReason = $state<string | null>(null);
	spectatorJoinedNotice = $state<string | null>(null);
	private updateConfigTimer: ReturnType<typeof setTimeout> | null = null;
	private pendingConfig: RoomConfig | null = null;

	connect() {
		if (this.socket && this.socket.readyState <= WebSocket.OPEN) return;
		const socket = new WebSocket(WS_URL);
		socket.onopen = () => {
			this.connected = true;
		};
		socket.onclose = () => {
			this.connected = false;
		};
		socket.onmessage = (event) => {
			const raw = JSON.parse(event.data);
			raw.type = String(raw.type).replace(SERVER_PREFIX, '');
			this.handleMessage(raw as ServerMessage);
		};
		this.socket = socket;
	}

	send(message: ClientMessage) {
		// A pending debounced UpdateConfig must land on the server before anything
		// sent after it (e.g. StartGame) — otherwise the server can act on a stale
		// config (the previous vote time, impostor count, etc.).
		if (message.type !== 'UpdateConfig') this.flushConfig();
		this.connect();
		const wire = JSON.stringify({ ...message, type: CLIENT_PREFIX + message.type });
		if (this.socket?.readyState === WebSocket.OPEN) {
			this.socket.send(wire);
		} else {
			this.socket?.addEventListener('open', () => this.socket?.send(wire), { once: true });
		}
	}

	private flushConfig() {
		if (this.updateConfigTimer) {
			clearTimeout(this.updateConfigTimer);
			this.updateConfigTimer = null;
		}
		if (this.pendingConfig) {
			const config = this.pendingConfig;
			this.pendingConfig = null;
			this.send({ type: 'UpdateConfig', config });
		}
	}

	// Actualiza la config local al instante (el RoomUpdated del server llega después
	// y confirma/sobreescribe) — evita que cada click espere el viaje de ida y vuelta.
	updateConfig(config: RoomConfig) {
		if (this.room) this.room = { ...this.room, config };
		this.pendingConfig = config;
		if (this.updateConfigTimer) clearTimeout(this.updateConfigTimer);
		// Debounce the actual send — clicking +/- repeatedly would otherwise fire one
		// UpdateConfig per click, and each RoomUpdated echo can race/overwrite later
		// optimistic local state, causing a visible flicker back to a stale value.
		this.updateConfigTimer = setTimeout(() => {
			this.updateConfigTimer = null;
			this.flushConfig();
		}, 300);
	}

	// El server cierra el socket al recibir LeaveRoom sin mandar confirmación,
	// así que hay que resetear el estado local nosotros mismos.
	leaveRoom() {
		this.send({ type: 'LeaveRoom' });
		this.reset();
	}

	// Botón "Volver al lobby" de ImpostorGuessingResultScreen: transición puramente
	// local (no manda mensaje), igual que el original.
	continueToResults() {
		this.screen = 'RESULT';
	}

	reset() {
		this.yourPlayerId = null;
		this.room = null;
		this.screen = 'HOME';
		this.yourRole = null;
		this.content = null;
		this.hintList = [];
		this.gameStartedAtMs = null;
		this.askVoteDeadline = null;
		this.voting = null;
		this.votedPlayerIds = [];
		this.votingResult = null;
		this.eliminationVotes = {};
		this.endGameProposal = null;
		this.lastWordPlayed = null;
		this.error = null;
		this.spectatorJoinedNotice = null;
	}

	private registerEliminationVotes(ejectedPlayerId: string | null, votes: Record<string, string>) {
		if (!ejectedPlayerId || ejectedPlayerId === NOBODY_VOTE_ID) return;
		if (ejectedPlayerId.startsWith(PUNISHMENT_PREFIX)) return;
		if (ejectedPlayerId === BOTH_IMPOSTORS_ID) {
			const room = this.room;
			if (!room) return;
			for (const p of room.players) {
				if (room.impostorIds.includes(p.id) && p.isSpectator) {
					this.eliminationVotes = { ...this.eliminationVotes, [p.id]: votes };
				}
			}
			return;
		}
		if (ejectedPlayerId.startsWith(WRONG_CLAIM_PREFIX)) {
			const voterId = ejectedPlayerId.slice(WRONG_CLAIM_PREFIX.length);
			this.eliminationVotes = { ...this.eliminationVotes, [voterId]: votes };
			return;
		}
		this.eliminationVotes = { ...this.eliminationVotes, [ejectedPlayerId]: votes };
	}

	private handleMessage(msg: ServerMessage) {
		switch (msg.type) {
			case 'Joined': {
				this.yourPlayerId = msg.yourPlayerId;
				this.room = normalizeRoom(msg.room);
				this.screen = this.room.state === 'FINISHED' || this.room.state === 'REMATCH' ? 'RESULT' : 'LOBBY';
				break;
			}
			case 'RoomUpdated': {
				const prevIds = new Set(this.room?.players.map((p) => p.id) ?? []);
				this.room = normalizeRoom(msg.room);
				if (this.room.state !== 'LOBBY') {
					const newSpectators = this.room.players.filter((p) => p.isSpectator && !prevIds.has(p.id));
					if (newSpectators.length) {
						this.spectatorJoinedNotice = `${newSpectators.map((p) => p.name).join(', ')} se ha unido a la sala y está viendo la partida`;
					}
				}
				if (this.room.state === 'FINISHED') {
					if (this.screen === 'IMPOSTOR_GUESSING') this.screen = 'IMPOSTOR_GUESSING_RESULT';
					else if (['ROUND_RESULT', 'GAME', 'VOTING', 'ASK_VOTE'].includes(this.screen)) this.screen = 'RESULT';
				} else if (this.room.state === 'IN_GAME' && this.screen === 'IMPOSTOR_GUESSING') {
					this.screen = 'GAME';
				}
				break;
			}
			case 'GameStarted':
				this.room = normalizeRoom(msg.room);
				this.screen = 'GAME';
				this.yourRole = msg.yourRole;
				this.contentIsWord = msg.contentIsWord;
				this.content = msg.content;
				this.hintList = msg.hintList ?? [];
				this.gameStartedAtMs = Date.now();
				this.eliminationVotes = {};
				this.votingResult = null;
				this.askVoteDeadline = null;
				this.voting = null;
				break;
			case 'TurnChanged':
				if (this.room) {
					if (msg.currentTurnPlayerId === this.yourPlayerId) sound.yourTurn();
					this.room = { ...this.room, currentTurnPlayerId: msg.currentTurnPlayerId, roundNumber: msg.roundNumber };
				}
				this.askVoteDeadline = null;
				this.voting = null;
				break;
			case 'WordPlayed':
				this.lastWordPlayed = { playerId: msg.playerId, word: msg.word };
				break;
			case 'AskWantVote':
				this.screen = 'ASK_VOTE';
				sound.voteStarted();
				this.askVoteDeadline = msg.deadlineEpochMs;
				break;
			case 'VotingStarted':
				this.screen = 'VOTING';
				this.askVoteDeadline = null;
				this.votedPlayerIds = [];
				this.voting = { candidateIds: msg.candidateIds, deadlineEpochMs: msg.deadlineEpochMs };
				break;
			case 'VoteCast':
				if (!this.votedPlayerIds.includes(msg.voterId)) this.votedPlayerIds = [...this.votedPlayerIds, msg.voterId];
				break;
			case 'VotingResult':
				this.room = normalizeRoom(msg.room);
				this.screen = 'ROUND_RESULT';
				this.voting = null;
				this.votingResult = {
					ejectedPlayerId: msg.ejectedPlayerId,
					wasImpostor: msg.wasImpostor,
					votes: msg.votes ?? {},
					voteTypes: msg.voteTypes ?? {},
					punishmentPlayerId: msg.punishmentPlayerId ?? null
				};
				this.registerEliminationVotes(msg.ejectedPlayerId, msg.votes ?? {});
				break;
			case 'RoundContinues':
				this.room = normalizeRoom(msg.room);
				this.screen = 'GAME';
				break;
			case 'ProceedToGuessing':
				this.room = normalizeRoom(msg.room);
				this.screen = 'IMPOSTOR_GUESSING';
				break;
			case 'GameEnded':
				this.room = normalizeRoom(msg.room);
				this.voting = null;
				if (this.screen !== 'IMPOSTOR_GUESSING_RESULT') this.screen = 'RESULT';
				break;
			case 'ErrorMessage':
				this.error = msg.text;
				break;
			case 'RematchStarted':
				this.room = normalizeRoom(msg.room);
				this.screen = 'RESULT';
				sound.rematch();
				break;
			case 'ReturnedToLobby':
				this.room = normalizeRoom(msg.room);
				this.screen = 'LOBBY';
				this.yourRole = null;
				this.content = null;
				this.hintList = [];
				this.votingResult = null;
				break;
			case 'RemovedFromRoom':
				this.removedReason = msg.reason;
				this.reset();
				break;
			case 'EndGameProposed':
				this.endGameProposal = { agreedPlayerIds: msg.agreedPlayerIds, totalActive: msg.totalActive };
				break;
			case 'EndGameCancelled':
				this.endGameProposal = null;
				break;
		}
	}
}

export const gameStore = new GameStore();
