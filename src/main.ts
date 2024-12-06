import {
	App,
	CachedMetadata,
	Debouncer,
	EventRef,
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
import { configureRenderedIndent, getEditorData, handleCodeblockListItem } from './Utils';
import { listRegex, localTocSettingsRegex } from './constants';
import { EditorData } from './types';
import { Validator } from './validator';


export default class InstaTocPlugin extends Plugin {
	public app: App;
	public settings: InstaTocSettings;
	private validator: Validator | undefined;
	private modifyEventRef: EventRef | undefined;
	private debouncer: Debouncer<[fileCache: CachedMetadata], void>;

	// Flags to maintain state with updates
	public isPluginEdit = false;
	public hasTocBlock = true;

	public getDelay = () => this.settings.updateDelay;

	constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);
		this.app = app;
	}

	async onload(): Promise<void> {
		console.log(`Loading Insta TOC Plugin`);

		await this.loadSettings();
		this.addSettingTab(new SettingTab(this.app, this));

		// Custom codeblock processor for the insta-toc codeblock
		this.registerMarkdownCodeBlockProcessor(
			"insta-toc",
			async (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext): Promise<void> => {
				if (!this.hasTocBlock) {
					this.hasTocBlock = true;
				}

				const pathWithFileExtension: string = ctx.sourcePath; // Includes .md
				const filePath: string = pathWithFileExtension.substring(0, pathWithFileExtension.lastIndexOf("."));
				const file: TFile = this.app.vault.getAbstractFileByPath(pathWithFileExtension) as TFile;
				// TOC codeblock content
				const lines: string[] = source
					.replace(localTocSettingsRegex, '') // Process only the ToC content without local settings
					.split('\n');
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

		this.registerEvent(
			// Reset with new files to fix no detection on file open
			this.app.workspace.on("file-open", () => this.hasTocBlock = true)
		);

		this.updateModifyEventListener();
	}

	onunload(): void {
		console.log(`Insta TOC Plugin Unloaded.`);
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
			this.app.metadataCache.offref(this.modifyEventRef);
		}

		this.setDebouncer();
		
		// Register the new event listener with the updated debounce delay
		this.modifyEventRef = this.app.metadataCache.on(
			"changed", // file cache (containing heading cache) has been updated
			(file: TFile, data: string, cache: CachedMetadata) => {
				if (!this.hasTocBlock) return;

				this.debouncer(cache);
			}
		);

		this.registerEvent(this.modifyEventRef);
	}

	// Needed for dynamically setting the debounce delay
	public setDebouncer(): void {
		this.debouncer = debounce(
			(fileCache: CachedMetadata) => {
				// Ignore updates performed by ManageToc.ts
				if (this.isPluginEdit) {
					this.isPluginEdit = false;
					return;
				}

				const { editor, cursorPos }: EditorData = getEditorData(this.app);

				if (!editor || !cursorPos) return;

				// Reuse and update the existing validator instance if it exists
				if (this.validator) {
					this.validator.update(this, fileCache, editor, cursorPos);
				} else {
					this.validator = new Validator(this, fileCache, editor, cursorPos);
				}

				const isValid: boolean = this.validator.isValid();

				if (isValid) {
					// Handle all active file changes for the insta-toc plaintext content
					new ManageToc(this, this.validator);
				}
			}, this.settings.updateDelay, false
		);
	}
}