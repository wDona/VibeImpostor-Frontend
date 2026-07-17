<script lang="ts">
	import { onMount } from 'svelte';
	import { gameStore } from '$lib/ws.svelte';
	import * as api from '$lib/api';
	import { MIN_PLAYERS, type RoomConfig } from '$lib/protocol';
	import PlayerAvatar from './PlayerAvatar.svelte';

	const room = $derived(gameStore.room!);
	const config = $derived(room.config);
	const isHost = $derived(room.hostId === gameStore.yourPlayerId);
	const activeCount = $derived(room.players.filter((p) => !p.isSpectator).length);
	const canStart = $derived(activeCount >= MIN_PLAYERS);
	const neededMore = $derived(Math.max(0, MIN_PLAYERS - activeCount));
	const maxImpostors = $derived(room.players.length);
	const impostorLocked = $derived(config.winOnFirstEjection || config.singleWordRound || config.hiddenImpostor);
	const progressiveHintsExcluded = $derived(
		config.randomVariant && (config.winOnFirstEjection || config.singleWordRound)
	);

	let codeHidden = $state(false);
	let showCategoryDialog = $state(false);
	let justCopied = $state(false);

	function updateConfig(patch: Partial<RoomConfig>) {
		gameStore.updateConfig({ ...config, ...patch });
	}

	function startGame() {
		gameStore.send({ type: 'StartGame' });
	}

	function leave() {
		gameStore.leaveRoom();
	}

	function kick(targetPlayerId: string) {
		gameStore.send({ type: 'KickPlayer', targetPlayerId });
	}

	async function copyCode() {
		try {
			await navigator.clipboard.writeText(room.code);
			justCopied = true;
			setTimeout(() => (justCopied = false), 1500);
		} catch {
			/* clipboard unavailable */
		}
	}

	let categories = $state<api.CategoryResponse[]>([]);
	onMount(async () => {
		try {
			const res = await api.listCategories();
			categories = res.categories;
		} catch {
			/* sin sesión o error de red — se usan categorías por defecto del server */
		}
	});

	const filteredCategories = $derived(categories.filter((c) => c.language === config.language));
	// selectedCategoryIds vacío significa "todos los temas por defecto" en el server.
	// Para poder quitar solo un par de ellos, la UI trata ese estado como "todo
	// marcado" y calcula el complemento al desmarcar, en vez de partir de cero.
	const allCategoryIds = $derived(filteredCategories.map((c) => c.id));
	const effectiveSelected = $derived(
		config.selectedCategoryIds.length === 0
			? allCategoryIds
			: config.selectedCategoryIds.filter((id) => allCategoryIds.includes(id))
	);
	const allCategoriesSelected = $derived(
		filteredCategories.length > 0 && filteredCategories.every((c) => effectiveSelected.includes(c.id))
	);

	function collapseIfAll(ids: number[]) {
		return ids.length === allCategoryIds.length && allCategoryIds.every((id) => ids.includes(id)) ? [] : ids;
	}

	function isCategoryChecked(id: number) {
		return effectiveSelected.includes(id);
	}

	function toggleCategory(id: number) {
		const next = effectiveSelected.includes(id)
			? effectiveSelected.filter((c) => c !== id)
			: [...effectiveSelected, id];
		updateConfig({ selectedCategoryIds: collapseIfAll(next) });
	}

	function toggleAllCategories() {
		const filteredIds = filteredCategories.map((c) => c.id);
		const next = allCategoriesSelected
			? effectiveSelected.filter((id) => !filteredIds.includes(id))
			: [...new Set([...effectiveSelected, ...filteredIds])];
		updateConfig({ selectedCategoryIds: collapseIfAll(next) });
	}

	function setNumImpostors(delta: number) {
		if (impostorLocked) return;
		const next = config.numImpostors + delta;
		if (next < Math.max(1, config.minImpostors) || next > maxImpostors) return;
		updateConfig({ numImpostors: next });
	}

	function setMinImpostors(delta: number) {
		if (impostorLocked) return;
		const next = config.minImpostors + delta;
		if (next < 0 || next > config.numImpostors) return;
		updateConfig({ minImpostors: next });
	}

	function setVoteTime(delta: number) {
		const next = config.voteTimeLimitSeconds + delta;
		if (next < 15 || next > 180) return;
		updateConfig({ voteTimeLimitSeconds: next });
	}

	type SpecialModeKey = 'normal' | 'noCategory' | 'progressiveHints' | 'hiddenImpostor' | 'random';

	const SPECIAL_MODES: { key: SpecialModeKey; icon: string; label: string; desc: string }[] = [
		{ key: 'normal', icon: '⚪', label: 'Normal', desc: 'Modo estándar sin variantes' },
		{ key: 'noCategory', icon: '🚫', label: 'Sin categoría', desc: 'El impostor no recibe categoría ni pistas' },
		{
			key: 'progressiveHints',
			icon: '💡',
			label: 'Pistas progresivas',
			desc: 'El impostor recibe una pista nueva cada ronda'
		},
		{
			key: 'hiddenImpostor',
			icon: '🫥',
			label: 'Impostor oculto',
			desc: 'El impostor no sabe que lo es: recibe una palabra parecida (una pista) y cree que es inocente'
		},
		{
			key: 'random',
			icon: '🎲',
			label: 'Aleatorio',
			desc: 'Se elige una variante al azar al empezar cada partida — excluye "Gana en primera expulsión" y "Una sola ronda", y siempre fuerza 1 impostor. Si activas alguna de esas dos, "Pistas progresivas" también queda excluido de la tirada.'
		}
	];

	const activeSpecialMode = $derived<SpecialModeKey>(
		config.randomVariant
			? 'random'
			: config.hiddenImpostor
				? 'hiddenImpostor'
				: config.progressiveHints
					? 'progressiveHints'
						: config.noCategory
							? 'noCategory'
							: 'normal'
	);
	const activeModeInfo = $derived(SPECIAL_MODES.find((m) => m.key === activeSpecialMode)!);

	function selectSpecialMode(key: SpecialModeKey) {
		updateConfig({
			randomVariant: key === 'random',
			noCategory: key === 'noCategory',
			progressiveHints: key === 'progressiveHints',
			hiddenImpostor: key === 'hiddenImpostor',
			numImpostors: key === 'hiddenImpostor' || key === 'random' ? 1 : config.numImpostors,
			minImpostors: key === 'hiddenImpostor' || key === 'random' ? 1 : config.minImpostors,
			winOnFirstEjection: key === 'progressiveHints' || key === 'random' ? false : config.winOnFirstEjection,
			singleWordRound: key === 'progressiveHints' || key === 'random' ? false : config.singleWordRound
		});
	}

	function toggleWinOnFirstEjection() {
		const next = !config.winOnFirstEjection;
		updateConfig(next ? { winOnFirstEjection: true, numImpostors: 1, minImpostors: 1 } : { winOnFirstEjection: false });
	}

	function toggleSingleWordRound() {
		const next = !config.singleWordRound;
		updateConfig(next ? { singleWordRound: true, numImpostors: 1, minImpostors: 1 } : { singleWordRound: false });
	}
