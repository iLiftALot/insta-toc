import type InstaTocPlugin from "src/Plugin";
import {
    createSvelteContext,
    FoldToggleComponent,
    type MountedSvelteComponent,
    TocActionsToolbar,
    TocToolbarState,
    type ToolbarState
} from "src/svelte";
import type { IndentLevel } from "src/types";
import { mount, unmount } from "svelte";
import { SvelteMap, SvelteSet } from "svelte/reactivity";

const toolbarInstances = new WeakMap<HTMLElement, MountedSvelteComponent>();
const toggleBtnInstances = new WeakMap<HTMLElement, MountedSvelteComponent[]>();
const toolbarStates = new WeakMap<HTMLElement, ToolbarState>();

export async function mountRenderedTocActionButtons(
    plugin: InstaTocPlugin,
    sourcePath: string,
    el: HTMLElement
): Promise<void> {
    const parent: HTMLElement = el.parentElement as HTMLElement;
    assert(parent, "Rendered TOC element must have a parent to mount action buttons");

    const existingInstance = toolbarInstances.get(parent);
    if (existingInstance) {
        await unmount(existingInstance);
        toolbarInstances.delete(parent);
    }

    let toolbarHost = parent.querySelector<HTMLElement>(
        ":scope > .insta-toc-toolbar-host"
    );
    if (!toolbarHost) {
        toolbarHost = el.createDiv({ cls: "insta-toc-toolbar-host" });
    }
    toolbarHost.replaceChildren();

    const editCodeBlockButton = parent.querySelector<HTMLDivElement>(
        ".edit-block-button[aria-label='Edit this block']:not(.insta-toc-action-button)"
    );
    editCodeBlockButton?.remove();

    const state = toolbarStates.get(el)
        ?? new TocToolbarState(plugin.getTocBlockCollapsed(sourcePath));
    toolbarStates.set(el, state);

    const getRootLists = (): HTMLElement[] => Array.from(el.querySelectorAll<HTMLElement>(":scope > ul, :scope > ol"));

    const getFoldToggles = (): HTMLButtonElement[] =>
        Array.from(
            el.querySelectorAll<HTMLButtonElement>(
                ".insta-toc-fold-toggle-host > .fold-toggle"
            )
        );

    const mounted = mount(TocActionsToolbar, {
        target: toolbarHost,
        props: {
            toolbarState: state,
            onToggleToc() {
                const collapsed = !state.tocCollapsed;
                state.tocCollapsed = collapsed;
                el.classList.toggle("insta-toc-block-collapsed", collapsed);
                getRootLists().forEach((list) => {
                    list.style.display = collapsed ? "none" : "";
                });
                plugin.setTocBlockCollapsed(sourcePath, collapsed);
            },
            onToggleAllFolds() {
                const targetCollapsed = !state.allFoldsCollapsed;
                for (const toggle of getFoldToggles()) {
                    const isCurrentlyCollapsed = toggle.classList.contains(
                        "is-collapsed"
                    );
                    if (isCurrentlyCollapsed !== targetCollapsed) toggle.click();
                }
            },
            async onOpenLocalSettings() {
                await plugin.openLocalSettingsModal(sourcePath);
            },
            onOpenEditBlock: editCodeBlockButton
                ? () => editCodeBlockButton.click()
                : null
        },
        context: createSvelteContext(plugin.context)
    });

    toolbarInstances.set(parent, mounted);

    // Apply initial TOC collapse state
    if (state.tocCollapsed) {
        el.classList.add("insta-toc-block-collapsed");
        getRootLists().forEach((list) => {
            list.style.display = "none";
        });
    }
}

/**
 * Configure indentation for the insta-toc code block HTML element, post-render
 * @param el The HTML element containing the rendered TOC, used to apply classes and styles for indentation and fold state
 * @param headingLevels An array of heading levels corresponding to each list item, used to determine the indent level for each item
 * @param indentSize The number of spaces to use for each {@link IndentLevel}, used to calculate the CSS variable for indentation
 * @param plugin The {@link InstaTocPlugin} instance, used to get and set fold state for each foldable item
 * @param sourcePath The path of the source file, used as part of the key for storing fold state in the plugin's memory (including .md extension)
 * @returns Promise<void>
 */
