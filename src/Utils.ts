import { TFile, App } from "obsidian";
import { IndentLevel } from "./Settings";

// Matches indent, bullet, and content
export const listRegex: RegExp = /^(\s*)(-|\d+(?:\.\d+)*|\d\.)\s+(.*)/;
// Extracts path/link and alias from headings with Obsidian wiki links
const wikiLinkRegex: RegExp = /\[\[(.*?)\|(.*?)\]\]/;
// Extracts path/link and alias from headings with regular markdown links
const markdownLinkRegex: RegExp = /\[(.*?)\]\(.*?\)/;

type ListItemContext = {
    indent: string;
    bullet: string;
    navLink: string;
}

export function handleCodeblockListItem(
    app: App,
    file: TFile,
    listItemMatch: RegExpMatchArray,
    line: string,
    filePath: string
): ListItemContext {
    const headingWikiLink: RegExpMatchArray | null = line.match(wikiLinkRegex);
    const headingMdLink: RegExpMatchArray | null = line.match(markdownLinkRegex);

    let [, indent, bullet, contentText]: RegExpMatchArray = listItemMatch;
    let alias: string = contentText;

    if (headingWikiLink) {
        const [wikiLink, refPath, refAlias] = headingWikiLink;

        contentText = contentText.replace(wikiLink, `${refPath} ${refAlias}`);
        alias = contentText.replace(`${refPath} `, '');
    }

    if (headingMdLink) {
        const [mdLink, refAlias] = headingMdLink;
        alias = contentText.replace(mdLink, refAlias);
    }

    const navLink = app.fileManager.generateMarkdownLink(
        file, filePath, `#${contentText}`, alias
    );

    return { indent, bullet, navLink };
}

// Configure indentation for the insta-toc codeblock element post-render
export function configureRenderedIndent(el: HTMLElement, headingLevels: number[], indentSize: IndentLevel) {
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