import { svelte } from "@sveltejs/vite-plugin-svelte";
import { playwright } from "@vitest/browser-playwright";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const srcRootPath = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig(({ mode }) => ({
    plugins: [svelte()],
    resolve: {
        conditions: mode === "test" ? ["browser"] : [],
        alias: {
            src: srcRootPath
        }
    },
    test: {
        expect: { requireAssertions: true },
        projects: [
            {
                extends: "./vite.config.ts",
                test: {
                    name: "client",
                    browser: {
                        enabled: true,
                        provider: playwright(),
                        instances: [{ browser: "chromium", headless: true }]
                    },
                    include: ["src/**/*.svelte.{test,spec}.{js,ts}"],
                    exclude: []
                }
            },
            {
                extends: "./vite.config.ts",
                test: {
                    name: "server",
                    environment: "node",
                    include: ["src/**/*.{test,spec}.{js,ts}"],
                    exclude: ["src/**/*.svelte.{test,spec}.{js,ts}"]
                }
            }
        ]
    }
}));
