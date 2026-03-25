import { mergician, type MergicianOptions } from "mergician";
import type { App, TFile } from "obsidian";
import { htmlToMarkdown } from "obsidian";
import type InstaTocPlugin from "./Plugin";
import {
    markdownLinkRegex,
    mergicianSettings,
    tagLinkRegex,
    wikiLinkNoAliasRegex,
    wikiLinkWithAliasRegex
} from "./constants";
import type { HandledLink, HeadingLevel, ListItemContext } from "./types";

/**
 * Handle the codeblock list item and return the indent level and navigation link
 * @param app The Obsidian {@link App} instance
 * @param plugin The {@link InstaTocPlugin} instance
 * @param file The {@link TFile} containing the list item
 * @param listItemMatch The {@link RegExpMatchArray} for the list item
 * @param filePath The path of the file
 * @returns A {@link ListItemContext} containing the indent, bullet, and navigation link for the list item
 */
export function handleCodeblockListItem(
    app: App,
    plugin: InstaTocPlugin,
    file: TFile,
    listItemMatch: RegExpMatchArray,
    filePath: string
): ListItemContext {
    const [, indent, bullet, content]: RegExpMatchArray = listItemMatch;
    const { contentText, alias } = handleLinks(plugin, content);

    const navLink: string = app.fileManager.generateMarkdownLink(
        file,
        filePath,
        `#${contentText}`,
        alias
    );

    return { indent, bullet, navLink };
}

/**
 * Handle links in the content and alias of a list item.
 * @param plugin The plugin instance
 * @param content The raw content of the list item
 * @returns A {@link HandledLink} containing the processed content text
 * (with wiki links and tags cleaned up) and the alias
 * (with excluded characters removed and HTML converted to markdown)
 */
export function handleLinks(plugin: InstaTocPlugin, content: string): HandledLink {
    let [contentText, alias]: string[] = [content, content];

    // Process Obsidian wiki links with alias
    contentText = contentText.replace(
        wikiLinkWithAliasRegex,
        (_match: string, refPath: string | number, refAlias: string | number): string => {
            // Text including [[wikilink|wikitext]] -> Text including wikilink wikitext
            return `${refPath} ${refAlias}`;
        }
    );
    alias = alias.replace(
        wikiLinkWithAliasRegex,
        (
            _match: string,
            _refPath: string | number,
            refAlias: string | number
        ): string => {
            // [[wikilink|wikitext]] -> wikitext
            return `${refAlias}`;
        }
    );

    // Process Obsidian wiki links without alias
    contentText = contentText.replace(
        wikiLinkNoAliasRegex,
        (_match: string, refPath: string | number): string => {
            // Text including [[wikilink]] -> Text including wikilink
            // OR
            // Text including [[path/to/wikilink]] -> Text including wikilink
            return String(refPath).split("/").pop() ?? String(refPath);
        }
    );
    alias = alias.replace(
        wikiLinkNoAliasRegex,
        (_match: string, refPath: string | number): string => {
            // [[wikilink]] -> wikilink
            // OR
            // [[path/to/wikilink]] -> wikilink
            return String(refPath).split("/").pop() ?? String(refPath);
        }
    );

    // Process markdown links
    contentText = contentText.replace(
        markdownLinkRegex,
        (match: string, _refAlias: string | number): string => {
            // Text including [Link](https://www.link.com) -> Text including [Link](https://www.link.com)
            return match;
        }
    );
    alias = alias.replace(
        markdownLinkRegex,
        (_match: string, refAlias: string | number): string => {
            // [Link](https://www.link.com) -> Link
            return String(refAlias);
        }
    );

    // Clean up tags
    contentText = contentText.replace(
        tagLinkRegex,
        (_match: string, _symbol: string | number, tag: string | number): string => {
            // Remove any tags
            // Text including #a-tag -> Text including a-tag
            return String(tag);
        }
    );
    // Process HTML and exluded characters
    alias = cleanAlias(alias, plugin);

    return { contentText, alias };
}

