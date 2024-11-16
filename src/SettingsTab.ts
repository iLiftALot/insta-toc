import { App, DropdownComponent, PluginSettingTab, Setting, SliderComponent } from 'obsidian';
import InstaToc from './main';
import { BulletType, IndentLevel, UpdateDelay } from './Settings';

const BulletTypes = {
    dash: 'dash',
    number: 'number',
}

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
            .setName('List Bullet Type')
            .setDesc('Select the list bullet type.')
            .addDropdown((component: DropdownComponent) => 
                component
                    .addOptions(BulletTypes)
                    .setValue(this.plugin.settings.bulletType)
                    .onChange(async (value: BulletType) => {
                        this.plugin.settings.bulletType = value;
                        await this.plugin.saveSettings();
                    })
        )

        new Setting(containerEl)
            .setName('Indent Size')
            .setDesc('Select the indentation size.')
            .addSlider((component: SliderComponent) =>
                component
                    .setLimits(2, 8, 2)
                    .setDynamicTooltip()
                    .setInstant(true)
                    .setValue(this.plugin.settings.indentSize)
                    .onChange(async (value: IndentLevel) => {
                        this.plugin.settings.indentSize = value;
                        await this.plugin.saveSettings();
                    })
            )

        new Setting(containerEl)
            .setName('Update Delay')
            .setDesc('The delay for each TOC update.')
            .addSlider((component: SliderComponent) => {
                component
                    .setLimits(500, 10000, 500)
                    .setDynamicTooltip()
                    .setInstant(true)
                    .setValue(this.plugin.settings.updateDelay)
                    .onChange(async (value: UpdateDelay) => {
                        this.plugin.settings.updateDelay = value;
                        await this.plugin.saveSettings();
                    })
            })
    }
}