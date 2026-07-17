<script lang="ts">
	import { gameStore } from '$lib/ws.svelte';

	const room = $derived(gameStore.room!);
	const isGuessing = $derived(room.pendingGuessImpostorId === gameStore.yourPlayerId);
	const guesser = $derived(room.players.find((p) => p.id === room.pendingGuessImpostorId));

	let guess = $state('');
	let submitted = $state(false);

	function submit(e: Event) {
		e.preventDefault();
		const word = guess.trim();
		if (!word) return;
		submitted = true;
		gameStore.send({ type: 'SubmitImpostorGuess', word });
	}
</script>

<div class="flex min-h-screen flex-col items-center justify-center px-6 text-center">
	<p class="mb-2 text-xs tracking-[0.35em] text-blood-bright uppercase">Última oportunidad</p>

	{#if isGuessing}
		<h1 class="font-display mb-6 text-3xl font-black text-paper italic">Adivina la palabra secreta</h1>
		{#if !submitted}
			<form class="flex w-full max-w-sm gap-2" onsubmit={submit}>
				<input
					bind:value={guess}
					placeholder="Tu respuesta..."
					class="flex-1 border-b-2 border-blood bg-transparent px-1 py-2 text-lg text-paper outline-none placeholder:text-paper-dim/40"
				/>
				<button type="submit" class="bg-blood px-5 py-2 text-sm font-bold text-paper uppercase hover:bg-blood-bright">
					Enviar
				</button>
			</form>
		{:else}
			<p class="text-sm text-paper-dim italic">Esperando resultado...</p>
		{/if}
	{:else}
		<h1 class="font-display mb-3 text-3xl font-black text-paper italic">
			{guesser?.name ?? 'El impostor'} está adivinando la palabra
		</h1>
		<p class="text-sm text-paper-dim italic">Si acierta, gana la partida...</p>
	{/if}
</div>
