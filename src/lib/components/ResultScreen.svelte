<script lang="ts">
	import { gameStore } from '$lib/ws.svelte';
	import { BOTH_IMPOSTORS_ID, NOBODY_VOTE_ID, PUNISHMENT_PREFIX, WRONG_CLAIM_PREFIX } from '$lib/protocol';
	import PlayerAvatar from './PlayerAvatar.svelte';
	import VoteReveal from './VoteReveal.svelte';

	const room = $derived(gameStore.room!);
	const you = $derived(room.players.find((p) => p.id === gameStore.yourPlayerId));
	const isRematch = $derived(room.state === 'REMATCH');
	const rematchCount = $derived(room.players.filter((p) => p.wantsRematch).length);

	const impostorsWon = $derived(
		room.lastWinners.length > 0 && room.lastWinners.every((id) => room.impostorIds.includes(id))
	);
	const topScore = $derived(room.players.reduce((max, p) => Math.max(max, p.score), 0));
	const highlightIds = $derived(
		room.lastWinners.length ? room.lastWinners : room.players.filter((p) => p.score === topScore).map((p) => p.id)
	);
	const ranked = $derived([...room.players].sort((a, b) => b.score - a.score));

	const result = $derived(gameStore.votingResult);
	const rawId = $derived(result?.ejectedPlayerId ?? null);
	const detailText = $derived.by(() => {
		if (!result) return null;
		if (rawId?.startsWith(PUNISHMENT_PREFIX)) return null;
		if (rawId?.startsWith(WRONG_CLAIM_PREFIX)) {
			const voter = room.players.find((p) => p.id === rawId!.slice(WRONG_CLAIM_PREFIX.length));
			return `¡${voter?.name ?? 'Alguien'} se creyó que era el único inocente!`;
		}
		if (rawId === BOTH_IMPOSTORS_ID) {
			return result.wasImpostor ? '¡Acertó! Los demás eran impostores.' : 'Equivocado. Quedó eliminado.';
		}
		if (rawId === NOBODY_VOTE_ID) {
			return result.wasImpostor ? '¡Había impostores! Los inocentes perdieron.' : 'No había impostores.';
		}
		if (!rawId) return 'Empate. Nadie fue expulsado.';
		const player = room.players.find((p) => p.id === rawId);
		return player ? `${player.name} fue expulsado — ${result.wasImpostor ? 'era el impostor' : 'era inocente'}` : null;
	});

	let rematchSecondsLeft = $state(20);
	$effect(() => {
		if (!isRematch) return;
		rematchSecondsLeft = 20;
		const id = setInterval(() => (rematchSecondsLeft = Math.max(0, rematchSecondsLeft - 1)), 1000);
		return () => clearInterval(id);
	});

	function requestRematch() {
		gameStore.send({ type: 'RequestRematch' });
	}

	function backToLobby() {
		gameStore.send({ type: 'BackToLobby' });
	}
</script>

<div class="mx-auto flex min-h-screen max-w-lg flex-col items-center px-6 py-16 text-center">
	<div
		class={`mb-6 w-full border-2 p-6 ${impostorsWon ? 'border-blood bg-blood/10' : 'border-amber bg-amber/10'}`}
	>
		<p class={`mb-2 text-xs tracking-[0.35em] uppercase ${impostorsWon ? 'text-blood-bright' : 'text-amber'}`}>
			Fin de la partida
		</p>
		<h1 class="font-display text-4xl font-black text-paper italic">
			{impostorsWon ? '¡Gana el impostor!' : '¡Ganaron los inocentes!'}
		</h1>
		{#if detailText}
			<p class="mt-2 text-sm text-paper-dim">{detailText}</p>
		{/if}
	</div>

	{#if result}
		<div class="mb-8 w-full">
			<VoteReveal
				players={room.players}
				votes={result.votes}
				voteTypes={result.voteTypes}
				anonymousVotes={room.config.anonymousVotes}
			/>
		</div>
	{/if}

	<div class="w-full space-y-1.5">
		{#each ranked as p, i (p.id)}
			{@const isWinnerHighlight = highlightIds.includes(p.id)}
			{@const isImpostorAlive = room.impostorIds.includes(p.id) && !p.isSpectator}
			<div
				class={`flex items-center justify-between border px-4 py-2.5 ${
					isWinnerHighlight ? 'border-amber bg-amber/10' : isImpostorAlive ? 'border-blood bg-blood/5' : 'border-wire bg-ink-raised/40'
				}`}
			>
				<span class="flex items-center gap-2.5">
					<span class="w-6 text-xs font-bold text-paper-dim">#{i + 1}</span>
					<PlayerAvatar name={p.name} colorIndex={p.colorIndex} size="sm" />
					<span class="text-sm text-paper">{p.name}</span>
					<span class={`text-[0.6rem] tracking-widest uppercase ${room.impostorIds.includes(p.id) ? 'text-blood-bright' : 'text-paper-dim'}`}>
						{room.impostorIds.includes(p.id) ? 'Impostor' : 'Inocente'}
					</span>
				</span>
				<span class="text-sm font-bold text-paper">{p.score} pts</span>
			</div>
		{/each}
	</div>

	<div class="mt-10 flex gap-3">
		{#if !isRematch}
			{#if you?.wantsRematch}
				<p class="text-sm text-paper-dim italic">Esperando a los demás...</p>
			{:else}
				<button
					onclick={requestRematch}
					class="bg-amber px-6 py-3 text-sm font-bold tracking-widest text-ink uppercase hover:bg-amber-dim"
				>
					Revancha
				</button>
				<button
					onclick={backToLobby}
					class="border border-wire px-6 py-3 text-sm tracking-widest text-paper-dim uppercase hover:text-paper"
				>
					Volver al lobby
				</button>
			{/if}
			<button
				onclick={() => gameStore.leaveRoom()}
				class="border border-wire px-6 py-3 text-sm tracking-widest text-paper-dim uppercase hover:border-blood-bright hover:text-blood-bright"
			>
				Salir
			</button>
		{/if}
	</div>
</div>

{#if isRematch}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
		<div role="dialog" aria-modal="true" aria-label="Revancha" class="w-full max-w-sm border border-wire bg-ink p-6 text-center">
			<h3 class="font-display mb-2 text-2xl font-black text-paper italic">Volver a jugar</h3>
			<p class="mb-1 text-sm text-paper-dim">Esperando a que todos se unan...</p>
			<p class="mb-4 text-xs text-paper-dim/70">Segundos restantes: {rematchSecondsLeft}</p>
			<p class="mb-6 text-sm text-paper">Listos: {rematchCount} / {room.players.length}</p>
			<div class="flex gap-3">
				<button
					onclick={() => gameStore.leaveRoom()}
					class="flex-1 border border-wire py-2.5 text-xs tracking-widest text-paper-dim uppercase hover:text-paper"
				>
					Salir
				</button>
				<button
					onclick={requestRematch}
					disabled={you?.wantsRematch}
					class="flex-1 bg-amber py-2.5 text-xs font-bold tracking-widest text-ink uppercase hover:bg-amber-dim disabled:cursor-not-allowed disabled:opacity-40"
				>
					Unirse
				</button>
			</div>
		</div>
	</div>
{/if}
