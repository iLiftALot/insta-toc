type AnyFn = (...args: any[]) => any;

export class App {
    workspace: any = {};
    vault: any = {};
    metadataCache: any = {};
    fileManager: any = {};
}

export class Plugin {
    app: App;

    constructor(app?: App, _manifest?: unknown) {
        this.app = app ?? new App();
    }

    registerEvent(_ref: unknown): void {}
    registerMarkdownCodeBlockProcessor(_name: string, _processor: AnyFn): void {}
    addSettingTab(_tab: unknown): void {}

    async loadData(): Promise<any> {
        return {};
    }

    async saveData(_data: unknown): Promise<void> {}
}

export class PluginSettingTab {
    app: App;
    plugin: unknown;
    containerEl: any = {
        empty: () => undefined,
    };

    constructor(app: App, plugin: unknown) {
        this.app = app;
        this.plugin = plugin;
    }
}

export class DropdownComponent {
    addOptions(_options: Record<string, string>): this {
        return this;
    }

    setValue(_value: string): this {
        return this;
    }

    onChange(_handler: AnyFn): this {
        return this;
    }
}

export class SliderComponent {
    setLimits(_min: number, _max: number, _step: number): this {
        return this;
    }

    setDynamicTooltip(): this {
        return this;
    }

    setInstant(_instant: boolean): this {
        return this;
    }

    setValue(_value: number): this {
        return this;
    }

    onChange(_handler: AnyFn): this {
        return this;
    }
}

export class TextComponent {
    inputEl: any = {
        placeholder: '',
        classList: {
            add: (..._classes: string[]) => undefined,
        },
    };

    setValue(_value: string): this {
        return this;
    }

    onChange(_handler: AnyFn): this {
        return this;
    }
}

export class TextAreaComponent {
    private value = '';

    inputEl: any = {
        placeholder: '',
        classList: {
            add: (..._classes: string[]) => undefined,
        },
        addEventListener: (_event: string, _handler: AnyFn) => undefined,
    };

    setValue(value: string): this {
        this.value = value;
        return this;
    }

    getValue(): string {
        return this.value;
    }

    onChange(_handler: AnyFn): this {
        return this;
    }
}

export class Setting {
    nameEl: any = {
        classList: {
            add: (..._classes: string[]) => undefined,
        },
    };

    controlEl: any = {
        remove: () => undefined,
    };

    infoEl: any = {
        classList: {
            add: (..._classes: string[]) => undefined,
        },
    };

    constructor(_containerEl: unknown) {}

    setHeading(): this {
        return this;
    }

    setName(_name: string): this {
        return this;
    }

    setDesc(_description: string): this {
        return this;
    }

    setTooltip(_tooltip: string): this {
        return this;
    }

    addDropdown(callback: (component: DropdownComponent) => unknown): this {
        callback(new DropdownComponent());
        return this;
    }

    addSlider(callback: (component: SliderComponent) => unknown): this {
        callback(new SliderComponent());
        return this;
    }

    addText(callback: (component: TextComponent) => unknown): this {
        callback(new TextComponent());
        return this;
    }

    addTextArea(callback: (component: TextAreaComponent) => unknown): this {
        callback(new TextAreaComponent());
        return this;
    }
}

export class TFile {
    path = '';
}

export class MarkdownView {}

export class Notice {
    message: string;

    constructor(message: string) {
        this.message = message;
    }
}

export const MarkdownRenderer = {
    render: async (_app: App, _source: string, _el: HTMLElement, _sourcePath: string, _component: unknown): Promise<void> => {
        return;
    },
};

export function debounce<TArgs extends any[], TResult>(
    fn: (...args: TArgs) => TResult,
    _wait: number,
    _immediate?: boolean,
): (...args: TArgs) => TResult {
    return (...args: TArgs): TResult => fn(...args);
}

export function parseYaml(yaml: string): any {
    const result: Record<string, any> = {};
    const lines = yaml.split(/\r?\n/);
    let index = 0;

    const parseScalar = (value: string): any => {
        const trimmed = value.trim();

        if (trimmed === 'true') return true;
        if (trimmed === 'false') return false;
        if (/^[-+]?\d+$/.test(trimmed)) return Number(trimmed);

        if (
            (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
            (trimmed.startsWith("'") && trimmed.endsWith("'"))
        ) {
            return trimmed.slice(1, -1);
        }

        return trimmed;
    };

    while (index < lines.length) {
        const line = lines[index];

        if (!line || line.trim() === '') {
            index += 1;
            continue;
        }

        const keyMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
        if (!keyMatch) {
            throw new Error(`Invalid YAML line: ${line}`);
        }

        const [, key, inlineValue] = keyMatch;

        if (inlineValue !== '') {
            result[key] = parseScalar(inlineValue);
            index += 1;
            continue;
        }

        index += 1;
        const block: string[] = [];

        while (index < lines.length) {
            const current = lines[index];

            if (!current || current.trim() === '') {
                block.push(current);
                index += 1;
                continue;
            }

            if (!current.startsWith('  ')) break;

            block.push(current);
            index += 1;
        }

        const nonEmpty = block.filter((entry) => entry.trim() !== '');

        if (nonEmpty.length === 0) {
            result[key] = {};
            continue;
        }

        if (nonEmpty.every((entry) => entry.trimStart().startsWith('- '))) {
            result[key] = nonEmpty.map((entry) => parseScalar(entry.trimStart().slice(2)));
            continue;
        }

        const nested: Record<string, any> = {};

        for (const entry of nonEmpty) {
            const nestedMatch = entry.trim().match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
            if (!nestedMatch) {
                throw new Error(`Invalid YAML nested line: ${entry}`);
            }

            const [, nestedKey, nestedValue] = nestedMatch;
            nested[nestedKey] = parseScalar(nestedValue);
        }

        result[key] = nested;
    }

    return result;
}

export function stringifyYaml(value: unknown): string {
    if (!value || typeof value !== 'object') return '';

    const lines: string[] = [];
    for (const [key, val] of Object.entries(value as Record<string, any>)) {
        if (Array.isArray(val)) {
            lines.push(`${key}:`);
            for (const item of val) {
                lines.push(`  - ${String(item)}`);
            }
            continue;
        }

        if (val && typeof val === 'object') {
            lines.push(`${key}:`);
            for (const [nestedKey, nestedVal] of Object.entries(val)) {
                lines.push(`  ${nestedKey}: ${String(nestedVal)}`);
            }
            continue;
        }

        lines.push(`${key}: ${String(val)}`);
    }

    return `${lines.join('\n')}\n`;
}

export function htmlToMarkdown(input: string): string {
    return input.replace(/<[^>]*>/g, '');
}
