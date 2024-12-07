import { DefaultExcludedChars } from "./constants";
import { BulletType, HeadingLevel, IndentLevel, UpdateDelay } from "./types";

export interface InstaTocSettings {
    bulletType: BulletType;
    indentSize: IndentLevel;
    updateDelay: UpdateDelay;
    tocTitle: string;
    excludedHeadingLevels: HeadingLevel[];
    excludedHeadingText: string[];
    excludedChars: string[];
}

export const DEFAULT_SETTINGS: InstaTocSettings = {
    bulletType: 'dash',
    indentSize: 2,
    updateDelay: 2000,
    tocTitle: 'Table of Contents',
    excludedHeadingLevels: [],
    excludedHeadingText: [],
    excludedChars: DefaultExcludedChars
}
