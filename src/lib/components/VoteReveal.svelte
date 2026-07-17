<script lang="ts">
	import type { PublicPlayer } from '$lib/protocol';
	import { NOBODY_VOTE_ID } from '$lib/protocol';
	import PlayerAvatar from './PlayerAvatar.svelte';

	let {
		players,
		votes,
		voteTypes,
		anonymousVotes
	}: {
		players: PublicPlayer[];
		votes: Record<string, string>;
		voteTypes: Record<string, boolean>;
		anonymousVotes: boolean;
	} = $props();

	function playerName(id: string) {
		if (id === NOBODY_VOTE_ID) return 'Nadie';
		return players.find((p) => p.id === id)?.name ?? '?';
	}

	function player(id: string) {
		return players.find((p) => p.id === id);
	}

	const groups = $derived.by(() => {
		const byTarget = new Map<string, string[]>();
		for (const [voterId, targetId] of Object.entries(votes)) {
			const list = byTarget.get(targetId) ?? [];
			list.push(voterId);
			byTarget.set(targetId, list);
		}
		return [...byTarget.entries()].sort((a, b) => b[1].length - a[1].length);
	});

	const hasVoteTypes = $derived(Object.keys(voteTypes).length > 0);
</script>

{#if groups.length}
	<div class="w-full space-y-2 text-left">
		{#each groups as [targetId, voterIds] (targetId)}
			<div class="border border-wire bg-ink-raised/50 px-4 py-2.5">
				<p class="text-sm text-paper">
					<span class="font-medium">{playerName(targetId)}</span>
					<span class="text-paper-dim"> — {voterIds.length} voto{voterIds.length === 1 ? '' : 's'}</span>
				</p>
				{#if !anonymousVotes}
					<div class="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
						{#each voterIds as voterId (voterId)}
							{@const voter = player(voterId)}
							{#if voter}
								<span class="flex items-center gap-1 text-xs text-paper-dim">
									<PlayerAvatar name={voter.name} colorIndex={voter.colorIndex} size="sm" />
									{voter.name}
									{#if hasVoteTypes}
										<span title={voteTypes[voterId] ? 'Voto duro' : 'Sospechoso'}>
											{voteTypes[voterId] ? '🔴' : '🟡'}
										</span>
									{/if}
								</span>
							{/if}
						{/each}
					</div>
				{/if}
			</div>
		{/each}
	</div>
{/if}
