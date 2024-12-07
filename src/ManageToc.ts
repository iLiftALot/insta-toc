import {
    EditorRange,
    HeadingCache,
    stringifyYaml
} from 'obsidian';
import InstaTocPlugin from './main';
import { instaTocCodeBlockId } from './constants';
import { Validator } from './validator';

export class ManageToc {
    private plugin: InstaTocPlugin;
    private validator: Validator;
    private headingLevelStack: number[];

    constructor(
        plugin: InstaTocPlugin,
        validator: Validator
    ) {
        this.plugin = plugin;
        this.validator = validator;
        this.headingLevelStack = [];
        
        this.updateAutoToc();
    }

    // Determine the correct indentation level
    private getIndentationLevel(headingLevel: number): number {
        // Pop from the stack until we find a heading level less than the current
        while (
            this.headingLevelStack.length > 0 && // Avoid indentation for the first heading
            headingLevel <= this.headingLevelStack[this.headingLevelStack.length - 1]
        ) {
            this.headingLevelStack.pop();
        }
        this.headingLevelStack.push(headingLevel);

        const currentIndentLevel = this.headingLevelStack.length - 1;

        return currentIndentLevel;
    }

    // Generates a new insta-toc codeblock with number-type bullets
    private generateNumberedToc(): string {
        const tocHeadingRefs: string[] = [];
        const levelNumbers: { [level: number]: number } = {};
        const fileHeadings: HeadingCache[] = this.validator.fileHeadings;

        for (const headingCache of fileHeadings) {
            const headingLevel = headingCache.level;
            const headingText = headingCache.heading;

            if (headingText.length === 0) continue;

            const currentIndentLevel = this.getIndentationLevel(headingLevel);

            // Initialize numbering for this level if not already
            if (!levelNumbers[currentIndentLevel]) {
                levelNumbers[currentIndentLevel] = 0;
            }

            // Reset numbering for deeper levels
            for (let i = currentIndentLevel + 1; i <= 6; i++) {
                levelNumbers[i] = 0;
            }

            // Increment the numbering at the current level
            levelNumbers[currentIndentLevel]++;

            const indent = ' '.repeat(currentIndentLevel * 4);
            const bullet = levelNumbers[currentIndentLevel].toString();
            const tocHeadingRef = `${indent}${bullet}. ${headingText}`;

            tocHeadingRefs.push(tocHeadingRef);
        }

        const tocContent: string = `${
            instaTocCodeBlockId
        }\n---\n${
            stringifyYaml(this.validator.localTocSettings)
        }---\n\n${
            '#'.repeat(this.validator.localTocSettings.title.level)
        } ${
            this.validator.localTocSettings.title.center
                ? '<center>' + this.validator.localTocSettings.title.name + '</center>'
                : this.validator.localTocSettings.title.name
        }\n\n${
            tocHeadingRefs.join('\n')
        }`;
        
        return `\`\`\`${tocContent}\n\`\`\``;
    }

    // Generates a new insta-toc codeblock with normal dash-type bullets
    private generateNormalToc(): string {
        const tocHeadingRefs: string[] = [];
        const fileHeadings: HeadingCache[] = this.validator.fileHeadings;

        for (const headingCache of fileHeadings) {
            const headingLevel: number = headingCache.level;
            const headingText: string = headingCache.heading;

            if (headingText.length === 0) continue;

            const currentIndentLevel = this.getIndentationLevel(headingLevel);

            // Calculate the indentation based on the current indentation level
            const indent: string = ' '.repeat(currentIndentLevel * 4);
            const tocHeadingRef = `${indent}- ${headingText}`;

            tocHeadingRefs.push(tocHeadingRef);
        }

        const tocContent: string = `${
            instaTocCodeBlockId
        }\n---\n${
            stringifyYaml(this.validator.localTocSettings)
        }---\n\n${
            '#'.repeat(this.validator.localTocSettings.title.level)
        } ${
            this.validator.localTocSettings.title.center
                ? '<center>' + this.validator.localTocSettings.title.name + '</center>'
                : this.validator.localTocSettings.title.name
        }\n\n${
            tocHeadingRefs.join('\n')
        }`;
        
        return `\`\`\`${tocContent}\n\`\`\``;
    }

    // Dynamically update the TOC
    private updateAutoToc(): void {
        const tocInsertRange: EditorRange = this.validator.tocInsertPos;
        // Determine if local settings override global
        const decisionMaker: string = this.plugin.settings.bulletType !== this.validator.localTocSettings.style.listType
            ? this.validator.localTocSettings.style.listType
            : this.plugin.settings.bulletType;
        
        let newTocBlock: string;
        switch(decisionMaker) {
            case "dash":
                newTocBlock = this.generateNormalToc();
                break;
            case "number":
                newTocBlock = this.generateNumberedToc();
                break;
            default:
                newTocBlock = this.generateNormalToc();
                break;
        }

        // Set the flag to indicate plugin-initiated changes
        this.plugin.isPluginEdit = true;

        // Replace the old TOC with the updated TOC
        this.validator.editor.replaceRange(
            newTocBlock, tocInsertRange.from, tocInsertRange.to
        );
    }
}