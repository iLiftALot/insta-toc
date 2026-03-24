<script lang="ts">
    import {
        autocompletion,
        type Completion,
        type CompletionContext,
        type CompletionResult,
        startCompletion
    } from "@codemirror/autocomplete";
    import { yaml } from "@codemirror/lang-yaml";
    import { syntaxTree } from "@codemirror/language";
    import { type Diagnostic, linter, lintGutter } from "@codemirror/lint";
    import { Compartment, EditorState, Line } from "@codemirror/state";
    import { oneDark } from "@codemirror/theme-one-dark";
    import {
        EditorView,
        keymap,
        placeholder as placeholderExt,
        ViewUpdate
    } from "@codemirror/view";
    import { basicSetup } from "codemirror";
    import { parseYaml } from "obsidian";
    import { localSettingsComponentPlaceholder } from "src/constants";
    import {
        matchesCompletionQuery,
        normalizeYamlArrayItemQuery,
        parseYamlArrayItemValue,
        quoteYamlSingleQuoted
    } from "src/settings/localSettingsCompletionUtils";
    import { getContext, onDestroy, onMount, tick } from "svelte";
    import { SvelteSet } from "svelte/reactivity";
    import type { YamlSchemaNode } from "../../ComponentTypes";
    import type ModalBase from "../modal/ModalBase";
    
    interface Props {
        initialYaml?: string;
        darkMode?: boolean;
        bulletTypeOptions?: string[];
        omitSuggestions?: string[];
    }

    let {
        initialYaml = "",
        darkMode = true,
        bulletTypeOptions = [],
        omitSuggestions = []
    }: Props = $props();

    let editorContainer: HTMLDivElement | undefined = $state();
    let editorView: EditorView | null = null;
    let errorMessage: string = $state("");
    let saving: boolean = $state(false);

    const componentClassInstance = getContext<ModalBase>(
        "componentClassInstance"
    );
    const themeCompartment = new Compartment();
    const INDENT_UNIT = "  ";
    const HEADING_LEVEL_OPTIONS = ["1", "2", "3", "4", "5", "6"];
    const BOOLEAN_OPTIONS = ["true", "false"];
    const YAML_KEY_PATTERN = /^(\s*)([A-Za-z_][A-Za-z0-9_-]*)\s*:(.*)$/;
    const YAML_ARRAY_ITEM_PATTERN = /^(\s*)-\s*(.*)$/;
    const YAML_SCALAR_VALUE_PATTERN =
        /^\s*([A-Za-z_][A-Za-z0-9_-]*)\s*:\s*([^#]*)$/;
    const YAML_KEY_PREFIX_PATTERN = /^(\s*)([A-Za-z_][A-Za-z0-9_-]*)?$/;
    const COMPLETION_TRIGGER_PATTERNS = [
        /^\s*-\s$/,
        /^\s*[A-Za-z_]\w*\s*:\s$/,
        /^\s+$/
    ];

    interface ScopeEntry {
        indent: number;
        key: string;
    }

    interface ParsedKeyLine {
        indent: number;
        key: string;
        value: string;
    }

    interface ParsedArrayItemLine {
        indent: number;
        value: string;
    }

    interface CompletionLineContext {
        line: Line;
        lineIndex: number;
        lines: string[];
        textBefore: string;
        currentIndent: number;
        parentPath: string[];
    }

    function createLocalSettingsSchema(
        listTypeOptions: string[],
        omitItems: string[]
    ): YamlSchemaNode {
        return {
            kind: "object",
            children: {
                title: {
                    kind: "object",
                    children: {
                        name: { kind: "string" },
                        level: { kind: "enum", values: HEADING_LEVEL_OPTIONS },
                        center: { kind: "enum", values: BOOLEAN_OPTIONS }
                    }
                },
                exclude: { kind: "string" },
                style: {
                    kind: "object",
                    children: {
                        listType: { kind: "enum", values: listTypeOptions }
                    }
                },
                omit: { kind: "array", itemValues: omitItems },
                levels: {
                    kind: "object",
                    children: {
                        min: { kind: "enum", values: HEADING_LEVEL_OPTIONS },
                        max: { kind: "enum", values: HEADING_LEVEL_OPTIONS }
                    }
                }
            }
        };
    }

    const localSettingsSchema = $derived(
        createLocalSettingsSchema(bulletTypeOptions, omitSuggestions)
    );

    function normalizeLine(line: string): string {
        return line.replace(/\t/g, INDENT_UNIT);
    }

    function getIndentLevel(line: string): number {
        const match = normalizeLine(line).match(/^(\s*)/);
        return match?.[1].length ?? 0;
    }

    function arePathsEqual(a: string[], b: string[]): boolean {
        if (a.length !== b.length) return false;
        return a.every((segment, index) => segment === b[index]);
    }

    function popScopeEntries(stack: ScopeEntry[], indent: number): void {
        while (stack.length > 0 && indent <= stack[stack.length - 1].indent) {
            stack.pop();
        }
    }

    function getScopePath(stack: ScopeEntry[]): string[] {
        return stack.map((entry) => entry.key);
    }

    function parseKeyLine(rawLine: string): ParsedKeyLine | null {
        const line = normalizeLine(rawLine);
        const trimmed = line.trim();

        if (!trimmed || trimmed.startsWith("#")) return null;

        const keyMatch = line.match(YAML_KEY_PATTERN);
        if (!keyMatch) return null;

        return {
            indent: keyMatch[1].length,
            key: keyMatch[2],
            value: keyMatch[3].trim()
        };
    }

    function parseArrayItemLine(rawLine: string): ParsedArrayItemLine | null {
        const line = normalizeLine(rawLine);
        const trimmed = line.trim();

        if (!trimmed || trimmed.startsWith("#")) return null;

        const itemMatch = line.match(YAML_ARRAY_ITEM_PATTERN);
        if (!itemMatch) return null;

        return {
            indent: itemMatch[1].length,
            value: itemMatch[2]
        };
    }

    function getCompletionLineContext(
        context: CompletionContext
    ): CompletionLineContext {
        const line = context.state.doc.lineAt(context.pos);
        const lineIndex = line.number - 1;
        const lines = context.state.doc.toString().split("\n");
        const textBefore = line.text.slice(0, context.pos - line.from);
        const currentIndent = getIndentLevel(textBefore);

        return {
            line,
            lineIndex,
            lines,
            textBefore,
            currentIndent,
            parentPath: getParentPathForLine(lines, lineIndex, currentIndent)
        };
    }

    function getSchemaNode(path: string[]): YamlSchemaNode | null {
        let node: YamlSchemaNode = localSettingsSchema;

        for (const segment of path) {
            if (node.kind !== "object") return null;

            const nextNode = node.children[segment];
            if (!nextNode) return null;

            node = nextNode;
        }

        return node;
    }

    function getParentPathForLine(
        lines: string[],
        lineIndex: number,
        currentIndent: number
    ): string[] {
        const stack: ScopeEntry[] = [];

        for (let i = 0; i < lineIndex; i++) {
            const keyLine = parseKeyLine(lines[i]);
            if (!keyLine) continue;

            const { indent, key, value } = keyLine;
            popScopeEntries(stack, indent);

            if (value === "") {
                stack.push({ indent, key });
            }
        }

        popScopeEntries(stack, currentIndent);

        return getScopePath(stack);
    }

    function getUsedKeysInScope(
        lines: string[],
        scopePath: string[],
        scopeIndent: number
    ): Set<string> {
        const used = new SvelteSet<string>();
        const stack: ScopeEntry[] = [];

        for (const rawLine of lines) {
            const keyLine = parseKeyLine(rawLine);
            if (!keyLine) continue;

            const { indent, key, value } = keyLine;
            popScopeEntries(stack, indent);

            const parentPath = getScopePath(stack);
            if (
                indent === scopeIndent && arePathsEqual(parentPath, scopePath)
            ) {
                used.add(key);
            }

            if (value === "") {
                stack.push({ indent, key });
            }
        }

        return used;
    }

    function getUsedArrayItemsInScope(
        lines: string[],
        scopePath: string[],
        scopeIndent: number,
        excludeLineIndex?: number
    ): Set<string> {
        const used = new SvelteSet<string>();
        const stack: ScopeEntry[] = [];

        for (let i = 0; i < lines.length; i += 1) {
            if (i === excludeLineIndex) continue;

            const keyLine = parseKeyLine(lines[i]);
            if (keyLine) {
                const { indent, key, value } = keyLine;
                popScopeEntries(stack, indent);

                if (value === "") {
                    stack.push({ indent, key });
                }

                continue;
            }

            const itemLine = parseArrayItemLine(lines[i]);
            if (!itemLine) continue;

            const { indent } = itemLine;
            const value = parseYamlArrayItemValue(itemLine.value);

            if (!value) continue;

            const parentPath = getScopePath(stack);
            if (
                indent === scopeIndent && arePathsEqual(parentPath, scopePath)
            ) {
                used.add(value);
            }
        }

        return used;
    }

    function mapEnumCompletions(
        values: string[],
        typedPrefix: string
    ): Completion[] {
        return values
            .filter((value) => matchesCompletionQuery(value, typedPrefix))
            .map((value) => ({
                label: value,
                type: "enum" as const
            }));
    }

    function getSchemaNodeDetail(node: YamlSchemaNode): string {
        if (node.kind === "object") return "object";
        if (node.kind === "enum") return `allowed: ${node.values.join(", ")}`;
        if (node.kind === "array") return "list";
        return "string";
    }

    function buildKeyCompletionOptions(
        scopeNode: Extract<YamlSchemaNode, { kind: "object"; }>,
        usedKeys: Set<string>,
        typedPrefix: string,
        currentIndent: number
    ): Completion[] {
        return Object.entries(scopeNode.children)
            .filter(
                ([key]) =>
                    (!usedKeys.has(key) || key === typedPrefix)
                    && matchesCompletionQuery(key, typedPrefix)
            )
            .map(([key, node]) => ({
                label: key,
                type: "property" as const,
                detail: getSchemaNodeDetail(node),
                apply: node?.kind === "object"
                    ? `${key}:\n${
                        " ".repeat(currentIndent + INDENT_UNIT.length)
                    }`
                    : `${key}: `
            }));
    }

    function buildOmitCompletionOptions(
        availableValues: string[],
        normalizedPrefix: string
    ): Completion[] {
        const matchedValues = availableValues.filter((value) =>
            matchesCompletionQuery(value, normalizedPrefix, "includes")
        );

        return matchedValues.map((value, idx) => ({
            label: value,
            type: "text" as const,
            detail: `Exclude '${value}'`,
            info: `Exclude '${value}'`,
            sortText: String(idx).padStart(6, "0"),
            apply: quoteYamlSingleQuoted(value)
        }));
    }

    function createOmitCompletionResult(
        context: CompletionContext,
        lineContext: CompletionLineContext = getCompletionLineContext(context),
        arrayItemMatch: RegExpMatchArray | null = lineContext.textBefore.match(
            YAML_ARRAY_ITEM_PATTERN
        )
    ): CompletionResult | null {
        if (!arrayItemMatch) return null;

        const { line, lineIndex, lines, currentIndent, parentPath } =
            lineContext;

        const arrayNode = getSchemaNode(parentPath);
        if (arrayNode?.kind !== "array") return null;

        const values = arrayNode.itemValues ?? [];
        if (values.length === 0) return null;

        const usedValues = getUsedArrayItemsInScope(
            lines,
            parentPath,
            currentIndent,
            lineIndex
        );

        const availableValues = values.filter((value) =>
            !usedValues.has(value)
        );

        const rawTypedPrefix = arrayItemMatch[2] ?? "";
        const replacementPrefix = rawTypedPrefix.trimStart();
        const typedPrefix = normalizeYamlArrayItemQuery(replacementPrefix);
        const normalizedPrefix = normalizeValuePrefix(typedPrefix);

        const options = buildOmitCompletionOptions(
            availableValues,
            normalizedPrefix
        );
        if (options.length === 0) return null;

        return {
            from: context.pos - replacementPrefix.length,
            to: line.to,
            options,
            filter: false,
            update: (_current, _from, _to, nextContext) =>
                createOmitCompletionResult(nextContext)
        };
    }

    function shouldStartCompletion(textBefore: string): boolean {
        return COMPLETION_TRIGGER_PATTERNS.some((pattern) =>
            pattern.test(textBefore)
        );
    }

    function handleTabKey(view: EditorView): boolean {
        const { state } = view;
        const { from, to } = state.selection.main;

        if (from === to) {
            view.dispatch({
                changes: {
                    from,
                    to,
                    insert: INDENT_UNIT
                },
                selection: { anchor: from + INDENT_UNIT.length }
            });

            return true;
        }

        const changes = [];
        let lineCount = 0;

        for (let pos = from; pos <= to;) {
            const line = state.doc.lineAt(pos);
            changes.push({ from: line.from, insert: INDENT_UNIT });
            lineCount += 1;
            pos = line.to + 1;
        }

        view.dispatch({ changes });
        view.dispatch({
            selection: {
                anchor: from + INDENT_UNIT.length,
                head: to + INDENT_UNIT.length * lineCount
            }
        });

        return true;
    }

    function normalizeValuePrefix(rawPrefix: string): string {
        const trimmed = rawPrefix.trim();

        if (trimmed === "null" || trimmed === "~") {
            return "";
        }

        return trimmed;
    }

    function yamlLinter(view: EditorView): Diagnostic[] {
        const doc = view.state.doc.toString();
        if (!doc.trim()) return [];

        const diagnostics: Diagnostic[] = [];

        // Walk the Lezer syntax tree for parse-error nodes
        const tree = syntaxTree(view.state);
        tree.iterate({
            enter: (node) => {
                if (node.type.isError) {
                    const from = node.from;
                    const to = node.to > node.from
                        ? node.to
                        : Math.min(node.from + 1, doc.length);
                    const line = view.state.doc.lineAt(from);
                    const snippet = line.text.trim().slice(0, 40);
                    diagnostics.push({
                        from,
                        to,
                        severity: "error",
                        message: snippet
                            ? `YAML syntax error near: ${snippet}`
                            : "YAML syntax error"
                    });
                }
            }
        });

        if (diagnostics.length > 0) return diagnostics;

        // Fallback: Obsidian parseYaml for semantic errors the parser doesn't catch
        try {
            parseYaml(doc);
        } catch (e: any) {
            const message = e?.message || "Invalid YAML";
            const lineMatch = message.match(/line (\d+)/i);
            let from = 0;
            let to = doc.length;

            if (lineMatch) {
                const lineNum = Math.min(
                    parseInt(lineMatch[1], 10),
                    view.state.doc.lines
                );
                const line = view.state.doc.line(lineNum);
                from = line.from;
                to = line.to;
            }

            diagnostics.push({ from, to, severity: "error", message });
        }

        return diagnostics;
    }

    function yamlCompletions(
        context: CompletionContext
    ): CompletionResult | null {
        const lineContext = getCompletionLineContext(context);
        const { line, lines, textBefore, currentIndent, parentPath } =
            lineContext;

        // Completing array values, e.g. omit:
        //   - Heading text
        const arrayItemMatch = textBefore.match(YAML_ARRAY_ITEM_PATTERN);
        if (arrayItemMatch) {
            const omitResult = createOmitCompletionResult(
                context,
                lineContext,
                arrayItemMatch
            );
            if (omitResult) return omitResult;
        }

        // Completing scalar value after key: value
        const valueMatch = textBefore.match(YAML_SCALAR_VALUE_PATTERN);
        if (valueMatch) {
            const key = valueMatch[1];
            const typedPrefix = valueMatch[2].trimStart();
            const normalizedPrefix = normalizeValuePrefix(typedPrefix);
            const valueNode = getSchemaNode([...parentPath, key]);

            if (valueNode?.kind !== "enum") return null;

            let options = mapEnumCompletions(
                valueNode.values,
                normalizedPrefix
            );

            if (options.length === 0 && context.explicit) {
                options = mapEnumCompletions(valueNode.values, "");
            }

            if (options.length === 0) return null;

            return {
                from: context.pos - typedPrefix.length,
                options,
                to: line.to,
                validFor: /^[A-Za-z0-9_-]*$/
            };
        }

        // Completing keys in the current object scope
        const keyMatch = textBefore.match(YAML_KEY_PREFIX_PATTERN);
        if (!keyMatch) return null;

        const typedPrefix = keyMatch[2] ?? "";
        if (!typedPrefix && !context.explicit && textBefore.trim().length > 0) {
            return null;
        }

        const scopeNode = parentPath.length === 0
            ? localSettingsSchema
            : getSchemaNode(parentPath);

        if (!scopeNode || scopeNode.kind !== "object") return null;

        const usedKeys = getUsedKeysInScope(lines, parentPath, currentIndent);
        const options = buildKeyCompletionOptions(
            scopeNode,
            usedKeys,
            typedPrefix,
            currentIndent
        );

        if (options.length === 0) return null;

        return {
            from: context.pos - typedPrefix.length,
            options,
            validFor: /^[A-Za-z0-9_-]*$/
        };
    }

    function getEditorContent(): string {
        return editorView?.state.doc.toString() ?? initialYaml;
    }

    async function handleSave() {
        errorMessage = "";
        const content = getEditorContent();

        try {
            if (content.trim()) {
                parseYaml(content);
            }
        } catch (e: any) {
            errorMessage = `Invalid YAML: ${e?.message || "Unknown error"}`;
            return;
        }

        // Parent is responsible for closing; reset saving after a tick in componentClassInstance.submit
        saving = true;
        await componentClassInstance.submit(content);
        saving = false;
    }

    onMount(() => {
        const extensions = [
            basicSetup,
            yaml(),
            placeholderExt(localSettingsComponentPlaceholder),
            lintGutter({}),
            linter(yamlLinter, { delay: 300 }),
            autocompletion({
                override: [yamlCompletions],
                activateOnTyping: true
            }),
            EditorView.updateListener.of((update: ViewUpdate) => {
                if (!update.docChanged) return;
                const pos = update.state.selection.main.head;
                const line = update.state.doc.lineAt(pos);
                const textBefore = line.text.slice(0, pos - line.from);
                if (shouldStartCompletion(textBefore)) {
                    startCompletion(update.view);
                }
            }),
            keymap.of([
                {
                    key: "Mod-s",
                    run: () => {
                        handleSave();
                        return true;
                    }
                },
                {
                    key: "Escape",
                    run: () => {
                        componentClassInstance.close();
                        return true;
                    }
                },
                {
                    key: "Tab",
                    preventDefault: true,
                    run: handleTabKey
                }
            ]),
            themeCompartment.of(darkMode ? oneDark : []),
            EditorView.theme({
                "&": {
                    height: "300px",
                    fontSize: "0.85em",
                    border: "1px solid var(--background-modifier-border)",
                    borderRadius: "4px",
                    backgroundColor: "var(--background-primary)"
                },
                ".cm-scroller": {
                    fontFamily: "var(--font-monospace)",
                    overflow: "auto"
                },
                ".cm-content": {
                    padding: "8px"
                },
                ".cm-gutters": {
                    backgroundColor: "var(--background-secondary)",
                    borderRight: "1px solid var(--background-modifier-border)"
                }
            }),
            EditorState.tabSize.of(INDENT_UNIT.length)
        ];

        if (!editorContainer) {
            return;
        }

        editorView = new EditorView({
            state: EditorState.create({
                doc: initialYaml,
                extensions
            }),
            parent: editorContainer
        });

        editorView.focus();
    });

    onDestroy(() => {
        editorView?.destroy();
        editorView = null;
    });
</script>

<div class="local-settings-component">
    <p class="setting-item-description">
        Enter YAML configuration below. These settings will override the global
        defaults for this note.
        <kbd>Ctrl/Cmd+S</kbd> to save, <kbd>Esc</kbd> to cancel.
    </p>

    <div class="yaml-editor-container" bind:this={editorContainer}></div>

    {#if errorMessage}
        <div class="yaml-error-message">{errorMessage}</div>
    {/if}

    <div class="button-container">
        <button
            class="mod-cancel"
            onclick={componentClassInstance.close}
            disabled={saving}>
            Cancel
        </button>
        <button class="mod-cta" onclick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
        </button>
    </div>
</div>

<style lang="scss">
    .setting-item-description {
      color: var(--text-muted);
      font-size: 0.875em;
      margin-bottom: 1em;
    }

    .setting-item-description kbd {
      font-size: 0.85em;
      padding: 1px 4px;
      border: 1px solid var(--background-modifier-border);
      border-radius: 3px;
      background: var(--background-secondary);
      font-family: var(--font-monospace);
    }

    .yaml-editor-container {
      margin-bottom: 1em;
      border-radius: 4px;
      overflow: hidden;
      padding: 0px;
    }

    .yaml-error-message {
      color: var(--text-error);
      background: var(--background-modifier-error);
      padding: 8px 12px;
      border-radius: 4px;
      margin-bottom: 1em;
      font-size: 0.85em;
      font-family: var(--font-monospace);
    }

    .button-container {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      flex: 0 33%;
      margin: 0;
      button {
        padding: 6px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.9em;
        border: 1px solid var(--background-modifier-border);
        margin: 0;
        color: var(--text-normal);
        &.mod-cta {
          flex: 0 33%;
          margin: 0;
        }
        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        &.mod-cta:hover:not(:disabled) {
          background: var(--interactive-accent-hover);
          color: var(--text-on-accent);
        }
        &.mod-cancel:hover:not(:disabled) {
          background: #f80606b9;
        }
      }
    }
</style>
