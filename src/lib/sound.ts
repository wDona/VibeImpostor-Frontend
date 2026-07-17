const STORAGE_KEY = 'impostor_sound_enabled';

let ctx: AudioContext | null = null;

export function isSoundEnabled(): boolean {
	if (typeof localStorage === 'undefined') return true;
	return localStorage.getItem(STORAGE_KEY) !== 'false';
}

export function setSoundEnabled(enabled: boolean) {
	localStorage.setItem(STORAGE_KEY, String(enabled));
}

function getContext(): AudioContext | null {
	if (typeof window === 'undefined') return null;
	if (!ctx) ctx = new AudioContext();
	return ctx;
}

function tone(freqStart: number, freqEnd: number, duration: number, delay = 0) {
	if (!isSoundEnabled()) return;
	const audioCtx = getContext();
	if (!audioCtx) return;

	const osc = audioCtx.createOscillator();
	const gain = audioCtx.createGain();
	osc.connect(gain);
	gain.connect(audioCtx.destination);

	const start = audioCtx.currentTime + delay;
	osc.frequency.setValueAtTime(freqStart, start);
	osc.frequency.linearRampToValueAtTime(freqEnd, start + duration);

	gain.gain.setValueAtTime(0.28, start);
	gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

	osc.start(start);
	osc.stop(start + duration);
}

export const sound = {
	yourTurn: () => tone(880, 1100, 0.18),
	voteStarted: () => {
		tone(440, 440, 0.12, 0);
		tone(660, 660, 0.12, 0.15);
	},
	rematch: () => tone(523, 784, 0.25)
};
