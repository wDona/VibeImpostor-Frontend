<script lang="ts">
	import { gameStore } from '$lib/ws.svelte';
	import { BOTH_IMPOSTORS_ID, NOBODY_VOTE_ID, PUNISHMENT_PREFIX } from '$lib/protocol';

	const room = $derived(gameStore.room!);
	const result = $derived(gameStore.votingResult!);

	const rawId = $derived(result.ejectedPlayerId);
	const isPunishment = $derived(rawId?.startsWith(PUNISHMENT_PREFIX) ?? false);
	const accusedId = $derived(isPunishment ? rawId!.slice(PUNISHMENT_PREFIX.length) : rawId);

	const ejectedPlayer = $derived(
		accusedId && accusedId !== NOBODY_VOTE_ID && accusedId !== BOTH_IMPOSTORS_ID
			? room.players.find((p) => p.id === accusedId)
			: null
	);

	let continued = $state(false);

	function continueRound() {
		continued = true;
		gameStore.send({ type: 'ContinueRound' });
	}

	$effect(() => {
		result;
		continued = false;
	});
</script>

<div class="flex min-h-screen flex-col items-center justify-center px-6 text-center">
	<p class="mb-2 text-xs tracking-[0.35em] text-paper-dim uppercase">Resultado de la votación</p>

	{#if isPunishment}
		<h1 class="font-display mb-3 text-3xl font-black text-amber italic">
			{ejectedPlayer?.name ?? 'Alguien'} recibe una advertencia
		</h1>
		<p class="text-sm text-paper-dim">Era inocente — la partida continúa.</p>
	{:else if !ejectedPlayer}
		<h1 class="font-display mb-3 text-3xl font-black text-paper italic">Nadie fue expulsado</h1>
	{:else}
		<h1 class="font-display mb-3 text-3xl font-black text-paper italic">
			{ejectedPlayer.name} fue expulsado
		</h1>
		<p class={`mb-2 text-lg font-bold ${result.wasImpostor ? 'text-blood-bright' : 'text-amber'}`}>
			{result.wasImpostor ? 'Era el impostor' : 'Era inocente'}
		</p>
	{/if}

	{#if Object.keys(result.votes).length}
		<div class="mt-6 space-y-1 text-sm text-paper-dim">
			{#each Object.entries(result.votes) as [voterId, targetId] (voterId)}
				{@const voter = room.players.find((p) => p.id === voterId)}
				{@const target = room.players.find((p) => p.id === targetId)}
				<p>{voter?.name ?? '?'} → {target?.name ?? (targetId === NOBODY_VOTE_ID ? 'nadie' : '?')}</p>
			{/each}
		</div>
	{/if}

	<div class="mt-10">
		{#if !continued}
			<button
				onclick={continueRound}
				class="bg-amber px-8 py-3 text-sm font-bold tracking-widest text-ink uppercase hover:bg-amber-dim"
			>
				Continuar
			</button>
		{:else}
			<p class="text-sm text-paper-dim italic">Esperando a los demás...</p>
		{/if}
	</div>
</div>
