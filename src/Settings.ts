export type BulletType = 'dash' | 'number';

export interface InstaTocSettings {
    bulletType: BulletType;
    indentSize: number;
}

export const DEFAULT_SETTINGS: InstaTocSettings = {
    bulletType: 'dash',
    indentSize: 4
}
