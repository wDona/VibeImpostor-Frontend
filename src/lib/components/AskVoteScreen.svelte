<script lang="ts">
	import { gameStore } from '$lib/ws.svelte';
	import Countdown from './Countdown.svelte';
	import LeaveGameButton from './LeaveGameButton.svelte';

	const room = $derived(gameStore.room!);
	const isSpectator = $derived(room.players.find((p) => p.id === gameStore.yourPlayerId)?.isSpectator ?? false);

	let answered = $state(false);

	function answer(wantsToVote: boolean) {
		answered = true;
		gameStore.send({ type: 'AnswerWantVote', wantsToVote });
	}
</script>

<LeaveGameButton />
<div class="flex min-h-screen flex-col items-center justify-center px-6 text-center">
	<p class="mb-2 text-xs tracking-[0.35em] text-amber uppercase">Ronda terminada</p>
	<h1 class="font-display mb-6 text-4xl font-black text-paper italic">¿Alguien sospecha algo?</h1>

	{#if gameStore.askVoteDeadline}
		<p class="mb-8 text-sm text-paper-dim">
			Tiempo restante: <Countdown deadlineEpochMs={gameStore.askVoteDeadline} />
		</p>
	{/if}

	{#if isSpectator}
		<p class="text-sm text-paper-dim italic">Eres espectador, no puedes votar.</p>
	{:else if !answered}
		<div class="flex gap-4">
			<button onclick={() => answer(true)} class="bg-blood px-8 py-3 text-sm font-bold tracking-widest text-paper uppercase hover:bg-blood-bright">
				Sí, votar
			</button>
			<button onclick={() => answer(false)} class="border border-wire px-8 py-3 text-sm tracking-widest text-paper-dim uppercase hover:text-paper">
				No, continuar
			</button>
		</div>
	{:else}
		<p class="text-sm text-paper-dim italic">Esperando a los demás jugadores...</p>
	{/if}
</div>
