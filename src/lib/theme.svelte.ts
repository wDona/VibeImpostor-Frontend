export type ThemePref = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'impostor_theme';

function loadInitial(): ThemePref {
	if (typeof localStorage === 'undefined') return 'system';
	const stored = localStorage.getItem(STORAGE_KEY);
	return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
}

class ThemeStore {
	pref = $state<ThemePref>(loadInitial());

	apply() {
		if (typeof document === 'undefined') return;
		if (this.pref === 'system') {
			document.documentElement.removeAttribute('data-theme');
		} else {
			document.documentElement.setAttribute('data-theme', this.pref);
		}
		localStorage.setItem(STORAGE_KEY, this.pref);
	}

	cycle() {
		this.pref = this.pref === 'system' ? 'dark' : this.pref === 'dark' ? 'light' : 'system';
		this.apply();
	}
}

export const themeStore = new ThemeStore();
