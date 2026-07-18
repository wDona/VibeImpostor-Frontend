<script lang="ts">
	import * as api from '$lib/api';
	import { isSoundEnabled, setSoundEnabled } from '$lib/sound';

	let soundOn = $state(isSoundEnabled());
	function toggleSound() {
		soundOn = !soundOn;
		setSoundEnabled(soundOn);
	}

	let loggedIn = $state(!!api.getToken());
	let mode = $state<'login' | 'register'>('login');
	let username = $state('');
	let password = $state('');
	let authError = $state<string | null>(null);

	let packs = $state<api.PackDto[]>([]);
	let packJson = $state('');
	let importMode = $state<'simple' | 'json'>('simple');
	let categoryName = $state('');
	let categoryWords = $state('');
	let categoryLanguage = $state<'es' | 'en'>('es');
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

	async function doCreateCategory(e: Event) {
		e.preventDefault();
		packError = null;
		const name = categoryName.trim();
		const words = categoryWords
			.split('\n')
			.map((w) => w.trim())
			.filter(Boolean);
		if (!name || words.length === 0) return;
		const json = JSON.stringify({
			name,
			language: categoryLanguage,
			categories: [{ name, words }]
		});
		try {
			await api.importPack(json);
			categoryName = '';
			categoryWords = '';
			await loadPacks();
		} catch (e) {
			packError = e instanceof Error ? e.message : 'No se pudo crear la categoría';
		}
	}

	// El editor trabaja con las palabras de cada categoría como texto plano, una por
	// línea, igual que el formulario de crear. Las pistas van tras "|" separadas por comas.
	interface EditableCategory {
		name: string;
		words: string;
	}

	let editingPack = $state<{ id: number; name: string; language: string; categories: EditableCategory[] } | null>(null);
	let savingPack = $state(false);

	function wordToLine(word: api.PackWord): string {
		if (typeof word === 'string') return word;
		const hints = word.hints?.filter(Boolean) ?? [];
		return hints.length ? `${word.text} | ${hints.join(', ')}` : word.text;
	}

	function lineToWord(line: string): api.PackWord | null {
		const [rawText, rawHints] = line.split('|');
		const text = rawText.trim();
		if (!text) return null;
		const hints = (rawHints ?? '')
			.split(',')
			.map((h) => h.trim())
			.filter(Boolean);
		return hints.length ? { text, hints } : text;
	}

	async function startEdit(id: number) {
		packError = null;
		try {
			const content = await api.getPackContent(id);
			editingPack = {
				id,
				name: content.name,
				language: content.language,
				categories: content.categories.map((c) => ({
					name: c.name,
					words: c.words.map(wordToLine).join('\n')
				}))
			};
		} catch (e) {
			packError = e instanceof Error ? e.message : 'No se pudo abrir el paquete';
		}
	}

	async function saveEdit() {
		if (!editingPack) return;
		savingPack = true;
		packError = null;
		try {
			await api.updatePack(editingPack.id, {
				name: editingPack.name.trim(),
				language: editingPack.language,
				categories: editingPack.categories
					.filter((c) => c.name.trim())
					.map((c) => ({
						name: c.name.trim(),
						words: c.words.split('\n').map(lineToWord).filter((w) => w !== null)
					}))
			});
			editingPack = null;
			await loadPacks();
		} catch (e) {
			packError = e instanceof Error ? e.message : 'No se pudo guardar';
		} finally {
			savingPack = false;
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

	<label class="mb-8 flex cursor-pointer items-center justify-between border border-wire bg-ink-raised/60 px-4 py-3">
		<span class="text-sm text-paper-dim">Sonido</span>
		<input type="checkbox" checked={soundOn} onchange={toggleSound} class="h-5 w-5 accent-amber" />
	</label>

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
			<div class="mb-3 flex items-center justify-between">
				<h2 class="text-xs tracking-[0.3em] text-amber uppercase">Nueva categoría</h2>
				<div class="flex text-[0.6rem] tracking-widest uppercase">
					<button
						type="button"
						onclick={() => (importMode = 'simple')}
						class={importMode === 'simple' ? 'text-amber' : 'text-paper-dim hover:text-paper'}
					>
						Simple
					</button>
					<span class="mx-1.5 text-paper-dim">/</span>
					<button
						type="button"
						onclick={() => (importMode = 'json')}
						class={importMode === 'json' ? 'text-amber' : 'text-paper-dim hover:text-paper'}
					>
						JSON
					</button>
				</div>
			</div>

			{#if importMode === 'simple'}
				<form class="space-y-3" onsubmit={doCreateCategory}>
					<input
						bind:value={categoryName}
						placeholder="Nombre de la categoría"
						class="w-full border-b-2 border-wire bg-transparent px-1 py-2 text-paper outline-none placeholder:text-paper-dim/40 focus:border-amber"
					/>
					<div class="flex gap-2">
						<button
							type="button"
							onclick={() => (categoryLanguage = 'es')}
							class={`flex-1 border px-3 py-1.5 text-xs uppercase ${categoryLanguage === 'es' ? 'border-amber bg-amber text-ink font-bold' : 'border-wire text-paper-dim'}`}
						>
							Español
						</button>
						<button
							type="button"
							onclick={() => (categoryLanguage = 'en')}
							class={`flex-1 border px-3 py-1.5 text-xs uppercase ${categoryLanguage === 'en' ? 'border-amber bg-amber text-ink font-bold' : 'border-wire text-paper-dim'}`}
						>
							English
						</button>
					</div>
					<textarea
						bind:value={categoryWords}
						rows="5"
						placeholder={'Palabras (una por línea)'}
						class="w-full resize-none border border-wire bg-transparent px-3 py-2 text-sm text-paper outline-none placeholder:text-paper-dim/40 focus:border-amber"
					></textarea>
					<button type="submit" class="w-full bg-amber py-2.5 text-xs font-bold tracking-widest text-ink uppercase hover:bg-amber-dim">
						Crear categoría
					</button>
				</form>
			{:else}
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
			{/if}
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
						<li class="border-l-2 border-wire bg-ink-raised/60 px-4 py-2.5">
							<div class="flex items-center justify-between">
								<span class="text-paper">{pack.name} <span class="text-xs text-paper-dim">({pack.language})</span></span>
								<div class="flex gap-3">
									<button
										onclick={() => (editingPack?.id === pack.id ? (editingPack = null) : startEdit(pack.id))}
										class="text-[0.6rem] tracking-widest text-paper-dim uppercase hover:text-amber"
									>
										{editingPack?.id === pack.id ? 'cerrar' : 'editar'}
									</button>
									<button onclick={() => doDelete(pack.id)} class="text-[0.6rem] tracking-widest text-paper-dim uppercase hover:text-blood-bright">
										borrar
									</button>
								</div>
							</div>

							{#if editingPack?.id === pack.id}
								{@const edited = editingPack}
								<div class="mt-4 space-y-4 border-t border-wire pt-4">
									<input
										bind:value={edited.name}
										placeholder="Nombre del paquete"
										class="w-full border border-wire bg-transparent px-3 py-2 text-sm text-paper outline-none focus:border-amber"
									/>

									{#each edited.categories as cat, i (i)}
										<div class="space-y-2 border border-wire p-3">
											<div class="flex items-center gap-2">
												<input
													bind:value={cat.name}
													placeholder="Nombre de la categoría"
													class="flex-1 border border-wire bg-transparent px-3 py-1.5 text-sm text-paper outline-none focus:border-amber"
												/>
												<button
													onclick={() => (edited.categories = edited.categories.filter((_, j) => j !== i))}
													class="px-2 text-[0.6rem] tracking-widest text-paper-dim uppercase hover:text-blood-bright"
												>
													quitar
												</button>
											</div>
											<textarea
												bind:value={cat.words}
												rows="6"
												placeholder={'Palabras (una por línea)\ncamión | grande, ruedas'}
												class="w-full resize-y border border-wire bg-transparent px-3 py-2 text-sm text-paper outline-none placeholder:text-paper-dim/40 focus:border-amber"
											></textarea>
										</div>
									{/each}

									<button
										onclick={() => (edited.categories = [...edited.categories, { name: '', words: '' }])}
										class="w-full border border-wire py-2 text-[0.6rem] tracking-widest text-paper-dim uppercase hover:border-amber hover:text-amber"
									>
										+ añadir categoría
									</button>

									<p class="text-xs text-paper-dim italic">
										Una palabra por línea. Para darle pistas: <span class="text-paper">palabra | pista1, pista2</span>
									</p>

									<button
										onclick={saveEdit}
										disabled={savingPack}
										class="w-full bg-amber py-2.5 text-xs font-bold tracking-widest text-ink uppercase hover:bg-amber-dim disabled:opacity-40"
									>
										{savingPack ? 'Guardando...' : 'Guardar cambios'}
									</button>
								</div>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	{/if}
</div>
