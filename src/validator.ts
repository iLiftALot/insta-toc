import type {
    CachedMetadata,
    Editor,
    EditorPosition,
    EditorRange,
    HeadingCache,
    SectionCache
} from "obsidian";
import { Notice, parseYaml } from "obsidian";
import type InstaTocPlugin from "./Plugin";
import {
    deepMerge,
    escapeRegExp,
    isHeadingLevel,
    isNothing,
    isRegexPattern,
    sanitizeYaml
} from "./Utils";
import { BulletTypes, instaTocCodeBlockId, localTocSettingsRegex } from "./constants";
import { getDefaultLocalSettings } from "./settings/Settings";
import type {
    BulletType,
    HeadingLevel,
    LocalTocSettings,
    ValidatedInstaToc,
    ValidCacheType
} from "./types";

export class Validator {
    private plugin: InstaTocPlugin;
    private activeFilePath: string;
    private previousHeadings: HeadingCache[] = [];
    private previousLocalSettingsRaw = "";

    public editor: Editor;
    public cursorPos: EditorPosition;
    public tocInsertPos!: EditorRange; // Assigned in this.isValid

    public fileHeadings: HeadingCache[];
    public localTocSettings: LocalTocSettings;
    public updatedLocalSettings: LocalTocSettings | undefined;
    public metadata: CachedMetadata;
    public instaTocSection!: SectionCache; // Assigned in this.isValid

    public hasLocalListTypeOverride = false;

    constructor(
        plugin: InstaTocPlugin,
        metadata: CachedMetadata,
        cursorPos: EditorPosition,
        activeFilePath: string
    ) {
        this.plugin = plugin;
        this.metadata = metadata;
        this.editor = plugin.editor;
        this.cursorPos = cursorPos;
        this.activeFilePath = activeFilePath;
        this.fileHeadings = [];
        this.localTocSettings = getDefaultLocalSettings();
    }

    // Method to update the validator properties while maintaining the previous state
    public update(
        plugin: InstaTocPlugin,
        metadata: CachedMetadata,
        cursorPos: EditorPosition,
        activeFilePath: string,
        // localTocSettings?: LocalTocSettings
    ): void {
        this.plugin = plugin;
        this.metadata = metadata;
        this.cursorPos = cursorPos;

        this.resetStateForFileSwitch(activeFilePath); //, localTocSettings);
    }

    private resetStateForFileSwitch(
        activeFilePath: string,
        // localTocSettings?: LocalTocSettings
    ): void {
        if (this.activeFilePath === activeFilePath) return;

        this.activeFilePath = activeFilePath;
        this.previousHeadings = [];
        this.previousLocalSettingsRaw = "";
        this.localTocSettings = getDefaultLocalSettings();
        this.updatedLocalSettings = undefined;
        this.fileHeadings = [];
        this.hasLocalListTypeOverride = false;
    }

    // Overload 1: top-level key, no callback
    public insureLocalTocSetting<K extends keyof LocalTocSettings>(
        settingKey: K
    ): NonNullable<LocalTocSettings[K]> | null;

    // Overload 2: sub-key, no callback
    public insureLocalTocSetting<
        K extends keyof LocalTocSettings,
        SK extends keyof NonNullable<LocalTocSettings[K]>
    >(
        settingKey: K,
        subKey: SK
    ): NonNullable<NonNullable<LocalTocSettings[K]>[SK]> | null;

    // Overload 3: top-level key + callback
    public insureLocalTocSetting<K extends keyof LocalTocSettings, R>(
        settingKey: K,
        cb: (value: NonNullable<LocalTocSettings[K]>) => R
    ): R | null;

    // Overload 4: top-level key + callback + default
    public insureLocalTocSetting<K extends keyof LocalTocSettings, R, D>(
        settingKey: K,
        cb: (value: NonNullable<LocalTocSettings[K]>) => R,
        defaultVal: D
    ): R | D;

    // Overload 5: sub-key + callback
    public insureLocalTocSetting<
        K extends keyof LocalTocSettings,
        SK extends keyof NonNullable<LocalTocSettings[K]>,
        R
    >(
        settingKey: K,
        subKey: SK,
        cb: (value: NonNullable<NonNullable<LocalTocSettings[K]>[SK]>) => R
    ): R | null;

    // Overload 6: sub-key + callback + default
    public insureLocalTocSetting<
        K extends keyof LocalTocSettings,
        SK extends keyof NonNullable<LocalTocSettings[K]>,
        R,
        D
    >(
        settingKey: K,
        subKey: SK,
        cb: (value: NonNullable<NonNullable<LocalTocSettings[K]>[SK]>) => R,
        defaultVal: D
    ): R | D;

