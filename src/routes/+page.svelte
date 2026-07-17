<script lang="ts">
	import { onMount } from 'svelte';
	import { gameStore } from '$lib/ws.svelte';
	import HomeScreen from '$lib/components/HomeScreen.svelte';
	import LobbyScreen from '$lib/components/LobbyScreen.svelte';
	import GameScreen from '$lib/components/GameScreen.svelte';
	import AskVoteScreen from '$lib/components/AskVoteScreen.svelte';
	import VotingScreen from '$lib/components/VotingScreen.svelte';
	import RoundResultScreen from '$lib/components/RoundResultScreen.svelte';
	import ImpostorGuessingScreen from '$lib/components/ImpostorGuessingScreen.svelte';
	import ImpostorGuessingResultScreen from '$lib/components/ImpostorGuessingResultScreen.svelte';
	import ResultScreen from '$lib/components/ResultScreen.svelte';

	onMount(() => {
		gameStore.connect();
	});
</script>

{#if gameStore.screen === 'HOME'}
	<HomeScreen />
{:else if gameStore.screen === 'LOBBY'}
	<LobbyScreen />
{:else if gameStore.screen === 'GAME'}
	<GameScreen />
{:else if gameStore.screen === 'ASK_VOTE'}
	<AskVoteScreen />
{:else if gameStore.screen === 'VOTING'}
	<VotingScreen />
{:else if gameStore.screen === 'ROUND_RESULT'}
	<RoundResultScreen />
{:else if gameStore.screen === 'IMPOSTOR_GUESSING'}
	<ImpostorGuessingScreen />
{:else if gameStore.screen === 'IMPOSTOR_GUESSING_RESULT'}
	<ImpostorGuessingResultScreen />
{:else if gameStore.screen === 'RESULT'}
	<ResultScreen />
{/if}
