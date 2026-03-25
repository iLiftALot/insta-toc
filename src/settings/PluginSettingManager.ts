import { PluginSettingsManagerBase } from "obsidian-dev-utils/obsidian/plugin/plugin-settings-manager-base";
import type InstaTocPlugin from "../Plugin";
import { isRecord, sortRecord } from "../Utils";
import { bulletTypeOptions } from "../constants";
import type { PluginTypes } from "../types";
import {
    DEFAULT_SETTINGS,
    type InstaTocPersistedData,
    type InstaTocSettings
} from "./Settings";

export class PluginSettingsManager extends PluginSettingsManagerBase<PluginTypes> {
    public constructor(plugin: InstaTocPlugin) {
        super(plugin);
    }

    protected override createDefaultSettings(): InstaTocSettings {
        return {
            ...DEFAULT_SETTINGS,
            excludedChars: [...DEFAULT_SETTINGS.excludedChars],
            excludedHeadingLevels: [...DEFAULT_SETTINGS.excludedHeadingLevels],
            excludedHeadingText: [...DEFAULT_SETTINGS.excludedHeadingText]
        };
    }

    protected override async onLoadRecord(
        rawRecord: Record<string, unknown>
    ): Promise<void> {
        const persistedData = this.parsePersistedData(rawRecord);

        this.plugin.setPersistedUiState(
            persistedData.tocFoldState,
            persistedData.tocBlockCollapseState
        );

        // Convert persisted shape -> flat settings record expected by base manager
        for (const key of Object.keys(rawRecord)) {
            delete rawRecord[key];
        }

        Object.assign(rawRecord, persistedData.settings);
    }

    protected override async onSavingRecord(
        rawRecord: Record<string, unknown>
    ): Promise<void> {
        const persistedData = this.buildPersistedData(
            { ...rawRecord } as Partial<InstaTocSettings>
        );

        for (const key of Object.keys(rawRecord)) {
            delete rawRecord[key];
        }

        Object.assign(rawRecord, persistedData as Record<string, unknown>);
    }

    public async savePersistedData(): Promise<void> {
        await this.plugin.saveData(
            this.buildPersistedData(this.settingsWrapper.settings as InstaTocSettings)
        );
    }

    private buildPersistedData(
        settings: Partial<InstaTocSettings>
    ): InstaTocPersistedData {
        const { tocBlockCollapseState, tocFoldState } = this.plugin.getPersistedUiState();

        return {
            settings: { ...settings },
            tocBlockCollapseState: sortRecord(tocBlockCollapseState),
            tocFoldState: sortRecord(tocFoldState)
        };
    }

    public override registerValidators(): void {
        super.registerValidators();

        this.registerValidator("bulletType", (value) => {
            if (!(bulletTypeOptions.has(value))) {
                return "List bullet style is invalid.";
            }
        });

        this.registerValidator("indentSize", (value) => {
            if (![2, 4, 6, 8].includes(value)) {
                return "Indentation width must be 2, 4, 6, or 8.";
            }
        });

        this.registerValidator("updateDelay", (value) => {
            if (value < 500 || value > 10000 || value % 500 !== 0) {
                return "Update delay must be between 500 and 10000 milliseconds in 500 ms steps.";
            }
        });

        this.registerValidator("tocTitleLevel", (value) => {
            if (value < 1 || value > 6) {
                return "ToC heading level must be between 1 and 6.";
            }
        });

        this.registerValidator("excludedHeadingLevels", (value) => {
            if (value.some((level) => level < 1 || level > 6)) {
                return "Excluded heading levels must contain only values from 1 to 6.";
            }
        });

        this.registerValidator("excludedHeadingText", (value) => {
            if (value.some((item) => item.trim() === "")) {
                return "Excluded heading text cannot contain empty values.";
            }
        });

        this.registerValidator("excludedChars", (value) => {
            if (value.some((item) => item.trim() === "")) {
                return "Excluded characters cannot contain empty values.";
            }
        });
    }

    private parsePersistedData(data: unknown): InstaTocPersistedData {
        if (!isRecord(data)) {
            return { settings: {}, tocBlockCollapseState: {}, tocFoldState: {} };
        }

        // Current shape:
        // { settings, tocFoldState, tocBlockCollapseState }
        if (
            "settings" in data || "tocFoldState" in data
            || "tocBlockCollapseState" in data
        ) {
            const settings = isRecord(data.settings)
                ? (data.settings as Partial<InstaTocSettings>)
                : {};
            const tocFoldState = this.sanitizeFoldState(data.tocFoldState);
            const tocBlockCollapseState = this.sanitizeFoldState(
                data.tocBlockCollapseState
            );

            return { settings, tocBlockCollapseState, tocFoldState };
        }

        // Backward-compatible fallback: old settings-only shape
        return {
            settings: data as Partial<InstaTocSettings>,
            tocBlockCollapseState: {},
            tocFoldState: {}
        };
    }

    private sanitizeFoldState(rawState: unknown): Record<string, boolean> {
        if (!isRecord(rawState)) return {};

        const state: Record<string, boolean> = {};

        for (const [key, value] of Object.entries(rawState)) {
            if (typeof value === "boolean") {
                state[key] = value;
            }
        }

        return state;
    }
}
