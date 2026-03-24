import type { IndentLevel } from 'src/types';
import { describe, expect, test } from 'vitest';
import type InstaTocPlugin from '../src/main';
import { configureRenderedIndent } from '../src/svelte/TocMount.svelte';

type FoldPlugin = InstaTocPlugin & {
    __foldState: Map<string, boolean>;
};

function createFoldPlugin(): FoldPlugin {
    const foldState = new Map<string, boolean>();

    return {
        __foldState: foldState,
        getTocFoldState: (key: string): boolean | undefined => foldState.get(key),
        setTocFoldState: (key: string, isCollapsed: boolean): void => {
            foldState.set(key, isCollapsed);
        },
        pruneTocFoldStateForPath: (
            sourcePath: string,
            activeModernFoldKeys: Set<string>
        ): void => {
            const pathPrefix = `${sourcePath}::`;

            for (const key of Array.from(foldState.keys())) {
                if (key.startsWith(pathPrefix) && !activeModernFoldKeys.has(key)) {
                    foldState.delete(key);
                }
            }
        },
        configureRenderedIndent: async (
            container: HTMLElement,
            indentLevel: IndentLevel,
            filePath: string
        ): Promise<void> => {
            await configureRenderedIndent(
                container,
                indentLevel,
                {} as InstaTocPlugin,
                filePath
            );
        },
        getTocBlockCollapsed(sourcePath: string): boolean {
            return foldState.get(sourcePath) ?? false;
        }
    } as unknown as FoldPlugin;
}

function createRenderedTocElement(): HTMLElement {
    const container = document.createElement('div');
    container.innerHTML = `
        <ul>
            <li>
                <a href="notes/my-note#Heading 1" class="internal-link">Heading 1</a>
                <ul>
                    <li>
                        <a href="notes/my-note#Heading 2" class="internal-link">Heading 2</a>
                    </li>
                </ul>
            </li>
        </ul>
    `;

    return container;
}

function getRenderedControls(container: HTMLElement): {
    toggleButton: HTMLButtonElement;
    subList: HTMLUListElement;
} {
    const parentItem = container.querySelector('li') as HTMLLIElement;
    const toggleButton = parentItem.querySelector(
        ':scope > .fold-toggle'
    ) as HTMLButtonElement;
    const subList = parentItem.querySelector(':scope > ul') as HTMLUListElement;

    return { toggleButton, subList };
}

describe('TOC fold rendering and memory', () => {
    test('adds sleek fold toggles and persists collapsed state on click', async () => {
        const plugin = createFoldPlugin();
        const container = createRenderedTocElement();

        await configureRenderedIndent(container, 2, plugin, 'notes/my-note.md');

        const { toggleButton, subList } = getRenderedControls(container);

        expect(toggleButton).toBeTruthy();
        expect(toggleButton.classList.contains('is-collapsed')).toBe(false);
        expect(subList.style.display).toBe('');

        toggleButton.click();

        expect(toggleButton.classList.contains('is-collapsed')).toBe(true);
        expect(subList.style.display).toBe('none');
        expect(plugin.__foldState.size).toBe(1);
        expect(Array.from(plugin.__foldState.values())[0]).toBe(true);
    });

    test('restores collapsed state after TOC re-render in same file', async () => {
        const plugin = createFoldPlugin();

        const firstRender = createRenderedTocElement();
        await configureRenderedIndent(firstRender, 2, plugin, 'notes/my-note.md');
        const firstToggle = getRenderedControls(firstRender).toggleButton;
        firstToggle.click();

        const secondRender = createRenderedTocElement();
        await configureRenderedIndent(secondRender, 2, plugin, 'notes/my-note.md');

        const { toggleButton, subList } = getRenderedControls(secondRender);

        expect(toggleButton.classList.contains('is-collapsed')).toBe(true);
        expect(subList.style.display).toBe('none');
    });

    test('does not leak fold state across different files', async () => {
        const plugin = createFoldPlugin();

        const firstFileRender = createRenderedTocElement();
        await configureRenderedIndent(firstFileRender, 2, plugin, 'notes/file-a.md');
        getRenderedControls(firstFileRender).toggleButton.click();

        const secondFileRender = createRenderedTocElement();
        await configureRenderedIndent(secondFileRender, 2, plugin, 'notes/file-b.md');

        const { toggleButton, subList } = getRenderedControls(secondFileRender);

        expect(toggleButton.classList.contains('is-collapsed')).toBe(false);
        expect(subList.style.display).toBe('');
    });

    test('restores from legacy fold key on first render and migrates key format', async () => {
        const plugin = createFoldPlugin();

        plugin.__foldState.set('notes/my-note.md::notes/my-note#Heading 1::1', true);

        const container = createRenderedTocElement();
        await configureRenderedIndent(container, 2, plugin, 'notes/my-note.md');

        const { toggleButton, subList } = getRenderedControls(container);

        expect(toggleButton.classList.contains('is-collapsed')).toBe(true);
        expect(subList.style.display).toBe('none');
        expect(
            plugin.__foldState.get('notes/my-note.md::1::notes/my-note#Heading 1')
        ).toBe(true);
    });
});
