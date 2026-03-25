import type { Context } from "./ComponentTypes";

export function createSvelteContext<T extends Context>(ctx: T): Map<string, T[keyof T]> {
    // console.log("Creating Svelte context with:", ctx); // Debug log
    return new Map(Object.entries(ctx)) as Map<string, T[keyof T]>;
}
