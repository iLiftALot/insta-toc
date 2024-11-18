import { HeadingCache, SectionCache } from "obsidian";

// Matches indent, bullet, and content
export const listRegex: RegExp = /^(\s*)(-|\d+(?:\.\d+)*|\d\.)\s+(.*)/;
// Extracts path/link WITH alias from headings with Obsidian wiki links
export const wikiLinkWithAliasRegex: RegExp = /\[\[([^\]]+)\|([^\]]+)\]\]/g;
// Extracts path/link WITHOUT alias from headings with Obsidian wiki links
export const wikiLinkNoAliasRegex: RegExp = /\[\[([^\]\|]+)\]\]/g;
// Extracts path/link and alias from headings with regular markdown links
export const markdownLinkRegex: RegExp = /\[([^\]]+)\]\([^)]+\)/g;
// Replaces tags in headings
export const tagLinkRegex: RegExp = /(#)([^\s]*\w)/g;

export const instaTocCodeBlockId = 'insta-toc';
export const BulletTypes = {
    dash: 'dash',
    number: 'number',
}
export const DefaultExcludedChars: string[] = ['*', '_', '`', '==', '~~', '{', '}', '#', '\\'];

export type BulletType = 'dash' | 'number';
export type IndentLevel = 2 | 4 | 6 | 8;
export type UpdateDelay = 500 | 1000
    | 1500 | 2000 | 2500 | 3000 | 3500 | 4000
    | 4500 | 5000 | 5500 | 6000 | 6500 | 7000
    | 7500 | 8000 | 8500 | 9000 | 9500 | 10000

export type TocData = {
    fileHeadings: HeadingCache[],
    instaTocSection: SectionCache | undefined
}
export type HandledLink = {
    contentText: string,
    alias: string
}
export type ListItemContext = {
    indent: string;
    bullet: string;
    navLink: string;
}
