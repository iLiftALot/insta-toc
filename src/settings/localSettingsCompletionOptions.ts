import type { HeadingCache } from "obsidian";
import { bulletTypeOptions, omitHeadingRegex } from "../constants";

export function getLocalSettingsBulletTypeSuggestions(): string[] {
    return Array.from(bulletTypeOptions.keys());
}

export function getLocalSettingsOmitSuggestions(headings?: HeadingCache[]): string[] {
    if (!headings || headings.length === 0) return [];

    const suggestions = new Set<string>();

    for (const heading of headings) {
        const normalizedHeading = heading.heading.trim();

        if (
            normalizedHeading.length === 0
            || omitHeadingRegex.test(normalizedHeading)
            || suggestions.has(normalizedHeading)
        ) {
            continue;
        }

        suggestions.add(normalizedHeading);
    }

    return Array.from(suggestions);
}
