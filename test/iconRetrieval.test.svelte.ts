import { icons } from "lucide-svelte/icons";
import { expect, test } from "vitest";

type LucideIconComponent<T extends keyof typeof icons> = (typeof icons)[T];

function getLucideIcon<T extends keyof typeof icons>(name: T): LucideIconComponent<T> {
    return icons[name];
}

function normalizeIconName(name: LucideIconComponent<keyof typeof icons>): string {
    const iconName: string = typeof name === "string" ? name : name.name;

    return iconName
        .replace(/(?<!^)([A-Z])/g, "-$1")
        .replace(/([a-zA-Z])(\d)/g, "$1-$2")
        .replace(/_/g, "-")
        .toLowerCase();
}

test("getLucideIcon", () => {
    const icon = getLucideIcon("ArrowDown");
    console.log(icon);
    expect(icon).toBe(icons.ArrowDown);
});

test("normalizeIconName", () => {
    const normalized = normalizeIconName(icons.ChevronDown);
    console.log(`${icons.ChevronDown.name} -> ${normalized}`);
    expect(normalized).toBe("chevron-down");
});
