import { icons } from "lucide-svelte";
import { setIcon } from "obsidian";
import type { LucideIcon, LucideIconName, ToolbarIconName } from "./ComponentTypes";

type IconParameters = LucideIcon | LucideIconName | ToolbarIconName;
type UpdateIconFunction = {
    update: (nextName: IconParameters) => void;
};

export function icon(node: HTMLElement, name: IconParameters): UpdateIconFunction {
    setToolbarIcon(node, name);

    return {
        update(nextName: Parameters<typeof icon>[1]): void {
            setToolbarIcon(node, nextName);
        }
    };
}

function normalizeIconName(name: string): string {
    return name
        .replace(/(?<!^)([A-Z])/g, "-$1")
        .replace(/([a-zA-Z])(\d)/g, "$1-$2")
        .replace(/_/g, "-")
        .toLowerCase();
}

function resolveIconKey(
    name: Parameters<typeof icon>[1]
): string | undefined {
    if (typeof name === "string") return name;
    return Object.keys(icons).find((k) => icons[k as keyof typeof icons] === name);
}

function setToolbarIcon(
    node: HTMLElement,
    name: Parameters<typeof icon>[1]
): void {
    const key = resolveIconKey(name);
    const normalizedIconName = key === "code-2"
        ? key
        : key
        ? normalizeIconName(key)
        : "triangle-alert";

    setIcon(node, normalizedIconName);
}
