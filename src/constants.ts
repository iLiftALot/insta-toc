import { LocalTocSettings } from "./types";

export const instaTocCodeBlockId = 'insta-toc';

// Matches 3 groups: indent, bullet, and content
export const listRegex: RegExp = /^(\s*)(-|\d+(?:\.\d+)*|\d\.)\s+(.*)/;

// Extracts path/link WITH alias from headings with Obsidian wiki links
export const wikiLinkWithAliasRegex: RegExp = /\[\[([^\]]+)\|([^\]]+)\]\]/g;

// Extracts path/link WITHOUT alias from headings with Obsidian wiki links
export const wikiLinkNoAliasRegex: RegExp = /\[\[([^\]\|]+)\]\]/g;

// Extracts path/link and alias from headings with regular markdown links
export const markdownLinkRegex: RegExp = /\[([^\]]+)\]\([^)]+\)/g;

// Replaces tags in headings
export const tagLinkRegex: RegExp = /(#)([/\-_\w][^\s]*)/g;

// Omit Specific Headings
export const omitHeadingRegex: RegExp = /<!--\s*omit\s*-->/;

// Extracts TOC settings
export const localTocSettingsRegex: RegExp = /-{3}\n([\s\S]*)\n-{3}/;


export const BulletTypes = {
    dash: 'dash',
    number: 'number'
}
export const DefaultExcludedChars: string[] = ['*', '_', '`', '==', '~~', '{', '}', '#', '\\'];

export const defaultLocalSettings: LocalTocSettings = {
    title: {
        name: "Table of Contents",
        level: 1
    },
    exclude: "",
    style: {
        listType: "dash",
    },
    omit: [],
    levels: {
        min: 1,
        max: 6
    }
};
