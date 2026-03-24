import { svelte } from "@sveltejs/vite-plugin-svelte";
import { fileURLToPath } from "node:url";
import {
    configDefaults,
    defineConfig
} from "vitest/config";
import svelteConfig from "../svelte.config";

const obsidianMockPath = fileURLToPath(new URL("./mocks/obsidian.ts", import.meta.url));
const srcRootPath = fileURLToPath(new URL("../src", import.meta.url));

export default defineConfig(({ mode }) => ({
    plugins: [svelte(svelteConfig)],
    resolve: {
        conditions: mode === "test" ? ["browser"] : [],
        alias: {
            obsidian: obsidianMockPath,
            src: srcRootPath
        }
    },
    test: {
        globals: true,
        environment: "jsdom",
        include: [
            "**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
            "**/*.{test,spec}.svelte*"
        ],
        exclude: [...configDefaults.exclude, ".claude/**"],
        coverage: {
            reporter: ["text", "json", "html"]
        }
    }
}));
