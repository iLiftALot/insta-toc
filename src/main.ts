import {
	App,
	CachedMetadata,
	Editor,
	EditorPosition,
	EditorRange,
	HeadingCache,
	MarkdownFileInfo,
	MarkdownPostProcessorContext,
	MarkdownRenderer,
	Plugin,
	PluginManifest,
	SectionCache,
	TFile
} from 'obsidian';
import { InstaTocSettings, DEFAULT_SETTINGS } from './Settings';
import { SettingTab } from './SettingsTab';
import { deepmerge } from 'deepmerge-ts';
import { debounce } from 'Utility';


export default class InstaTocPlugin extends Plugin {
	public app: App;
	public settings: InstaTocSettings;

	constructor(app: App, manifest?: PluginManifest) {
		const mainManifest = manifest ?? Process.env.pluginManifest;
		super(app, mainManifest);
		this.app = app;
	}

	async onload(): Promise<void> {
		console.log('Loading Insta TOC Plugin');

		await this.loadSettings();
		this.addSettingTab(new SettingTab(this.app, this));

		// Custom codeblock processor for the insta-toc codeblock
		this.registerMarkdownCodeBlockProcessor(
			"insta-toc",
			async (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext): Promise<void> => {
				const pathWithFileExtension: string = ctx.sourcePath; // Includes .md
				const filePath: string = pathWithFileExtension.substring(0, pathWithFileExtension.lastIndexOf("."));

				const listRegex: RegExp = /^(\s*)-\s*(.*)/; // Regex to match leading spaces/tabs, bullet, and content
				const lines: string[] = source.split('\n'); // insta-toc codeblock content

				// Process the codeblock text by converting each line into a markdown link list item
				const processedSource: string = lines.map((line) => {
					const match: RegExpMatchArray | null = line.match(listRegex);
					if (!match) return line;

					const [, indent, contentText]: RegExpMatchArray = match;
					const navLink = `${filePath}#${contentText}`;

					return `${indent}- [[${navLink}|${contentText}]]`;
				})
					.join('\n');

				// Now render the markdown
				await MarkdownRenderer.render(this.app, processedSource, el, pathWithFileExtension, this);
			}
		);

		// Detect when the user types and update headers
		this.registerEvent(
			this.app.vault.on(
				"modify",
				debounce(this.handleEditorChange.bind(this), 2000)
			)
		);
	}

	onunload(): void {
		console.log('Unloading Insta TOC Plugin');
	}

	async loadSettings(): Promise<void> {
		let mergedSettings = DEFAULT_SETTINGS;
		const settingsData = await this.loadData();
		if (settingsData) {
			mergedSettings = deepmerge(DEFAULT_SETTINGS, settingsData);
		}
		this.settings = mergedSettings;
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
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

	// Generates a new insta-toc codeblock
	private generateToc(fileHeadings: HeadingCache[]): string {
		const tocHeadingRefs: string[] = [];

		// Iterate each heading cache object to generate the new TOC content
		if (fileHeadings.length > 0) {
			fileHeadings.forEach((headingCache: HeadingCache) => {
				const headingLevel: number = headingCache.level;
				const headingText: string = headingCache.heading;
				const tocHeadingRef = `${' '.repeat((headingLevel - 1) * 4)}- ${headingText}`;

				tocHeadingRefs.push(tocHeadingRef);
			});
		}

		const tocContent: string = tocHeadingRefs.join('\n');
		return `\`\`\`insta-toc\n${tocContent}\n\`\`\``;
	}

	// Dynamically update the TOC
	private updateAutoToc(editor: Editor, file: TFile): void {
		// Extract the headings and sections from the active file's cache
		const fileCache: CachedMetadata | null = this.app.metadataCache.getFileCache(file);
		const fileHeadings: HeadingCache[] = fileCache?.headings ?? [];
		const instaTocSection: SectionCache | undefined = fileCache?.sections
			? fileCache.sections.find(
				(section: SectionCache) => section.type === 'code' &&
					editor.getLine(section.position.start.line) === '```insta-toc'
			) : undefined;

		// Return early if no sections (which means no insta-toc blocks)
		if (!instaTocSection) return;

		// Get the insertion position and generate the updated TOC
		const tocInsertRange: EditorRange = this.getTocInsertPosition(instaTocSection);
		const newTocBlock = this.generateToc(fileHeadings);

		// Replace the old TOC with the updated TOC
		editor.replaceRange(newTocBlock, tocInsertRange.from, tocInsertRange.to);
	}

	// Main control method to handle all active file changes
	private async handleEditorChange(): Promise<void> {
		const activeEditor: MarkdownFileInfo | null = this.app.workspace.activeEditor;
		const editor: Editor | undefined = activeEditor?.editor;
		const file: TFile | undefined = activeEditor?.file ?? undefined;

		if (!activeEditor || !editor || !file) return;

		// Dynamically update the insta-toc codeblock
		this.updateAutoToc(editor, file);
	}
}