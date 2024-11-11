export interface AutoTocSettings {
    tocString: string;
    shouldGenToc: boolean;
}

export const DEFAULT_SETTINGS: AutoTocSettings = {
    tocString: `> [!SUMMARY] Table of Contents`,
    shouldGenToc: false
}


