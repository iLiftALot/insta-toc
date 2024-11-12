import {
	App,
	Editor,
	EditorPosition,
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


export default class AutoToc extends Plugin {
	public static app: App;
	//public static get vault_name() { return Process.env.vaultName }
	//public static settingsConfigPath = `${Process.env.pluginRoot.replace(
	//	new RegExp(`[A-Za-z0-9_-\\s/]+?${decodeURI(Process.env.vaultName)}/`, 'g'),
	//	''
	//)}/data.json`;
	public settings: AutoTocSettings;
	public manifest: PluginManifest;

	public currentLine: string;
	public isFile: boolean;
	public hasToc: boolean;
	public shouldGenerateToc: boolean;
	
	public headersObject: Record<string, string[]> = (knownHeadersJson as any).default;
	//private
	knownHeaders: Map<string, Set<string>> = new Map();

	constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);
		this.app = app;
		this.manifest = manifest;

		this.currentLine = "";
		this.isFile = false;
		this.hasToc = false;

		this.loadSettings().then(() => {
			// Load known headers from JSON
			this.initKnownHeaders();
		})
	}

	async onload() {
		console.log('Loading Auto Toc Plugin');

		await this.loadSettings();
		this.addSettingTab(new SettingTab(this.app, this));

		this.registerMarkdownCodeBlockProcessor(
			"auto-toc",
			(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
				// Split the source into lines
				const lines = source.split('\n');

				// Create a container for the table of contents
				const tocContainer = document.createElement('div');
				tocContainer.classList.add('auto-toc-container');

				// Function to create a list item
				const createListItem = (text: string, level: number) => {
					const li = document.createElement('li');
					li.textContent = text;
					li.style.marginLeft = `${level * 20}px`; // Indent based on heading level
					return li;
				}

				// Iterate over each line and create list items
				lines.forEach(line => {
					const match = line.match(/^(\s*)- (.+)$/);
					if (match) {
						const indent = match[1].length;
						const text = match[2];
						const level = indent / 4; // Assuming 4 spaces per indent level
						const listItem = createListItem(text, level);
						tocContainer.appendChild(listItem);
					}
				})

				// Append the container to the element
				el.appendChild(tocContainer);
			}
		)

		// Step 2: Obtain all headers within the file when opened
		this.registerEvent(
			this.app.workspace.on(
				"file-open",
				async (file: TFile | null) => {
					if (!file) {
						this.isFile = false;
						this.hasToc = false;
						this.currentLine = "";
						return;
					}

					const fileContents = await this.app.vault.read(file);
					this.isFile = true;
					this.hasToc = fileContents.match(/^>\s\[!\w+?\]\sTable of Contents/gm) !== null;

					// Extract headers from the file
					const headers = new Set<string>();
					const headerRegex = /^#+\s(.+)$/gm;
					let match;

					while ((match = headerRegex.exec(fileContents)) !== null) {
						headers.add(match[1]);
					}

					// Step 3: Update known headers storage
					const filePath = file.path;
					const existingHeaders = this.knownHeaders.get(filePath) || new Set<string>();

					// Add new headers
					headers.forEach(header => {
						if (!existingHeaders.has(header)) {
							existingHeaders.add(header);
						}
					});

					// Remove headers that no longer exist
					existingHeaders.forEach(header => {
						if (!headers.has(header)) {
							existingHeaders.delete(header);
						}
					});

					this.knownHeaders.set(filePath, existingHeaders);

					// Save updated headers to JSON
					await this.saveKnownHeaders();
				}
			)
		);

		// Step 4: Detect when the user types and update headers
		this.registerEvent(
			this.app.workspace.on(
				"editor-change",
				debounce(this.handleEditorChange.bind(this), 500)
			)
		);

		//console.log(JSON.stringify(this.headersObject, null, 4))
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

	// Method to save known headers to JSON
	private async saveKnownHeaders(): Promise<void> {
		const headersObject: Record<string, string[]> = {};
		this.knownHeaders.forEach((headers, filePath) => {
			headersObject[filePath] = Array.from(headers);
		});
		await this.app.vault.adapter.write('.obsidian/plugins/auto-toc/src/headers.json', JSON.stringify(headersObject, null, 2));
	}

	// Load known headers from JSON
	private initKnownHeaders(): void {
		const headers = this.headersObject;
		try {
			Object.entries(headers).forEach(([filePath, headers]) => {
			if (Array.isArray(headers)) {
				this.knownHeaders.set(filePath, new Set(headers));
			} else {
				console.error(`Invalid headers for "${filePath}": ${headers}\ntypeof headers === ${typeof headers} <--> typeof filePath === ${typeof filePath}\n${console.log(this.knownHeaders)}`);
			}
			});
		} catch (error) {
			console.error("Failed to initialize known headers:", error);
		}
	}

	private updateAutoToc(editor: Editor, filePath: string) {
		const fileContents = editor.getValue();
		const tocRegex = /^```auto-toc\n([\s\S]*?)\n```/gm;
		let match = tocRegex.exec(fileContents);

		if (match) {
			const tocStartPos = editor.offsetToPos(match.index);
			const tocEndPos = editor.offsetToPos(match.index + match[0].length);
			const headers = this.knownHeaders.get(filePath) || new Set<string>();

			// Generate the new TOC content
			const tocContent = Array.from(headers)
				.map((header: string) => {
					const levelMatch = header.match(/^(#+)\s+/);
					const level = levelMatch ? levelMatch[1].length : 1;
					const text = header.replace(/^#+\s+/, '');
					console.log(level);
					return `${' '.repeat((level - 1) * 4)}- ${text}`;
				})
				.join('\n');

			const newTocBlock = `\`\`\`auto-toc\n${tocContent}\n\`\`\``;

			// Replace the old TOC with the new content
			editor.replaceRange(newTocBlock, tocStartPos, tocEndPos);
		} else {
			// Insert the TOC at the top of the document if it doesn't exist
			const insertPos = { line: 0, ch: 0 };
			const headers = this.knownHeaders.get(filePath) || new Set<string>();

			// Generate the TOC content
			const tocContent = Array.from(headers)
				.map((header: string) => {
					const levelMatch = header.match(/^(#+)\s+/);
					const level = levelMatch ? levelMatch[1].length : 1;
					const text = header.replace(/^#+\s+/, '');
					return `${' '.repeat((level - 1) * 4)}- ${text}`;
				})
				.join('\n');

			const newTocBlock = `\`\`\`auto-toc\n${tocContent}\n\`\`\`\n\n`;

			// Insert the TOC at the determined position
			editor.replaceRange(newTocBlock, insertPos);
		}
	}

	private async handleEditorChange(editor: Editor, info: MarkdownView | MarkdownFileInfo) {
		const file = info.file;

		if (editor && file && info instanceof MarkdownView) {
			const currentLineNumber = editor.getCursor("head").line;
			const currentLineText = editor.getLine(currentLineNumber);

			// Check if the user is typing a heading
			const headingMatch = currentLineText.match(/^(#+)\s+(.+)$/);
			if (headingMatch) {
				const level = headingMatch[1].length;
				const headingText = headingMatch[2];

				// Update the known headers storage
				const filePath = file.path;
				const existingHeaders = this.knownHeaders.get(filePath) || new Set<string>();
				if (!existingHeaders.has(headingText)) {
					existingHeaders.add(headingText);
					this.knownHeaders.set(filePath, existingHeaders);

					// Save updated headers to JSON
					await this.saveKnownHeaders();
				}

				// Dynamically update the auto-toc block
				this.updateAutoToc(editor, filePath);
			}
		}
	}
}
