<script lang="ts">
	import { gameStore } from '$lib/ws.svelte';
	import { BOTH_IMPOSTORS_ID, NOBODY_VOTE_ID } from '$lib/protocol';
	import Countdown from './Countdown.svelte';
	import PlayerAvatar from './PlayerAvatar.svelte';

	const room = $derived(gameStore.room!);
	const voting = $derived(gameStore.voting!);

	let votedFor = $state<string | null>(null);
	const punishmentVote = $derived(room.config.punishmentVote);

	function castVote(targetPlayerId: string, voteIsHard = true) {
		votedFor = targetPlayerId;
		gameStore.send({ type: 'CastVote', targetPlayerId, voteIsHard });
	}
</script>

<div class="mx-auto min-h-screen max-w-xl px-6 py-16 text-center">
	<p class="mb-2 text-xs tracking-[0.35em] text-blood-bright uppercase">Votación</p>
	<h1 class="font-display mb-4 text-4xl font-black text-paper italic">¿Quién es el impostor?</h1>

	{#if voting.deadlineEpochMs}
		<p class="mb-8 text-sm text-paper-dim">
			Tiempo restante: <Countdown deadlineEpochMs={voting.deadlineEpochMs} />
		</p>
	{/if}

	<div class="space-y-2">
		{#each voting.candidateIds.filter((id) => id !== NOBODY_VOTE_ID) as pid (pid)}
			{@const p = room.players.find((pl) => pl.id === pid)}
			{#if p}
				{#if punishmentVote}
					<div class="flex border border-wire">
						<span class="flex flex-1 items-center gap-2.5 px-4 py-2 text-left text-lg text-paper">
							<PlayerAvatar name={p.name} colorIndex={p.colorIndex} />
							{p.name}
						</span>
						<button
							onclick={() => castVote(pid, false)}
							disabled={votedFor !== null}
							class={`border-l border-wire px-3 py-2 text-xs uppercase transition-colors ${
								votedFor === pid ? 'bg-amber text-ink font-bold' : 'text-amber hover:bg-amber/10'
							} disabled:cursor-not-allowed disabled:opacity-50`}
						>
							Sospechoso
						</button>
						<button
							onclick={() => castVote(pid, true)}
							disabled={votedFor !== null}
							class={`border-l border-wire px-3 py-2 text-xs uppercase transition-colors ${
								votedFor === pid ? 'bg-blood text-paper font-bold' : 'text-blood-bright hover:bg-blood/10'
							} disabled:cursor-not-allowed disabled:opacity-50`}
						>
							Seguro echar
						</button>
					</div>
				{:else}
					<button
						onclick={() => castVote(pid)}
						disabled={votedFor !== null}
						class={`block w-full border px-5 py-3 text-left text-lg transition-colors ${
							votedFor === pid
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
</div>
