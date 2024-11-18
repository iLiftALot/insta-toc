import TurndownService from "turndown";

export const testStandardHeadings = [
    { heading: 'Title 1 Level 1', level: 1 },
    { heading: 'Title 1 Level 2', level: 2 },
    { heading: 'Title 1 Level 3', level: 3 },
    { heading: 'Title 1 Level 4', level: 4 },
    { heading: 'Title 1 Level 5', level: 5 },
    { heading: 'Title 1 Level 6', level: 6 }
];

export const testHeadingsWithoutFirstLevel = [
    { heading: 'Title 1 Level 2', level: 2 },
    { heading: 'Title 1 Level 3', level: 3 },
    { heading: 'Title 1 Level 4', level: 4 },
    { heading: 'Title 1 Level 5', level: 5 },
    { heading: 'Title 1 Level 6', level: 6 }
];

export const testHeadingsMixed = [
    { heading: 'Title 1 Level 4', level: 4 },
    { heading: 'Title 1 Level 1', level: 1 },
    { heading: 'Title 1 Level 6', level: 6 },
    { heading: 'Title 1 Level 2', level: 2 },
    { heading: 'Title 2 Level 2', level: 2 },
    { heading: 'Title 1 Level 3', level: 3 }
];

export const testHeadingsWithSpecialChars = [
    { heading: 'Title 1 `level 1` {with special chars}, **bold**, _italic_, #a-tag, ==highlighted== and ~~strikethrough~~ text', level: 1 },
    { heading: 'Title 1 level 2 <em style="color: black">with HTML</em>', level: 2 },
    { heading: 'Title 1 level 3 [[wikilink1]] [[wikilink2|wikitext2]] [mdlink](https://mdurl)', level: 3 },
    { heading: 'Title 1 level 4 [[wikilink1]] [[wikilink2|wikitext2]] [mdlink1](https://mdurl) [[wikilink3]] [[wikilink4|wikitext3]] [mdlink2](https://mdurl)', level: 4 }
];

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
export const testTagLinkRegex = /(#)([^\s]*\w)/g;

// `#${contentText}|alias`

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
    //return `${' '.repeat(indentation * 4)}- [[${fileName}#${contentText}|${alias}]]`;
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
