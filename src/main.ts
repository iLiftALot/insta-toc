import {
	App,
	Editor,
	EventRef,
	MarkdownFileInfo,
	MarkdownPostProcessorContext,
	MarkdownRenderer,
	Plugin,
	PluginManifest,
	TFile,
	debounce
} from 'obsidian';
import { deepmerge } from 'deepmerge-ts';
import { InstaTocSettings, DEFAULT_SETTINGS } from './Settings';
import { SettingTab } from './SettingsTab';
import { ManageToc } from './ManageToc';
import { configureRenderedIndent, handleCodeblockListItem } from './Utils';
import { listRegex } from './constants';


export default class InstaTocPlugin extends Plugin {
	public app: App;
	public settings: InstaTocSettings;
	private modifyEventRef: EventRef | null = null;

	constructor(app: App, manifest?: PluginManifest) {
		const mainManifest = manifest ?? Process.env.pluginManifest;
		super(app, mainManifest);
		this.app = app;
	}

	async onload(): Promise<void> {
		console.log(`Loading Insta TOC Plugin ${Process.env.pluginVersion}`);

		await this.loadSettings();
		this.addSettingTab(new SettingTab(this.app, this));

		// Custom codeblock processor for the insta-toc codeblock
		this.registerMarkdownCodeBlockProcessor(
			"insta-toc",
			async (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext): Promise<void> => {
				const pathWithFileExtension: string = ctx.sourcePath; // Includes .md
				const filePath: string = pathWithFileExtension.substring(0, pathWithFileExtension.lastIndexOf("."));
				const file: TFile = this.app.vault.getAbstractFileByPath(pathWithFileExtension) as TFile;

				const lines: string[] = source.split('\n'); // TOC codeblock content
				const headingLevels: number[] = []; // To store heading levels corresponding to each line

				// Process the codeblock text by converting each line into a markdown link list item
				const processedSource: string = lines.map((line) => {
					const match: RegExpMatchArray | null = line.match(listRegex);
					if (!match) return line;

					const { indent, bullet, navLink } = handleCodeblockListItem(this.app, this, file, match, filePath);

					// Calculate heading level based on indentation
					const indentLevel = Math.floor(indent.length / 4); // Each indent level represents one heading level increment
					const headingLevel: number = indentLevel + 1; // H1 corresponds to no indentation
					headingLevels.push(headingLevel);

					return `${indent}${bullet} ${navLink}`;
				}).join('\n');

				// Now render the markdown
				await MarkdownRenderer.render(this.app, processedSource, el, pathWithFileExtension, this);

				// Configure indentation once rendered
				configureRenderedIndent(el, headingLevels, this.settings.indentSize);
			}
		);

		// Detect when the user types and update headers
		this.updateModifyEventListener();
	}

	onunload(): void {
		console.log(`Unloading Insta TOC Plugin ${Process.env.pluginVersion}`);
	}

	async loadSettings(): Promise<void> {
		let mergedSettings: InstaTocSettings = DEFAULT_SETTINGS;
		const settingsData: InstaTocSettings = await this.loadData();
		
		if (settingsData) {
			mergedSettings = deepmerge(DEFAULT_SETTINGS, settingsData);
		}

		this.settings = mergedSettings;
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	// Dynamically update the debounce delay for ToC updates
	public updateModifyEventListener(): void {
		if (this.modifyEventRef) {
			// Unregister the previous event listener
			this.app.vault.offref(this.modifyEventRef);
		}

		// Register the new event listener with the updated debounce delay
		this.modifyEventRef = this.app.metadataCache.on(
			"changed",
			debounce(this.handleEditorChange.bind(this), this.settings.updateDelay, true)
		);

		this.registerEvent(this.modifyEventRef);
	}

	// Handle all active file changes for the insta-toc plaintext content
	private async handleEditorChange(): Promise<void> {
		const activeEditor: MarkdownFileInfo | null = this.app.workspace.activeEditor;
		const editor: Editor | undefined = activeEditor?.editor;
		const file: TFile | undefined = activeEditor?.file ?? undefined;

		if (!activeEditor || !editor || !file) return;

		// Dynamically update the insta-toc codeblock
		new ManageToc(this.app, this, editor, file);
	}
}