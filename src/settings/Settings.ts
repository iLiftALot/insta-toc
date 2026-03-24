import { BulletTypes, defaultExcludedChars } from "../constants";
import type {
    BulletType,
    HeadingLevel,
    IndentLevel,
    LocalTocSettings,
    UpdateDelay
} from "../types";

export interface InstaTocSettings {
    bulletType: BulletType;
    indentSize: IndentLevel;
    updateDelay: UpdateDelay;
    tocTitle: string;
    tocTitleLevel: HeadingLevel;
    excludedHeadingLevels: HeadingLevel[];
    excludedHeadingText: string[];
    excludedChars: string[];
}

export const DEFAULT_SETTINGS: InstaTocSettings = {
    bulletType: BulletTypes.circle,
    indentSize: 2,
    updateDelay: 2000,
    tocTitle: "Table of Contents",
    tocTitleLevel: 1,
    excludedHeadingLevels: [],
    excludedHeadingText: [],
    excludedChars: defaultExcludedChars
};

export type InstaTocPersistedData = {
    settings: Partial<InstaTocSettings>;
    tocFoldState: Record<string, boolean>;
    tocBlockCollapseState: Record<string, boolean>;
};

export function getDefaultLocalSettings(): LocalTocSettings {
    return {
        title: { name: null, level: null, center: null },
        exclude: null,
        style: { listType: null },
        omit: null,
        levels: { min: null, max: null }
    };
}
