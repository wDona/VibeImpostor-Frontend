<script lang="ts">
	import { gameStore } from '$lib/ws.svelte';

	const room = $derived(gameStore.room!);
	const winners = $derived(room.lastWinners.map((id) => room.players.find((p) => p.id === id)).filter(Boolean));
	const isRematch = $derived(room.state === 'REMATCH');
	const you = $derived(room.players.find((p) => p.id === gameStore.yourPlayerId));
	const rematchCount = $derived(room.players.filter((p) => p.wantsRematch).length);

	function requestRematch() {
		gameStore.send({ type: 'RequestRematch' });
	}

	function backToLobby() {
		gameStore.send({ type: 'BackToLobby' });
	}
</script>

<div class="flex min-h-screen flex-col items-center justify-center px-6 text-center">
	<p class="mb-2 text-xs tracking-[0.35em] text-amber uppercase">Fin de la partida</p>

	{#if winners.length}
		<h1 class="font-display mb-2 text-4xl font-black text-paper italic">
			Ganan {winners.map((p) => p?.name).join(', ')}
		</h1>
	{:else}
		<h1 class="font-display mb-2 text-4xl font-black text-paper italic">Partida terminada</h1>
	{/if}

	<div class="mt-8 space-y-1">
		{#each room.players as p (p.id)}
			<p class="text-sm text-paper-dim">
				{p.name} — <span class="text-paper">{p.score} pts</span>
			</p>
		{/each}
	</div>

	<div class="mt-10 flex gap-4">
		{#if isRematch}
			<p class="text-sm text-paper-dim italic">
				{rematchCount} / {room.players.length} quieren revancha
			</p>
		{:else if you?.wantsRematch}
			<p class="text-sm text-paper-dim italic">Esperando a los demás...</p>
		{:else}
			<button
				onclick={requestRematch}
				class="bg-amber px-8 py-3 text-sm font-bold tracking-widest text-ink uppercase hover:bg-amber-dim"
			>
				Revancha
			</button>
			<button
				onclick={backToLobby}
				class="border border-wire px-8 py-3 text-sm tracking-widest text-paper-dim uppercase hover:text-paper"
			>
				Volver al lobby
			</button>
		{/if}
	</div>
</div>
