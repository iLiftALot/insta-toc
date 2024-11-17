import { BulletType, IndentLevel, UpdateDelay } from "./Utils";

export interface InstaTocSettings {
    bulletType: BulletType;
    indentSize: IndentLevel;
    updateDelay: UpdateDelay;
}

export const DEFAULT_SETTINGS: InstaTocSettings = {
    bulletType: 'dash',
    indentSize: 4,
    updateDelay: 2000
}
