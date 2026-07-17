<script lang="ts">
	import { gameStore } from '$lib/ws.svelte';
	import { BOTH_IMPOSTORS_ID, NOBODY_VOTE_ID } from '$lib/protocol';
	import Countdown from './Countdown.svelte';
	import PlayerAvatar from './PlayerAvatar.svelte';
	import LeaveGameButton from './LeaveGameButton.svelte';

	const room = $derived(gameStore.room!);
	const voting = $derived(gameStore.voting!);
	const you = $derived(room.players.find((p) => p.id === gameStore.yourPlayerId));
	const isSpectator = $derived(you?.isSpectator ?? false);
	const activePlayers = $derived(room.players.filter((p) => !p.isSpectator));
	const candidates = $derived(room.players.filter((p) => p.id !== gameStore.yourPlayerId && !p.isSpectator));

	let votedFor = $state<string | null>(null);
	const punishmentVote = $derived(room.config.punishmentVote);

	function castVote(targetPlayerId: string, voteIsHard = true) {
		votedFor = targetPlayerId;
		gameStore.send({ type: 'CastVote', targetPlayerId, voteIsHard });
	}
</script>

<LeaveGameButton />
<div class="mx-auto min-h-screen max-w-xl px-6 py-16 text-center">
	<p class="mb-2 text-xs tracking-[0.35em] text-blood-bright uppercase">Votación</p>
	<h1 class="font-display mb-4 text-4xl font-black text-paper italic">¿Quién es el impostor?</h1>

	{#if voting.deadlineEpochMs}
		<p class="mb-4 text-sm text-paper-dim">
			Tiempo restante: <Countdown deadlineEpochMs={voting.deadlineEpochMs} />
		</p>
	{/if}

	<p class="mb-6 text-xs tracking-widest text-paper-dim uppercase">
		Votos — {gameStore.votedPlayerIds.length}/{activePlayers.length}
	</p>
	<div class="mb-8 flex flex-wrap justify-center gap-1.5">
		{#each activePlayers as p (p.id)}
			<span class={gameStore.votedPlayerIds.includes(p.id) ? '' : 'opacity-30 grayscale'}>
				<PlayerAvatar name={p.name} colorIndex={p.colorIndex} size="sm" />
			</span>
		{/each}
	</div>

	{#if isSpectator}
		<p class="text-sm text-paper-dim italic">Eres espectador, no puedes votar.</p>
	{:else}
		<div class="space-y-2">
			{#each candidates as p (p.id)}
				{#if punishmentVote}
					<div class="flex border border-wire">
						<span class="flex flex-1 items-center gap-2.5 px-4 py-2 text-left text-lg text-paper">
							<PlayerAvatar name={p.name} colorIndex={p.colorIndex} />
							{p.name}
						</span>
						<button
							onclick={() => castVote(p.id, false)}
							disabled={votedFor !== null}
							class={`border-l border-wire px-3 py-2 text-xs uppercase transition-colors ${
								votedFor === p.id ? 'bg-amber text-ink font-bold' : 'text-amber hover:bg-amber/10'
							} disabled:cursor-not-allowed disabled:opacity-50`}
						>
							Sospechoso
						</button>
						<button
							onclick={() => castVote(p.id, true)}
							disabled={votedFor !== null}
							class={`border-l border-wire px-3 py-2 text-xs uppercase transition-colors ${
								votedFor === p.id ? 'bg-blood text-paper font-bold' : 'text-blood-bright hover:bg-blood/10'
							} disabled:cursor-not-allowed disabled:opacity-50`}
						>
							Seguro echar
						</button>
					</div>
				{:else}
					<button
						onclick={() => castVote(p.id)}
						disabled={votedFor !== null}
						class={`block w-full border px-5 py-3 text-left text-lg transition-colors ${
							votedFor === p.id
								? 'border-blood-bright bg-blood text-paper'
								: 'border-wire text-paper hover:border-blood-bright'
						} disabled:cursor-not-allowed disabled:opacity-50`}
					>
						<span class="inline-flex items-center gap-2.5">
							<PlayerAvatar name={p.name} colorIndex={p.colorIndex} />
							{p.name}
						</span>
					</button>
				{/if}
			{/each}

			{#if voting.candidateIds.includes(NOBODY_VOTE_ID)}
				<button
					onclick={() => castVote(NOBODY_VOTE_ID)}
					disabled={votedFor !== null}
					class={`block w-full border px-5 py-3 text-left text-lg text-paper-dim italic transition-colors ${
						votedFor === NOBODY_VOTE_ID ? 'border-amber bg-amber/20' : 'border-wire hover:border-amber'
					} disabled:cursor-not-allowed disabled:opacity-50`}
				>
					Nadie
				</button>
			{/if}

			{#if room.config.numImpostors > 1}
				<button
					onclick={() => castVote(BOTH_IMPOSTORS_ID)}
					disabled={votedFor !== null}
					class={`block w-full border px-5 py-3 text-left text-lg text-amber italic transition-colors ${
						votedFor === BOTH_IMPOSTORS_ID ? 'border-amber bg-amber/20' : 'border-wire hover:border-amber'
					} disabled:cursor-not-allowed disabled:opacity-50`}
				>
					Los dos son impostores
				</button>
			{/if}
		</div>

		{#if votedFor}
			<p class="mt-8 text-sm text-paper-dim italic">Esperando al resto...</p>
		{/if}
	{/if}
</div>
