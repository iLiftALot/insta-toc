import type {
    CachedMetadata,
    Editor,
    EditorPosition,
    EditorRange,
    HeadingCache,
    SectionCache,
    TFile
} from "obsidian";

import type { PluginTypesBase } from "obsidian-dev-utils/obsidian/plugin/plugin-types-base";
import type { BulletTypes } from "./constants";

import type InstaTocPlugin from "./Plugin";
import type { PluginSettingsManager } from "./settings/PluginSettingManager";
import type { InstaTocSettings } from "./settings/Settings";
import type { SettingTab } from "./settings/SettingsTab";
import type { Validator } from "./validator";

export interface PluginTypes extends PluginTypesBase {
    plugin: InstaTocPlugin;
    pluginSettings: InstaTocSettings;
    pluginSettingsManager: PluginSettingsManager;
    pluginSettingsTab: SettingTab;
}

/**
 * Type asserts that {@link SectionCache}[] is not undefined within the CachedMetadata type
 */
export type ValidCacheType = CachedMetadata & { sections: SectionCache[]; }; // Required<Pick<CachedMetadata, "sections">>;

/**
 * Type that represents a fully validated Validator instance
 */
export type ValidatedInstaToc = {
    metadata: ValidCacheType;
    fileHeadings: HeadingCache[];
    instaTocSection: SectionCache;
    editor: Editor;
    cursorPos: EditorPosition;
    tocInsertPos: EditorRange;
    localTocSettings: LocalTocSettings;
};

export type EditorData = {
    editor?: Editor;
    cursorPos?: EditorPosition;
    activeFile: TFile | null;
    metadataCache: CachedMetadata | null;
};

export type BulletType = keyof typeof BulletTypes;
export type IndentLevel = 2 | 4 | 6 | 8;
export type UpdateDelay =
    | 500
    | 1000
    | 1500
    | 2000
    | 2500
    | 3000
    | 3500
    | 4000
    | 4500
    | 5000
    | 5500
    | 6000
    | 6500
    | 7000
    | 7500
    | 8000
    | 8500
    | 9000
    | 9500
    | 10000;

export type TocData = {
    fileHeadings: HeadingCache[];
    instaTocSection?: SectionCache;
};

export type HandledLink = {
    contentText: string;
    alias: string;
};
export type ListItemContext = {
    indent: string;
    bullet: string;
    navLink: string;
};

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
export type LocalTocStyle = {
    listType: BulletType | null;
};
export type LocalTocTitle = {
    name: string | null;
    level: HeadingLevel | null;
    center: boolean | null;
};
export type LocalTocLevels = {
    min: HeadingLevel | null;
    max: HeadingLevel | null;
};
export interface LocalTocSettings {
    title: LocalTocTitle;
    exclude: string | null;
    style: LocalTocStyle;
    omit: string[] | null;
    levels: LocalTocLevels;
}

export type TocAction =
    | "collapse-toc"
    | "expand-toc"
    | "collapse-all-items"
    | "expand-all-items"
    | "local-settings-modal";

export type ReloadValidatorField = keyof EditorData;

export interface ReloadValidatorOpts<
    F extends ReloadValidatorField = ReloadValidatorField
> {
    /** Which EditorData fields to compute and return — omit to return nothing (update-only) */
    select?: readonly F[];
    /** File path for the validator — falls back to activeFile.path when omitted */
    sourcePath?: string;
    /** Whether to create or update the Validator instance */
    updateValidator?: boolean;
    /** Pre-fetched metadata cache — skips internal lookup when provided */
    metadataCache?: CachedMetadata;
}

export type ReloadWorkflowOpts =
    & Omitted<
        ReloadValidatorOpts<"activeFile">,
        "select" | "updateValidator"
    >
    & {
        forceValidate?: boolean;
    };

export type ReloadedTocState = {
    activeFile: TFile;
    validator: Validator;
    isValid: boolean;
};

/**
 * The current view mode, or null if there is no active view or the view type is unsupported.
 *
 * @example
 *      // Explanation of viewState values
 *      { mode: 'preview' | 'source' | 'live-preview'; source: boolean }
 *
 *      { mode: 'preview'; source: boolean } // Preview/Reading Mode, source doesn't matter
 *      { mode: 'source'; source: false } // Source/Editing Mode, source will be false
 *      { mode: 'source'; source: true } // Live Preview/Editing Mode, source will be true
 *      null; // No active view or unsupported view type
 */
export type ViewState = "preview" | "source" | "live-preview" | null;
