<script lang="ts">
	import * as api from '$lib/api';

	let loggedIn = $state(!!api.getToken());
	let mode = $state<'login' | 'register'>('login');
	let username = $state('');
	let password = $state('');
	let authError = $state<string | null>(null);

	let packs = $state<api.PackDto[]>([]);
	let packJson = $state('');
	let packError = $state<string | null>(null);
	let loadingPacks = $state(false);

	async function loadPacks() {
		loadingPacks = true;
		try {
			const res = await api.listMyPacks();
			packs = res.packs;
		} catch (e) {
			packError = e instanceof Error ? e.message : 'Error al cargar paquetes';
		} finally {
			loadingPacks = false;
		}
	}

	$effect(() => {
		if (loggedIn) loadPacks();
	});

	async function submitAuth(e: Event) {
		e.preventDefault();
		authError = null;
		try {
			const res = mode === 'login' ? await api.login(username, password) : await api.register(username, password);
			api.setToken(res.token);
			loggedIn = true;
			username = '';
			password = '';
		} catch (e) {
			authError = e instanceof Error ? e.message : 'Error de autenticación';
		}
	}

	function logout() {
		api.setToken(null);
		loggedIn = false;
		packs = [];
	}

	async function doImport(e: Event) {
		e.preventDefault();
		packError = null;
		try {
			await api.importPack(packJson);
			packJson = '';
			await loadPacks();
		} catch (e) {
			packError = e instanceof Error ? e.message : 'Formato de paquete inválido';
		}
	}

	async function doDelete(id: number) {
		try {
			await api.deletePack(id);
			await loadPacks();
		} catch (e) {
			packError = e instanceof Error ? e.message : 'No se pudo borrar';
		}
	}
</script>

<div class="mx-auto min-h-screen max-w-md px-6 py-16">
	<a href="/" class="mb-8 inline-block text-xs tracking-widest text-paper-dim uppercase hover:text-paper">
		&larr; Volver
	</a>

	<h1 class="font-display mb-8 text-4xl font-black text-paper italic">Cuenta</h1>

	{#if !loggedIn}
		<div class="border border-wire bg-ink-raised/60 p-6">
			<div class="mb-5 flex text-xs tracking-widest uppercase">
				<button
					class={`flex-1 py-2 ${mode === 'login' ? 'border-b-2 border-amber text-amber' : 'text-paper-dim'}`}
					onclick={() => (mode = 'login')}
				>
					Entrar
				</button>
				<button
					class={`flex-1 py-2 ${mode === 'register' ? 'border-b-2 border-amber text-amber' : 'text-paper-dim'}`}
					onclick={() => (mode = 'register')}
				>
					Registrarse
				</button>
			</div>

			<form class="space-y-4" onsubmit={submitAuth}>
				<input
					bind:value={username}
					placeholder="Usuario"
					class="w-full border-b-2 border-wire bg-transparent px-1 py-2 text-paper outline-none placeholder:text-paper-dim/40 focus:border-amber"
				/>
				<input
					bind:value={password}
					type="password"
					placeholder="Contraseña"
					class="w-full border-b-2 border-wire bg-transparent px-1 py-2 text-paper outline-none placeholder:text-paper-dim/40 focus:border-amber"
				/>
				{#if authError}
					<p class="text-sm text-blood-bright">{authError}</p>
				{/if}
				<button type="submit" class="w-full bg-amber py-3 text-sm font-bold tracking-widest text-ink uppercase hover:bg-amber-dim">
					{mode === 'login' ? 'Entrar' : 'Crear cuenta'}
				</button>
			</form>
		</div>
	{:else}
		<div class="mb-6 flex items-center justify-between">
			<p class="text-sm text-paper-dim">Sesión iniciada</p>
			<button onclick={logout} class="text-xs tracking-widest text-paper-dim uppercase hover:text-blood-bright">
				Cerrar sesión
			</button>
		</div>

		<section class="mb-6 border border-wire bg-ink-raised/60 p-5">
			<h2 class="mb-3 text-xs tracking-[0.3em] text-amber uppercase">Importar paquete</h2>
			<form class="space-y-3" onsubmit={doImport}>
				<textarea
					bind:value={packJson}
					rows="4"
					placeholder={'{"name": "...", "language": "es", "words": [...]}'}
					class="w-full resize-none border border-wire bg-transparent px-3 py-2 text-sm text-paper outline-none placeholder:text-paper-dim/40 focus:border-amber"
				></textarea>
				<button type="submit" class="w-full bg-amber py-2.5 text-xs font-bold tracking-widest text-ink uppercase hover:bg-amber-dim">
					Importar
				</button>
			</form>
			{#if packError}
				<p class="mt-2 text-sm text-blood-bright">{packError}</p>
			{/if}
		</section>

		<section>
			<h2 class="mb-3 text-xs tracking-[0.3em] text-paper-dim uppercase">Mis paquetes</h2>
			{#if loadingPacks}
				<p class="text-sm text-paper-dim italic">Cargando...</p>
			{:else if packs.length === 0}
				<p class="text-sm text-paper-dim italic">Sin paquetes propios todavía.</p>
			{:else}
				<ul class="space-y-1.5">
					{#each packs as pack (pack.id)}
						<li class="flex items-center justify-between border-l-2 border-wire bg-ink-raised/60 px-4 py-2.5">
							<span class="text-paper">{pack.name} <span class="text-xs text-paper-dim">({pack.language})</span></span>
							<button onclick={() => doDelete(pack.id)} class="text-[0.6rem] tracking-widest text-paper-dim uppercase hover:text-blood-bright">
								borrar
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	{/if}
</div>
