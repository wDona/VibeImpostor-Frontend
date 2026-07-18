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

interface NoteOptions {
	delay?: number;
	duration?: number;
	gain?: number;
	type?: OscillatorType;
}

// Una nota tipo campana: ataque de 8ms (sin él, saltar de golpe al volumen final
// suena como un click) y caída exponencial larga. La triangular tiene algún
// armónico impar, así que no queda tan hueca como la senoidal de antes.
function note(freq: number, { delay = 0, duration = 0.4, gain = 0.22, type = 'triangle' }: NoteOptions = {}) {
	if (!isSoundEnabled()) return;
	const audioCtx = getContext();
	if (!audioCtx) return;

	const osc = audioCtx.createOscillator();
	const env = audioCtx.createGain();
	osc.connect(env);
	env.connect(audioCtx.destination);

	const start = audioCtx.currentTime + delay;
	osc.type = type;
	osc.frequency.setValueAtTime(freq, start);

	env.gain.setValueAtTime(0.0001, start);
	env.gain.exponentialRampToValueAtTime(gain, start + 0.008);
	env.gain.exponentialRampToValueAtTime(0.0001, start + duration);

	osc.start(start);
	osc.stop(start + duration);
}

export const sound = {
	// Dos notas ascendentes solapadas (G5 → C6): corto y luminoso, no molesta
	// aunque salte muchas veces por partida.
	yourTurn: () => {
		note(784, { duration: 0.3 });
		note(1046.5, { delay: 0.09, duration: 0.45 });
	},
	// Segunda menor descendente (Bb4 → A4): disonante a propósito, avisa de que
	// hay que votar sin sonar a alarma.
	voteStarted: () => {
		note(466.16, { duration: 0.35, gain: 0.2 });
		note(440, { delay: 0.16, duration: 0.5, gain: 0.2 });
	},
	// Arpegio de Do mayor: fanfarria de "otra vez".
	rematch: () => {
		note(523.25, { duration: 0.35 });
		note(659.25, { delay: 0.1, duration: 0.4 });
		note(783.99, { delay: 0.2, duration: 0.45 });
		note(1046.5, { delay: 0.3, duration: 0.7 });
	}
};
