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
	import ResultScreen from '$lib/components/ResultScreen.svelte';

	onMount(() => {
		gameStore.connect();
	});
</script>

{#if !gameStore.room}
	<HomeScreen />
{:else if gameStore.votingResult}
	<RoundResultScreen />
{:else if gameStore.room.state === 'LOBBY'}
	<LobbyScreen />
{:else if gameStore.room.state === 'IN_GAME'}
	<GameScreen />
{:else if gameStore.room.state === 'ASK_VOTE'}
	<AskVoteScreen />
{:else if gameStore.room.state === 'VOTING'}
	<VotingScreen />
{:else if gameStore.room.state === 'IMPOSTORS_GUESSING'}
	<ImpostorGuessingScreen />
{:else if gameStore.room.state === 'FINISHED' || gameStore.room.state === 'REMATCH'}
	<ResultScreen />
{/if}
