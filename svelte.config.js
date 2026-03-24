import { sveltePreprocess } from "svelte-preprocess";

// /** @type {import('@sveltejs/kit').Config} */
/** @type {import('@sveltejs/vite-plugin-svelte').SvelteConfig} */
const config = {
	preprocess: sveltePreprocess(),
	compilerOptions: {
		runes: undefined,
		hmr: true,
		experimental: {
			async: true
		}
	}
};

export default config;
