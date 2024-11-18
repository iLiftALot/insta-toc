import { TFile, App, htmlToMarkdown } from "obsidian";
import {
    HandledLink,
    IndentLevel,
    ListItemContext,
    markdownLinkRegex,
    tagLinkRegex,
    wikiLinkNoAliasRegex,
    wikiLinkWithAliasRegex
} from "./constants";
import InstaTocPlugin from "./main";

export function handleCodeblockListItem(
    app: App,
    plugin: InstaTocPlugin,
    file: TFile,
    listItemMatch: RegExpMatchArray,
    filePath: string
): ListItemContext {
    let [, indent, bullet, content]: RegExpMatchArray = listItemMatch;
    let { contentText, alias } = handleLinks(
        plugin,
        content
    );

    const navLink = app.fileManager.generateMarkdownLink(
        file, filePath, `#${contentText}`, alias
    );

    return { indent, bullet, navLink };
}

export function handleLinks(plugin: InstaTocPlugin, content: string): HandledLink {
    let [contentText, alias]: string[] = [content, content];

    // Process Obsidian wiki links with alias
    contentText = contentText.replace(wikiLinkWithAliasRegex, (match, refPath, refAlias) => {
        // Text including [[wikilink|wikitext]] -> Text including wikilink wikitext
        return `${refPath} ${refAlias}`;
    });
    alias = alias.replace(wikiLinkWithAliasRegex, (match, refPath, refAlias) => {
        // [[wikilink|wikitext]] -> wikitext
        return refAlias;
    });

    // Process Obsidian wiki links without alias
    contentText = contentText.replace(wikiLinkNoAliasRegex, (match, refPath) => {
        // Text including [[wikilink]] -> Text including wikilink
        // OR
        // Text including [[path/to/wikilink]] -> Text including wikilink
        refPath = refPath.split('/').pop() ?? refPath;
        return refPath;
    });
    alias = alias.replace(wikiLinkNoAliasRegex, (match, refPath) => {
        // [[wikilink]] -> wikilink
        // OR
        // [[path/to/wikilink]] -> wikilink
        refPath = refPath.split('/').pop() ?? refPath;
        return refPath;
    });

    // Process markdown links
    contentText = contentText.replace(markdownLinkRegex, (match, refAlias) => {
        // Text including [Link](https://www.link.com) -> Text including [Link](https://www.link.com)
        return match;
    });
    alias = alias.replace(markdownLinkRegex, (match, refAlias) => {
        // [Link](https://www.link.com) -> Link
        return refAlias;
    });

    // Final clean and format for tags and HTML
    contentText = contentText.replace(tagLinkRegex, (match, symbol, tag) => { // Remove any tags
        // Text including #a-tag -> Text including a-tag
        return tag;
    });
    alias = cleanAlias(alias, plugin); // Process HTML and exluded characters

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

// Configure indentation for the insta-toc codeblock element post-render
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
                    toggleButton.textContent = '▾'; // Down arrow
                } else {
                    subList.style.display = 'none';
                    toggleButton.textContent = '▸'; // Right arrow
                }
            });

            // Insert the toggle button
            listItem.prepend(toggleButton);
        }
    });
}