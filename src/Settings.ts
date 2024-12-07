import { DefaultExcludedChars } from "./constants";
import { BulletType, IndentLevel, UpdateDelay } from "./types";

export interface InstaTocSettings {
    bulletType: BulletType;
    indentSize: IndentLevel;
    updateDelay: UpdateDelay;
    tocTitle: string;
    excludedChars: string[];
}

export const DEFAULT_SETTINGS: InstaTocSettings = {
    bulletType: 'dash',
    indentSize: 4,
    updateDelay: 2000,
    tocTitle: 'Table of Contents',
    excludedChars: DefaultExcludedChars
}
