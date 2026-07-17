<script lang="ts">
	import { gameStore } from '$lib/ws.svelte';
	import LeaveGameButton from './LeaveGameButton.svelte';
	import PlayerAvatar from './PlayerAvatar.svelte';

	const room = $derived(gameStore.room!);
	const you = $derived(room.players.find((p) => p.id === gameStore.yourPlayerId));
	const isHost = $derived(room.hostId === gameStore.yourPlayerId);
	const isMyTurn = $derived(room.currentTurnPlayerId === gameStore.yourPlayerId);
	const isImpostor = $derived(gameStore.yourRole === 'IMPOSTOR');
	const currentPlayer = $derived(room.players.find((p) => p.id === room.currentTurnPlayerId));
	const hiddenRole = $derived(room.config.hiddenRole);
	const eliminated = $derived(room.players.filter((p) => p.isSpectator));

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

	// cronómetro
	let now = $state(Date.now());
	$effect(() => {
		const id = setInterval(() => (now = Date.now()), 1000);
		return () => clearInterval(id);
	});
	const elapsed = $derived(gameStore.gameStartedAtMs ? Math.max(0, Math.floor((now - gameStore.gameStartedAtMs) / 1000)) : 0);
	const elapsedLabel = $derived(
		`${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`
	);

	// expulsar (host, durante partida) — reusa KickPlayer, igual que en el lobby
	let kickStep = $state<'closed' | 'select' | 'confirm'>('closed');
	let kickTargetId = $state<string | null>(null);
	const kickTarget = $derived(room.players.find((p) => p.id === kickTargetId));

	function openKickSelect() {
		kickStep = 'select';
	}
	function selectKickTarget(id: string) {
		kickTargetId = id;
		kickStep = 'confirm';
	}
	function confirmKick() {
		if (kickTargetId) gameStore.send({ type: 'KickPlayer', targetPlayerId: kickTargetId });
		kickStep = 'closed';
		kickTargetId = null;
	}
	function closeKick() {
		kickStep = 'closed';
		kickTargetId = null;
	}

	// historial de eliminados: votos de esa expulsión
	let votesDialogFor = $state<string | null>(null);
	const votesDialogPlayer = $derived(room.players.find((p) => p.id === votesDialogFor));
	const votesDialogData = $derived(votesDialogFor ? (gameStore.eliminationVotes[votesDialogFor] ?? {}) : {});
	const votesDialogCount = $derived(Object.values(votesDialogData).filter((t) => t === votesDialogFor).length);
</script>

