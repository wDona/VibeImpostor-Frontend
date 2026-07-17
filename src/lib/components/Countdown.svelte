<script lang="ts">
	let { deadlineEpochMs }: { deadlineEpochMs: number } = $props();

	let now = $state(Date.now());

	$effect(() => {
		const id = setInterval(() => (now = Date.now()), 250);
		return () => clearInterval(id);
	});

	const remaining = $derived(Math.max(0, Math.ceil((deadlineEpochMs - now) / 1000)));
</script>

<span class={remaining <= 5 ? 'text-blood-bright' : 'text-amber'}>{remaining}s</span>
