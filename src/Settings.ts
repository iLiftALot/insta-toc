import { BulletType, DefaultExcludedChars, IndentLevel, UpdateDelay } from "./constants";

export interface InstaTocSettings {
    bulletType: BulletType;
    indentSize: IndentLevel;
    updateDelay: UpdateDelay;
    excludedChars: string[];
}

export const DEFAULT_SETTINGS: InstaTocSettings = {
    bulletType: 'dash',
    indentSize: 4,
    updateDelay: 2000,
    excludedChars: DefaultExcludedChars
}