/**
 * Strip the alias of specified excluded characters and convert HTML to markdown
 * @param aliasText The raw alias text to be cleaned
 * @param plugin The {@link InstaTocPlugin} instance, used to access settings for excluded characters
 * @param exclChars An optional array of characters to be excluded from the alias, used if plugin instance is not available
 * @returns The cleaned alias text, with HTML converted to markdown and excluded characters removed
 */
export function cleanAlias(
    aliasText: string,
    plugin?: InstaTocPlugin,
    exclChars?: string[]
): string {
    const excludedChars = (plugin ? plugin.settings.excludedChars : exclChars) ?? [];
    let alias: string = htmlToMarkdown(aliasText); // Convert any possible HTML to markdown

    // Replace all specified excluded characters
    for (const char of excludedChars) alias = alias.replaceAll(char, "");

    return alias;
}

/**
 * Escape special characters in a string for use in a regular expression pattern
 * @param string The input string that may contain special characters that need to be escaped for use in a regular expression
 * @returns A new string with special characters escaped, so that it can be safely used in a regular expression pattern without being interpreted as regex syntax
 */
export function escapeRegExp(string: string): string {
    return string.replace(/[.*+\-?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Check if a string is a regex pattern
 * @param string The input string to check for being a regex pattern, which is determined by whether it starts and ends with a forward slash '/'
 * @returns A boolean value indicating whether the input string is a regex pattern (true) or not (false), based on the presence of starting and ending forward slashes
 */
export function isRegexPattern(string: string): boolean {
    // Checks if the string starts and ends with '/'
    return /^\/.*\/$/.test(string);
}

/**
 * Check if a value is a valid heading level
 * @param value The input value to check for being a valid heading level, which is determined by whether it is an integer between 1 and 6
 * @returns A boolean value indicating whether the input value is a valid {@link HeadingLevel}
 */
export function isHeadingLevel(value: any): value is HeadingLevel {
    return [1, 2, 3, 4, 5, 6].includes(value);
}

/**
 * Attempt to fix malformed YAML where spaces after colons are missing
 * (e.g., "min:1 max:6" → { min: 1, max: 6 })
 */
export function sanitizeYaml(value: string): string {
    return value
        .replace(/(\w+):(\S)/g, "$1: $2") // Add space after colon: "min:1" → "min: 1"
        .replace(
            /(?<indent>^[ \t]*)(?<key>[A-Za-z_][A-Za-z0-9_-]*[ \t]*:)[ \t]*(?:(?<value>[^:\n#]+)[ \t]+)?(?<nextKeyWithValue>[A-Za-z_][A-Za-z0-9_-]*[ \t]*:(?:[ \t]*(?:#.*)?|[ \t]+[^#\n]*(?:#.*)?))$/gm,
            "$<indent>$<key> $<value>\n$<indent>$<nextKeyWithValue>"
        ); // Newline before each key: "min: 1 max: 6" → "min: 1\nmax: 6"
}

export function isNothing<T>(value: T): value is Extract<T, null | undefined> {
    return value === null || value === undefined;
}

export function sortRecord(obj: Record<string, boolean>): Record<string, boolean> {
    return Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)));
}

/**
 * Check if a value is an object that can be merged
 * @param value The input value to check for being a mergeable object
 * @returns A boolean value indicating whether the input value is a mergeable object (true) or not (false), based on whether it is a non-null object that is not an array
 */
export function isRecord<T>(value: T): value is Record<PropertyKey, any> {
    return !isNothing(value) && value instanceof Object && !Array.isArray(value);
}

/**
 * Deep merge two objects
 * @param target The target object that will be merged into and returned as the result, which will be modified by merging properties from the source object
 * @param source The source object whose properties will be merged into the target object
 * @param dedupeArrays A boolean flag indicating whether arrays should be deduplicated when merging (default is true)
 * @returns The merged object, which is the same as the target object after merging properties from the source object, with nested objects merged recursively and arrays concatenated and optionally deduplicated
 */
export function deepMerge<T extends Record<keyof T, any>>(
    target: Partial<T>,
    source: Partial<T>,
    mergeSettings?: MergicianOptions
): T {
    const settings = { ...mergicianSettings, ...(mergeSettings ?? {}) };
    const merger = mergician(settings);
    return merger(target, source);
}
