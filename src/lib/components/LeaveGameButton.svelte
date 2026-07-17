<script lang="ts">
	import { gameStore } from '$lib/ws.svelte';

	let confirming = $state(false);
</script>

<button
	onclick={() => (confirming = true)}
	class="fixed top-4 left-4 z-40 border border-wire bg-ink-raised/80 px-2.5 py-1.5 text-[0.6rem] tracking-widest text-paper-dim uppercase backdrop-blur hover:border-blood-bright hover:text-blood-bright"
>
	Salir
</button>

{#if confirming}
	<div
		role="presentation"
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
		onclick={() => (confirming = false)}
		onkeydown={(e) => e.key === 'Escape' && (confirming = false)}
	>
		<div
			role="dialog"
			aria-modal="true"
			aria-label="Salir de la partida"
			tabindex="-1"
			class="w-full max-w-sm border border-wire bg-ink p-6 text-center"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			<h3 class="font-display mb-2 text-2xl font-black text-paper italic">¿Salir de la partida?</h3>
			<p class="mb-6 text-sm text-paper-dim">Si te sales, perderás tu sitio en esta partida.</p>
			<div class="flex gap-3">
				<button
					onclick={() => (confirming = false)}
					class="flex-1 border border-wire py-2.5 text-xs tracking-widest text-paper-dim uppercase hover:text-paper"
				>
					Cancelar
				</button>
				<button
					onclick={() => gameStore.leaveRoom()}
					class="flex-1 bg-blood py-2.5 text-xs font-bold tracking-widest text-paper uppercase hover:bg-blood-bright"
				>
					Salir
				</button>
			</div>
		</div>
	</div>
{/if}
