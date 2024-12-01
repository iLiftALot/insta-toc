import {
    HeadingCache,
    CachedMetadata,
    SectionCache,
    Editor,
    EditorPosition,
    parseYaml,
    EditorRange
} from "obsidian";
import { defaultLocalSettings, instaTocCodeBlockId, localTocSettingsRegex } from "./constants";
import { LocalTocSettings, ValidatedInstaToc, ValidCacheType } from "./types";
import InstaTocPlugin from "./main";
import { deepMerge, escapeRegExp, isHeadingLevel, isRegexPattern } from "./utils";


export class Validator {
    private plugin: InstaTocPlugin;
    private previousHeadings: HeadingCache[] | undefined;

    public editor: Editor;
    public cursorPos: EditorPosition;
    public tocInsertPos: EditorRange;

    public fileHeadings: HeadingCache[];
    public localTocSettings: LocalTocSettings;
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
        this.localTocSettings = defaultLocalSettings;
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
        this.localTocSettings = defaultLocalSettings;
    }

    // Method to compare current headings with previous headings
    private haveHeadingsChanged(): boolean {
        const currentHeadings: HeadingCache[] = this.metadata.headings || [];

        if (!this.previousHeadings) {
            this.previousHeadings = currentHeadings;
            return true;
        }

        const noHeadingsChange: boolean = currentHeadings.every(
            (headingCache: HeadingCache, index: number) => {
                return (
                    headingCache.heading === this.previousHeadings![index].heading &&
                    headingCache.level === this.previousHeadings![index].level
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
            console.error('Invalid YAML in insta-toc settings:\n', err);
            this.localTocSettings = { ...defaultLocalSettings };
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
                    validationErrors.push("'title.name' must be a string.");
                }
                if (level !== undefined && !isHeadingLevel(level)) {
                    validationErrors.push("'title.level' must be an integer between 1 and 6.");
                }
            }
        }

        // Validate and assign 'exclude'
        if (parsedYml.exclude !== undefined) {
            if (typeof parsedYml.exclude !== 'string') {
                validationErrors.push("'exclude' must be a string.");
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
                validationErrors.push("'omit' must be an array of strings.");
            } else {
                for (const item of parsedYml.omit) {
                    if (typeof item !== 'string') {
                        validationErrors.push("'omit' array must contain only strings.");
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
                    validationErrors.push("'levels.min' must be an integer between 1 and 6.");
                }
                if (max !== undefined && !isHeadingLevel(max)) {
                    validationErrors.push("'levels.max' must be an integer between 1 and 6.");
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

            this.localTocSettings = defaultLocalSettings;
        } else {
            // All validations passed; merge with defaults
            this.localTocSettings = deepMerge(defaultLocalSettings, parsedYml);
        }
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
                    return (
                        // Omit headings with "<!-- omit -->"
                        !heading.heading.match(/<!--\s*omit\s*-->/) &&
                        // Omit headings included within local "omit" setting
                        !this.localTocSettings.omit.includes(heading.heading) &&
                        // Omit headings with levels outside of the specific local min/max setting
                        heading.level >= this.localTocSettings.levels.min &&
                        heading.level <= this.localTocSettings.levels.max
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

        this.setTocInsertPos();
        this.configureLocalSettings();
        this.setFileHeadings();

        // Lastly, ensure the cursor is not within the ToC
        return !this.cursorInToc();
    }
}
