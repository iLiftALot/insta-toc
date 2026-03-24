import type { HeadingCache } from "obsidian";
import { describe, expect, test, vi } from "vitest";
import { ManageToc } from "../src/ManageToc";
import type InstaTocPlugin from "../src/main";
import { getDefaultLocalSettings } from "../src/settings/Settings";
import type { LocalTocSettings } from "../src/types";
import type { Validator } from "../src/validator";

function createPluginMock(overrides?: Partial<InstaTocPlugin["settings"]>) {
    let capturedContent = "";

    const plugin = {
        settings: {
            bulletType: "circle",
            indentSize: 2,
            updateDelay: 2000,
            tocTitle: "Global TOC",
            excludedHeadingLevels: [],
            excludedHeadingText: [],
            excludedChars: ["*", "_", "`", "==", "~~", "{", "}", "#", "\\"],
            ...overrides
        },
        app: {
            workspace: {
                getActiveFile: () => ({ path: "test.md" }),
                getActiveViewOfType: () => ({
                    data: "",
                    editor: {
                        getValue: () => capturedContent,
                        replaceRange: (newContent: string, ..._args: any[]) => {
                            capturedContent = newContent;
                        }
                        // setValue: vi.fn()
                    },
                    previewMode: {
                        rerender: (_full?: boolean) => vi.fn()
                    }
                })
            },
            vault: {
                process: vi.fn(
                    async (_file: unknown, fn: (content: string) => string) => {
                        capturedContent = fn(capturedContent);
                    }
                ),
                read: vi.fn(async () => capturedContent)
            }
        },
        getViewState() {
            return "live-preview";
        }
    } as unknown as InstaTocPlugin;

    return { plugin, getCapturedContent: () => capturedContent };
}

function createValidatorMock(
    localTocSettings: LocalTocSettings,
    fileHeadings: HeadingCache[]
) {
    const validator = {
        localTocSettings,
        fileHeadings,
        tocInsertPos: {
            from: { line: 0, ch: 0 },
            to: { line: 0, ch: 0 }
        },
        insureLocalTocSetting(
            settingKey: keyof LocalTocSettings,
            subKeyOrCb?: string | ((value: unknown) => unknown),
            cbOrDefault?: ((value: unknown) => unknown) | unknown,
            defaultVal?: unknown
        ): unknown {
            const value = localTocSettings[settingKey];

            if (typeof subKeyOrCb === "function") {
                if (value === null || value === undefined) {
                    return cbOrDefault !== undefined ? cbOrDefault : null;
                }

                return subKeyOrCb(value);
            }

            if (typeof subKeyOrCb === "string") {
                const subValue = (value as Record<string, unknown>)?.[subKeyOrCb];

                if (typeof cbOrDefault === "function") {
                    if (subValue === null || subValue === undefined) {
                        return defaultVal !== undefined ? defaultVal : null;
                    }

                    return cbOrDefault(subValue);
                }

                return subValue === undefined ? null : subValue;
            }

            return value ?? null;
        }
    } as unknown as Validator;

    return { validator };
}

describe("ManageToc global/local setting precedence", () => {
    test("falls back to global tocTitle when local title.name is null", async () => {
        const localSettings = getDefaultLocalSettings();
        localSettings.title.name = null;
        localSettings.title.level = null;
        localSettings.title.center = null;

        const fileHeadings = [
            { heading: "Heading 1", level: 1 },
            { heading: "Heading 2", level: 2 }
        ] as HeadingCache[];

        const { validator } = createValidatorMock(localSettings, fileHeadings);
        const { plugin, getCapturedContent } = createPluginMock({
            tocTitle: "Global Table of Contents",
            indentSize: 2
        });

        await ManageToc.run(plugin, validator);

        const generatedTocBlock = getCapturedContent();

        expect(generatedTocBlock).toContain("Global Table of Contents");
        expect(generatedTocBlock).not.toContain("null Global Table of Contents");
        expect(generatedTocBlock).toContain("\n    - Heading 2");
    });

    test("prefers local title settings over global defaults when provided", async () => {
        const localSettings = getDefaultLocalSettings();
        localSettings.title.name = "Local TOC";
        localSettings.title.level = 2;
        localSettings.title.center = true;

        const fileHeadings = [{ heading: "Heading 1", level: 1 }] as HeadingCache[];

        const { validator } = createValidatorMock(localSettings, fileHeadings);
        const { plugin, getCapturedContent } = createPluginMock({
            tocTitle: "Global Table of Contents"
        });

        await ManageToc.run(plugin, validator);

        const generatedTocBlock = getCapturedContent();

        expect(generatedTocBlock).toContain("## <center>Local TOC</center>");
        expect(generatedTocBlock).not.toContain("Global Table of Contents");
    });
});
