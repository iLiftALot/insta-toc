<script lang="ts" generics="T">
    import { X } from "lucide-svelte";
    import InstaTocPlugin from "src/Plugin";
    import { getContext, tick } from "svelte";
    import type { ParseResult } from "../ComponentTypes";

    interface ListInputComponentProps<T> {
        placeholder?: string;
        addButtonText?: string;
        initialValues: T[];
        parseInput: (raw: string) => ParseResult<T>;
        renderValue: (value: T) => string;
        equals?: (a: T, b: T) => boolean;
        sort?: (a: T, b: T) => number;
        onSave: (values: T[]) => Promise<void> | void;
    }

    let {
        initialValues,
        placeholder = "",
        addButtonText = "+",
        parseInput,
        renderValue,
        equals = (a, b) => String(a) === String(b),
        sort,
        onSave
    }: ListInputComponentProps<T> = $props();

    const plugin = getContext<InstaTocPlugin>("plugin");

    // svelte-ignore state_referenced_locally
    let items = $state<T[]>([...initialValues]);
    let inputValue = $state<string>("");
    let busy = $state<boolean>(false);
    let errorMsg = $state<string>("");
    let rmBtnVisibleIndex = $state<number | null>(null);

    let inputElement: HTMLInputElement;

    function refocus(): void {
        tick().then(() => {
            inputElement?.focus();
        });
    }

    async function persistAndRender(nextItems: T[]): Promise<void> {
        const finalItems = sort ? [...nextItems].sort(sort) : [...nextItems];

        busy = true;
        try {
            await onSave(finalItems);
            items = finalItems;
        } catch (e) {
            console.error(e);
            errorMsg = `Failed to save changes${": " + e?.message || "."}`;
        } finally {
            busy = false;
        }
    }

    async function removeAt(index: number): Promise<void> {
        const nextItems = [...items];
        nextItems.splice(index, 1);
        await persistAndRender(nextItems);
    }

    async function addCurrentValue(): Promise<void> {
        const raw = inputValue.trim();
        if (!raw) return;

        const parsed = parseInput(raw);
        if (!parsed.ok) {
            errorMsg = parsed.message;
            return;
        }

        if (items.some((v) => equals(v, parsed.value))) {
            inputValue = "";
            return;
        }

        await persistAndRender([parsed.value, ...items]);
        inputValue = "";
        refocus();
    }

    function keyDownListener(e: KeyboardEvent): void {
        if (e.key === "Enter") {
            e.preventDefault();
            void addCurrentValue();
        }
    }
</script>

<div class="insta-toc-list-input-container">
    <div class="setting-item-control">
        <input
            type="text"
            class="insta-toc-text-area"
            spellcheck="false"
            {placeholder}
            onkeydown={keyDownListener}
            bind:this={inputElement}
            bind:value={inputValue}
        />
        <button
            class="insta-toc-list-input-add-btn"
            type="button"
            disabled={busy}
            onclick={addCurrentValue}>
            {addButtonText}
        </button>
    </div>

    {#if errorMsg}
        <div class="insta-toc-list-input-error">{errorMsg}</div>
    {/if}

    {#if items.length > 0}
        <ul class="insta-toc-list-input">
            <li class="insta-toc-list-input-item">
                {#each items as item, i (`${i}:${renderValue(item)}`)}
                    <div
                        class="insta-toc-list-input-div"
                        role="presentation"
                        onmouseenter={() => (rmBtnVisibleIndex = i)}
                        onmouseleave={() => (rmBtnVisibleIndex = null)}>
                        <span class="insta-toc-list-input-value">
                            {renderValue(item)}
                        </span>
                        <button
                            class="insta-toc-list-input-remove"
                            type="button"
                            disabled={busy}
                            style:display|important={rmBtnVisibleIndex === i
                            || plugin.isMobile
                            ? "inline-grid"
                            : "none"}
                            onclick={() => void removeAt(i)}>
                            <X size={16} />
                        </button>
                    </div>
                {/each}
            </li>
        </ul>
    {/if}
</div>

<style lang="scss">
    .insta-toc-list-input-container {
      width: 50%;
    }

    .insta-toc-text-area {
      width: 100%;
    }

    .insta-toc-list-input {
      list-style: none;
      margin: 6px 0 0 0;
      padding: 4px;
      width: 100%;
      max-height: 70px;
      overflow-y: auto;
      scrollbar-gutter: stable;
      border: 1px solid var(--background-modifier-border);
      border-radius: 6px;
      background: var(--background-primary-alt);
    }

    .insta-toc-list-input-item {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .insta-toc-list-input-value {
      display: flex;
      align-self: center;
    }

    .insta-toc-list-input-remove {
      inline-size: 15px;
      block-size: 15px;
      margin: 0;
      padding: 0;
      line-height: 1;
      display: inline-grid;
      place-items: center;
      border: none;
      border-radius: 4px;
      background: transparent !important;
      color: var(--text-error) !important;
      opacity: 0.2;
      cursor: pointer;
      box-sizing: border-box;
      box-shadow: none !important;
      &:hover,
      &:focus-visible {
        opacity: 1 !important;
        box-shadow: var(--input-shadow) !important;
      }
    }

    .insta-toc-list-input-div {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-radius: 3px;
      border: 0.05px outset rgb(255 255 255 / 15%);
      padding-left: 10px;
      padding-right: 10px;
      &:hover {
        border: 0.1px outset rgb(255 255 255 / 55%);
      }
    }
</style>
