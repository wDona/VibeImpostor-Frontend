import { API_BASE } from './config';

const TOKEN_KEY = 'impostor_auth_token';

export function getToken(): string | null {
	return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
	if (token) localStorage.setItem(TOKEN_KEY, token);
	else localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
	const token = getToken();
	const res = await fetch(`${API_BASE}${path}`, {
		...init,
		headers: {
			'Content-Type': 'application/json',
			...(token ? { Authorization: `Bearer ${token}` } : {}),
			...init?.headers
		}
	});
	if (!res.ok) {
		const body = await res.json().catch(() => ({}));
		throw new Error(body.error ?? `Error ${res.status}`);
	}
	return res.json();
}

export function register(username: string, password: string) {
	return request<{ token: string }>('/auth/register', {
		method: 'POST',
		body: JSON.stringify({ username, password })
	});
}

export function login(username: string, password: string) {
	return request<{ token: string }>('/auth/login', {
		method: 'POST',
		body: JSON.stringify({ username, password })
	});
}

export interface CategoryResponse {
	id: number;
	name: string;
	language: string;
}

export async function listCategories() {
	const res = await request<{ categories: CategoryResponse[] }>('/packs/categories');
	// kotlinx omite "language" del wire cuando vale su default ("es")
	return { categories: res.categories.map((c) => ({ ...c, language: c.language ?? 'es' })) };
}

export interface PackDto {
	id: number;
	name: string;
	language: string;
}

export async function listMyPacks() {
	const res = await request<{ packs: PackDto[] }>('/packs/my-packs');
	return { packs: res.packs.map((p) => ({ ...p, language: p.language ?? 'es' })) };
}

export function importPack(json: string) {
	return request<{ packId: number }>('/packs/import', {
		method: 'POST',
		body: JSON.stringify({ json })
	});
}

export function deletePack(id: number) {
	return request<{ success: boolean }>(`/packs/${id}`, { method: 'DELETE' });
}
