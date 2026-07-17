<script lang="ts">
	import { gameStore } from '$lib/ws.svelte';
	import PlayerAvatar from './PlayerAvatar.svelte';

	const room = $derived(gameStore.room!);
	const entries = $derived(
		Object.entries(room.impostorGuesses).map(([playerId, correct]) => ({
			player: room.players.find((p) => p.id === playerId),
			correct
		}))
	);
</script>

<div class="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
	<p class="mb-2 text-xs tracking-[0.35em] text-amber uppercase">Resultado de la adivinanza</p>
	<h1 class="font-display mb-8 text-3xl font-black text-paper italic">¿Cuál era la palabra?</h1>

	<div class="w-full space-y-3">
		{#each entries as entry (entry.player?.id ?? Math.random())}
			{#if entry.player}
				<div
					class={`flex items-center justify-between border p-4 ${
						entry.correct ? 'border-amber bg-amber/10' : 'border-blood bg-blood/10'
					}`}
				>
					<span class="flex items-center gap-3 text-left">
						<PlayerAvatar name={entry.player.name} colorIndex={entry.player.colorIndex} />
						<span>
							<span class="block font-medium text-paper">{entry.player.name}</span>
							<span class="block text-xs text-paper-dim">
								{entry.correct ? '✓ Sí ha encontrado la palabra' : '✗ No sabía la palabra'}
							</span>
						</span>
					</span>
					<span
						class={`text-xs font-bold tracking-widest uppercase ${entry.correct ? 'text-amber' : 'text-blood-bright'}`}
					>
						{entry.correct ? 'OK' : 'FAIL'}
					</span>
				</div>
			{/if}
		{/each}
	</div>

	<button
		onclick={() => gameStore.continueToResults()}
		class="mt-10 bg-amber px-8 py-3 text-sm font-bold tracking-widest text-ink uppercase hover:bg-amber-dim"
	>
		Volver al lobby
	</button>
</div>