    // Implementation
    public insureLocalTocSetting<
        K extends keyof LocalTocSettings,
        SK extends keyof NonNullable<LocalTocSettings[K]>,
        R,
        D
    >(
        settingKey: K,
        subKeyOrCb?: SK | ((value: NonNullable<LocalTocSettings[K]>) => R),
        cbOrDefault?:
            | ((value: NonNullable<NonNullable<LocalTocSettings[K]>[SK]>) => R)
            | D,
        defaultVal?: D
    ):
        | NonNullable<LocalTocSettings[K]>
        | NonNullable<NonNullable<LocalTocSettings[K]>[SK]>
        | R
        | D
        | null {
        const val = this.localTocSettings[settingKey];

        // subKeyOrCb is a callback → overload 2 or 3
        if (typeof subKeyOrCb === "function") {
            if (isNothing(val)) {
                // cbOrDefault is the defaultVal for overload 3
                return cbOrDefault !== undefined ? (cbOrDefault as D) : null;
            }
            return subKeyOrCb(val as NonNullable<LocalTocSettings[K]>);
        }

        // No sub-key → overload 1
        if (isNothing(subKeyOrCb)) {
            return isNothing(val) ? null : (val as NonNullable<LocalTocSettings[K]>);
        }

        // Has sub-key
        if (isNothing(val)) {
            return defaultVal !== undefined ? defaultVal : null;
        }

        const subVal = (val as NonNullable<typeof val>)[subKeyOrCb];
        if (isNothing(subVal)) {
            return defaultVal !== undefined ? defaultVal : null;
        }

        // Sub-key + callback → overload 5 or 6
        if (typeof cbOrDefault === "function") {
            return (
                cbOrDefault as (
                    value: NonNullable<NonNullable<LocalTocSettings[K]>[SK]>
                ) => R
            )(subVal as NonNullable<NonNullable<LocalTocSettings[K]>[SK]>);
        }

        // Sub-key, no callback → overload 4
        return subVal as NonNullable<NonNullable<LocalTocSettings[K]>[SK]>;
    }

    private haveLocalSettingsChanged(): boolean {
        const tocRange = this.plugin.editor.getRange(
            this.tocInsertPos.from,
            this.tocInsertPos.to
        );
        const tocData = tocRange.match(localTocSettingsRegex);
        const current = (tocData?.[1] ?? "").trim();

        if (current === this.previousLocalSettingsRaw) return false;

        this.previousLocalSettingsRaw = current;
        return true;
    }

    // Method to compare current headings with previous headings
    private haveHeadingsChanged(): boolean {
        const currentHeadings: HeadingCache[] = this.metadata.headings || [];
        const noPrevHeadings: boolean = this.previousHeadings.length === 0;
        const diffHeadingsLength: boolean = currentHeadings.length !== this.previousHeadings.length;

        const noHeadingsChange: boolean = noPrevHeadings || diffHeadingsLength
            ? false
            : currentHeadings.every((headingCache: HeadingCache, index: number) => {
                return (
                    headingCache.heading === this.previousHeadings[index].heading
                    && headingCache.level === this.previousHeadings[index].level
                );
            });

        if (noHeadingsChange) return false;

        // Headings have changed, update previousHeadings
        this.previousHeadings = currentHeadings;

        return true;
    }

    // Type predicate to assert that metadata has headings and sections
    private hasSections(): this is Validator & {
        metadata: ValidCacheType;
    } {
        return !!this.metadata && !!this.metadata.sections;
    }

    // Finds and stores the instaTocSection
    private hasInstaTocSection(): this is Validator & {
        metadata: ValidCacheType;
        instaTocSection: SectionCache;
    } {
        if (!this.hasSections()) return false;

        const instaTocSection: SectionCache | undefined = this.metadata.sections.find(
            (section: SectionCache) =>
                section.type === "code"
                && this.plugin.editor.getLine(section.position.start.line)
                    === `\`\`\`${instaTocCodeBlockId}`
        );

        if (instaTocSection) {
            this.instaTocSection = instaTocSection;
            return true;
        }

        return false;
    }

    // Provides the insert location range for the new insta-toc codeblock
    private setTocInsertPos(): void {
        // Extract the start/end line/character index
        const startLine: number = this.instaTocSection.position.start.line;
        const startCh = 0;
        const endLine: number = this.instaTocSection.position.end.line;
        const endCh: number = this.instaTocSection.position.end.col;

        const tocStartPos: EditorPosition = { line: startLine, ch: startCh };
        const tocEndPos: EditorPosition = { line: endLine, ch: endCh };

        this.tocInsertPos = { from: tocStartPos, to: tocEndPos };
    }

    private configureLocalSettings(): void {
        const tocRange = this.plugin.editor.getRange(
            this.tocInsertPos.from,
            this.tocInsertPos.to
        );
        const tocData = tocRange.match(localTocSettingsRegex);

        if (!tocData) return;

        const [, settingString] = tocData;

        this.validateLocalSettings(settingString);
    }

