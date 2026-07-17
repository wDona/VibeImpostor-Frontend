<script lang="ts">
	import { gameStore } from '$lib/ws.svelte';

	$effect(() => {
		if (!gameStore.spectatorJoinedNotice) return;
		const id = setTimeout(() => (gameStore.spectatorJoinedNotice = null), 4000);
		return () => clearTimeout(id);
	});
</script>

{#if gameStore.spectatorJoinedNotice}
	<div class="fixed top-4 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 px-4">
		<div class="border-l-2 border-amber bg-ink-raised px-4 py-3 text-sm text-amber shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)]">
			{gameStore.spectatorJoinedNotice}
		</div>
	</div>
{/if}
