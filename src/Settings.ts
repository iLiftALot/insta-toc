export type BulletType = 'dash' | 'number';
export type IndentLevel = 2 | 4 | 6 | 8;

export interface InstaTocSettings {
    bulletType: BulletType;
    indentSize: IndentLevel;
}

export const DEFAULT_SETTINGS: InstaTocSettings = {
    bulletType: 'dash',
    indentSize: 4
}
