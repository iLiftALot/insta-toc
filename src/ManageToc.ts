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
import InstaTocPlugin from './main';

interface TocData {
    fileHeadings: HeadingCache[],
    instaTocSection: SectionCache | undefined
}
const instaTocCodeBlockId = 'insta-toc';

export class ManageToc {
    public app: App;
    public plugin: InstaTocPlugin;
    public editor: Editor;
    public file: TFile;
    public fileCache: CachedMetadata | null;

    constructor(app: App, plugin: InstaTocPlugin, editor: Editor, file: TFile) {
        this.app = app;
        this.plugin = plugin;
        this.editor = editor;
        this.file = file;
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

    private generateNumberedToc(fileHeadings: HeadingCache[]): string {
        const tocHeadingRefs: string[] = [];
        const levelNumbers: { [level: number]: number } = {};

        for (const headingCache of fileHeadings) {
            const headingLevel = headingCache.level;
            const headingText = headingCache.heading;

            // Reset numbering for deeper levels
            for (let level = headingLevel + 1; level <= 6; level++) {
                levelNumbers[level] = 0;
            }

            // Initialize numbering for this level if not already
            if (!levelNumbers[headingLevel]) {
                levelNumbers[headingLevel] = 0;
            }

            // Increment the numbering at the current level
            levelNumbers[headingLevel]++;

            const bullet = levelNumbers[headingLevel].toString();

            const indent = ' '.repeat((headingLevel - 1) * 4);
            const tocHeadingRef = `${indent}${bullet}. ${headingText}`;

            tocHeadingRefs.push(tocHeadingRef);
        }

        const tocContent: string = tocHeadingRefs.join('\n');
        return `\`\`\`${instaTocCodeBlockId}\n${tocContent}\n\`\`\``;
    }

    // Generates a new insta-toc codeblock
    private generateNormalToc(fileHeadings: HeadingCache[]): string {
        const tocHeadingRefs: string[] = [];

        // Iterate each heading cache object to generate the new TOC content
        if (fileHeadings.length > 0) {
            fileHeadings.forEach((headingCache: HeadingCache) => {
                const headingLevel: number = headingCache.level;
                const headingText: string = headingCache.heading;

                const indent: string = ' '.repeat((headingLevel - 1) * 4);
                const tocHeadingRef = `${indent}- ${headingText}`;

                tocHeadingRefs.push(tocHeadingRef);
            });
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