    public applyLocalSettingsYaml(yml: string): boolean {
        const previousLocalSettings = deepMerge<LocalTocSettings>(
            getDefaultLocalSettings(),
            this.localTocSettings
        );
        const previousUpdatedSettings = this.updatedLocalSettings
            ? deepMerge<LocalTocSettings>(
                getDefaultLocalSettings(),
                this.updatedLocalSettings
            )
            : undefined;
        const previousHasLocalListTypeOverride = this.hasLocalListTypeOverride;

        this.localTocSettings = getDefaultLocalSettings();
        this.updatedLocalSettings = undefined;
        this.hasLocalListTypeOverride = false;

        const didApply = this.validateLocalSettings(yml);

        if (!didApply) {
            this.localTocSettings = previousLocalSettings;
            this.updatedLocalSettings = previousUpdatedSettings ?? previousLocalSettings;
            this.hasLocalListTypeOverride = previousHasLocalListTypeOverride;
            return false;
        }

        return true;
    }

    private validateLocalSettings(yml: string): boolean {
        let parsedYml: Partial<LocalTocSettings>;

        try {
            const sanitizedYmlString = sanitizeYaml(yml);
            parsedYml = parseYaml(sanitizedYmlString) as Partial<LocalTocSettings>;
        } catch (err) {
            this.localTocSettings = this.updatedLocalSettings || this.localTocSettings;
            const errMsg = "Invalid YAML in insta-toc settings:\n" + err;

            console.error(errMsg);
            this.plugin.consoleDebug(
                "Failed to parse local settings YAML string:\n",
                yml,
                "\nError:\n",
                err
            );
            new Notice(errMsg);

            return false;
        }

        const validationErrors: string[] = [];

        // Validate and assign 'title'
        if (!!parsedYml.title) {
            const title = parsedYml.title;

            if (typeof title !== "object") {
                validationErrors.push("'title' must be an object.");
            } else {
                const { name, level, center } = title;

                if (!!name && typeof name !== "string") {
                    parsedYml.title.name = String(name);
                }

                if (!!level && !isHeadingLevel(level)) {
                    validationErrors.push(
                        "'title.level' must be an integer between 1 and 6 indicating the heading level of the ToC title."
                    );
                }

                if (!!center && !(typeof center === "boolean")) {
                    validationErrors.push(
                        "'title.center' must be a boolean indicating whether the title position should be centered."
                    );
                }
            }
        }

        // Validate and assign 'exclude'
        if (!!parsedYml.exclude) {
            if (typeof parsedYml.exclude !== "string") {
                parsedYml.exclude = parsedYml.exclude === null
                    ? parsedYml.exclude
                    : String(parsedYml.exclude);
            }
        }

        // Validate and assign 'style'
        let parsedListTypeOverride: BulletType | null | undefined = undefined;
        if (!!parsedYml.style) {
            const style = parsedYml.style;

            if (typeof style !== "object") {
                parsedYml.style = { listType: null };
                validationErrors.push("'style' must be an object.");
            } else {
                const { listType } = style;

                if (!!listType && !Object.values(BulletTypes).includes(listType)) {
                    validationErrors.push(
                        `Invalid style.listType: '${listType}'; must be one of: ${
                            Object.values(
                                BulletTypes
                            ).join(", ")
                        }.`
                    );
                } else {
                    parsedListTypeOverride = listType;
                }
            }
        }

        // Validate and assign 'omit'
        if (!!parsedYml.omit) {
            if (!Array.isArray(parsedYml.omit)) {
                validationErrors.push(
                    "'omit' must be an array of strings indicating the text of each heading you'd like to omit."
                );
            } else {
                for (const [index, item] of parsedYml.omit.entries()) {
                    if (typeof item !== "string") {
                        // replace item with stringified version
                        parsedYml.omit[index] = item === null ? "" : String(item);
                    }
                }
            }
        }

        // Validate and assign 'levels'
        if (!!parsedYml.levels) {
            const levels = parsedYml.levels;

            // Attempt to fix malformed YAML (e.g., "min:1 max:6" from missing space after colon)
            // if (typeof levels === "string") {
            //     const fixed = sanitizeYaml(levels, true);
            //     if (fixed) {
            //         levels = parsedYml.levels = fixed as LocalTocLevels;
            //     }
            // }

            if (typeof levels !== "object") {
                validationErrors.push(
                    `'levels' is type ${typeof levels}, but must be an object:\n${JSON.stringify(levels)}`
                );
            } else {
                const { min, max } = levels;

                if (!!min && !isHeadingLevel(min)) {
                    validationErrors.push(
                        "'levels.min' must be an integer between 1 and 6 indicating the minimum heading level to include."
                    );
                }

                if (!!max && !isHeadingLevel(max)) {
                    validationErrors.push(
                        "'levels.max' must be an integer between 1 and 6 indicating the maximum heading level to include."
                    );
                }

                if (!!min && !!max && min > max) {
                    validationErrors.push(
                        "'levels.min' cannot be greater than 'levels.max'."
                    );
                }
            }
        }

        if (validationErrors.length > 0) {
            const validationErrorMsg: string = "Invalid properties in insta-toc settings:\n"
                + validationErrors.join("\n");

            console.error(validationErrorMsg);
            new Notice(validationErrorMsg);

            this.updatedLocalSettings = this.localTocSettings;
        } else {
            // All validations passed; merge
            if (!this.updatedLocalSettings) {
                this.updatedLocalSettings = deepMerge<LocalTocSettings>(
                    this.localTocSettings,
                    parsedYml,
                    { dedupArrays: true }
                );
            } else {
                this.updatedLocalSettings = deepMerge<LocalTocSettings>(
                    this.updatedLocalSettings,
                    parsedYml
                );
            }
            this.hasLocalListTypeOverride = !isNothing(parsedListTypeOverride);
        }

        this.localTocSettings = this.updatedLocalSettings;
        return validationErrors.length === 0;
    }

