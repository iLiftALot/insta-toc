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
import { ManageToc } from './ManageToc';


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
		//this.addSettingTab(new SettingTab(this.app, this));

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

	// Main control method to handle all active file changes
	private async handleEditorChange(): Promise<void> {
		const activeEditor: MarkdownFileInfo | null = this.app.workspace.activeEditor;
		const editor: Editor | undefined = activeEditor?.editor;
		const file: TFile | undefined = activeEditor?.file ?? undefined;

		if (!activeEditor || !editor || !file) return;

		// Dynamically update the insta-toc codeblock
		new ManageToc(this.app, this, editor, file);
	}
}