import {
    App,
    DropdownComponent,
    PluginSettingTab,
    Setting,
    SliderComponent,
    TextAreaComponent,
    TextComponent
} from 'obsidian';
import InstaToc from './main';
import { BulletTypes } from './constants';
import { BulletType, IndentLevel, UpdateDelay } from "./types";


export class SettingTab extends PluginSettingTab {
    plugin: InstaToc;

    constructor(app: App, plugin: InstaToc) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        const tabTitle = new Setting(containerEl)
            .setHeading()
            .setName('Insta ToC Global Settings');
        tabTitle.nameEl.classList.add('setting-title');
        tabTitle.controlEl.remove();

        new Setting(containerEl)
            .setName('List bullet style')
            .setDesc('Select the global list bullet type.')
            .addDropdown((component: DropdownComponent) => 
                component
                    .addOptions(BulletTypes)
                    .setValue(this.plugin.settings.bulletType)
                    .onChange(async (value: BulletType) => {
                        this.plugin.settings.bulletType = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName('Indentation width')
            .setDesc('Select the global indentation size.')
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
            );

        new Setting(containerEl)
            .setName('Update delay')
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
                        this.plugin.updateModifyEventListener();
                    })
            });

        new Setting(containerEl)
            .setName('ToC Title')
            .setDesc('The global title of the generated Table of Contents.')
            .addText((component: TextComponent) => {
                component
                    .setValue(this.plugin.settings.tocTitle)
                    .onChange(async (value: string) => {
                        this.plugin.settings.tocTitle = value;
                        await this.plugin.saveSettings();
                    });
            });

        new Setting(containerEl)
            .setName('Excluded characters')
            .setDesc('Characters to exclude in headings.')
            .addTextArea((component: TextAreaComponent) => {
                component
                    .setValue([...new Set(this.plugin.settings.excludedChars)].join(','))
                    .onChange(async (value: string) => {
                        const textValue = component.getValue();
                        const excludedChars = new Set([
                            ...this.plugin.settings.excludedChars,
                            ...textValue
                                .replace(/^,/, '').replace(/,$/, '')
                                .split(',')
                                .map((value: string) => value.trim())
                        ]);

                        this.plugin.settings.excludedChars = [...excludedChars];
                        await this.plugin.saveSettings();
                    });

                component.inputEl.classList.add('exclude-chars');
            });
    }
}