import {
	App,
	Editor,
	MarkdownFileInfo,
	MarkdownPostProcessorContext,
	MarkdownRenderer,
	Plugin,
	PluginManifest,
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
		this.addSettingTab(new SettingTab(this.app, this));

		// Custom codeblock processor for the insta-toc codeblock
		this.registerMarkdownCodeBlockProcessor(
			"insta-toc",
			async (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext): Promise<void> => {
				const pathWithFileExtension: string = ctx.sourcePath; // Includes .md
				const filePath: string = pathWithFileExtension.substring(0, pathWithFileExtension.lastIndexOf("."));

				const listRegex: RegExp = /^(\s*)(-|\d+(?:\.\d+)*|\d\.)\s+(.*)/; // Matches indent, bullet, and content
				const lines: string[] = source.split('\n'); // TOC codeblock content
				const headingLevels: number[] = []; // To store heading levels corresponding to each line

				// Process the codeblock text by converting each line into a markdown link list item
				const processedSource: string = lines.map((line) => {
					const match: RegExpMatchArray | null = line.match(listRegex);
					
					if (!match) return line;

					const [, indent, bullet, contentText]: RegExpMatchArray = match;
					const navLink = `${filePath}#${contentText}`;

					const headingLevel: number = Math.floor(indent.length / 4) + 1;
					headingLevels.push(headingLevel);

					return `${indent}${bullet} [[${navLink}|${contentText}]]`;
				}).join('\n');

				// Now render the markdown
				await MarkdownRenderer.render(this.app, processedSource, el, pathWithFileExtension, this);

				// Customize Indentation
				const indentSize = this.settings.indentSize;
				const listItems = el.querySelectorAll('li');
				listItems.forEach((listItem: HTMLLIElement, index: number) => {
					const headingLevel = headingLevels[index];

					// Only adjust indentation for headings beyond H1 (headingLevel > 1)
					if (headingLevel > 1) {
						listItem.style.marginLeft = `${indentSize * 10}px`;
					}
				});
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