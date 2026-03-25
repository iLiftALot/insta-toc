import { sveltePreprocess } from "svelte-preprocess";
import packageJson from "./package.json" with { type: "json" };

/** @type {import('@sveltejs/vite-plugin-svelte').SvelteConfig} */
const config = {
    preprocess: sveltePreprocess({ scss: true, globalStyle: true, postcss: true }),
    compilerOptions: {
        runes: undefined,
        css: "injected",
        experimental: {
            async: true
        }
    },
    vitePlugin: {
        inspector: packageJson.main.includes("dev") ? true : false,
        experimental: {
            sendWarningsToBrowser: true
        }
    }
};

export default config;
