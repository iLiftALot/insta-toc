<script lang="ts">
    import { icons } from "lucide-svelte/icons";
    import type InstaTocPlugin from "src/Plugin";
    import { getContext } from "svelte";
    import { icon } from "../../IconMounter";

    interface Props {
        foldKey: string;
        initialCollapsed: boolean;
        subList: HTMLUListElement | HTMLOListElement;
        onToggle?: (isCollapsed: boolean) => void;
    }

    let { foldKey, initialCollapsed, subList, onToggle }: Props = $props();

    const plugin = getContext<InstaTocPlugin>("plugin");

    // svelte-ignore state_referenced_locally
    let isCollapsed = $state(initialCollapsed);

    $effect.pre(() => {
        subList.style.display = isCollapsed ? "none" : "block";
    });

    function toggleBtnClicked(event: MouseEvent): void {
        event.preventDefault();
        event.stopPropagation();

        isCollapsed = !isCollapsed;
        plugin.setTocFoldState(foldKey, isCollapsed);
        onToggle?.(isCollapsed);
    }

    function attachIcon(el: HTMLElement): void {
        const iconName: Parameters<typeof icon>[1] = !isCollapsed
            ? icons.ChevronDown
            // ? 'ChevronDown'
            : icons.ChevronRight;
        // : 'ChevronsRight';
        icon(el, iconName);
    }
</script>

<!-- {@snippet isCollapsed ? ChevronRight : ChevronDown} -->
<!-- <div>
    <ChevronDown />
    <ChevronRight />
</div> -->

<button
    type="button"
    class={{ "fold-toggle": true, "is-collapsed": isCollapsed }}
    aria-expanded={!isCollapsed}
    aria-label={isCollapsed ? "Expand section" : "Collapse section"}
    id={foldKey}
    onclick={toggleBtnClicked}
    {@attach attachIcon}>
</button>

<!--- // {@attach attachIcon} /> --->

<!-- use:icon={!isCollapsed ? 'ChevronDown' : 'ChevronRight'}></button> -->

<style lang="scss">
    :global(.insta-toc-rendered .insta-toc-fold-parent)::marker {
      content: "";
    }

    .fold-toggle {
      width: 14px;
      height: 14px;
      margin: 0;
      padding: 0;
      border-radius: 4px;
      background: #00000000;
      background-color: rgba(1, 0, 0, 0) !important;
      color: var(--text-muted);
      box-shadow: none !important;
      opacity: 0.6;
      cursor: pointer;
      display: inline-grid;
      place-items: center;
      vertical-align: middle;
      transition:
        background-color 140ms ease,
        opacity 140ms ease,
        color 140ms ease;
      align-content: center;
      justify-content: center;
      align-items: center;
      justify-items: center;
    }

    :global(.insta-toc-rendered
      .insta-toc-fold-parent
      > .insta-toc-fold-toggle-host) {
      display: inline-grid;
      margin-inline-end: 5px;
      vertical-align: middle;
    }

    :global(.insta-toc-rendered
      .insta-toc-fold-parent
      > .insta-toc-fold-toggle-host)
      > .fold-toggle {
      position: relative !important;
      inset-inline-end: 0 !important;
      margin-inline-end: 0;
    }

    .fold-toggle::before {
      content: none;
    }

    :global(.fold-toggle svg) {
      width: 14px;
      height: 14px;
      stroke-width: 2.2;
      pointer-events: none;
    }

    .fold-toggle:hover {
      opacity: 1;
      color: var(--text-normal);
      background-color: var(--background-modifier-hover);
    }

    .fold-toggle:focus-visible {
      outline: 1px solid var(--interactive-accent);
      outline-offset: 1px;
      opacity: 1;
    }
</style>
