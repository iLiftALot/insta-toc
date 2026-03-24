import { svelte } from "@sveltejs/vite-plugin-svelte";
import { fileURLToPath } from "node:url";
import {
    configDefaults,
    defineConfig
} from "vitest/config";

const obsidianMockPath = fileURLToPath(new URL("./mocks/obsidian.ts", import.meta.url));

export default defineConfig({
    plugins: [svelte()],
    resolve: {
        alias: {
            obsidian: obsidianMockPath
        }
    },
    test: {
        globals: true,
        environment: "jsdom",
        include: [
            "**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
            "**/*.{test,spec}.svelte*"
        ],
        exclude: [...configDefaults.exclude],
        coverage: {
            reporter: ["text", "json", "html"]
        }
    }
});
