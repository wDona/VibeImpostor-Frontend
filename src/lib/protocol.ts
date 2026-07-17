// Espejo de core/src/commonMain/kotlin/org/example/project/{model/Models.kt,protocol/Messages.kt}
// classDiscriminator = "type" en el server (ProtocolJson)

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 16;

export const NOBODY_VOTE_ID = '__nobody__';
export const BOTH_IMPOSTORS_ID = '__both__';
export const WRONG_CLAIM_PREFIX = '__wrongclaim__';
export const PUNISHMENT_PREFIX = '__punishment__';

export type RoomState =
	| 'LOBBY'
	| 'IN_GAME'
	| 'ASK_VOTE'
	| 'VOTING'
	| 'IMPOSTORS_GUESSING'
	| 'FINISHED'
	| 'REMATCH';

export type Role = 'INNOCENT' | 'IMPOSTOR';
export type GameMode = 'VOICE' | 'TEXT';
export type ImpostorMode = 'FIXED' | 'RANDOM';

export interface PublicPlayer {
	id: string;
	name: string;
	score: number;
	connected: boolean;
	isHost: boolean;
	waitingNextGame: boolean;
	isSpectator: boolean;
	wantsRematch: boolean;
	colorIndex: number;
}

export interface RoomConfig {
	gameMode: GameMode;
	numImpostors: number;
	minImpostors: number;
	impostorMode: ImpostorMode;
	allCanBeImpostor: boolean;
	voteTimeLimitSeconds: number;
	selectedCategoryIds: number[];
	language: string;
	winOnFirstEjection: boolean;
	anonymousVotes: boolean;
	singleWordRound: boolean;
	noCategory: boolean;
	progressiveHints: boolean;
	punishmentVote: boolean;
	hiddenImpostor: boolean;
	randomVariant: boolean;
}

export function defaultRoomConfig(): RoomConfig {
	return {
		gameMode: 'VOICE',
		numImpostors: 1,
		minImpostors: 1,
		impostorMode: 'FIXED',
		allCanBeImpostor: false,
		voteTimeLimitSeconds: 60,
		selectedCategoryIds: [],
		language: 'es',
		winOnFirstEjection: false,
		anonymousVotes: false,
		singleWordRound: false,
		noCategory: false,
		progressiveHints: false,
		punishmentVote: false,
		hiddenImpostor: false,
		randomVariant: false
	};
}

export interface RoomSnapshot {
	code: string;
	state: RoomState;
	config: RoomConfig;
	players: PublicPlayer[];
	hostId: string;
	currentTurnPlayerId: string | null;
	turnOrder: string[];
	roundNumber: number;
	impostorIds: string[];
	impostorGuesses: Record<string, boolean>;
	pendingGuessImpostorId: string | null;
	lastWinners: string[];
	continueResponses: string[];
	isInPunishmentRound: boolean;
	punishmentPlayerId: string | null;
	chosenVariant: string | null;
}

// ---- ClientMessage (cliente -> servidor) ----

export type ClientMessage =
	| { type: 'CreateRoom'; playerName: string; authToken?: string | null }
	| { type: 'JoinRoom'; roomCode: string; playerName: string; authToken?: string | null }
	| { type: 'LeaveRoom' }
	| { type: 'UpdateConfig'; config: RoomConfig }
	| { type: 'StartGame' }
	| { type: 'EndTurn' }
	| { type: 'SubmitWord'; text: string }
	| { type: 'AnswerWantVote'; wantsToVote: boolean }
	| { type: 'CastVote'; targetPlayerId: string; voteIsHard?: boolean }
	| { type: 'AnswerEndGame'; agrees: boolean }
	| { type: 'BackToLobby' }
	| { type: 'RequestRematch' }
	| { type: 'SubmitImpostorGuess'; word: string }
	| { type: 'ContinueRound' }
	| { type: 'KickPlayer'; targetPlayerId: string }
	| { type: 'EjectPlayer'; targetPlayerId: string };

// ---- ServerMessage (servidor -> cliente) ----

export type ServerMessage =
	| { type: 'Joined'; yourPlayerId: string; room: RoomSnapshot }
	| { type: 'RoomUpdated'; room: RoomSnapshot }
	| {
			type: 'GameStarted';
			yourRole: Role;
			contentIsWord: boolean;
			content: string;
			room: RoomSnapshot;
			hintList: string[];
	  }
	| { type: 'TurnChanged'; currentTurnPlayerId: string; roundNumber: number }
	| { type: 'WordPlayed'; playerId: string; word: string }
	| { type: 'AskWantVote'; deadlineEpochMs: number }
	| { type: 'VotingStarted'; candidateIds: string[]; deadlineEpochMs: number }
	| {
			type: 'VotingResult';
			ejectedPlayerId: string | null;
			wasImpostor: boolean;
			room: RoomSnapshot;
			votes: Record<string, string>;
			voteTypes: Record<string, boolean>;
			punishmentPlayerId?: string | null;
	  }
	| { type: 'RoundContinues'; roundNumber: number; room: RoomSnapshot }
	| { type: 'ProceedToGuessing'; room: RoomSnapshot }
	| { type: 'GameEnded'; winnerIds: string[]; room: RoomSnapshot }
	| { type: 'ErrorMessage'; text: string }
	| { type: 'RematchStarted'; room: RoomSnapshot }
	| { type: 'ReturnedToLobby'; room: RoomSnapshot }
	| { type: 'RemovedFromRoom'; reason: string }
	| { type: 'EndGameProposed'; agreedPlayerIds: string[]; totalActive: number }
	| { type: 'EndGameCancelled' }
	| { type: 'VoteCast'; voterId: string };
