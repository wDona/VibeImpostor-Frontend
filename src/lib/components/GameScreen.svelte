<script lang="ts">
	import { gameStore } from '$lib/ws.svelte';

	const room = $derived(gameStore.room!);
	const isMyTurn = $derived(room.currentTurnPlayerId === gameStore.yourPlayerId);
	const isImpostor = $derived(gameStore.yourRole === 'IMPOSTOR');
	const currentPlayer = $derived(room.players.find((p) => p.id === room.currentTurnPlayerId));

	let wordInput = $state('');

	function submitWord(e: Event) {
		e.preventDefault();
		const text = wordInput.trim();
		if (!text) return;
		gameStore.send({ type: 'SubmitWord', text });
		wordInput = '';
	}

	function endTurn() {
		gameStore.send({ type: 'EndTurn' });
	}

	function proposeEnd() {
		gameStore.send({ type: 'AnswerEndGame', agrees: true });
	}

	function cancelProposal() {
		gameStore.send({ type: 'AnswerEndGame', agrees: false });
	}

	const iAgreed = $derived(
		gameStore.endGameProposal?.agreedPlayerIds.includes(gameStore.yourPlayerId ?? '') ?? false
	);
</script>

<div class="mx-auto min-h-screen max-w-2xl px-6 py-10">
	<header class="mb-6 flex items-center justify-between text-xs tracking-widest text-paper-dim uppercase">
		<span>Sala {room.code}</span>
		<span>Ronda {room.roundNumber}</span>
	</header>

	<section
		class={`mb-8 border p-6 text-center ${
			isImpostor ? 'border-blood bg-blood/10' : 'border-wire bg-ink-raised/60'
		}`}
	>
		<p
			class={`mb-2 text-[0.65rem] tracking-[0.35em] uppercase ${isImpostor ? 'text-blood-bright' : 'text-amber'}`}
		>
			{isImpostor ? 'Eres el impostor' : 'Eres inocente'}
		</p>
		<p class="font-display text-4xl font-black text-paper italic">{gameStore.content}</p>
		{#if !gameStore.contentIsWord}
			<p class="mt-1 text-xs text-paper-dim uppercase">categoría</p>
		{/if}
		{#if gameStore.hintList.length}
			<div class="mt-4 flex flex-wrap justify-center gap-2">
				{#each gameStore.hintList as hint}
					<span class="border border-amber-dim px-2 py-1 text-xs text-amber">{hint}</span>
				{/each}
			</div>
		{/if}
	</section>

	<section class="mb-8">
		<h2 class="mb-3 text-xs tracking-[0.3em] text-paper-dim uppercase">Orden de turno</h2>
		<div class="flex flex-wrap gap-2">
			{#each room.turnOrder as pid (pid)}
				{@const p = room.players.find((pl) => pl.id === pid)}
				{#if p}
					<span
						class={`border px-3 py-1.5 text-sm ${
							pid === room.currentTurnPlayerId
								? 'border-amber bg-amber text-ink font-bold'
								: 'border-wire text-paper-dim'
						} ${!p.connected ? 'opacity-40' : ''}`}
					>
						{p.name}
					</span>
				{/if}
			{/each}
		</div>
	</section>

	<section class="mb-8 border border-wire bg-ink-raised/50 p-6 text-center">
		{#if isMyTurn}
			{#if room.config.gameMode === 'TEXT'}
				<form class="flex gap-2" onsubmit={submitWord}>
					<input
						bind:value={wordInput}
						placeholder="Tu palabra..."
						class="flex-1 border-b-2 border-amber bg-transparent px-1 py-2 text-lg text-paper outline-none placeholder:text-paper-dim/40"
					/>
					<button type="submit" class="bg-amber px-5 py-2 text-sm font-bold text-ink uppercase hover:bg-amber-dim">
						Enviar
					</button>
				</form>
			{:else}
				<p class="mb-4 text-sm text-paper-dim">Es tu turno — di tu palabra en voz alta</p>
				<button
					onclick={endTurn}
					class="bg-amber px-8 py-3 text-sm font-bold tracking-widest text-ink uppercase hover:bg-amber-dim"
				>
					Terminar turno
				</button>
			{/if}
		{:else}
			<p class="text-sm text-paper-dim italic">
				Turno de <span class="text-paper not-italic">{currentPlayer?.name ?? '...'}</span>
			</p>
		{/if}
	</section>

	{#if gameStore.endGameProposal}
		<section class="mb-6 border border-blood bg-blood/10 p-4 text-center text-sm">
			<p class="mb-3 text-paper">
				{gameStore.endGameProposal.agreedPlayerIds.length} / {gameStore.endGameProposal.totalActive}
				quieren terminar la partida
			</p>
			{#if !iAgreed}
				<button onclick={proposeEnd} class="bg-blood px-4 py-2 text-xs font-bold text-paper uppercase hover:bg-blood-bright">
					Estoy de acuerdo
				</button>
			{:else}
				<button onclick={cancelProposal} class="border border-wire px-4 py-2 text-xs text-paper-dim uppercase hover:text-paper">
					Cancelar
				</button>
			{/if}
		</section>
	{:else}
		<div class="text-center">
			<button onclick={proposeEnd} class="text-xs tracking-widest text-paper-dim/60 uppercase hover:text-blood-bright">
				Proponer terminar partida
			</button>
		</div>
	{/if}
</div>
