import { WS_URL } from './config';
import { defaultRoomConfig, type ClientMessage, type RoomConfig, type RoomSnapshot, type Role, type ServerMessage } from './protocol';

// kotlinx.serialization usa el nombre completo cualificado de la clase Kotlin
// como discriminador "type" en el wire — no el nombre corto del sealed member.
const CLIENT_PREFIX = 'org.example.project.protocol.ClientMessage.';
const SERVER_PREFIX = 'org.example.project.protocol.ServerMessage.';

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

function normalizeRoom(raw: Partial<RoomSnapshot> & Pick<RoomSnapshot, 'code' | 'state' | 'players' | 'hostId' | 'turnOrder' | 'roundNumber'>): RoomSnapshot {
	return {
		...raw,
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

	yourRole = $state<Role | null>(null);
	contentIsWord = $state(false);
	content = $state<string | null>(null);
	hintList = $state<string[]>([]);

	askVoteDeadline = $state<number | null>(null);
	voting = $state<VotingInfo | null>(null);
	votingResult = $state<VotingResultInfo | null>(null);
	endGameProposal = $state<EndGameProposal | null>(null);
	lastWordPlayed = $state<{ playerId: string; word: string } | null>(null);

	error = $state<string | null>(null);
	removedReason = $state<string | null>(null);

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
		this.connect();
		const wire = JSON.stringify({ ...message, type: CLIENT_PREFIX + message.type });
		if (this.socket?.readyState === WebSocket.OPEN) {
			this.socket.send(wire);
		} else {
			this.socket?.addEventListener('open', () => this.socket?.send(wire), { once: true });
		}
	}

	// Actualiza la config local al instante (el RoomUpdated del server llega después
	// y confirma/sobreescribe) — evita que cada click espere el viaje de ida y vuelta.
	updateConfig(config: RoomConfig) {
		if (this.room) this.room = { ...this.room, config };
		this.send({ type: 'UpdateConfig', config });
	}

	// El server cierra el socket al recibir LeaveRoom sin mandar confirmación,
	// así que hay que resetear el estado local nosotros mismos.
	leaveRoom() {
		this.send({ type: 'LeaveRoom' });
		this.reset();
	}

	reset() {
		this.yourPlayerId = null;
		this.room = null;
		this.yourRole = null;
		this.content = null;
		this.hintList = [];
		this.askVoteDeadline = null;
		this.voting = null;
		this.votingResult = null;
		this.endGameProposal = null;
		this.lastWordPlayed = null;
		this.error = null;
	}

	private handleMessage(msg: ServerMessage) {
		switch (msg.type) {
			case 'Joined':
				this.yourPlayerId = msg.yourPlayerId;
				this.room = normalizeRoom(msg.room);
				break;
			case 'RoomUpdated':
				this.room = normalizeRoom(msg.room);
				break;
			case 'GameStarted':
				this.room = normalizeRoom(msg.room);
				this.yourRole = msg.yourRole;
				this.contentIsWord = msg.contentIsWord;
				this.content = msg.content;
				this.hintList = msg.hintList ?? [];
				this.askVoteDeadline = null;
				this.voting = null;
				this.votingResult = null;
				break;
			case 'TurnChanged':
				if (this.room) {
					this.room = { ...this.room, currentTurnPlayerId: msg.currentTurnPlayerId, roundNumber: msg.roundNumber };
				}
				this.askVoteDeadline = null;
				this.voting = null;
				break;
			case 'WordPlayed':
				this.lastWordPlayed = { playerId: msg.playerId, word: msg.word };
				break;
			case 'AskWantVote':
				this.askVoteDeadline = msg.deadlineEpochMs;
				break;
			case 'VotingStarted':
				this.askVoteDeadline = null;
				this.voting = { candidateIds: msg.candidateIds, deadlineEpochMs: msg.deadlineEpochMs };
				break;
			case 'VoteCast':
				break;
			case 'VotingResult':
				this.room = normalizeRoom(msg.room);
				this.voting = null;
				this.votingResult = {
					ejectedPlayerId: msg.ejectedPlayerId,
					wasImpostor: msg.wasImpostor,
					votes: msg.votes ?? {},
					voteTypes: msg.voteTypes ?? {},
					punishmentPlayerId: msg.punishmentPlayerId ?? null
				};
				break;
			case 'RoundContinues':
				this.room = normalizeRoom(msg.room);
				this.votingResult = null;
				break;
			case 'ProceedToGuessing':
				this.room = normalizeRoom(msg.room);
				this.votingResult = null;
				break;
			case 'GameEnded':
				this.room = normalizeRoom(msg.room);
				this.voting = null;
				this.votingResult = null;
				break;
			case 'ErrorMessage':
				this.error = msg.text;
				break;
			case 'RematchStarted':
				this.room = normalizeRoom(msg.room);
				break;
			case 'ReturnedToLobby':
				this.room = normalizeRoom(msg.room);
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
