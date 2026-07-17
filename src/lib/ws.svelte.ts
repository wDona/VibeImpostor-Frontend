import { WS_URL } from './config';
import type { ClientMessage, RoomSnapshot, Role, ServerMessage } from './protocol';

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
		socket.onmessage = (event) => this.handleMessage(JSON.parse(event.data) as ServerMessage);
		this.socket = socket;
	}

	send(message: ClientMessage) {
		this.connect();
		if (this.socket?.readyState === WebSocket.OPEN) {
			this.socket.send(JSON.stringify(message));
		} else {
			this.socket?.addEventListener('open', () => this.socket?.send(JSON.stringify(message)), {
				once: true
			});
		}
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
				this.room = msg.room;
				break;
			case 'RoomUpdated':
				this.room = msg.room;
				break;
			case 'GameStarted':
				this.room = msg.room;
				this.yourRole = msg.yourRole;
				this.contentIsWord = msg.contentIsWord;
				this.content = msg.content;
				this.hintList = msg.hintList;
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
				this.room = msg.room;
				this.voting = null;
				this.votingResult = {
					ejectedPlayerId: msg.ejectedPlayerId,
					wasImpostor: msg.wasImpostor,
					votes: msg.votes,
					voteTypes: msg.voteTypes,
					punishmentPlayerId: msg.punishmentPlayerId ?? null
				};
				break;
			case 'RoundContinues':
				this.room = msg.room;
				this.votingResult = null;
				break;
			case 'ProceedToGuessing':
				this.room = msg.room;
				this.votingResult = null;
				break;
			case 'GameEnded':
				this.room = msg.room;
				this.voting = null;
				this.votingResult = null;
				break;
			case 'ErrorMessage':
				this.error = msg.text;
				break;
			case 'RematchStarted':
				this.room = msg.room;
				break;
			case 'ReturnedToLobby':
				this.room = msg.room;
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
