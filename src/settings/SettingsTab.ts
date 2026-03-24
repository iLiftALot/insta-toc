import type { SliderComponent, TextComponent } from "obsidian";
import { debounce } from "obsidian";
import type {
    TypedDropdownComponent
} from "obsidian-dev-utils/obsidian/Components/SettingComponents/TypedDropdownComponent";
import {
    PluginSettingsTabBase,
    SAVE_TO_FILE_CONTEXT
} from "obsidian-dev-utils/obsidian/Plugin/PluginSettingsTabBase";
import { SettingEx } from "obsidian-dev-utils/obsidian/SettingEx";
import type InstaTocPlugin from "../Plugin";
import { bulletTypeOptions, headingLevelOptions } from "../constants";
import { ComponentMounter, ListInputComponent } from "../svelte";
import type { BulletType, HeadingLevel, PluginTypes } from "../types";
import type { InstaTocSettings } from "./Settings";

export class SettingTab extends PluginSettingsTabBase<PluginTypes> {
    public constructor(plugin: InstaTocPlugin) {
        super(plugin);
    }

    public override display(): void {
        super.display();

        const tabTitle = new SettingEx(this.containerEl).setHeading().setName(
            "Insta ToC Global Settings"
        );
        tabTitle.nameEl.classList.add("setting-title");
        tabTitle.controlEl.remove();

        // Global list bullet style
        this.addBulletTypeSetting();
        // Global indentation width
        this.addIndentSizeSetting();
        // Update delay
        this.addUpdateDelaySetting();
        // Global ToC title
        this.addTocTitleSetting();
        // Global ToC Level
        this.addTocLevelSetting();
        // Global excluded heading text
        this.addExcludedHeadingTextSetting();
        // Global excluded heading levels
        this.addExcludedHeadingLevelSetting();
        // Global excluded characters
        this.addExcludedCharacterSetting();

        // this.plugin.settingsManager.on("saveSettings", async (newSettings, oldSettings) => {
        //     this.plugin.refreshRenderedTocStyles();
        // }, this);
    }

    private addTocLevelSetting(): void {
        new SettingEx(this.containerEl).setName("ToC Heading Level").setDesc(
            "The global heading level for the Table of Contents title."
        ).setClass("insta-toc-heading-level-setting").addTypedDropdown(
            (typedDropdown: TypedDropdownComponent<HeadingLevel>) => {
                typedDropdown.addOptions(headingLevelOptions);
                this.bind(typedDropdown, "tocTitleLevel", {
                    onChanged: () => {
                        this.plugin.refreshRenderedTocStyles();
                    }
                });
            }
        );
    }

    private addBulletTypeSetting(): void {
        new SettingEx(this.containerEl).setName("List bullet style").setDesc(
            "Select the global list bullet type."
        ).addTypedDropdown((component: TypedDropdownComponent<BulletType>) => {
            component.addOptions(bulletTypeOptions);
            this.bind(component, "bulletType", {
                onChanged: () => {
                    this.plugin.refreshRenderedTocStyles();
                }
            });
        });
    }

    private addIndentSizeSetting(): void {
        new SettingEx(this.containerEl).setName("Indentation width").setDesc(
            "Select the global indentation size."
        ).addSlider((component: SliderComponent) => {
            component.setLimits(2, 8, 2).setDynamicTooltip().setInstant(true);
            this.bind(component, "indentSize", {
                onChanged: () => {
                    this.plugin.refreshRenderedTocStyles();
                }
            });
        });
    }

    private addUpdateDelaySetting(): void {
        new SettingEx(this.containerEl).setName("Update delay").setDesc(
            "The delay for each ToC update."
        ).addSlider((component: SliderComponent) => {
            component.setLimits(500, 10000, 500).setDynamicTooltip().setInstant(false);
            this.bind(component, "updateDelay", {
                onChanged: () => {
                    debounce(
                        async () => {
                            this.plugin.refreshRenderedTocStyles();
                            this.plugin.updateModifyEventListener();
                        },
                        1000,
                        true
                    )();
                }
            });
        });
    }

