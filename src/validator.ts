import {
    HeadingCache,
    CachedMetadata,
    SectionCache,
    Editor,
    EditorPosition,
    parseYaml,
    EditorRange
} from "obsidian";
import { getDefaultLocalSettings, instaTocCodeBlockId, localTocSettingsRegex } from "./constants";
import { HeadingLevel, LocalTocSettings, ValidatedInstaToc, ValidCacheType } from "./types";
import { deepMerge, escapeRegExp, isHeadingLevel, isRegexPattern } from "./Utils";
import InstaTocPlugin from "./main";

export class Validator {
    private plugin: InstaTocPlugin;
    private previousHeadings: HeadingCache[] = [];

    public editor: Editor;
    public cursorPos: EditorPosition;
    public tocInsertPos: EditorRange;

    public fileHeadings: HeadingCache[];
    public localTocSettings: LocalTocSettings;
    public updatedLocalSettings: LocalTocSettings | undefined;
    public metadata: CachedMetadata;
    public instaTocSection: SectionCache;

    constructor(
        plugin: InstaTocPlugin,
        metadata: CachedMetadata,
        editor: Editor,
        cursorPos: EditorPosition
    ) {
        this.plugin = plugin;
        this.metadata = metadata;
        this.editor = editor;
        this.cursorPos = cursorPos;
        this.localTocSettings = getDefaultLocalSettings();
    }

    // Method to update the validator properties while maintaining the previous state
    public update(
        plugin: InstaTocPlugin,
        metadata: CachedMetadata,
        editor: Editor,
        cursorPos: EditorPosition
    ): void {
        this.plugin = plugin;
        this.metadata = metadata;
        this.editor = editor;
        this.cursorPos = cursorPos;
    }

    // Method to compare current headings with previous headings
    private haveHeadingsChanged(): boolean {
        const currentHeadings: HeadingCache[] = this.metadata.headings || [];
        const noPrevHeadings: boolean = this.previousHeadings.length === 0;
        const diffHeadingsLength: boolean = currentHeadings.length !== this.previousHeadings.length;

        const noHeadingsChange: boolean = noPrevHeadings || diffHeadingsLength
            ? false
            : currentHeadings.every(
                (headingCache: HeadingCache, index: number) => {
                    return (
                        headingCache.heading === this.previousHeadings[index].heading &&
                        headingCache.level === this.previousHeadings[index].level
                    );
                }
            );

        if (noHeadingsChange) return false;

        // Headings have changed, update previousHeadings
        this.previousHeadings = currentHeadings;

        return true;
    }

    // Type predicate to assert that metadata has headings and sections
    private hasHeadingsAndSections(): this is Validator & {
        metadata: ValidCacheType
    } {
        return (
            !!this.metadata &&
            !!this.metadata.headings &&
            !!this.metadata.sections
        )
    }

    // Finds and stores the instaTocSection
    private hasInstaTocSection(): this is Validator & {
        metadata: ValidCacheType;
        instaTocSection: SectionCache
    } {
        if (!this.hasHeadingsAndSections()) return false;

        const instaTocSection: SectionCache | undefined = this.metadata.sections.find(
            (section: SectionCache) =>
                section.type === 'code' &&
                this.editor.getLine(section.position.start.line) === `\`\`\`${instaTocCodeBlockId}`
        );

        if (instaTocSection) {
            this.instaTocSection = instaTocSection;
            return true;
        }

        return false;
    }

    // Provides the insert location range for the new insta-toc codeblock
    private setTocInsertPos(): void {
        // Extract the star/end line/character index
        const startLine: number = this.instaTocSection.position.start.line;
        const startCh = 0;
        const endLine: number = this.instaTocSection.position.end.line;
        const endCh: number = this.instaTocSection.position.end.col;

        const tocStartPos: EditorPosition = { line: startLine, ch: startCh };
        const tocEndPos: EditorPosition = { line: endLine, ch: endCh };

        this.tocInsertPos = { from: tocStartPos, to: tocEndPos }
    }

