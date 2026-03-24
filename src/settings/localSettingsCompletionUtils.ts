export type CompletionMatchMode = "startsWith" | "includes";

export function stripYamlInlineComment(value: string): string {
    let inSingle = false;
    let inDouble = false;

    for (let i = 0; i < value.length; i += 1) {
        const char = value[i];

        if (char === "'" && !inDouble) {
            if (inSingle && value[i + 1] === "'") {
                i += 1;
                continue;
            }

            inSingle = !inSingle;
            continue;
        }

        if (char === "\"" && !inSingle) {
            let backslashCount = 0;

            for (let j = i - 1; j >= 0 && value[j] === "\\"; j -= 1) {
                backslashCount += 1;
            }

            if (backslashCount % 2 === 0) {
                inDouble = !inDouble;
            }

            continue;
        }

        if (char === "#" && !inSingle && !inDouble) {
            const previousChar = i === 0 ? " " : value[i - 1];

            if (/\s/.test(previousChar)) {
                return value.slice(0, i).trimEnd();
            }
        }
    }

    return value.trimEnd();
}

export function quoteYamlSingleQuoted(value: string): string {
    return `'${value.replace(/'/g, "''")}'`;
}

function unquoteYamlSingleQuoted(value: string): string {
    return value.slice(1, -1).replace(/''/g, "'");
}

function unquoteYamlDoubleQuoted(value: string): string {
    return value.slice(1, -1).replace(/\\(["\\])/g, "$1");
}

export function parseYamlArrayItemValue(rawValue: string): string {
    const trimmedValue = stripYamlInlineComment(rawValue).trim().replace(/''/g, "'")
        .replace(/""/g, "\"");
    if (trimmedValue.length === 0) return "";

    if (
        trimmedValue.startsWith("'") && trimmedValue.endsWith("'")
        && trimmedValue.length > 1
    ) {
        return unquoteYamlSingleQuoted(trimmedValue);
    }

    if (
        trimmedValue.startsWith("\"") && trimmedValue.endsWith("\"")
        && trimmedValue.length > 1
    ) {
        return unquoteYamlDoubleQuoted(trimmedValue);
    }

    return trimmedValue;
}

export function normalizeYamlArrayItemQuery(rawValue: string): string {
    const trimmedValue = stripYamlInlineComment(rawValue).trimStart();

    if (trimmedValue.length === 0) return "";

    if (trimmedValue.startsWith("'")) {
        return trimmedValue.slice(1).replace(/''/g, "'");
    }

    if (trimmedValue.startsWith("\"")) {
        return trimmedValue.slice(1).replace(/\\(["\\])/g, "$1");
    }

    return trimmedValue;
}

export function matchesCompletionQuery(
    value: string,
    query: string,
    mode: CompletionMatchMode = "startsWith"
): boolean {
    const normalizedQuery = query.trim().toLowerCase();

    if (normalizedQuery.length === 0) return true;

    const normalizedValue = value.toLowerCase();

    return mode === "includes"
        ? normalizedValue.includes(normalizedQuery)
        : normalizedValue.startsWith(normalizedQuery);
}
