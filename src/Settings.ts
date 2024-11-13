export interface InstaTocSettings {
    tocString: string;
    shouldGenToc: boolean;
}

export const DEFAULT_SETTINGS: InstaTocSettings = {
    tocString: `> [!SUMMARY] Table of Contents`,
    shouldGenToc: false
}

