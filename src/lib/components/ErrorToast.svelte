<script lang="ts">
	import { gameStore } from '$lib/ws.svelte';

	$effect(() => {
		if (!gameStore.error) return;
		const id = setTimeout(() => (gameStore.error = null), 4000);
		return () => clearTimeout(id);
	});
</script>

{#if gameStore.error}
	<div class="fixed bottom-4 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 px-4">
		<div class="border-l-2 border-blood-bright bg-ink-raised px-4 py-3 text-sm text-blood-bright shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)]">
			{gameStore.error}
		</div>
	</div>
{/if}
