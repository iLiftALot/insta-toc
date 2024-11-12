import {
	App,
	Editor,
	EditorPosition,
	EventRef,
	MarkdownFileInfo,
	MarkdownPostProcessorContext,
	MarkdownRenderer,
	MarkdownView,
	Plugin,
	PluginManifest,
	TFile
} from 'obsidian';
import { AutoTocSettings, DEFAULT_SETTINGS } from './settings/Settings';
import { SettingTab } from './settings/SettingsTab';
import { deepmerge } from 'deepmerge-ts';
import * as knownHeadersJson from './headers.json';
import { debounce } from 'Utility';
import { MetadataEditor, PropertyEntryData } from 'obsidian-typings';


export default class AutoToc extends Plugin {
	public app: App;

	private settings: AutoTocSettings;
	private headersObject: Record<string, string[]> = (knownHeadersJson as any).default;
	private knownHeaders: Map<string, string[]> = new Map();
	private relativePluginRoot = Process.env.pluginRoot.replace(
		new RegExp(`[A-Za-z0-9_-\\s/]+?${decodeURI(Process.env.vaultName)}/`, 'g'),
		''
	);

	constructor(app: App, manifest?: PluginManifest) {
		const mainManifest = manifest ?? Process.env.pluginManifest;
		
		super(app, mainManifest);
		this.app = app;
		
		this.loadSettings().then(() => {
			// Load known headers from JSON
			this.initKnownHeaders();
		});
	}

	async onload() {
		console.log('Loading Insta TOC Plugin');

		await this.loadSettings();
		this.addSettingTab(new SettingTab(this.app, this));

		// Step 1: Create a custom codeblock processor for the table of contents
		this.registerMarkdownCodeBlockProcessor(
			"insta-toc",
			async (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext): Promise<void> => {
				const pathWithFileExtension: string = ctx.sourcePath;
				const filePath: string = pathWithFileExtension.substring(0, pathWithFileExtension.lastIndexOf("."));

				const lines = source.split('\n');
				const processedLines = lines.map((line) => {
					if (!line.trim()) return line;

					// Match leading spaces or tabs and the content
					const match = line.match(/^(\s*)(-)\s*(.*)/);
					if (!match) return line;

					const indent = match[1];
					const bullet = match[2];
					const contentText = match[3];
					const navLink = `${filePath}#${contentText}`;

					return `${indent}${bullet} [[${navLink}|${contentText}]]`;
				});

				const processedSource = processedLines.join('\n');

				// Now render the markdown
				await MarkdownRenderer.render(this.app, processedSource, el, ctx.sourcePath, this);
			}
		);

		// Step 2: Obtain all headers and update storages within the file when opened
		this.registerEvent(
			this.app.workspace.on(
				"file-open",
				async (file: TFile | null): Promise<EventRef | void> => {
					if (!file) return;

					const headers: string[] = []; // Used for live temporary storage for comparisons
					const headerRegex: RegExp = /^#+\s(.+)$/gm; // Heading text excluding all "#"
					const fileContents: string = await this.app.vault.read(file); // All file contents
					
					// Extract headers from the file
					let match: RegExpExecArray | null;
					while ((match = headerRegex.exec(fileContents)) !== null) {
						// Store full heading including '#' symbols
						headers.push(`${match[1]} ${match[2]}`);
					}

					// Update known headers class storage
					const filePath: string = file.path;

					// Save updated headers to both JSON and class storage
					this.knownHeaders.set(filePath, headers);
					await this.saveKnownHeaders();
				}
			)
		);

		// Step 3: Detect when the user types and update headers
		this.registerEvent(
			this.app.vault.on(
				"modify",
				debounce(this.handleEditorChange.bind(this), 2000)
			)
		);

		// Load known headers from JSON
		this.initKnownHeaders();
	}

	onunload() {
		console.log('Unloading Insta TOC Plugin');
	}

