import type { EditorRange, HeadingCache, TFile } from "obsidian";
import { MarkdownView, stringifyYaml } from "obsidian";
import type InstaTocPlugin from "./Plugin";
import { instaTocCodeBlockId } from "./constants";
import type { Validator } from "./validator";

export class ManageToc {
    private plugin: InstaTocPlugin;
    private validator: Validator;
    private headingLevelStack: number[];

    private constructor(plugin: InstaTocPlugin, validator: Validator) {
        this.plugin = plugin;
        this.validator = validator;
        this.headingLevelStack = [];
    }

    public static async run(plugin: InstaTocPlugin, validator: Validator): Promise<void> {
        const instance = new ManageToc(plugin, validator);
        await instance.updateAutoToc();
    }

    // Determine the correct indentation level
    private getIndentationLevel(headingLevel: number): number {
        // Pop from the stack until we find a heading level less than the current
        while (
            this.headingLevelStack.length > 0 // Avoid indentation for the first heading
            && headingLevel <= this.headingLevelStack[this.headingLevelStack.length - 1]
        ) {
            this.headingLevelStack.pop();
        }
        this.headingLevelStack.push(headingLevel);

        const currentIndentLevel = this.headingLevelStack.length - 1;

        return currentIndentLevel;
    }

    private createTocContent(tocHeadingRefs: string[]): string {
        const titleName = this.validator.insureLocalTocSetting(
            "title",
            "name",
            (name) => name,
            this.plugin.settings.tocTitle
        );
        const titleLevelPrefix = this.validator.insureLocalTocSetting(
            "title",
            "level",
            (level) => "#".repeat(level),
            "#".repeat(this.plugin.settings.tocTitleLevel)
        );
        const shouldCenterTitle = this.validator.insureLocalTocSetting(
            "title",
            "center",
            (center) => center,
            false
        );

        const normalizedTitleName = titleName.trim();
        const centeredTitleName = shouldCenterTitle && normalizedTitleName.length > 0
            ? `<center>${normalizedTitleName}</center>`
            : normalizedTitleName;

        const localSettingsYaml = stringifyYaml(
            this.validator.localTocSettings
        ).trimEnd();
        const localSettingsContent = `---\n${localSettingsYaml}\n---`;
        const titleContent = centeredTitleName.length > 0
            ? [titleLevelPrefix, centeredTitleName]
                .filter((section) => section.length > 0)
                .join(" ")
            : "";
        const tocList = tocHeadingRefs.join("\n");

        return [localSettingsContent, titleContent, tocList]
            .filter((section) => section.length > 0)
            .join("\n\n");
    }

    // Generates a new insta-toc codeblock with normal dash-type bullets
    private generateToc(): string {
        const tocHeadingRefs: string[] = [];
        const fileHeadings: HeadingCache[] = this.validator.fileHeadings;

        for (const headingCache of fileHeadings) {
            const headingLevel: number = headingCache.level;
            const headingText: string = headingCache.heading;

            if (headingText.length === 0) continue;

            const currentIndentLevel = this.getIndentationLevel(headingLevel);

            // Calculate the indentation based on the current indentation level
            const indent: string = " ".repeat(currentIndentLevel * 4);
            // const indent: string = " ".repeat(currentIndentLevel * this.plugin.settings.indentSize);
            const tocHeadingRef = `${indent}- ${headingText}`;

            tocHeadingRefs.push(tocHeadingRef);
        }

        const tocContent: string = this.createTocContent(tocHeadingRefs);
        return `\`\`\`${instaTocCodeBlockId}\n${tocContent}\n\`\`\``;
    }

    private async insertTocBlock(
        newTocBlock: string,
        tocInsertRange: EditorRange
    ): Promise<void> {
        const activeFile: TFile | null = this.plugin.app.workspace.getActiveFile();
        if (!activeFile) return;

        // Sync the active MarkdownView so the editor and reading view stay consistent
        const view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
        if (!view) return;

        // If an editor is live (editing/source/live-preview)
        if (this.plugin.getViewState() !== "preview") {
            // const cmContent = view.editor.getValue();
            // if (cmContent !== updatedContent) {
            //     view.editor.setValue(updatedContent);
            // }
            // Replace the old TOC with the updated TOC
            view.editor.replaceRange(newTocBlock, tocInsertRange.from, tocInsertRange.to);
        } else {
            const fromLine = tocInsertRange.from.line;
            const fromCh = tocInsertRange.from.ch;
            const toLine = tocInsertRange.to.line;
            const toCh = tocInsertRange.to.ch;

            // vault.process() atomically reads the file, applies the transform, and writes it back.
            // This ensures the on-disk content stays in sync regardless of editor mode.
            await this.plugin.app.vault.process(activeFile, (content) => {
                const lines = content.split("\n");

                let fromPos = 0;
                for (let i = 0; i < fromLine && i < lines.length; i++) {
                    fromPos += lines[i].length + 1;
                }
                fromPos += fromCh;

                let toPos = 0;
                for (let i = 0; i < toLine && i < lines.length; i++) {
                    toPos += lines[i].length + 1;
                }
                toPos += toCh;

                return content.slice(0, fromPos) + newTocBlock + content.slice(toPos);
            });

            // Re-read the updated file content so both editor and preview have it
            const updatedContent = await this.plugin.app.vault.read(activeFile);
            view.data = updatedContent;

            // Force the reading-mode preview to re-render with the new content
            view.previewMode.rerender(false);
        }
    }

    // Dynamically update the TOC
    private async updateAutoToc(): Promise<void> {
        const tocInsertRange: EditorRange = this.validator.tocInsertPos;
        const newTocBlock: string = this.generateToc();
        await this.insertTocBlock(newTocBlock, tocInsertRange);
    }
}
