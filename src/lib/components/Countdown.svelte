<script lang="ts">
	import { serverNow } from '$lib/clock';

	let { deadlineEpochMs }: { deadlineEpochMs: number } = $props();

	let now = $state(serverNow());

	$effect(() => {
		const id = setInterval(() => (now = serverNow()), 250);
		return () => clearInterval(id);
	});

	const remaining = $derived(Math.max(0, Math.ceil((deadlineEpochMs - now) / 1000)));
</script>

<span class={remaining <= 5 ? 'text-blood-bright' : 'text-amber'}>{remaining}s</span>
