<script lang="ts">
	import { onMount } from 'svelte';
	import { gameStore } from '$lib/ws.svelte';
	import * as api from '$lib/api';

	const room = $derived(gameStore.room!);
	const isHost = $derived(room.hostId === gameStore.yourPlayerId);
	const canStart = $derived(room.players.filter((p) => !p.isSpectator).length >= 3);

	function updateConfig(patch: Partial<typeof room.config>) {
		gameStore.send({ type: 'UpdateConfig', config: { ...room.config, ...patch } });
	}

	function startGame() {
		gameStore.send({ type: 'StartGame' });
	}

	function leave() {
		gameStore.send({ type: 'LeaveRoom' });
	}

	function kick(targetPlayerId: string) {
		gameStore.send({ type: 'KickPlayer', targetPlayerId });
	}

	async function copyCode() {
		try {
			await navigator.clipboard.writeText(room.code);
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

	function toggleCategory(id: number) {
		const selected = room.config.selectedCategoryIds;
		const next = selected.includes(id) ? selected.filter((c) => c !== id) : [...selected, id];
		updateConfig({ selectedCategoryIds: next });
	}
</script>

<div class="mx-auto min-h-screen max-w-2xl px-6 py-12">
	<header class="mb-8 flex items-start justify-between gap-4">
		<div>
			<p class="text-xs tracking-[0.3em] text-amber-dim uppercase">Sala de espera</p>
			<button
				onclick={copyCode}
				class="font-display text-5xl font-black tracking-[0.15em] text-paper italic transition-opacity hover:opacity-70"
				title="Copiar código"
			>
				{room.code}
			</button>
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
				<li
					class="flex items-center justify-between border-l-2 border-wire bg-ink-raised/60 px-4 py-2.5"
					style={`border-left-color: hsl(${(p.colorIndex * 47) % 360} 60% 45%)`}
				>
					<span class="flex items-center gap-2">
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
		<section class="mb-8 space-y-4 border border-wire bg-ink-raised/50 p-5">
			<h2 class="text-xs tracking-[0.3em] text-amber uppercase">Configuración</h2>

			<label class="flex items-center justify-between gap-4">
				<span class="text-sm text-paper-dim">Impostores</span>
				<input
					type="number"
					min="1"
					max="3"
					value={room.config.numImpostors}
					onchange={(e) => updateConfig({ numImpostors: Number(e.currentTarget.value) })}
					class="w-16 border-b-2 border-wire bg-transparent px-1 py-1 text-right text-paper outline-none focus:border-amber"
				/>
			</label>

			<label class="flex items-center justify-between gap-4">
				<span class="text-sm text-paper-dim">Tiempo de voto (s)</span>
				<input
					type="number"
					min="15"
					max="180"
					step="15"
					value={room.config.voteTimeLimitSeconds}
					onchange={(e) => updateConfig({ voteTimeLimitSeconds: Number(e.currentTarget.value) })}
					class="w-16 border-b-2 border-wire bg-transparent px-1 py-1 text-right text-paper outline-none focus:border-amber"
				/>
			</label>

			<label class="flex items-center justify-between gap-4">
				<span class="text-sm text-paper-dim">Rol oculto del impostor</span>
				<input
					type="checkbox"
					checked={room.config.hiddenImpostor}
					onchange={(e) => updateConfig({ hiddenImpostor: e.currentTarget.checked })}
					class="h-5 w-5 accent-amber"
				/>
			</label>

			<label class="flex items-center justify-between gap-4">
				<span class="text-sm text-paper-dim">Pistas progresivas</span>
				<input
					type="checkbox"
					checked={room.config.progressiveHints}
					onchange={(e) => updateConfig({ progressiveHints: e.currentTarget.checked })}
					class="h-5 w-5 accent-amber"
				/>
			</label>

			{#if categories.length}
				<div>
					<span class="mb-2 block text-sm text-paper-dim">Categorías (vacío = todas)</span>
					<div class="flex flex-wrap gap-2">
						{#each categories as cat (cat.id)}
							<button
								type="button"
								onclick={() => toggleCategory(cat.id)}
								class={`border px-3 py-1 text-xs uppercase ${
									room.config.selectedCategoryIds.includes(cat.id)
										? 'border-amber bg-amber text-ink font-bold'
										: 'border-wire text-paper-dim hover:border-amber-dim'
								}`}
							>
								{cat.name}
							</button>
						{/each}
					</div>
				</div>
			{/if}
		</section>

		<button
			onclick={startGame}
			disabled={!canStart}
			class="w-full bg-blood py-4 text-sm font-bold tracking-[0.2em] text-paper uppercase transition-transform enabled:hover:bg-blood-bright disabled:cursor-not-allowed disabled:opacity-30"
		>
			{canStart ? 'Comenzar partida' : 'Se necesitan 3 jugadores'}
		</button>
	{:else}
		<p class="text-center text-sm text-paper-dim italic">Esperando a que el host inicie la partida...</p>
	{/if}
</div>