    private addTocTitleSetting(): void {
        new SettingEx(this.containerEl).setName("ToC Title").setDesc(
            "The global title for the Table of Contents."
        ).addText((component: TextComponent) => {
            this.bind(component, "tocTitle", {
                onChanged: () => {
                    this.plugin.refreshRenderedTocStyles();
                }
            });
            component.inputEl.placeholder = "Table of Contents";
        }).infoEl.classList.add("insta-toc-text-info");
    }

    private addExcludedHeadingTextSetting(): void {
        new SettingEx(this.containerEl).setName("Excluded heading text").setDesc(
            "Add headings to exclude globally."
        ).addComponentClass(ComponentMounter, async (component) => {
            await component.setup(ListInputComponent, {
                placeholder: "e.g. Table of Contents",
                initialValues: this.plugin.settings.excludedHeadingText,
                parseInput: (raw: string) => {
                    const value = raw.trim();
                    return value
                        ? { ok: true, value }
                        : { ok: false, message: "Heading text cannot be empty." };
                },
                renderValue: (v: string) => v,
                onSave: async (values: string[]) => {
                    await this.plugin.settingsManager.editAndSave(
                        (settings: InstaTocSettings) => {
                            settings.excludedHeadingText = values;
                        },
                        SAVE_TO_FILE_CONTEXT
                    );
                    this.plugin.refreshRenderedTocStyles();
                }
            }, this.plugin.context);
        });
    }

    private addExcludedHeadingLevelSetting(): void {
        new SettingEx(this.containerEl).setName("Excluded heading levels").setDesc(
            "Add heading levels (1–6) to exclude globally."
        ).addComponentClass(ComponentMounter, async (component) => {
            await component.setup(ListInputComponent, {
                placeholder: "1-6",
                initialValues: this.plugin.settings.excludedHeadingLevels,
                parseInput: (raw: string) => {
                    const n = Number.parseInt(raw.trim(), 10);
                    if (!Number.isInteger(n) || n < 1 || n > 6) {
                        return {
                            ok: false,
                            message: "Level must be an integer from 1 to 6."
                        };
                    }
                    return { ok: true, value: n as HeadingLevel };
                },
                renderValue: (v: HeadingLevel) => `H${v}`,
                equals: (a: HeadingLevel, b: HeadingLevel) => a === b,
                sort: (a: HeadingLevel, b: HeadingLevel) => a - b,
                onSave: async (values: HeadingLevel[]) => {
                    await this.plugin.settingsManager.editAndSave(
                        (settings: InstaTocSettings) => {
                            settings.excludedHeadingLevels = values;
                        },
                        SAVE_TO_FILE_CONTEXT
                    );
                    this.plugin.refreshRenderedTocStyles();
                }
            }, this.plugin.context);
        });
    }

    private addExcludedCharacterSetting(): void {
        new SettingEx(this.containerEl).setName("Excluded characters").setDesc(
            "Add characters to strip from headings globally."
        ).addComponentClass(ComponentMounter, async (component) => {
            await component.setup(ListInputComponent, {
                placeholder: "e.g. #",
                initialValues: this.plugin.settings.excludedChars,
                parseInput: (raw: string) => {
                    const value = raw.trim();
                    return value
                        ? { ok: true, value }
                        : { ok: false, message: "Character value cannot be empty." };
                },
                renderValue: (v: string) => v,
                onSave: async (values: string[]) => {
                    await this.plugin.settingsManager.editAndSave(
                        (settings: InstaTocSettings) => {
                            settings.excludedChars = values;
                        },
                        SAVE_TO_FILE_CONTEXT
                    );
                    this.plugin.refreshRenderedTocStyles();
                }
            }, this.plugin.context);
        });
    }
}
