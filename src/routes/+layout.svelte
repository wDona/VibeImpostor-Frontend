<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import ErrorToast from '$lib/components/ErrorToast.svelte';
	import SpectatorJoinToast from '$lib/components/SpectatorJoinToast.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<ThemeToggle />
<ErrorToast />
<SpectatorJoinToast />
{@render children()}