<LeaveGameButton />
<div class="mx-auto min-h-screen max-w-2xl px-6 py-10">
	<header class="mb-2 flex items-center justify-between text-xs tracking-widest text-paper-dim uppercase">
		<span>Sala {room.code}</span>
		<span class="flex items-center gap-3">
			{#if gameStore.gameStartedAtMs}
				<span class="font-mono text-paper">{elapsedLabel}</span>
			{/if}
			<span>Ronda {room.roundNumber}</span>
		</span>
	</header>

	{#if you?.isSpectator}
		<p class="mb-4 text-center text-sm font-bold text-blood-bright">
			Eres espectador. Observa hasta que termine la partida.
		</p>
	{/if}

	<section
		class={`mb-8 border p-6 text-center ${
			hiddenRole ? 'border-wire bg-ink-raised' : isImpostor ? 'border-blood bg-blood/10' : 'border-wire bg-ink-raised/60'
		}`}
	>
		{#if !hiddenRole}
			<p
				class={`mb-2 text-[0.65rem] tracking-[0.35em] uppercase ${isImpostor ? 'text-blood-bright' : 'text-amber'}`}
			>
				{isImpostor ? 'Eres el impostor' : 'Eres inocente'}
			</p>
		{/if}
		<p class="font-display text-4xl font-black text-paper italic">{gameStore.content}</p>
		{#if !hiddenRole && !gameStore.contentIsWord}
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
						class={`flex items-center gap-1.5 border px-2.5 py-1.5 text-sm ${
							pid === room.currentTurnPlayerId
								? 'border-amber bg-amber text-ink font-bold'
								: 'border-wire text-paper-dim'
						} ${!p.connected ? 'opacity-40' : ''}`}
					>
						<PlayerAvatar name={p.name} colorIndex={p.colorIndex} size="sm" />
						{p.name}
					</span>
				{/if}
			{/each}
		</div>
	</section>

	{#if eliminated.length}
		<section class="mb-8">
			<h2 class="mb-3 text-xs tracking-[0.3em] text-paper-dim uppercase">Eliminados</h2>
			<div class="flex flex-wrap gap-2">
				{#each eliminated as p (p.id)}
					{@const clickable = p.id in gameStore.eliminationVotes}
					<button
						type="button"
						disabled={!clickable}
						onclick={() => (votesDialogFor = p.id)}
						class={`flex items-center gap-1.5 border border-wire px-2.5 py-1.5 text-sm text-paper-dim opacity-70 ${
							clickable ? 'cursor-pointer hover:border-amber hover:text-amber hover:opacity-100' : 'cursor-default'
						}`}
					>
						<PlayerAvatar name={p.name} colorIndex={p.colorIndex} size="sm" />
						{p.name}
					</button>
				{/each}
			</div>
		</section>
	{/if}

	<section class="mb-8 border border-wire bg-ink-raised/50 p-6 text-center">
		{#if you?.isSpectator}
			<p class="text-sm text-paper-dim italic">Observando la partida...</p>
		{:else if isMyTurn}
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

	{#if isHost}
		<div class="mb-6 text-center">
			<button onclick={openKickSelect} class="text-xs tracking-widest text-paper-dim/60 uppercase hover:text-blood-bright">
				Expulsar jugador
			</button>
		</div>
	{/if}

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

{#if kickStep !== 'closed'}
	<div
		role="presentation"
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
		onclick={closeKick}
		onkeydown={(e) => e.key === 'Escape' && closeKick()}
	>
		<div
			role="dialog"
			aria-modal="true"
			aria-label="Expulsar jugador"
			tabindex="-1"
			class="w-full max-w-sm border border-wire bg-ink p-6"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			{#if kickStep === 'select'}
				<h3 class="font-display mb-4 text-xl font-bold text-paper italic">Selecciona el jugador a expulsar</h3>
				<div class="space-y-1.5">
					{#each room.players.filter((p) => p.id !== gameStore.yourPlayerId) as p (p.id)}
						<button
							onclick={() => selectKickTarget(p.id)}
							class="flex w-full items-center gap-2.5 border border-wire px-3 py-2 text-left text-paper hover:border-blood-bright"
						>
							<PlayerAvatar name={p.name} colorIndex={p.colorIndex} size="sm" />
							{p.name}
						</button>
					{/each}
				</div>
				<button onclick={closeKick} class="mt-4 w-full border border-wire py-2 text-xs text-paper-dim uppercase hover:text-paper">
					Cancelar
				</button>
			{:else if kickTarget}
				<h3 class="font-display mb-2 text-xl font-bold text-paper italic">¿Expulsar a {kickTarget.name}?</h3>
				<p class="mb-6 text-sm text-paper-dim">El jugador será expulsado de la sala.</p>
				<div class="flex gap-3">
					<button onclick={closeKick} class="flex-1 border border-wire py-2.5 text-xs tracking-widest text-paper-dim uppercase hover:text-paper">
						Cancelar
					</button>
					<button onclick={confirmKick} class="flex-1 bg-blood py-2.5 text-xs font-bold tracking-widest text-paper uppercase hover:bg-blood-bright">
						Expulsar
					</button>
				</div>
			{/if}
		</div>
	</div>
{/if}

{#if votesDialogFor && votesDialogPlayer}
	<div
		role="presentation"
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
		onclick={() => (votesDialogFor = null)}
		onkeydown={(e) => e.key === 'Escape' && (votesDialogFor = null)}
	>
		<div
			role="dialog"
			aria-modal="true"
			aria-label="Votos recibidos"
			tabindex="-1"
			class="w-full max-w-sm border border-wire bg-ink p-6"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			<div class="mb-3 flex items-center gap-2.5">
				<PlayerAvatar name={votesDialogPlayer.name} colorIndex={votesDialogPlayer.colorIndex} />
				<h3 class="font-display text-xl font-bold text-paper italic">{votesDialogPlayer.name}</h3>
			</div>
			<p class="mb-3 text-sm text-paper-dim">Recibió {votesDialogCount} voto{votesDialogCount === 1 ? '' : 's'}</p>
			{#if !room.config.anonymousVotes}
				<div class="space-y-1">
					{#each Object.entries(votesDialogData) as [voterId, targetId] (voterId)}
						{#if targetId === votesDialogFor}
							{@const voter = room.players.find((p) => p.id === voterId)}
							{#if voter}
								<p class="flex items-center gap-2 text-sm text-paper-dim">
									<PlayerAvatar name={voter.name} colorIndex={voter.colorIndex} size="sm" />
									{voter.name}
								</p>
							{/if}
						{/if}
					{/each}
				</div>
			{/if}
			<button
				onclick={() => (votesDialogFor = null)}
				class="mt-4 w-full border border-wire py-2 text-xs text-paper-dim uppercase hover:text-paper"
			>
				Cerrar
			</button>
		</div>
	</div>
{/if}