export async function configureRenderedIndent(
    el: HTMLElement,
    indentSize: IndentLevel,
    plugin: InstaTocPlugin,
    sourcePath: string
): Promise<void> {
    const existingInstances = toggleBtnInstances.get(el);
    if (existingInstances) {
        for (const instance of existingInstances) {
            await unmount(instance);
        }
        toggleBtnInstances.delete(el);
    }

    el.classList.add("insta-toc-rendered");
    el.style.setProperty("--insta-toc-indent-size", `${indentSize * 6}px`);

    const state = new TocToolbarState(plugin.getTocBlockCollapsed(sourcePath));
    toolbarStates.set(el, state);

    let foldParentIndex = 0;
    let totalFolds = 0;
    let initialCollapsedCount = 0;
    const listItems: HTMLLIElement[] = Array.from(el.querySelectorAll("li"));
    const activeModernFoldKeys = new SvelteSet<string>();
    const legacyFoldReferenceCount = new SvelteMap<string, number>();
    const mountedToggleInstances: MountedSvelteComponent[] = [];

    for (const [index, listItem] of listItems.entries()) {
        listItem.classList.add("insta-toc-item");
        if (plugin.isMobile) {
            listItem.classList.add("is-mobile");
        }

        const subList = getNestedListElement(listItem);
        if (!subList) continue;

        foldParentIndex += 1;
        totalFolds += 1;
        listItem.classList.add("insta-toc-fold-parent");

        listItem.querySelector(":scope > .insta-toc-fold-toggle-host")?.remove();
        listItem.querySelector(":scope > .fold-toggle")?.remove();
            
        const foldReference: string = getFoldReference(listItem, index);
        const modernFoldKey = `${sourcePath}::${foldParentIndex}::${foldReference}`;
        activeModernFoldKeys.add(modernFoldKey);

        const legacyCount: number = (legacyFoldReferenceCount.get(foldReference) ?? 0) + 1;
        legacyFoldReferenceCount.set(foldReference, legacyCount);
        const legacyFoldKey = `${sourcePath}::${foldReference}::${legacyCount}`;

        const modernState: boolean | undefined = plugin.getTocFoldState(modernFoldKey);
        const legacyState: boolean | undefined = plugin.getTocFoldState(legacyFoldKey);
        const isCollapsed = modernState ?? legacyState ?? false;

        if (isCollapsed) initialCollapsedCount += 1;

        if (modernState === undefined && legacyState !== undefined) {
            plugin.setTocFoldState(modernFoldKey, legacyState);
        }

        subList.style.display = isCollapsed ? "none" : "";

        const toggleHost = document.createElement("span");
        toggleHost.className = "insta-toc-fold-toggle-host";
        listItem.prepend(toggleHost);

        const mounted = mount(FoldToggleComponent, {
            target: toggleHost,
            props: {
                foldKey: modernFoldKey,
                initialCollapsed: isCollapsed,
                subList,
                onToggle(collapsed: boolean) {
                    state.collapsedCount += collapsed ? 1 : -1;
                }
            },
            context: createSvelteContext(plugin.context)
        });

        mountedToggleInstances.push(mounted);
    }
    state.totalFolds = totalFolds;
    state.collapsedCount = initialCollapsedCount;

    toggleBtnInstances.set(el, mountedToggleInstances);
    plugin.pruneTocFoldStateForPath(sourcePath, activeModernFoldKeys);
}

/**
 * Get the nested list element (ul or ol) within a list item, if it exists
 * @param listItem The {@link HTMLLIElement} representing the list item to check for a nested list
 * @returns The nested list element ({@link HTMLUListElement} or {@link HTMLOListElement}) if it exists, otherwise null
 */
function getNestedListElement(
    listItem: HTMLLIElement
): HTMLUListElement | HTMLOListElement | null {
    for (const child of Array.from(listItem.children)) {
        if (child instanceof HTMLUListElement || child instanceof HTMLOListElement) {
            return child;
        }
    }

    return null;
}

/**
 * Get a reference string for a foldable list item, used as part of the key for storing fold state in the plugin's memory
 * @param listItem The {@link HTMLLIElement} representing the foldable list item to get a reference for
 * @param index The index of the list item in the rendered TOC, used as a fallback for generating a reference if no link or text content is available
 * @returns A string reference for the list item, derived from its link or text content, used for storing fold state in the plugin's memory
 */
function getFoldReference(listItem: HTMLLIElement, index: number): string {
    const linkSelector = ":scope > a.internal-link, :scope > a, :scope > p > a.internal-link, :scope > p > a";
    const directLink = listItem.querySelector(linkSelector);

    let foldReference: string | undefined;

    if (directLink instanceof HTMLAnchorElement) {
        foldReference = directLink.getAttribute("href")?.trim()
            || directLink.textContent?.trim()
            || undefined;
    }

    const fallbackText = listItem.textContent?.replace(/\s+/g, " ").trim();
    return foldReference || fallbackText || `item-${index}`;
}