    private configureLocalSettings(): void {
        const tocRange = this.editor.getRange(
            this.tocInsertPos.from,
            this.tocInsertPos.to
        );
        const tocData = tocRange.match(localTocSettingsRegex);

        if (!tocData) return;

        const [, settingString] = tocData;
        
        this.validateLocalSettings(settingString);
    }

    private validateLocalSettings(yml: string): void {
        let parsedYml: Partial<LocalTocSettings>;

        try {
            parsedYml = parseYaml(yml);
        } catch (err) {
            this.localTocSettings = this.updatedLocalSettings || this.localTocSettings;
            const errMsg = 'Invalid YAML in insta-toc settings:\n' + err;

            console.error(errMsg);
            new Notice(errMsg);

            return;
        }

        const validationErrors: string[] = [];

        // Validate and assign 'title'
        if (parsedYml.title !== undefined) {
            const title = parsedYml.title;
            
            if (typeof title !== 'object' || title === null) {
                validationErrors.push("'title' must be an object.");
            } else {
                const { name, level } = title;
                
                if (name !== undefined && typeof name !== 'string') {
                    validationErrors.push("'title.name' must be a string indicating the title to be displayed on the ToC.");
                }

                if (level !== undefined && !isHeadingLevel(level)) {
                    validationErrors.push("'title.level' must be an integer between 1 and 6 indicating the heading level of the ToC title.");
                }
            }
        }

        // Validate and assign 'exclude'
        if (parsedYml.exclude !== undefined) {
            if (typeof parsedYml.exclude !== 'string') {
                validationErrors.push("'exclude' must be a string (\"...\") containing each character to exclude, or a regex pattern (/.../).");
            }
        }

        // Validate and assign 'style'
        if (parsedYml.style !== undefined) {
            const style = parsedYml.style;
            
            if (typeof style !== 'object' || style === null) {
                validationErrors.push("'style' must be an object.");
            } else {
                const { listType } = style;
                
                if (listType !== undefined && !['dash', 'number'].includes(listType)) {
                    validationErrors.push("'style.listType' must be 'dash' or 'number'.");
                }
            }
        }

        // Validate and assign 'omit'
        if (parsedYml.omit !== undefined) {
            if (!Array.isArray(parsedYml.omit)) {
                validationErrors.push("'omit' must be an array of strings indicating the text of each heading you'd like to omit.");
            } else {
                for (const item of parsedYml.omit) {
                    if (typeof item !== 'string') {
                        validationErrors.push("'omit' array must contain only strings indicating the text of headings you'd like to omit.");
                        break;
                    }
                }
            }
        }

        // Validate and assign 'levels'
        if (parsedYml.levels !== undefined) {
            const levels = parsedYml.levels;

            if (typeof levels !== 'object' || levels === null) {
                validationErrors.push("'levels' must be an object.");
            } else {
                const { min, max } = levels;
                
                if (min !== undefined && !isHeadingLevel(min)) {
                    validationErrors.push("'levels.min' must be an integer between 1 and 6 indicating the minimum heading level to include.");
                }
                
                if (max !== undefined && !isHeadingLevel(max)) {
                    validationErrors.push("'levels.max' must be an integer between 1 and 6 indicating the maximum heading level to include.");
                }
                
                if (min !== undefined && max !== undefined && min > max) {
                    validationErrors.push("'levels.min' cannot be greater than 'levels.max'.");
                }
            }
        }

        if (validationErrors.length > 0) {
            const validationErrorMsg: string = 'Invalid properties in insta-toc settings:\n' + validationErrors.join('\n');
            
            console.error(validationErrorMsg);
            new Notice(validationErrorMsg);

            this.updatedLocalSettings = this.localTocSettings;
        } else {
            // All validations passed; merge
            if (!this.updatedLocalSettings) {
                this.updatedLocalSettings = deepMerge<LocalTocSettings>(
                    this.localTocSettings,
                    parsedYml,
                    true
                );
            } else {
                this.updatedLocalSettings = deepMerge<LocalTocSettings>(
                    this.updatedLocalSettings,
                    parsedYml,
                    false
                );
            }
        }

        this.localTocSettings = this.updatedLocalSettings;
    }

