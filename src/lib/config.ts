export const API_BASE = import.meta.env.DEV ? 'http://localhost:8080' : 'https://server-impostor.wdona.dev';

export const WS_URL = import.meta.env.DEV ? 'ws://localhost:8080/ws/game' : 'wss://server-impostor.wdona.dev/ws/game';
