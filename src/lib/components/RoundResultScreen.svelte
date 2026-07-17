<script lang="ts">
	import { gameStore } from '$lib/ws.svelte';
	import { BOTH_IMPOSTORS_ID, NOBODY_VOTE_ID, PUNISHMENT_PREFIX, WRONG_CLAIM_PREFIX } from '$lib/protocol';
	import PlayerAvatar from './PlayerAvatar.svelte';
	import LeaveGameButton from './LeaveGameButton.svelte';
	import VoteReveal from './VoteReveal.svelte';

	const room = $derived(gameStore.room!);
	const result = $derived(gameStore.votingResult!);
	const you = $derived(room.players.find((p) => p.id === gameStore.yourPlayerId));

	const rawId = $derived(result.ejectedPlayerId);
	const isPunishment = $derived(rawId?.startsWith(PUNISHMENT_PREFIX) ?? false);
	const isWrongClaim = $derived(rawId?.startsWith(WRONG_CLAIM_PREFIX) ?? false);
	const accusedId = $derived(isPunishment ? rawId!.slice(PUNISHMENT_PREFIX.length) : rawId);
	const wrongClaimVoter = $derived(
		isWrongClaim ? room.players.find((p) => p.id === rawId!.slice(WRONG_CLAIM_PREFIX.length)) : null
	);

	const ejectedPlayer = $derived(
		!isWrongClaim && accusedId && accusedId !== NOBODY_VOTE_ID && accusedId !== BOTH_IMPOSTORS_ID
			? room.players.find((p) => p.id === accusedId)
			: null
	);

	// Requiere continuar: activos, o el impostor pendiente de adivinar aunque sea espectador.
	const canContinue = $derived(you ? !you.isSpectator || you.id === room.pendingGuessImpostorId : false);
	const requiredPlayers = $derived(
		room.players.filter((p) => !p.isSpectator || p.id === room.pendingGuessImpostorId)
	);

	let continued = $state(false);
	let secondsLeft = $state(30);

	function continueRound() {
		if (continued) return;
		continued = true;
		gameStore.send({ type: 'ContinueRound' });
	}

	$effect(() => {
		result;
		continued = false;
		secondsLeft = 30;
	});

	$effect(() => {
		if (!canContinue) return;
		const id = setInterval(() => {
			secondsLeft = Math.max(0, secondsLeft - 1);
			if (secondsLeft === 0) continueRound();
		}, 1000);
		return () => clearInterval(id);
	});
</script>

<LeaveGameButton />
<div class="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
	<p class="mb-2 text-xs tracking-[0.35em] text-paper-dim uppercase">Resultado de la votación</p>

	{#if isPunishment}
		<h1 class="font-display mb-3 text-3xl font-black text-amber italic">
			{ejectedPlayer?.name ?? 'Alguien'} recibe una advertencia
		</h1>
		<p class="text-sm text-paper-dim">Era inocente — la partida continúa.</p>
	{:else if isWrongClaim}
		<h1 class="font-display mb-3 text-3xl font-black text-blood-bright italic">
			¡{wrongClaimVoter?.name ?? 'Alguien'} se creyó que era el único inocente!
		</h1>
	{:else if accusedId === BOTH_IMPOSTORS_ID}
		<h1 class="font-display mb-3 text-3xl font-black text-paper italic">
			{result.wasImpostor ? '¡Acertó! Los demás eran impostores.' : 'Equivocado. Queda eliminado.'}
		</h1>
	{:else if accusedId === NOBODY_VOTE_ID}
		<h1 class="font-display mb-3 text-3xl font-black text-paper italic">
			{result.wasImpostor ? '¡Había impostores! Los inocentes pierden.' : '¡Correcto! No había impostores. Ganan los inocentes.'}
		</h1>
	{:else if !ejectedPlayer}
		<h1 class="font-display mb-3 text-3xl font-black text-paper italic">Empate. Nadie fue expulsado.</h1>
	{:else}
		<h1 class="font-display mb-3 text-3xl font-black text-paper italic">
			{ejectedPlayer.name} fue expulsado
		</h1>
		<p class={`mb-2 text-lg font-bold ${result.wasImpostor ? 'text-blood-bright' : 'text-amber'}`}>
			{result.wasImpostor ? 'Era el impostor' : 'Era inocente'}
		</p>
	{/if}

	<div class="mt-6 w-full">
		<VoteReveal
			players={room.players}
			votes={result.votes}
			voteTypes={result.voteTypes}
			anonymousVotes={room.config.anonymousVotes}
		/>
	</div>

	{#if requiredPlayers.length}
		<div class="mt-8 flex flex-wrap justify-center gap-1.5">
			{#each requiredPlayers as p (p.id)}
				<span class={room.continueResponses.includes(p.id) ? '' : 'opacity-30 grayscale'}>
					<PlayerAvatar name={p.name} colorIndex={p.colorIndex} size="sm" />
				</span>
			{/each}
		</div>
	{/if}

	<div class="mt-6">
		{#if !canContinue}
			<p class="text-sm text-paper-dim italic">Esperando a los demás...</p>
		{:else if !continued}
			<button
				onclick={continueRound}
				class="bg-amber px-8 py-3 text-sm font-bold tracking-widest text-ink uppercase hover:bg-amber-dim"
			>
				Continuar ({secondsLeft}s)
			</button>
		{:else}
			<p class="text-sm text-paper-dim italic">Esperando a los demás...</p>
		{/if}
	</div>
</div>