</script>

<div class="mx-auto min-h-screen max-w-2xl px-6 py-12">
	{#if room.state !== 'LOBBY'}
		<div class="mb-6 border border-amber bg-amber/10 px-4 py-3 text-center text-sm text-amber">
			Partida en curso. Esperando a la siguiente...
		</div>
	{/if}
	<header class="mb-8 flex items-start justify-between gap-4">
		<div>
			<p class="text-xs tracking-[0.3em] text-amber-dim uppercase">Sala de espera</p>
			<div class="flex items-center gap-3">
				<span class="font-display text-5xl font-black tracking-[0.15em] text-paper italic">
					{codeHidden ? '••••••' : room.code}
				</span>
				<div class="flex flex-col gap-1">
					<button
						onclick={copyCode}
						title="Copiar código"
						class="border border-wire px-2 py-0.5 text-[0.6rem] tracking-widest text-paper-dim uppercase hover:border-amber hover:text-amber"
					>
						{justCopied ? 'copiado' : 'copiar'}
					</button>
					<button
						onclick={() => (codeHidden = !codeHidden)}
						title={codeHidden ? 'Mostrar código' : 'Ocultar código'}
						class="border border-wire px-2 py-0.5 text-[0.6rem] tracking-widest text-paper-dim uppercase hover:border-amber hover:text-amber"
					>
						{codeHidden ? 'mostrar' : 'ocultar'}
					</button>
				</div>
			</div>
		</div>
		<button
			onclick={leave}
			class="border border-wire px-3 py-1.5 text-xs tracking-widest text-paper-dim uppercase hover:border-blood-bright hover:text-blood-bright"
		>
			Salir
		</button>
	</header>

	<section class="mb-8">
		<h2 class="mb-3 text-xs tracking-[0.3em] text-paper-dim uppercase">
			Jugadores — {room.players.length}
		</h2>
		<ul class="space-y-1.5">
			{#each room.players as p (p.id)}
				<li class="flex items-center justify-between border-l-2 border-wire bg-ink-raised/60 px-4 py-2.5">
					<span class="flex items-center gap-2.5">
						<PlayerAvatar name={p.name} colorIndex={p.colorIndex} />
						<span class="font-medium text-paper">{p.name}</span>
						{#if p.isHost}
							<span class="text-[0.6rem] tracking-widest text-amber uppercase">host</span>
						{/if}
						{#if p.id === gameStore.yourPlayerId}
							<span class="text-[0.6rem] tracking-widest text-paper-dim uppercase">(tú)</span>
						{/if}
					</span>
					{#if isHost && p.id !== gameStore.yourPlayerId}
						<button
							onclick={() => kick(p.id)}
							class="text-[0.6rem] tracking-widest text-paper-dim uppercase hover:text-blood-bright"
						>
							expulsar
						</button>
					{/if}
				</li>
			{/each}
		</ul>
	</section>

	{#if isHost}
		<section class="mb-6 grid grid-cols-1 gap-6 border border-wire bg-ink-raised/50 p-5 sm:grid-cols-2">
			<div>
				<span class="mb-2 block text-xs tracking-[0.3em] text-amber uppercase">Modo de juego</span>
				<div class="flex gap-2">
					<button
						type="button"
						onclick={() => updateConfig({ gameMode: 'VOICE' })}
						class={`flex-1 border px-3 py-2 text-sm uppercase ${config.gameMode === 'VOICE' ? 'border-amber bg-amber text-ink font-bold' : 'border-wire text-paper-dim hover:border-amber-dim'}`}
					>
						Voz
					</button>
					<button
						type="button"
						onclick={() => updateConfig({ gameMode: 'TEXT' })}
						class={`flex-1 border px-3 py-2 text-sm uppercase ${config.gameMode === 'TEXT' ? 'border-amber bg-amber text-ink font-bold' : 'border-wire text-paper-dim hover:border-amber-dim'}`}
					>
						Texto
					</button>
				</div>
			</div>

			<div>
				<span class="mb-2 block text-xs tracking-[0.3em] text-amber uppercase">Idioma de las palabras</span>
				<div class="flex gap-2">
					<button
						type="button"
						onclick={() => updateConfig({ language: 'es' })}
						class={`flex-1 border px-3 py-2 text-sm uppercase ${config.language === 'es' ? 'border-amber bg-amber text-ink font-bold' : 'border-wire text-paper-dim hover:border-amber-dim'}`}
					>
						Español
					</button>
					<button
						type="button"
						onclick={() => updateConfig({ language: 'en' })}
						class={`flex-1 border px-3 py-2 text-sm uppercase ${config.language === 'en' ? 'border-amber bg-amber text-ink font-bold' : 'border-wire text-paper-dim hover:border-amber-dim'}`}
					>
						English
					</button>
				</div>
			</div>

			<div>
				<span class="mb-2 block text-xs tracking-[0.3em] text-amber uppercase">Num impostores</span>
				<div class="flex gap-6">
					<div>
						<span class="block text-center text-[0.65rem] text-paper-dim uppercase">Min</span>
						<div class="flex items-center gap-2">
							<button
								type="button"
								onclick={() => setMinImpostors(-1)}
								disabled={impostorLocked || config.minImpostors <= 0}
								class="h-9 w-9 border border-wire text-paper disabled:cursor-not-allowed disabled:opacity-30"
							>
								−
							</button>
							<span class="w-6 text-center font-display text-xl font-bold text-paper">{config.minImpostors}</span>
							<button
								type="button"
								onclick={() => setMinImpostors(1)}
								disabled={impostorLocked || config.minImpostors >= config.numImpostors}
								class="h-9 w-9 border border-wire text-paper disabled:cursor-not-allowed disabled:opacity-30"
							>
								+
							</button>
						</div>
					</div>
					<div>
						<span class="block text-center text-[0.65rem] text-paper-dim uppercase">Max</span>
						<div class="flex items-center gap-2">
							<button
								type="button"
								onclick={() => setNumImpostors(-1)}
								disabled={impostorLocked || config.numImpostors <= Math.max(1, config.minImpostors)}
								class="h-9 w-9 border border-wire text-paper disabled:cursor-not-allowed disabled:opacity-30"
							>
								−
							</button>
							<span class="w-6 text-center font-display text-xl font-bold text-paper">{config.numImpostors}</span>
							<button
								type="button"
								onclick={() => setNumImpostors(1)}
								disabled={impostorLocked || config.numImpostors >= maxImpostors}
								class="h-9 w-9 border border-wire text-paper disabled:cursor-not-allowed disabled:opacity-30"
							>
								+
							</button>
						</div>
					</div>
				</div>
				{#if config.minImpostors === 0 && config.numImpostors >= 2}
					<p class="mt-1.5 text-[0.65rem] text-paper-dim italic">Hay ~5% de probabilidad de que no haya impostores</p>
				{/if}
			</div>

			<div>
				<span class="mb-2 block text-xs tracking-[0.3em] text-amber uppercase">Tiempo de voto</span>
				<div class="flex items-center gap-3">
					<button
						type="button"
						onclick={() => setVoteTime(-15)}
						disabled={config.voteTimeLimitSeconds <= 15}
						class="h-9 w-9 border border-wire text-paper disabled:cursor-not-allowed disabled:opacity-30"
					>
						−
					</button>
					<span class="w-10 text-center font-display text-xl font-bold text-paper">{config.voteTimeLimitSeconds}s</span>
					<button
						type="button"
						onclick={() => setVoteTime(15)}
						disabled={config.voteTimeLimitSeconds >= 180}
						class="h-9 w-9 border border-wire text-paper disabled:cursor-not-allowed disabled:opacity-30"
					>
						+
					</button>
				</div>
			</div>
		</section>

		<section class="mb-6 border border-wire bg-ink-raised/50 p-5">
			<span class="mb-3 block text-xs tracking-[0.3em] text-amber uppercase">Variante de juego</span>
			<div class="grid grid-cols-3 gap-2">
				{#each SPECIAL_MODES as mode (mode.key)}
					{@const selected = activeSpecialMode === mode.key}
					{@const isDisabled = mode.key === 'progressiveHints' && progressiveHintsExcluded}
					<button
						type="button"
						onclick={() => !isDisabled && selectSpecialMode(mode.key)}
						disabled={isDisabled}
						title={isDisabled ? 'Excluido: incompatible con Gana en primera expulsión / Una sola ronda' : mode.label}
						class={`flex flex-col items-center gap-1 border px-2 py-2.5 text-center transition-colors ${
							isDisabled
								? 'cursor-not-allowed border-wire opacity-30'
								: selected
									? 'border-amber bg-amber/10'
									: 'border-wire hover:border-amber-dim'
						}`}
					>
						<span class="text-lg leading-none">{mode.icon}</span>
						<span class={`text-[0.65rem] leading-tight font-semibold ${selected ? 'text-amber' : 'text-paper-dim'}`}>
							{mode.label}
						</span>
					</button>
				{/each}
			</div>
			<p class="mt-3 text-xs text-paper-dim">
				<span class="font-semibold text-amber">{activeModeInfo.icon} {activeModeInfo.label}</span>
				— {activeModeInfo.desc}
			</p>
		</section>

		<section class="mb-6 border border-wire bg-ink-raised/50 p-5">
			<button
				type="button"
				onclick={() => (showCategoryDialog = true)}
				class="flex w-full items-center justify-between text-left"
			>
				<span class="text-xs tracking-[0.3em] text-amber uppercase">Temas de palabras</span>
				<span class="text-sm text-paper-dim">
					{config.selectedCategoryIds.length === 0 ? 'todos' : effectiveSelected.length} →
				</span>
			</button>
		</section>

		<section class="mb-6 space-y-1 border border-wire bg-ink-raised/50 p-5">
			{#if !config.progressiveHints}
				<label class="flex cursor-pointer items-center justify-between gap-4 py-2">
					<span class="text-sm text-paper-dim">
						Gana en primera expulsión
						<span class="block text-xs text-paper-dim/70">La partida termina en la primera expulsión (sea quien sea): si cae el impostor, pasa a adivinar la palabra; si cae un inocente, ganan los impostores directamente. Limita el número de impostores a 1 (mín y máx)</span>
					</span>
					<input
						type="checkbox"
						checked={config.winOnFirstEjection}
						onchange={toggleWinOnFirstEjection}
						class="h-5 w-5 accent-amber"
					/>
				</label>
			{/if}

			<label class="flex cursor-pointer items-center justify-between gap-4 py-2">
				<span class="text-sm text-paper-dim">Votos anónimos</span>
				<input
					type="checkbox"
					checked={config.anonymousVotes}
					onchange={(e) => updateConfig({ anonymousVotes: e.currentTarget.checked })}
					class="h-5 w-5 accent-amber"
				/>
			</label>

			{#if !config.progressiveHints}
				<label class="flex cursor-pointer items-center justify-between gap-4 py-2">
					<span class="text-sm text-paper-dim">
						Una sola ronda
						<span class="block text-xs text-paper-dim/70">Cada ronda es una palabra por jugador y se pasa a votar directo, sin la fase de "¿queréis votar?". Si no hay expulsión la partida sigue con otra ronda igual. Limita el número de impostores a 1 (mín y máx)</span>
					</span>
					<input
						type="checkbox"
						checked={config.singleWordRound}
						onchange={toggleSingleWordRound}
						class="h-5 w-5 shrink-0 accent-amber"
					/>
				</label>
			{/if}

			<label class="flex cursor-pointer items-center justify-between gap-4 py-2">
				<span class="text-sm text-paper-dim">
					Voto de sospechoso
					<span class="block text-xs text-paper-dim/70">
						Cada jugador se puede votar de dos modos: sospechoso o para echarlo. Si no hay empate, el más votado recibe un turno
						extra en vez de ser expulsado directamente
					</span>
				</span>
				<input
					type="checkbox"
					checked={config.punishmentVote}
					onchange={(e) => updateConfig({ punishmentVote: e.currentTarget.checked })}
					class="h-5 w-5 shrink-0 accent-amber"
				/>
			</label>
		</section>

		{#if room.state === 'LOBBY'}
			<button
				onclick={startGame}
				disabled={!canStart}
				class="w-full bg-blood py-4 text-sm font-bold tracking-[0.2em] text-paper uppercase transition-transform enabled:hover:bg-blood-bright disabled:cursor-not-allowed disabled:opacity-30"
			>
				{canStart ? 'Comenzar partida' : `Se necesitan ${neededMore} jugadores más`}
			</button>
		{/if}
	{:else}
		{@const activeMode = SPECIAL_MODES.find((m) => m.key === activeSpecialMode)!}
		<section class="mb-6 space-y-2 border border-wire bg-ink-raised/50 p-5 text-sm">
			<h2 class="mb-3 text-xs tracking-[0.3em] text-amber uppercase">Configuración de la sala</h2>
			<p class="text-paper-dim">Modo de juego: <span class="text-paper">{config.gameMode === 'VOICE' ? 'Voz' : 'Texto'}</span></p>
			<p class="text-paper-dim">Impostores: <span class="text-paper">{config.numImpostors === 1 ? '1' : `${config.minImpostors}-${config.numImpostors}`}</span></p>
			<p class="text-paper-dim">Tiempo de voto: <span class="text-paper">{config.voteTimeLimitSeconds}s</span></p>
			<p class="text-paper-dim">Idioma de las palabras: <span class="text-paper">{config.language === 'en' ? 'English' : 'Español'}</span></p>
			<p class="text-paper-dim">
				Temas de palabras: <span class="text-paper">{config.selectedCategoryIds.length === 0 ? 'todos' : effectiveSelected.length}</span>
			</p>
			<div>
				<p class="text-paper-dim">Variante de juego: <span class="text-paper">{activeMode.label}</span></p>
				{#if activeMode.key !== 'normal' && activeMode.key !== 'random'}
					<p class="mt-0.5 text-xs text-paper-dim/70">{activeMode.desc}</p>
				{/if}
			</div>
			<p class="text-paper-dim">
				Gana en primera expulsión: <span class="text-paper">{config.winOnFirstEjection ? 'Activado' : 'Desactivado'}</span>
			</p>
			<p class="text-paper-dim">Votos anónimos: <span class="text-paper">{config.anonymousVotes ? 'Activado' : 'Desactivado'}</span></p>
			<p class="text-paper-dim">Una sola ronda: <span class="text-paper">{config.singleWordRound ? 'Activado' : 'Desactivado'}</span></p>
			<p class="text-paper-dim">Voto de sospechoso: <span class="text-paper">{config.punishmentVote ? 'Activado' : 'Desactivado'}</span></p>
			<p class="pt-2 font-bold text-paper-dim">Solo el host puede cambiar los ajustes</p>
		</section>
		<p class="text-center text-sm text-paper-dim italic">Esperando a que el host inicie la partida...</p>
	{/if}

	{#if showCategoryDialog}
		<div
			role="presentation"
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
			onclick={() => (showCategoryDialog = false)}
			onkeydown={(e) => e.key === 'Escape' && (showCategoryDialog = false)}
		>
			<div
				role="dialog"
				aria-modal="true"
				aria-label="Temas de palabras"
				tabindex="-1"
				class="max-h-[80vh] w-full max-w-md overflow-y-auto border border-wire bg-ink p-6"
				onclick={(e) => e.stopPropagation()}
				onkeydown={(e) => e.stopPropagation()}
			>
				<div class="mb-4 flex items-center justify-between">
					<h3 class="font-display text-xl font-bold text-paper italic">Temas de palabras</h3>
					<button onclick={() => (showCategoryDialog = false)} class="text-paper-dim hover:text-paper">✕</button>
				</div>
				<p class="mb-3 text-xs text-paper-dim italic">Si no eliges ninguno, se usan todos los temas base</p>
				{#if filteredCategories.length}
					<button
						type="button"
						onclick={toggleAllCategories}
						class="mb-3 w-full border border-amber-dim py-2 text-xs text-amber uppercase hover:bg-amber/10"
					>
						{allCategoriesSelected ? 'Deseleccionar todo' : 'Seleccionar todos'}
					</button>
					<div class="space-y-1.5">
						{#each filteredCategories as cat (cat.id)}
							<label class="flex cursor-pointer items-center gap-2 border border-wire px-3 py-2">
								<input
									type="checkbox"
									checked={isCategoryChecked(cat.id)}
									onchange={() => toggleCategory(cat.id)}
									class="h-4 w-4 accent-amber"
								/>
								<span class="text-sm text-paper">{cat.name}</span>
							</label>
						{/each}
					</div>
				{:else}
					<p class="text-sm text-paper-dim italic">No hay temas disponibles en este idioma todavía.</p>
				{/if}
				<button
					onclick={() => (showCategoryDialog = false)}
					class="mt-4 w-full bg-amber py-2.5 text-xs font-bold text-ink uppercase hover:bg-amber-dim"
				>
					Listo
				</button>
			</div>
		</div>
	{/if}
</div>
