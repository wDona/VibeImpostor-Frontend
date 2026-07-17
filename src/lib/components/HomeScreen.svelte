<script lang="ts">
	import { onMount } from 'svelte';
	import { gameStore } from '$lib/ws.svelte';

	let mode = $state<'create' | 'join'>('create');
	let playerName = $state('');
	let roomCode = $state('');

	onMount(() => {
		playerName = localStorage.getItem('impostor_last_name') ?? '';
		roomCode = localStorage.getItem('impostor_last_code') ?? '';
	});

	function submit(e: Event) {
		e.preventDefault();
		const name = playerName.trim();
		if (!name) return;
		localStorage.setItem('impostor_last_name', name);
		if (mode === 'create') {
			gameStore.send({ type: 'CreateRoom', playerName: name });
		} else {
			const code = roomCode.trim().toUpperCase();
			if (!code) return;
			localStorage.setItem('impostor_last_code', code);
			gameStore.send({ type: 'JoinRoom', roomCode: code, playerName: name });
		}
	}

	async function pasteCode() {
		try {
			const text = await navigator.clipboard.readText();
			roomCode = text
				.toUpperCase()
				.replace(/[^A-Z0-9]/g, '')
				.slice(0, 6);
		} catch {
			/* portapapeles no disponible o permiso denegado */
		}
	}
</script>

<div class="flex min-h-screen flex-col items-center justify-center px-6 py-16">
	<div class="relative w-full max-w-md">
		<div
			class="absolute -inset-x-4 -top-10 h-24 rotate-1 border-y border-wire/60 bg-ink-raised/40"
			aria-hidden="true"
		></div>

		<header class="relative mb-10 text-center">
			<p class="mb-2 text-xs tracking-[0.4em] text-amber-dim uppercase">Expediente confidencial</p>
			<h1 class="font-display text-7xl font-black tracking-tight text-paper italic">
				Impostor
			</h1>
			<p class="mt-3 text-sm text-paper-dim">Uno de vosotros no sabe la palabra. Encontradlo.</p>
		</header>

		<div class="rounded-sm border border-wire bg-ink-raised/80 p-1 shadow-[0_0_0_1px_rgba(0,0,0,0.4),0_20px_50px_-20px_rgba(0,0,0,0.8)]">
			<div class="flex text-xs tracking-widest uppercase">
				<button
					class={`flex-1 py-3 transition-colors ${mode === 'create' ? 'bg-amber text-ink font-bold' : 'text-paper-dim hover:text-paper'}`}
					onclick={() => (mode = 'create')}
				>
					Crear sala
				</button>
				<button
					class={`flex-1 py-3 transition-colors ${mode === 'join' ? 'bg-blood text-paper font-bold' : 'text-paper-dim hover:text-paper'}`}
					onclick={() => (mode = 'join')}
				>
					Unirse
				</button>
			</div>

			<form class="space-y-4 p-6" onsubmit={submit}>
				<label class="block">
					<span class="mb-1.5 block text-[0.65rem] tracking-widest text-paper-dim uppercase">Tu nombre</span>
					<input
						bind:value={playerName}
						maxlength="20"
						placeholder="Agente..."
						class="w-full border-b-2 border-wire bg-transparent px-1 py-2 text-lg text-paper outline-none placeholder:text-paper-dim/40 focus:border-amber"
					/>
				</label>

				{#if mode === 'join'}
					<label class="block">
						<span class="mb-1.5 block text-[0.65rem] tracking-widest text-paper-dim uppercase">Código de sala</span>
						<div class="flex items-center gap-2">
							<input
								bind:value={roomCode}
								maxlength="6"
								placeholder="XXXXXX"
								class="w-full border-b-2 border-wire bg-transparent px-1 py-2 font-display text-2xl tracking-[0.3em] text-blood-bright uppercase outline-none placeholder:text-paper-dim/30 focus:border-blood"
							/>
							<button
								type="button"
								onclick={pasteCode}
								class="shrink-0 border border-wire px-2.5 py-1.5 text-[0.6rem] tracking-widest text-paper-dim uppercase hover:border-blood-bright hover:text-blood-bright"
							>
								Pegar
							</button>
						</div>
					</label>
				{/if}
				<button
					type="submit"
					class={`w-full py-3 text-sm font-bold tracking-widest uppercase transition-transform active:scale-[0.98] ${
						mode === 'create' ? 'bg-amber text-ink hover:bg-amber-dim' : 'bg-blood text-paper hover:bg-blood-bright'
					}`}
				>
					{mode === 'create' ? 'Abrir expediente' : 'Entrar a la sala'}
				</button>
			</form>
		</div>

		<p class="mt-8 text-center text-[0.65rem] tracking-widest text-paper-dim/50 uppercase">
			{gameStore.connected ? 'Conexión establecida' : 'Conectando...'}
		</p>
		<p class="mt-3 text-center">
			<a href="/account" class="text-[0.65rem] tracking-widest text-paper-dim/60 uppercase hover:text-amber">
				Cuenta y paquetes
			</a>
		</p>
	</div>
</div>
