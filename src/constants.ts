import type { MergicianOptions } from "mergician";
import type {
    BulletType,
    HeadingLevel
} from "./types";

export const instaTocCodeBlockId = "insta-toc";

// Matches 3 groups: indent, bullet, and content
export const listRegex: RegExp = /^(\s*)(-|\d+(?:\.\d+)*|\d\.)\s+(.*)/;

// Extracts path/link WITH alias from headings with Obsidian wiki links
export const wikiLinkWithAliasRegex: RegExp = /\[\[([^\]]+)\|([^\]]+)\]\]/g;

// Extracts path/link WITHOUT alias from headings with Obsidian wiki links
export const wikiLinkNoAliasRegex: RegExp = /\[\[([^\]\|]+)\]\]/g;

// Extracts path/link and alias from headings with regular markdown links
export const markdownLinkRegex: RegExp = /\[([^\]]*)\]\([^)]+\)/g;

// Replaces tags in headings
export const tagLinkRegex: RegExp = /(#)([/\-_\w][^\s]*)/g;

// Omit Specific Headings
export const omitHeadingRegex: RegExp = /<!--\s*omit\s*-->/;

// Extracts TOC settings
export const localTocSettingsRegex: RegExp = /-{3}\r?\n([\s\S]*?)\r?\n-{3}/;

export const BulletTypes = {
    armenian: "armenian",
    circle: "circle",
    decimal: "decimal",
    "decimal-leading-zero": "decimal-leading-zero",
    disc: "disc",
    georgian: "georgian",
    "lower-alpha": "lower-alpha",
    "lower-greek": "lower-greek",
    "lower-latin": "lower-latin",
    "lower-roman": "lower-roman",
    square: "square",
    "upper-alpha": "upper-alpha",
    "upper-latin": "upper-latin",
    "upper-roman": "upper-roman",
    none: "none"
} as const;
export const bulletTypeOptions = new Map<BulletType, string>([
    ["none", "None"],
    ["armenian", "Armenian (Ա)"],
    ["georgian", "Georgian (Ⴀ)"],
    ["lower-greek", "Lower Greek (α)"],
    ["lower-latin", "Lower Latin (a)"],
    ["upper-latin", "Upper Latin (A)"],
    ["disc", "Disc (•)"],
    ["circle", "Circle (◦)"],
    ["square", "Square (▪)"],
    ["decimal", "Decimal (1.)"],
    ["decimal-leading-zero", "Decimal Leading Zero (01.)"],
    ["lower-alpha", "Lower Alpha (a.)"],
    ["upper-alpha", "Upper Alpha (A.)"],
    ["lower-roman", "Lower Roman (i.)"],
    ["upper-roman", "Upper Roman (I.)"]
]);
export const headingLevelOptions = new Map<HeadingLevel, string>([
    [1 as HeadingLevel, "H1"],
    [2 as HeadingLevel, "H2"],
    [3 as HeadingLevel, "H3"],
    [4 as HeadingLevel, "H4"],
    [5 as HeadingLevel, "H5"],
    [6 as HeadingLevel, "H6"]
]);
export const defaultExcludedChars: string[] = [
    "*",
    "_",
    "`",
    "==",
    "~~",
    "{",
    "}",
    "#",
    "\\"
];

export const mergicianSettings: MergicianOptions = {
    onlyCommonKeys: false,
    onlyUniversalKeys: false,
    skipCommonKeys: false,
    skipUniversalKeys: false,
    dedupArrays: true,
    sortArrays: true
};

export const localSettingsComponentPlaceholder = `\
title:
  name: Table of Contents
  level: 1
  center: false
exclude:
style:
  listType: none
omit:
levels:
  min:
  max:
`;
