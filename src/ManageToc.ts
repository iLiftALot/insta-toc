import {
    App,
    CachedMetadata,
    Editor,
    EditorPosition,
    EditorRange,
    HeadingCache,
    SectionCache,
    TFile
} from 'obsidian';
import { instaTocCodeBlockId, TocData } from './Utils';
import InstaTocPlugin from './main';

export class ManageToc {
    public app: App;
    public plugin: InstaTocPlugin;
    public editor: Editor;
    public file: TFile;
    public fileCache: CachedMetadata | null;
    public headingLevelStack: number[];

    constructor(app: App, plugin: InstaTocPlugin, editor: Editor, file: TFile) {
        this.app = app;
        this.plugin = plugin;
        this.editor = editor;
        this.file = file;
        this.headingLevelStack = [];
        this.fileCache = this.app.metadataCache.getFileCache(file);

        if (this.fileCache) this.updateAutoToc();
    }

    // Provides the insert location range for the new insta-toc codeblock
    private getTocInsertPosition(instaTocSection: SectionCache): EditorRange {
        // Define the star/end line/character index
        const startLine: number = instaTocSection.position.start.line;
        const startCh = 0;
        const endLine: number = instaTocSection.position.end.line;
        const endCh: number = instaTocSection.position.end.col;

        const tocStartPos: EditorPosition = { line: startLine, ch: startCh };
        const tocEndPos: EditorPosition = { line: endLine, ch: endCh };

        return { from: tocStartPos, to: tocEndPos };
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
    private generateNumberedToc(fileHeadings: HeadingCache[]): string {
        const tocHeadingRefs: string[] = [];
        const levelNumbers: { [level: number]: number } = {};

        for (const headingCache of fileHeadings) {
            const headingLevel = headingCache.level;
            const headingText = headingCache.heading;
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

        const tocContent: string = tocHeadingRefs.join('\n');
        return `\`\`\`${instaTocCodeBlockId}\n${tocContent}\n\`\`\``;
    }

    // Generates a new insta-toc codeblock with normal dash-type bullets
    private generateNormalToc(fileHeadings: HeadingCache[]): string {
        const tocHeadingRefs: string[] = [];

        for (const headingCache of fileHeadings) {
            const headingLevel: number = headingCache.level;
            const headingText: string = headingCache.heading;
            const currentIndentLevel = this.getIndentationLevel(headingLevel);

            // Calculate the indentation based on the current indentation level
            const indent: string = ' '.repeat(currentIndentLevel * 4);
            const tocHeadingRef = `${indent}- ${headingText}`;

            tocHeadingRefs.push(tocHeadingRef);
        }

        const tocContent: string = tocHeadingRefs.join('\n');
        return `\`\`\`${instaTocCodeBlockId}\n${tocContent}\n\`\`\``;
    }

    // Extract the headings and insta-toc sections from the active file's cache
    private getTocData(): TocData {
        const fileHeadings: HeadingCache[] = this.fileCache?.headings ?? [];
        const instaTocSection: SectionCache | undefined = this.fileCache?.sections
            ? this.fileCache.sections.find(
                (section: SectionCache) => section.type === 'code' &&
                    this.editor.getLine(section.position.start.line) === `\`\`\`${instaTocCodeBlockId}`
            ) : undefined;
        
        return { fileHeadings, instaTocSection };
    }

    // Dynamically update the TOC
    private updateAutoToc(): void {
        // Extract the headings and sections from the active file's cache
        const { fileHeadings, instaTocSection }: TocData = this.getTocData();

        // Return early if no sections (which means no insta-toc blocks)
        if (!instaTocSection) return;

        // Get the insertion position and generate the updated TOC
        const tocInsertRange: EditorRange = this.getTocInsertPosition(instaTocSection);
        
        let newTocBlock: string;
        switch(this.plugin.settings.bulletType) {
            case "dash":
                newTocBlock = this.generateNormalToc(fileHeadings);
                break;
            case "number":
                newTocBlock = this.generateNumberedToc(fileHeadings);
                break;
            default:
                newTocBlock = this.generateNormalToc(fileHeadings);
                break;
        }

        // Replace the old TOC with the updated TOC
        this.editor.replaceRange(newTocBlock, tocInsertRange.from, tocInsertRange.to);
    }
}