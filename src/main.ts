import { App, Editor, MarkdownFileInfo, MarkdownPostProcessorContext, MarkdownView, Plugin, PluginManifest, TFile } from 'obsidian';
import { AutoTocSettings, DEFAULT_SETTINGS } from './settings/Settings';
import { SettingTab } from './settings/SettingsTab';
import { deepmerge } from 'deepmerge-ts';
import { TocGenerator } from './tocGen';



export default class AutoToc extends Plugin {
	public static app: App;
	public static get vault_name() { return Process.env.vaultName }
	public static settingsConfigPath = `${Process.env.pluginRoot.replace(
		new RegExp(`[A-Za-z0-9_-\\s/]+?${decodeURI(Process.env.vaultName)}/`, 'g'),
		''
	)}/data.json`;
	public settings: AutoTocSettings;
	public manifest: PluginManifest;

	public currentLine: string;
	public isFile: boolean;
	public hasToc: boolean;
	public shouldGenerateToc: boolean;

	constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);
		this.app = app;
		this.manifest = manifest;

		this.currentLine = "";
		this.isFile = false;
		this.hasToc = false;

		this.loadSettings().then(() => {
			this.shouldGenerateToc = this.settings.shouldGenToc;
		})
	}

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new SettingTab(this.app, this));

		console.log('Loading Auto Toc Plugin');


		this.registerMarkdownCodeBlockProcessor(
			"auto-toc",
			(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
				
			}
		)

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
				}
			)
		)

		this.registerEvent( // detect when the user types
			this.app.workspace.on(
				"editor-change",
				(editor: Editor, info: MarkdownView | MarkdownFileInfo) => {
					const editorState = editor.activeCm?.state;
					const file = info.file;

					if (editorState && file && info instanceof MarkdownView) {
						const currentLineNumber = editorState.selection.main.head;
						const currentLineText = editorState.doc.lineAt(currentLineNumber).text;
						const tocGen = new TocGenerator(this.app, this, this.settings, file, editor);
					}
				}
			)
		)
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
}
