import { App, Plugin, PluginManifest } from 'obsidian';
import { AutoTocSettings, DEFAULT_SETTINGS } from './settings/Settings';
import { SettingTab } from './settings/SettingsTab';
import { deepmerge } from 'deepmerge-ts';

export default class AutoToc extends Plugin {
	public static app: App;
	public static get vault_name() { return Process.env.vaultName }
	public static settingsConfigPath = `${Process.env.pluginRoot.replace(
		new RegExp(`[A-Za-z0-9_-\\s/]+?${decodeURI(Process.env.vaultName)}/`, 'g'),
		''
	)}/data.json`;
	settings: AutoTocSettings;
	manifest: PluginManifest;

	constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);
		this.app = app;
		this.manifest = manifest;
	}

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new SettingTab(this.app, this));

		console.log('Loading Auto Toc Plugin');

		
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
