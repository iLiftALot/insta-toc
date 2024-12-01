import { HeadingCache, Pos } from "obsidian";
import TurndownService from "turndown";

export const defaultPosition: Pos = { 
    start: { line: 0, col: 0, offset: 0 },
    end: { line: 0, col: 0, offset: 0 }
};

export const testStandardHeadings: HeadingCache[] = [
    { heading: 'Title 1 Level 1', level: 1, position: defaultPosition },
    { heading: 'Title 1 Level 2', level: 2, position: defaultPosition },
    { heading: 'Title 1 Level 3', level: 3, position: defaultPosition },
    { heading: 'Title 1 Level 4', level: 4, position: defaultPosition },
    { heading: 'Title 1 Level 5', level: 5, position: defaultPosition },
    { heading: 'Title 1 Level 6', level: 6, position: defaultPosition }
];

export const testHeadingsWithoutFirstLevel: HeadingCache[] = [
    { heading: 'Title 1 Level 2', level: 2, position: defaultPosition },
    { heading: 'Title 1 Level 3', level: 3, position: defaultPosition },
    { heading: 'Title 1 Level 4', level: 4, position: defaultPosition },
    { heading: 'Title 1 Level 5', level: 5, position: defaultPosition },
    { heading: 'Title 1 Level 6', level: 6, position: defaultPosition }
];

export const testHeadingsMixed: HeadingCache[] = [
    { heading: 'Title 1 Level 4', level: 4, position: defaultPosition },
    { heading: 'Title 1 Level 1', level: 1, position: defaultPosition },
    { heading: 'Title 1 Level 6', level: 6, position: defaultPosition },
    { heading: 'Title 1 Level 2', level: 2, position: defaultPosition },
    { heading: 'Title 2 Level 2', level: 2, position: defaultPosition },
    { heading: 'Title 1 Level 3', level: 3, position: defaultPosition }
];

export const testHeadingsWithSpecialChars: HeadingCache[] = [
    { 
        heading: 'Title 1 `level 1` {with special chars}, **bold**, _italic_, #a-tag, ==highlighted== and ~~strikethrough~~ text',
        level: 1,
        position: defaultPosition
    },
    {
        heading: 'Title 1 level 2 <em style="color: black">with HTML</em>',
        level: 2,
        position: defaultPosition
    },
    {
        heading: 'Title 1 level 3 [[wikilink1]] [[wikilink2|wikitext2]] [mdlink](https://mdurl)',
        level: 3,
        position: defaultPosition
    },
    {
        heading: 'Title 1 level 4 [[wikilink1]] [[wikilink2|wikitext2]] [mdlink1](https://mdurl) [[wikilink3]] [[wikilink4|wikitext3]] [mdlink2](https://mdurl)',
        level: 4,
        position: defaultPosition
    },
    {
        heading: 'Title 1 level 5 <!-- omit -->',
        level: 5,
        position: defaultPosition
    }
];


export enum TestNames {
    "testStandardHeadings",
    "testHeadingsWithoutFirstLevel",
    "testHeadingsMixed",
    "testHeadingsWithSpecialChars"
}
export type TestName = keyof typeof TestNames;
export type ContextResult = {
    initialHeadings: string[];
    formattedHeadings: string[];
    finalResult: string;
}
export type Context = Record<TestName, ContextResult>;

export const initialStandardHeadings = Object.values(testStandardHeadings)
    .map((cache: HeadingCache) => cache.heading);
export const initialHeadingsWithoutFirstLevel = Object.values(testHeadingsWithoutFirstLevel)
    .map((cache: HeadingCache) => cache.heading);
export const initialHeadingsMixed = Object.values(testHeadingsMixed)
    .map((cache: HeadingCache) => cache.heading);
export const initialHeadingsWithSpecialChars = Object.values(testHeadingsWithSpecialChars)
    .map((cache: HeadingCache) => cache.heading);

export const TEST_DEFAULT_SETTINGS = {
    bulletType: 'dash',
    indentSize: 4,
    updateDelay: 2000,
    excludedChars: ['*', '_', '`', '==', '~~', '{', '}', '#', '\\']
}

// Extracts path/link WITH alias from headings with Obsidian wiki links
export const testWikiLinkWithAliasRegex = /\[\[([^\]]+)\|([^\]]+)\]\]/g;
// Extracts path/link WITHOUT alias from headings with Obsidian wiki links
export const testWikiLinkNoAliasRegex = /\[\[([^\]\|]+)\]\]/g;
// Extracts path/link and alias from headings with regular markdown links
export const testMarkdownLinkRegex = /\[([^\]]+)\]\([^)]+\)/g;
// Replaces tags in headings
export const testTagLinkRegex: RegExp = /(#)([/\-_\w][^\s]*)/g;
// Omit Specific Headings
export const testOmitHeadingRegex: RegExp = /<!--\s*omit\s*-->/;

export function testHandleLinks(fileName: string, content: string, indentation: number) {
    let [contentText, alias] = [content, content];

    // Process Obsidian wiki links with alias
    contentText = contentText.replace(testWikiLinkWithAliasRegex, (match, refPath, refAlias) => {
        // Text including [[wikilink|wikitext]] -> Text including wikilink wikitext
        return `${refPath} ${refAlias}`;
    });
    alias = alias.replace(testWikiLinkWithAliasRegex, (match, refPath, refAlias) => {
        // [[wikilink|wikitext]] -> wikitext
        return refAlias;
    });

    // Process Obsidian wiki links without alias
    contentText = contentText.replace(testWikiLinkNoAliasRegex, (match, refPath) => {
        // Text including [[wikilink]] -> Text including wikilink
        // OR
        // Text including [[path/to/wikilink]] -> Text including wikilink
        refPath = refPath.split('/').pop() ?? refPath;
        return refPath;
    });
    alias = alias.replace(testWikiLinkNoAliasRegex, (match, refPath) => {
        // [[wikilink]] -> wikilink
        // OR
        // [[path/to/wikilink]] -> wikilink
        refPath = refPath.split('/').pop() ?? refPath;
        return refPath;
    });

    // Process markdown links
    contentText = contentText.replace(testMarkdownLinkRegex, (match, refAlias) => {
        // Text including [Link](https://www.link.com) -> Text including [Link](https://www.link.com)
        return match;
    });
    alias = alias.replace(testMarkdownLinkRegex, (match, refAlias) => {
        // [Link](https://www.link.com) -> Link
        return refAlias;
    });

    // Final clean and format for tags and HTML
    contentText = contentText.replace(testTagLinkRegex, (match, symbol, tag) => { // Remove any tags
        // Text including #a-tag -> Text including a-tag
        return tag;
    });
    alias = testCleanAlias(alias); // Process HTML and exluded characters

    return `${' '.repeat((indentation < 0 ? 0 : indentation) * 4)}- [[${fileName}#${contentText}|${alias}]]`;
}

// Strip the alias of specified excluded characters and convert HTML to markdown
export function testCleanAlias(aliasText: string) {
    const turndownService = new TurndownService({
        "emDelimiter": "_",
        "strongDelimiter": "**"
    });
    const excludedChars = TEST_DEFAULT_SETTINGS.excludedChars;
    let alias = turndownService.turndown(aliasText);

    // Replace all specified excluded characters
    for (const char of excludedChars) alias = alias.replaceAll(char, '');

    return alias;
}
