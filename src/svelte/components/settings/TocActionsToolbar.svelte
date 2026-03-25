<script lang="ts">
    import type InstaTocPlugin from "src/Plugin";
    import { getContext } from "svelte";
    import { icon } from "../../IconMounter";
    import type { TocToolbarState } from "../../TocToolbarState.svelte";

    interface Props {
        toolbarState: TocToolbarState;
        onToggleToc: () => void;
        onToggleAllFolds: () => void;
        onOpenLocalSettings: () => void;
        onOpenEditBlock?: (() => void) | null;
    }

    let {
        toolbarState,
        onToggleToc,
        onToggleAllFolds,
        onOpenLocalSettings,
        onOpenEditBlock = null
    }: Props = $props();

    const plugin = getContext<InstaTocPlugin>("plugin");

    function handleKeyActivate(evt: KeyboardEvent): void {
        if (evt.key !== "Enter" && evt.key !== " ") return;

        evt.preventDefault();
        evt.stopPropagation();
        (evt.currentTarget as HTMLElement)?.click();
    }

    function handleToggleToc(evt: MouseEvent): void {
        evt.preventDefault();
        evt.stopPropagation();
        onToggleToc();
    }

    function handleToggleAllFolds(evt: MouseEvent): void {
        evt.preventDefault();
        evt.stopPropagation();
        onToggleAllFolds();
    }

    function handleOpenLocalSettings(evt: MouseEvent): void {
        evt.preventDefault();
        evt.stopPropagation();
        onOpenLocalSettings();
    }

    function handleOpenEditBlock(evt: MouseEvent): void {
        evt.preventDefault();
        evt.stopPropagation();
        onOpenEditBlock?.();
    }
</script>

<div class={{ "insta-toc-toolbar": true, "is-mobile": plugin.isMobile }}>
    <div
        class="edit-block-button insta-toc-action-button"
        role="button"
        tabindex="0"
        aria-label="Open local settings modal"
        onclick={handleOpenLocalSettings}
        onkeydown={handleKeyActivate}
        {@attach (e) => {
            icon(e, "Settings");
        }}>
    </div>
    <div
        class="edit-block-button insta-toc-action-button"
        role="button"
        tabindex="0"
        aria-label={toolbarState.tocCollapsed
        ? "Expand the ToC block"
        : "Collapse the ToC block"}
        onclick={handleToggleToc}
        onkeydown={handleKeyActivate}
        {@attach (e) => {
            const iconName = toolbarState.tocCollapsed
                ? toolbarState.icons.Plus
                // ? "Plus"
                : toolbarState.icons.Minus;
            // : "Minus";
            icon(e, iconName);
        }}>
    </div>
    <div
        class="edit-block-button insta-toc-action-button"
        role="button"
        tabindex="0"
        aria-label={toolbarState.allFoldsCollapsed
        ? "Expand all items"
        : "Collapse all items"}
        class:is-hidden={!toolbarState.hasAnyFolds || toolbarState.tocCollapsed}
        onclick={handleToggleAllFolds}
        onkeydown={handleKeyActivate}
        {@attach (e) => {
            const iconName = toolbarState.allFoldsCollapsed
                ? toolbarState.icons.ChevronsUpDown
                // ? "ChevronsUpDown"
                : toolbarState.icons.ChevronsDownUp;
            // : "ChevronsDownUp";
            icon(e, iconName);
        }}>
    </div>

    {#if onOpenEditBlock}
        <div
            class="edit-block-button insta-toc-action-button"
            role="button"
            tabindex="0"
            aria-label="Edit this block"
            onclick={handleOpenEditBlock}
            onkeydown={handleKeyActivate}
            {@attach (e) => {
                icon(e, "code-2");
            }}>
        </div>
    {/if}
</div>

<style lang="scss">
    .insta-toc-action-button {
      padding: 5px !important;
      position: relative !important;
      cursor: pointer !important;
      place-items: center;
      &.is-hidden {
        display: none !important;
      }
      &:hover {
        color: var(--text-normal);
      }
    }

    .insta-toc-toolbar {
      position: absolute;
      top: 0.3rem;
      right: 2rem;
      display: flex;
      /* gap: 0px; */
      z-index: 5;
      flex-direction: row;
      &.is-mobile {
        display: flex !important;
        opacity: 1 !important;
        visibility: visible !important;
        pointer-events: auto !important;
        .insta-toc-action-button {
          display: inline-grid !important;
          opacity: 1 !important;
          visibility: visible !important;
          pointer-events: auto !important;
        }
        .insta-toc-action-button.is-hidden {
          display: none !important;
          visibility: hidden !important;
          pointer-events: none !important;
        }
      }
    }

    :global(.cm-preview-code-block:has(> .insta-toc-toolbar-host
      > .insta-toc-toolbar)
      .edit-block-button[aria-label="Edit this block"]:not(.insta-toc-action-button)) {
      display: none !important;
    }
</style>
