import { App, PluginSettingTab, Setting } from 'obsidian';
import InstaToc from './main';

export class SettingTab extends PluginSettingTab {
    plugin: InstaToc;

    constructor(app: App, plugin: InstaToc) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        new Setting(containerEl)
            .setName('Setting #1')
            .setDesc('It\'s a secret')
            .addText(text => text
                .setPlaceholder('Enter your secret')
                .setValue(this.plugin.settings.tocString)
                .onChange(async (value) => {
                    this.plugin.settings.tocString = value;
                    await this.plugin.saveSettings();
                }));
    }
}