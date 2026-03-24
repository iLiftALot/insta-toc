<script lang="ts">
    import InstaTocPlugin from "src/Plugin";
    import { getContext } from "svelte";

    interface FoldToggleProps {
        indentSize: number;
        listItems: NodeListOf<HTMLLIElement>;
    }

    let { indentSize, listItems }: FoldToggleProps = $props();

    const plugin = getContext<InstaTocPlugin>("plugin");
</script>

<div
    class="block-language-insta-toc insta-toc-rendered"
    style:--insta-toc-indent-size={`${indentSize * 6}px`}>
    {#each listItems as listItem, i (`${listItem.textContent}:${indentSize}:${i}`)}
        <li class="insta-toc-item"></li>
    {/each}
</div>
