import type { Editor, EditorPosition, HeadingCache } from "obsidian";
import type InstaTocPlugin from "src/Plugin";
import type { LocalTocSettings } from "src/types";
import type { Validator } from "src/validator";
import { vi } from "vitest";

type EditorDispatchSpec = {
    changes: {
        from: number;
        to: number;
        insert: string;
    };
    scrollIntoView?: boolean;
};

type TestEditor = Editor & {
    cm: {
        dispatch: (spec: EditorDispatchSpec) => void;
        posToOffset: (pos: EditorPosition) => number;
        replaceRange: (
            replacement: string,
            from: EditorPosition,
            to: EditorPosition,
            origin?: string
        ) => void;
    };
    getValue: () => string;
    setValue: (content: string) => void;
    getCursor: () => EditorPosition;
    setCursor: (position: EditorPosition) => void;
    posToOffset: (pos: EditorPosition) => number;
    replaceRange: (
        replacement: string,
        from: EditorPosition,
        to: EditorPosition,
        origin?: string
    ) => void;
};

function getOffset(content: string, pos: EditorPosition): number {
    const lines = content.split("\n");
    let offset = 0;

    for (let line = 0; line < pos.line; line += 1) {
        offset += (lines[line] ?? "").length + 1;
    }

    return offset + pos.ch;
}

function replaceContent(
    content: string,
    replacement: string,
    from: EditorPosition,
    to: EditorPosition
): string {
    const startOffset = getOffset(content, from);
    const endOffset = getOffset(content, to);

    return content.slice(0, startOffset) + replacement + content.slice(endOffset);
}

function getEditorText(editor: Editor): string {
    return (editor as Partial<TestEditor>).getValue?.() ?? "";
}

function setEditorText(editor: Editor, content: string): void {
    (editor as Partial<TestEditor>).setValue?.(content);
}

export function createPluginMock(
    overrides?: Partial<InstaTocPlugin["settings"]>,
    initialEditor: Editor = createEditor([])
): {
    plugin: InstaTocPlugin;
    getCapturedContent: () => string;
    setEditor: (editor: Editor) => void;
} {
    let activeEditor = initialEditor;

    const workspace = {
        activeEditor: {
            get editor(): Editor {
                return activeEditor;
            },
            set editor(editor: Editor) {
                activeEditor = editor;
            }
        },
        getActiveFile: () => ({ path: "test.md" }),
        getActiveViewOfType: () => ({
            get data(): string {
                return getEditorText(activeEditor);
            },
            get editor(): Editor {
                return activeEditor;
            },
            previewMode: {
                rerender: vi.fn(),
                renderer: {
                    set: (text: string) => {
                        setEditorText(activeEditor, text);
                    }
                }
            }
        })
    };

    const plugin = {
        settings: {
            bulletType: "circle",
            indentSize: 2,
            updateDelay: 2000,
            tocTitle: "Global TOC",
            tocTitleLevel: 1,
            excludedHeadingLevels: [],
            excludedHeadingText: [],
            excludedChars: ["*", "_", "`", "==", "~~", "{", "}", "#", "\\"],
            ...overrides
        },
        consoleDebug: console.debug,
        app: {
            workspace,
            vault: {
                process: vi.fn(
                    async (_file: unknown, fn: (content: string) => string) => {
                        setEditorText(activeEditor, fn(getEditorText(activeEditor)));
                    }
                ),
                read: vi.fn(async () => getEditorText(activeEditor))
            }
        },
        getViewState() {
            return "live-preview";
        },
        get editor(): Editor {
            return workspace.activeEditor.editor;
        }
    } as unknown as InstaTocPlugin;

    return {
        plugin,
        getCapturedContent: () => getEditorText(activeEditor),
        setEditor: (editor: Editor) => {
            workspace.activeEditor.editor = editor;
        }
    };
}

export function createValidatorMock(
    localTocSettings: LocalTocSettings,
    fileHeadings: HeadingCache[]
): { validator: Validator; } {
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

export function createEditor(lines: string[]): Editor {
    let capturedContent = lines.join("\n");
    let cursorPos: EditorPosition = { line: 0, ch: 0 };

    const posToOffset = (pos: EditorPosition): number => {
        return getOffset(capturedContent, pos);
    };

    const replaceRange = (
        replacement: string,
        from: EditorPosition,
        to: EditorPosition,
        _origin?: string
    ): void => {
        capturedContent = replaceContent(capturedContent, replacement, from, to);
    };

    const editor = {
        cm: {
            dispatch: (spec: EditorDispatchSpec) => {
                capturedContent = [
                    capturedContent.slice(0, spec.changes.from),
                    spec.changes.insert,
                    capturedContent.slice(spec.changes.to)
                ].join("");
            },
            posToOffset,
            replaceRange
        },
        getValue(): string {
            return capturedContent;
        },
        setValue(content: string): void {
            capturedContent = content;
        },
        getCursor(): EditorPosition {
            return cursorPos;
        },
        setCursor(position: EditorPosition): void {
            cursorPos = position;
        },
        posToOffset,
        replaceRange,
        getLine(line: number): string {
            return capturedContent.split("\n")[line] ?? "";
        },
        getRange(from: EditorPosition, to: EditorPosition): string {
            const startOffset = posToOffset(from);
            const endOffset = posToOffset(to);

            return capturedContent.slice(startOffset, endOffset);
        }
    } as unknown as TestEditor;

    return editor as unknown as Editor;
}
