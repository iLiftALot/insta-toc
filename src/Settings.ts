export type BulletType = 'dash' | 'number';
export type IndentLevel = 2 | 4 | 6 | 8;
export type UpdateDelay = 500 | 1000
    | 1500 | 2000 | 2500 | 3000 | 3500 | 4000
    | 4500 | 5000 | 5500 | 6000 | 6500 | 7000
    | 7500 | 8000 | 8500 | 9000 | 9500 | 10000

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
