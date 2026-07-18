import { API_BASE } from './config';

// Los deadlines (turno, votación, ASK_VOTE) llegan como epoch absoluto del reloj
// del server. Si el del navegador va desajustado —móvil, portátil suspendido, NTP
// apagado— la cuenta atrás muestra un tiempo que no es el real: se ha visto un
// "173s restantes" que en realidad cortaba a los 30s. Preguntamos su hora una vez
// y corregimos el desfase en vez de fiarnos de Date.now().
let offsetMs = 0;

export function serverNow(): number {
	return Date.now() + offsetMs;
}

export async function syncClock(): Promise<void> {
	try {
		const before = Date.now();
		const res = await fetch(`${API_BASE}/time`, { cache: 'no-store' });
		if (!res.ok) return;
		const serverMs = Number(await res.text());
		if (!Number.isFinite(serverMs)) return;
		// La respuesta se generó en algún punto del viaje de ida y vuelta; el punto
		// medio es la mejor estimación con una sola muestra (error ~ RTT/2).
		const localMs = (before + Date.now()) / 2;
		offsetMs = serverMs - localMs;
	} catch {
		// Sin calibrar: se sigue usando el reloj local, como hasta ahora.
	}
}