	async loadSettings() {
		let mergedSettings = DEFAULT_SETTINGS;
		const settingsData = await this.loadData();
		if (settingsData) {
			mergedSettings = deepmerge(DEFAULT_SETTINGS, settingsData);
		}
		this.settings = mergedSettings;
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	// Save known headers to JSON storage
	private async saveKnownHeaders(): Promise<void> {
		const headersObject: Record<string, string[]> = {};
		
		// Add all current headers to the object and write it to the JSON file
		this.knownHeaders.forEach((headers: string[], filePath: string) => {
			headersObject[filePath] = Array.from(headers);
		});
		await this.app.vault.adapter.write(`${this.relativePluginRoot}/src/headers.json`, JSON.stringify(headersObject, null, 4));
	}

	// Check for file properties and adjust insertion position accordingly
	private getTocInsertPosition(activeEditor: MarkdownFileInfo): EditorPosition {
		let insertPosition: EditorPosition = { line: 0, ch: 0 }; // Initially position for top of document
		
		const metaDataEditor: MetadataEditor | undefined = activeEditor.metadataEditor;
		
		if (!metaDataEditor) return insertPosition; // No metadata present

		const fileProperties: PropertyEntryData<unknown>[] = metaDataEditor.properties;
		const fileHasProperties: boolean = fileProperties.length > 0;

		if (fileHasProperties) { // File contains metadata
			const fileContent: string = metaDataEditor.owner.data; // Entire file content string
			const propertyContent = fileContent.match(/^---[\s\S]*^---/gm) as RegExpMatchArray;
			const propertyLinesAmount: number = propertyContent[0].split('\n').length;
			
			insertPosition.line = propertyLinesAmount; // Adjust line to insert after properties
		}
		
		return insertPosition;
	}

	// Load known headers from JSON storage
	private initKnownHeaders(): void {
		const headers: Record<string, string[]> = this.headersObject;
		
		try {
			Object.entries(headers).forEach(([filePath, headers]) => {
				if (Array.isArray(headers)) {
					this.knownHeaders.set(filePath, headers);
				} else {
					console.error(`Invalid headers for "${filePath}": ${headers}`);
				}
			});
		} catch (error) {
			console.error("Failed to initialize known headers:\n", error);
		}
	}

	// Dynamically update the TOC
	private updateAutoToc(editor: Editor, filePath: string): void {
		const activeEditor: MarkdownFileInfo | null = this.app.workspace.activeEditor;
		const tocRegex: RegExp = /^```insta-toc\n([\s\S]*?)\n```/gm;
		const fileContents: string = editor.getValue();
		const fileHeadings: RegExpExecArray | null = tocRegex.exec(fileContents);

		if (fileHeadings) { // File has headings present
			// Obtain the active file's headings, or create a new set if not present
			const headers: string[] = this.knownHeaders.get(filePath) || [];

			// Obtain start/end insertion position from the RegExpExecArray index
			const tocStartPos: EditorPosition = editor.offsetToPos(fileHeadings.index);
			const tocEndPos: EditorPosition = editor.offsetToPos(fileHeadings.index + fileHeadings[0].length);

			// Generate the new TOC content
			const tocContent: string = Array.from(headers)
				.map((header: string) => {
					// Heading level based on amount of "#"
					const levelMatch: RegExpMatchArray | null = header.match(/^(#+)\s+/);
					const level: number = levelMatch ? levelMatch[1].length : 1;

					// Heading text excluding all "#"
					const text: string = header.replace(/^#+\s+/, '');
					
					return `${' '.repeat((level - 1) * 4)}- ${text}`;
				})
				.join('\n');
			
			// Replace the old TOC with the new content
			const newTocBlock = `\`\`\`insta-toc\n${tocContent}\n\`\`\``;
			editor.replaceRange(newTocBlock, tocStartPos, tocEndPos);
		
		} else if (activeEditor) { // File doesn't have headings present
			// Handle editor position while accounting for potential file properties
			const insertPos: EditorPosition = this.getTocInsertPosition(activeEditor);
			const headers: string[] = this.knownHeaders.get(filePath) || [];

			// Generate the TOC content
			const tocContent: string = Array.from(headers)
				.map((header: string) => {
					const levelMatch: RegExpMatchArray | null = header.match(/^(#+)\s+/);
					const level: number = levelMatch ? levelMatch[1].length : 1;
					const text: string = header.replace(/^#+\s+/, '');
					
					return `${' '.repeat((level - 1) * 4)}- ${text}`;
				})
				.join('\n');

			// Format and insert TOC at the determined position with new content
			const newTocBlock = `\`\`\`insta-toc\n${tocContent}\n\`\`\`\n\n`;
			editor.replaceRange(newTocBlock, insertPos);
		}
	}

	// Main control method to handle all active file changes
	private async handleEditorChange(file: TFile): Promise<void> {
		const editor: Editor | undefined = this.app.workspace.getActiveViewOfType(MarkdownView)?.editor;

		if (editor && file) {
			const fileContents: string = editor.getValue();
			const headers: string[] = [];
			const headerRegex: RegExp = /^(#+)\s+(.+)$/gm;
			
			// Extract all headings from the file
			let match: RegExpExecArray | null;
			while ((match = headerRegex.exec(fileContents)) !== null) {
				headers.push(`${match[1]} ${match[2]}`); // Store full heading including '#' symbols
			}

			// Update the known headers storage
			const filePath: string = file.path;
			this.knownHeaders.set(filePath, headers);

			// Save updated headers to the JSON file
			await this.saveKnownHeaders();

			// Dynamically update the insta-toc codeblock
			this.updateAutoToc(editor, filePath);
		}
	}
}
