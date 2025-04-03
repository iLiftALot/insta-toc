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
import { BulletTypes, DefaultExcludedChars } from './constants';
import { BulletType, HeadingLevel, IndentLevel, UpdateDelay } from "./types";


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

        // Global list bullet style
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

        // Global indentation width
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

        // Update delay
        new Setting(containerEl)
            .setName('Update delay')
            .setDesc('The delay for each ToC update.')
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
                    });
            });

        // Global ToC title
        new Setting(containerEl)
            .setName('ToC Title')
            .setDesc('The global title for the Table of Contents.')
            .addText((component: TextComponent) => {
                component
                    .setValue(this.plugin.settings.tocTitle)
                    .onChange(async (value: string) => {
                        this.plugin.settings.tocTitle = value;
                        await this.plugin.saveSettings();
                    });
                
                component.inputEl.placeholder = 'Table of Contents';
            }).infoEl.classList.add('insta-toc-text-info');

        // Global excluded heading text
        new Setting(containerEl)
            .setName('Excluded heading text')
            .setDesc('Comma-separated list of headings to exclude globally within the Table of Contents.')
            .addTextArea((component: TextAreaComponent) => {
                component.setValue(this.plugin.settings.excludedHeadingText.join(','));

                // Update settings when the text area loses focus
                component.inputEl.addEventListener('blur', async () => {
                    const textValue = component.getValue();
                    const excludedHeadingText = textValue.trim()
                        .replace(/^,/, '')
                        .replace(/,$/, '')
                        .split(',')
                        .map((value: string) => value.trim())
                        .filter((value: string) => value.length > 0);

                    this.plugin.settings.excludedHeadingText = excludedHeadingText;
                    await this.plugin.saveSettings();
                });

                component.inputEl.placeholder = 'Table of Contents,Introduction,Side Note';
                component.inputEl.classList.add('insta-toc-text-area');
            }).infoEl.classList.add('insta-toc-text-info');

        // Global excluded heading levels
        new Setting(containerEl)
            .setName('Excluded heading levels')
            .setDesc('Comma-separated list of heading levels to exclude globally within the Table of Contents.')
            .setTooltip('Valid values are 1-6.')
            .addTextArea((component: TextAreaComponent) => {
                component
                    .setValue(this.plugin.settings.excludedHeadingLevels.join(','))
                    .onChange(async (value: string) => {
                        const textValue = component.getValue();
                        const excludedHeadingLevels: HeadingLevel[] = textValue
                            .replace(/^,/, '').replace(/,$/, '')
                            .split(',')
                            .map((value: string) => parseInt(value.trim()) as HeadingLevel)
                            .filter((value: HeadingLevel) => value > 0 && value < 7);

                        this.plugin.settings.excludedHeadingLevels = [...excludedHeadingLevels];
                        await this.plugin.saveSettings();
                    });

                component.inputEl.classList.add('insta-toc-text-area');
                component.inputEl.placeholder = '1,2,3,4,5,6';
            }).infoEl.classList.add('insta-toc-text-info');

        // Global excluded characters
        new Setting(containerEl)
            .setName('Excluded characters')
            .setDesc('Globally excluded heading characters.')
            .addTextArea((component: TextAreaComponent) => {
                component
                    .setValue([...new Set(this.plugin.settings.excludedChars)].join(','))
                    .onChange(async (value: string)  => {
                        const textValue = component.getValue();
                        const excludedChars = new Set([
                            ...textValue.trim()
                                .replace(/^,/, '').replace(/,$/, '')
                                .split(',')
                                .map((value: string) => value.trim())
                                .filter((value: string) => value.length > 0)
                        ]);

                        this.plugin.settings.excludedChars = [...excludedChars];
                        await this.plugin.saveSettings();
                    });

                component.inputEl.classList.add('exclude-chars');
                component.inputEl.placeholder = DefaultExcludedChars.join(',');
            }).infoEl.classList.add('insta-toc-text-info');
    }
}