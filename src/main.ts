import {
	App,
	Editor,
	EditorPosition,
	EventRef,
	MarkdownFileInfo,
	MarkdownPostProcessorContext,
	MarkdownView,
	Plugin,
	PluginManifest,
	TFile
} from 'obsidian';
import { AutoTocSettings, DEFAULT_SETTINGS } from './settings/Settings';
import { SettingTab } from './settings/SettingsTab';
import { deepmerge } from 'deepmerge-ts';
import * as knownHeadersJson from './headers.json';
import { debounce } from './utils/debounce';
import { MetadataEditor, PropertyEntryData } from 'obsidian-typings';


export default class AutoToc extends Plugin {
	public static app: App;
	//public static get vault_name() { return Process.env.vaultName }
	//public static settingsConfigPath = `${Process.env.pluginRoot.replace(
	//	new RegExp(`[A-Za-z0-9_-\\s/]+?${decodeURI(Process.env.vaultName)}/`, 'g'),
	//	''
	//)}/data.json`;
	public settings: AutoTocSettings;
	public headersObject: Record<string, string[]> = (knownHeadersJson as any).default;
	//private
	knownHeaders: Map<string, Set<string>> = new Map();

	constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);
		this.app = app;

		this.loadSettings().then(() => {
			// Load known headers from JSON
			this.initKnownHeaders();
		});
	}

	async onload() {
		console.log('Loading Auto Toc Plugin');

		await this.loadSettings();
		this.addSettingTab(new SettingTab(this.app, this));

		// Step 1: Create a custom codeblock processor for the table of contents
		this.registerMarkdownCodeBlockProcessor(
			"auto-toc",
			(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext): void => {
				const pathWithFileExtension: string = ctx.sourcePath; 
				const filePath: string = pathWithFileExtension.substring(0, pathWithFileExtension.lastIndexOf("."));

				// Create the container for the table of contents
				const tocContainer: HTMLDivElement = this.createListLink(source, filePath, document.createElement('div'));
				tocContainer.classList.add('auto-toc-container');

				el.appendChild(tocContainer);
			}
		);

		// Step 2: Obtain all headers and update storages within the file when opened
		this.registerEvent(
			this.app.workspace.on(
				"file-open",
				async (file: TFile | null): Promise<EventRef | void> => {
					if (!file) return;

					const headers: Set<string> = new Set<string>();
					const headerRegex: RegExp = /^#+\s(.+)$/gm; // Heading text excluding all "#"
					const fileContents: string = await this.app.vault.read(file); // All file content
					
					// Extract headers from the file
					let match: RegExpExecArray | null;
					while ((match = headerRegex.exec(fileContents)) !== null) {
						// Store full heading including '#' symbols
						headers.add(`${match[1]} ${match[2]}`);
					}

					// Update known headers class storage
					const filePath: string = file.path;
					const existingHeaders: Set<string> = this.knownHeaders.get(filePath) || new Set<string>();

					// Add new headers
					headers.forEach((header: string): void => {
						if (!existingHeaders.has(header)) {
							existingHeaders.add(header);
						}
					});

					// Remove headers that no longer exist
					existingHeaders.forEach((header: string): void => {
						if (!headers.has(header)) {
							existingHeaders.delete(header);
						}
					});

					// Save updated headers to both JSON and class storage
					this.knownHeaders.set(filePath, existingHeaders);
					await this.saveKnownHeaders();
				}
			)
		);

		// Step 3: Detect when the user types and update headers
		this.registerEvent(
			this.app.vault.on(
				"modify",
				debounce(this.handleEditorChange.bind(this), 500)
			)
		);

		// Load known headers from JSON
		this.initKnownHeaders();
	}

	onunload() {
		console.log('Unloading Auto Toc Plugin');
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

	async onExternalSettingsChange() {
		await this.saveSettings();
	}

	// Save known headers to JSON storage
	private async saveKnownHeaders(): Promise<void> {
		const headersObject: Record<string, string[]> = {};
		
		// Add all current headers to the object and write it to the JSON file
		this.knownHeaders.forEach((headers: Set<string>, filePath: string) => {
			headersObject[filePath] = Array.from(headers);
		});
		await this.app.vault.adapter.write('.obsidian/plugins/auto-toc/src/headers.json', JSON.stringify(headersObject, null, 2));
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

	// Generate HTML link/list item -> append to main TOC container
	private createListLink(content: string, filePath: string, tocContainer: HTMLDivElement): HTMLDivElement {
		const lines: string[] = content.split('\n');

		// Create list element and set indent level
		const createListItem = (level: number): HTMLLIElement => {
			const li: HTMLLIElement = document.createElement('li');
			li.style.marginLeft = `${level * 20}px`; // Indent based on heading level

			return li;
		}

		// Create link element with Obsidian link properties
		const createLink = (filePath: string, headingText: string): HTMLAnchorElement => {
			const a: HTMLAnchorElement = document.createElement('a');
			const navLink = `${filePath}#${headingText}`; // Ensures navigation to heading on click
			const ariaLabel = `${filePath} > ${headingText}`;

			a.innerHTML = headingText; // Set inner HTML to header text excluding all "#"
			a.setAttrs({
				"href": navLink,
				"data-href": navLink,
				"aria-label": ariaLabel,
				"text": headingText,
				"class": "internal-link",
				"target": "_blank",
				"ref": "noopener nofollow",
				"data-tooltip-position": "top"
			});

			return a;
		}

		// Iterate over each line to create list items and append to listItem then tocContainer
		lines.forEach((line: string): void => {
			const match: RegExpMatchArray | null = line.match(/^(\s*)- (.+)$/);
			if (match) {
				const indent: number = match[1].length; // Amount of '#'
				const level: number = indent / 4; 		// 4 spaces per indent level
				const headingText: string = match[2]; 	// Text within heading excluding all '#'

				const link: HTMLAnchorElement = createLink(filePath, headingText); // Generate HTML link
				const listItem: HTMLLIElement = createListItem(level); // Generate HTML list item

				listItem.appendChild(link); 			// Append HTML link to the list item
				tocContainer.appendChild(listItem);		// Append HTML list item to main toc container
			}
		});

		return tocContainer;
	}

	// Load known headers from JSON storage
	private initKnownHeaders(): void {
		const headers: Record<string, string[]> = this.headersObject;
		
		try {
			Object.entries(headers).forEach(([filePath, headers]) => {
				if (Array.isArray(headers)) {
					this.knownHeaders.set(filePath, new Set(headers));
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
		const tocRegex: RegExp = /^```auto-toc\n([\s\S]*?)\n```/gm;
		const fileContents: string = editor.getValue();
		const fileHeadings: RegExpExecArray | null = tocRegex.exec(fileContents);

		if (fileHeadings) { // File has headings present
			// Obtain the active file's headings, or create a new set if not present
			const headers: Set<string> = this.knownHeaders.get(filePath) || new Set<string>();

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
			const newTocBlock = `\`\`\`auto-toc\n${tocContent}\n\`\`\``;
			editor.replaceRange(newTocBlock, tocStartPos, tocEndPos);
		
		} else if (activeEditor) { // File doesn't have headings present
			// Handle editor position while accounting for potential file properties
			const insertPos: EditorPosition = this.getTocInsertPosition(activeEditor);
			const headers: Set<string> = this.knownHeaders.get(filePath) || new Set<string>();

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
			const newTocBlock = `\`\`\`auto-toc\n${tocContent}\n\`\`\`\n\n`;
			editor.replaceRange(newTocBlock, insertPos);
		}
	}

	// Main control method to handle all active file changes
	private async handleEditorChange(file: TFile): Promise<void> {
		const editor: Editor | undefined = this.app.workspace.getActiveViewOfType(MarkdownView)?.editor;

		if (editor && file) {
			const fileContents: string = editor.getValue();
			const headers: Set<string> = new Set<string>();
			const headerRegex: RegExp = /^(#+)\s+(.+)$/gm;
			
			// Extract all headings from the file
			let match: RegExpExecArray | null;
			while ((match = headerRegex.exec(fileContents)) !== null) {
				headers.add(`${match[1]} ${match[2]}`); // Store full heading including '#' symbols
			}

			// Update the known headers storage
			const filePath: string = file.path;
			const existingHeaders: Set<string> = this.knownHeaders.get(filePath) || new Set<string>();

			// Add new headings
			headers.forEach((header: string): void => {
				existingHeaders.add(header);
			});

			// Remove headings that no longer exist
			existingHeaders.forEach((header: string): void => {
				if (!headers.has(header)) {
					existingHeaders.delete(header);
				}
			});

			// Update the class mapping (Map<string, Set<string>>) of the JSON headers
			this.knownHeaders.set(filePath, existingHeaders);

			// Save updated headers to the JSON file
			await this.saveKnownHeaders();

			// Dynamically update the auto-toc codeblock
			this.updateAutoToc(editor, filePath);
		}
	}
}
