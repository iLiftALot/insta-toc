import { CachedMetadata, Editor, EditorPosition, EditorRange, HeadingCache, SectionCache } from "obsidian";

// Interface asserts that HeadingCache[] and SectionCache[]
// are not undefined within the CachedMetadata type
export interface ValidCacheType extends CachedMetadata {
    headings: HeadingCache[],
    sections: SectionCache[]
}

// Type that represents a fully validated Validator instance
export type ValidatedInstaToc = {
    metadata: ValidCacheType;
    fileHeadings: HeadingCache[];
    instaTocSection: SectionCache;
    editor: Editor;
    cursorPos: EditorPosition;
    tocInsertPos: EditorRange;
    localTocSettings: LocalTocSettings;
};

export type EditorData = {
    editor: Editor | undefined;
    cursorPos: EditorPosition | undefined;
};

export type BulletType = 'dash' | 'number';
export type IndentLevel = 2 | 4 | 6 | 8;
export type UpdateDelay = 500 | 1000
    | 1500 | 2000 | 2500 | 3000 | 3500 | 4000
    | 4500 | 5000 | 5500 | 6000 | 6500 | 7000
    | 7500 | 8000 | 8500 | 9000 | 9500 | 10000

export type TocData = {
    fileHeadings: HeadingCache[],
    instaTocSection: SectionCache | undefined
}

export type HandledLink = {
    contentText: string,
    alias: string
}
export type ListItemContext = {
    indent: string;
    bullet: string;
    navLink: string;
}

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
export type LocalTocStyle = {
    listType: BulletType;
}
export type LocalTocTitle = {
    name: string;
    level: HeadingLevel
}
export type LocalTocLevels = {
    min: HeadingLevel;
    max: HeadingLevel;
}
export interface LocalTocSettings {
    title: LocalTocTitle;
    exclude: string;
    style: LocalTocStyle;
    omit: string[];
    levels: LocalTocLevels
};
