<script lang="ts">
	import { onMount } from 'svelte';
	import { themeStore } from '$lib/theme.svelte';

	onMount(() => {
		themeStore.apply();
	});

	const label = $derived(
		themeStore.pref === 'system' ? 'Sistema' : themeStore.pref === 'dark' ? 'Oscuro' : 'Claro'
	);
</script>

<button
	onclick={() => themeStore.cycle()}
	title="Cambiar tema"
	class="fixed top-4 right-4 z-40 border border-wire bg-ink-raised/80 px-2.5 py-1.5 text-[0.6rem] tracking-widest text-paper-dim uppercase backdrop-blur hover:border-amber hover:text-amber"
>
	{label}
</button>
