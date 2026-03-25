import type {
    CachedMetadata,
    Editor,
    EditorPosition,
    HeadingCache,
    Pos,
    SectionCache
} from "obsidian";
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    test,
    vi
} from "vitest";
import type InstaTocPlugin from "../src/main";
import {
    getLocalSettingsBulletTypeSuggestions,
    getLocalSettingsOmitSuggestions
} from "../src/settings/localSettingsCompletionOptions";
import { Validator } from "../src/validator";

function createPluginMock(): InstaTocPlugin {
    return {
        settings: {
            bulletType: "dash",
            indentSize: 2,
            updateDelay: 2000,
            tocTitle: "Table of Contents",
            excludedHeadingLevels: [],
            excludedHeadingText: [],
            excludedChars: ["*", "_", "`", "==", "~~", "{", "}", "#", "\\"]
        },
        consoleDebug: console.debug
    } as unknown as InstaTocPlugin;
}

function createEditor(lines: string[]): Editor {
    return {
        getLine(line: number): string {
            return lines[line] ?? "";
        },
        getRange(from: EditorPosition, to: EditorPosition): string {
            if (from.line === to.line) {
                return (lines[from.line] ?? "").slice(from.ch, to.ch);
            }

            const chunks: string[] = [];
            chunks.push((lines[from.line] ?? "").slice(from.ch));

            for (let line = from.line + 1; line < to.line; line += 1) {
                chunks.push(lines[line] ?? "");
            }

            chunks.push((lines[to.line] ?? "").slice(0, to.ch));
            return chunks.join("\n");
        }
    } as unknown as Editor;
}

function createHeading(heading: string, level: number, line: number): HeadingCache {
    const position: Pos = {
        start: { line, col: 0, offset: 0 },
        end: { line, col: heading.length, offset: heading.length }
    };

    return {
        heading,
        level,
        position
    } as HeadingCache;
}

function createCodeSection(closingFenceLine: number): SectionCache {
    return {
        type: "code",
        position: {
            start: { line: 0, col: 0, offset: 0 },
            end: { line: closingFenceLine, col: 3, offset: 0 }
        }
    } as SectionCache;
}

type ValidatorFixture = {
    metadata: CachedMetadata;
    editor: Editor;
    cursorPos: EditorPosition;
    filePath: string;
};

function createFixture(
    localYamlLines: string[],
    headings?: HeadingCache[],
    filePath = "folder/file-a.md"
): ValidatorFixture {
    const lines: string[] = [
        "```insta-toc",
        "---",
        ...localYamlLines,
        "---",
        "",
        "# Table of Contents",
        "",
        "- Existing",
        "```",
        "",
        "# Heading 1",
        "## Heading 2"
    ];

    const closingFenceLine = lines.indexOf("```", 1);
    const section = createCodeSection(closingFenceLine);

    const metadata: CachedMetadata = {
        sections: [section],
        headings
    };

    return {
        metadata,
        editor: createEditor(lines),
        cursorPos: { line: closingFenceLine + 2, ch: 0 },
        filePath
    };
}

describe("Validator local settings behavior", () => {
    beforeEach(() => {
        vi.stubGlobal("window", {
            app: {
                plugins: {
                    getPlugin: vi.fn().mockReturnValue({
                        settings: {
                            tocTitle: "Table of Contents",
                            bulletType: "dash"
                        }
                    })
                }
            }
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    test("re-validates when local settings change but headings do not", () => {
        const plugin = createPluginMock();
        const stableHeadings: HeadingCache[] = [createHeading("Heading 1", 1, 10), createHeading("Heading 2", 2, 11)];

        const initial = createFixture(["title:", "  name: Table of Contents"], stableHeadings);

        const validator = new Validator(plugin, initial.metadata, initial.cursorPos, initial.filePath);

        expect(validator.isValid()).toBe(true);
        expect(validator.fileHeadings.map((h) => h.heading)).toEqual(["Heading 1", "Heading 2"]);

        const updatedLocalConfigOnly = createFixture(
            ["levels:", "  min: 2", "  max: 6", "omit:", "  - Heading 2"],
            stableHeadings
        );

        validator.update(
            plugin,
            updatedLocalConfigOnly.metadata,
            updatedLocalConfigOnly.cursorPos,
            updatedLocalConfigOnly.filePath
        );

        expect(validator.isValid()).toBe(true);
        expect(validator.localTocSettings.levels.min).toBe(2);
        expect(validator.fileHeadings).toEqual([]);
    });

    test("returns false when neither headings nor local config changed", () => {
        const plugin = createPluginMock();
        const headings: HeadingCache[] = [createHeading("Heading 1", 1, 10), createHeading("Heading 2", 2, 11)];

        const fixture = createFixture(["title:", "  name: Table of Contents"], headings);

        const validator = new Validator(plugin, fixture.metadata, fixture.cursorPos, fixture.filePath);

        expect(validator.isValid()).toBe(true);

        validator.update(plugin, fixture.metadata, fixture.cursorPos, fixture.filePath);

        expect(validator.isValid()).toBe(false);
    });

    test("handles missing heading cache safely", () => {
        const plugin = createPluginMock();
        const noHeadingsFixture = createFixture(["title:", "  name: Table of Contents"], undefined);

        const validator = new Validator(
            plugin,
            noHeadingsFixture.metadata,
            noHeadingsFixture.cursorPos,
            noHeadingsFixture.filePath
        );

        expect(validator.isValid()).toBe(true);
        expect(validator.fileHeadings).toEqual([]);
    });

    test("resets local settings to global defaults when switching files", () => {
        const plugin = createPluginMock();
        const headings: HeadingCache[] = [createHeading("Heading 1", 1, 10), createHeading("Heading 2", 2, 11)];

        const firstFile = createFixture(
            ["levels:", "  min: 2", "  max: 6", "omit:", "  - Heading 2"],
            headings,
            "folder/file-a.md"
        );

        const validator = new Validator(
            plugin,
            firstFile.metadata,
            firstFile.cursorPos,
            firstFile.filePath
        );

        expect(validator.isValid()).toBe(true);
        expect(validator.localTocSettings.levels.min).toBe(2);
        expect(validator.fileHeadings).toEqual([]);

        const secondFile = createFixture([], headings, "folder/file-b.md");

        validator.update(plugin, secondFile.metadata, secondFile.cursorPos, secondFile.filePath);

        expect(validator.isValid()).toBe(true);
        expect(validator.localTocSettings.levels.min).toBeNull();
        expect(validator.localTocSettings.omit).toBeNull();
        expect(validator.fileHeadings.map((heading) => heading.heading)).toEqual(["Heading 1", "Heading 2"]);
    });

    test("provides list type suggestions for local settings completions", () => {
        expect(getLocalSettingsBulletTypeSuggestions()).toEqual([
            "none",
            "armenian",
            "georgian",
            "lower-greek",
            "lower-latin",
            "upper-latin",
            "disc",
            "circle",
            "square",
            "decimal",
            "decimal-leading-zero",
            "lower-alpha",
            "upper-alpha",
            "lower-roman",
            "upper-roman"
        ]);
    });

    test("builds omit suggestions from heading cache entries", () => {
        const headings: HeadingCache[] = [
            createHeading(" Heading 1 ", 1, 10),
            createHeading("Heading 1", 2, 11),
            createHeading("", 3, 12),
            createHeading("Heading 2 <!-- omit -->", 4, 13),
            createHeading("Heading 3", 5, 14)
        ];

        expect(getLocalSettingsOmitSuggestions(headings)).toEqual([
            "Heading 1",
            "Heading 3"
        ]);
    });
});