    private cursorInToc(): boolean {
        return (
            this.cursorPos.line >= this.instaTocSection.position.start.line
            && this.cursorPos.line <= this.instaTocSection.position.end.line
        );
    }

    private setFileHeadings(): void {
        const headings: HeadingCache[] = this.metadata?.headings ?? [];
        // Store the file headings to reference in later code
        this.fileHeadings = headings
            .filter((headingCache: HeadingCache) => {
                const headingText: string = headingCache.heading.trim();
                const headingLevel = headingCache.level as HeadingLevel;

                return (
                    /**
                     * Omit headings with "<!-- omit -->"
                     */
                    !headingText.match(/<!--\s*omit\s*-->/)
                    /**
                     * Omit headings included within local "omit" setting
                     */
                    && !this.insureLocalTocSetting(
                        "omit",
                        (omitList) => omitList.includes(headingText),
                        false
                    )
                    // !this.localTocSettings?.omit?.includes(headingText) &&
                    /**
                     * Omit headings with levels outside of the specified local min/max setting
                     */
                    && this.insureLocalTocSetting(
                        "levels",
                        "min",
                        (min) => headingLevel >= min,
                        true
                    )
                    && this.insureLocalTocSetting(
                        "levels",
                        "max",
                        (max) => headingLevel <= max,
                        true
                    )
                    // headingLevel >= this.localTocSettings.levels.max &&
                    // headingLevel <= this.localTocSettings.levels.max &&
                    /**
                     * Omit empty headings
                     */
                    && headingText.trim().length > 0
                    /**
                     * Omit heading text specified in the global excluded heading text setting
                     */
                    && !this.plugin.settings.excludedHeadingText.includes(headingText)
                    /**
                     * Omit heading levels specified in the global excluded heading levels setting
                     */
                    && !this.plugin.settings.excludedHeadingLevels.includes(headingLevel)
                );
            })
            .map((headingCache: HeadingCache) => {
                let modifiedHeading = headingCache.heading;
                const patterns: string[] = [];

                // Process global excluded characters
                if (
                    this.plugin.settings.excludedChars
                    && this.plugin.settings.excludedChars.length > 0
                ) {
                    // Escape and join global excluded characters
                    const escapedGlobalChars = this.plugin.settings.excludedChars
                        .map((char) => escapeRegExp(char))
                        .join("");

                    if (escapedGlobalChars.length > 0) {
                        patterns.push(`[${escapedGlobalChars}]`);
                    }
                }

                // Process local 'exclude' setting
                if (
                    this.localTocSettings.exclude
                    && this.localTocSettings.exclude.length > 0
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
                    const combinedPattern = new RegExp(patterns.join("|"), "g");
                    modifiedHeading = modifiedHeading.replace(combinedPattern, "");
                }

                return { ...headingCache, heading: modifiedHeading };
            });
    }

    // Validates all conditions and asserts the type when true
    public isValid(forceRefresh = false): this is Validator & ValidatedInstaToc {
        if (!this.hasInstaTocSection()) return false;

        this.setTocInsertPos();

        const headingsChanged = this.haveHeadingsChanged();
        const localSettingsChanged = this.haveLocalSettingsChanged();

        if (!forceRefresh && !headingsChanged && !localSettingsChanged) {
            return false;
        }

        this.configureLocalSettings();
        this.setFileHeadings();

        return !this.cursorInToc();
    }
}