    private cursorInToc(): boolean {
        return this.cursorPos.line >= this.instaTocSection.position.start.line &&
               this.cursorPos.line <= this.instaTocSection.position.end.line;
    }

    private setFileHeadings(): void {
        if (this.metadata.headings) {
            // Store the file headings to reference in later code
            this.fileHeadings = this.metadata.headings
                .filter((heading: HeadingCache) => {
                    const headingText: string = heading.heading.trim();
                    const headingLevel = heading.level as HeadingLevel;

                    return (
                        // Omit headings with "<!-- omit -->"
                        !headingText.match(/<!--\s*omit\s*-->/) &&
                        // Omit headings included within local "omit" setting
                        !this.localTocSettings.omit.includes(headingText) &&
                        // Omit headings with levels outside of the specified local min/max setting
                        headingLevel >= this.localTocSettings.levels.min &&
                        headingLevel <= this.localTocSettings.levels.max &&
                        // Omit empty headings
                        headingText.trim().length > 0 &&
                        // Omit heading text specified in the global exclude setting
                        !this.plugin.settings.excludedHeadingText.includes(headingText) &&
                        // Omit heading levels specified in the global exclude setting
                        !this.plugin.settings.excludedHeadingLevels.includes(headingLevel)
                    );
                })
                .map((heading: HeadingCache) => {
                    let modifiedHeading = heading.heading;
                    const patterns: string[] = [];

                    // Process global excluded characters
                    if (
                        this.plugin.settings.excludedChars &&
                        this.plugin.settings.excludedChars.length > 0
                    ) {
                        // Escape and join global excluded characters
                        const escapedGlobalChars = this.plugin.settings.excludedChars.map(
                            char => escapeRegExp(char)
                        ).join('');

                        if (escapedGlobalChars.length > 0) {
                            patterns.push(`[${escapedGlobalChars}]`);
                        }
                    }

                    // Process local 'exclude' setting
                    if (
                        this.localTocSettings.exclude &&
                        this.localTocSettings.exclude.length > 0
                    ) {
                        const excludeStr = this.localTocSettings.exclude;

                        if (isRegexPattern(excludeStr)) {
                            // It's a regex pattern (e.g., '/\d+/'), remove the slashes
                            const regexBody = excludeStr.slice(1, -1);

                            patterns.push(`(${regexBody})`);
                        } else {
                            // It's a string of characters to exclude
                            const escapedLocalChars = escapeRegExp(excludeStr);

                            if (escapedLocalChars.length > 0) {
                                patterns.push(`[${escapedLocalChars}]`);
                            }
                        }
                    }

                    // Build and apply the combined regex pattern
                    if (patterns.length > 0) {
                        const combinedPattern = new RegExp(patterns.join('|'), 'g');
                        modifiedHeading = modifiedHeading.replace(combinedPattern, '');
                    }

                    return { ...heading, heading: modifiedHeading };
                }
            );
        }
    }

    // Validates all conditions and asserts the type when true
    public isValid(): this is Validator & ValidatedInstaToc {
        const hasInstaTocSectionResult: boolean = this.hasInstaTocSection();

        // If file has no insta-toc section, skip processing
        if (!hasInstaTocSectionResult) {
            // Set the plugin.hasTocBlock variable, considering the
            // code block processor in main.ts can't
            this.plugin.hasTocBlock = false;

            return false;
        }

        const headingsChanged: boolean = this.haveHeadingsChanged();
        
        // If the headings have not changed, skip processing
        if (!headingsChanged) return false;

        // Process and store data for later use
        this.setTocInsertPos();
        this.configureLocalSettings();
        this.setFileHeadings();

        // Lastly, ensure the cursor is not within the ToC
        return !this.cursorInToc();
    }
}
