import {
    TFile,
    App,
    htmlToMarkdown,
    Editor,
    EditorPosition
} from "obsidian";
import {
    markdownLinkRegex,
    tagLinkRegex,
    wikiLinkNoAliasRegex,
    wikiLinkWithAliasRegex
} from "./constants";
import {
    EditorData,
    HandledLink,
    HeadingLevel,
    IndentLevel,
    ListItemContext
} from "./types";
import InstaTocPlugin from "./main";


// Handle the codeblock list item and return the indent level and navigation link
export function handleCodeblockListItem(
    app: App,
    plugin: InstaTocPlugin,
    file: TFile,
    listItemMatch: RegExpMatchArray,
    filePath: string
): ListItemContext {
    let [, indent, bullet, content]: RegExpMatchArray = listItemMatch;
    let { contentText, alias } = handleLinks(plugin, content);

    const navLink: string = app.fileManager.generateMarkdownLink(
        file, filePath, `#${contentText}`, alias
    );

    return { indent, bullet, navLink };
}

// Handle links in the content and alias of a list item
export function handleLinks(plugin: InstaTocPlugin, content: string): HandledLink {
    let [contentText, alias]: string[] = [content, content];

    // Process Obsidian wiki links with alias
    contentText = contentText.replace(wikiLinkWithAliasRegex, (_match: string, refPath: string | number, refAlias: string | number): string =>
        // Text including [[wikilink|wikitext]] -> Text including wikilink wikitext
        `${refPath} ${refAlias}`
    );
    alias = alias.replace(wikiLinkWithAliasRegex, (_match: string, _refPath: string | number, refAlias: string | number): string =>
        // [[wikilink|wikitext]] -> wikitext
        `${refAlias}`
    );

    // Process Obsidian wiki links without alias
    contentText = contentText.replace(wikiLinkNoAliasRegex, (_match: string, refPath: string | number): string => {
        // Text including [[wikilink]] -> Text including wikilink
        // OR
        // Text including [[path/to/wikilink]] -> Text including wikilink
        return String(refPath).split("/").pop() ?? String(refPath);
    });
    alias = alias.replace(wikiLinkNoAliasRegex, (_match: string, refPath: string | number): string => {
        // [[wikilink]] -> wikilink
        // OR
        // [[path/to/wikilink]] -> wikilink
        return (refPath).split("/").pop() ?? refPath;
    });

    // Process markdown links
    contentText = contentText.replace(markdownLinkRegex, (match, _refAlias) => {
        // Text including [Link](https://www.link.com) -> Text including [Link](https://www.link.com)
        return match;
    });
    alias = alias.replace(markdownLinkRegex, (_match, refAlias) => {
        // [Link](https://www.link.com) -> Link
        return refAlias;
    });

    // Clean up tags
    contentText = contentText.replace(tagLinkRegex, (_match, _symbol, tag) => { // Remove any tags
        // Text including #a-tag -> Text including a-tag
        return tag;
    });
    // Process HTML and exluded characters
    alias = cleanAlias(alias, plugin);
    
    return { contentText, alias };
}

// Strip the alias of specified excluded characters and convert HTML to markdown
export function cleanAlias(aliasText: string, plugin?: InstaTocPlugin, exclChars?: string[]): string {
    const excludedChars = (plugin ? plugin.settings.excludedChars : exclChars) ?? [];
    let alias: string = htmlToMarkdown(aliasText); // Convert any possible HTML to markdown
    
    // Replace all specified excluded characters
    for (const char of excludedChars) alias = alias.replaceAll(char, '');

    return alias;
}

// Configure indentation for the insta-toc code block HTML element, post-render
export function configureRenderedIndent(
    el: HTMLElement,
    headingLevels: number[],
    indentSize: IndentLevel
): void {
    const listItems: NodeListOf<HTMLLIElement> = el.querySelectorAll('li');

    listItems.forEach((listItem: HTMLLIElement, index: number) => {
        const headingLevel: number = headingLevels[index];

        // Only adjust indentation for headings beyond H1 (headingLevel > 1)
        if (headingLevel > 1) {
            listItem.style.marginInlineStart = `${indentSize * 10}px`;
        }

        const subList: HTMLUListElement | HTMLOListElement | null = listItem.querySelector('ul, ol');

        if (subList) {
            // List item has children
            const toggleButton: HTMLButtonElement = document.createElement('button');
            toggleButton.textContent = '▾'; // Down arrow
            toggleButton.classList.add('fold-toggle');

            // Event listener to toggle visibility
            toggleButton.addEventListener('click', () => {
                if (subList.style.display === 'none') {
                    subList.style.display = '';
                    toggleButton.textContent = '▾';
                } else {
                    subList.style.display = 'none';
                    toggleButton.textContent = '▸';
                }
            });

            listItem.prepend(toggleButton);
        }
    });
}

// Get the editor and cursor position
export function getEditorData(app: App): EditorData {
    const editor: Editor | undefined = app.workspace.activeEditor?.editor
    const cursorPos: EditorPosition | undefined = editor?.getCursor();
    
    return { editor, cursorPos }
}

// Escape special characters in a string for use in a regular expression
export function escapeRegExp(string: string): string {
    return string.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&');
}

// Check if a string is a regex pattern
export function isRegexPattern(string: string): boolean {
    // Checks if the string starts and ends with '/'
    return /^\/.*\/$/.test(string);
}

// Check if a string is a valid heading level
export function isHeadingLevel(value: any): value is HeadingLevel {
    return [1, 2, 3, 4, 5, 6].includes(value);
}

// Check if a value is an object that can be merged
function isMergeableObject(value: any): boolean {
    return value && typeof value === 'object' && !Array.isArray(value);
}

// Deep merge two objects
export function deepMerge<T extends object>(target: Partial<T>, source: Partial<T>, dedupeArrays = true): T {
    if (isMergeableObject(target) && isMergeableObject(source)) {
        for (const key of Object.keys(source) as Array<keyof T>) {
            const targetValue = target[key];
            const sourceValue = source[key];

            if (isMergeableObject(sourceValue)) {
                if (!targetValue) {
                    (target as any)[key] = {};
                }
                
                deepMerge(target[key] as any, sourceValue as any);
            } else if (Array.isArray(targetValue) && Array.isArray(sourceValue)) {
                if (dedupeArrays) {
                    (target as any)[key] = [...new Set(targetValue.concat(sourceValue))];
                } else {
                    (target as any)[key] = sourceValue;
                }
            } else {
                (target as any)[key] = sourceValue;
            }
        }
    }

    return target as T;
}
