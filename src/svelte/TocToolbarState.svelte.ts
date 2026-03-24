import { icons as LucideIcons } from "lucide-svelte";

/**
 * Shared reactive state between TocMount and TocActionsToolbar.
 * Replaces the getter-callback / custom-event sync pattern.
 */
export interface ToolbarState {
    tocCollapsed: boolean;
    totalFolds: number;
    collapsedCount: number;
    readonly hasAnyFolds: boolean;
    readonly allFoldsCollapsed: boolean;
    readonly icons: typeof LucideIcons;
}

export class TocToolbarState implements ToolbarState {
    public totalFolds = $state<number>(0);
    public collapsedCount = $state<number>(0);
    public tocCollapsed = $state<boolean>(false);

    public readonly hasAnyFolds = $derived<boolean>(this.totalFolds > 0);
    public readonly allFoldsCollapsed = $derived<boolean>(
        this.totalFolds > 0 && this.collapsedCount === this.totalFolds
    );
    public readonly icons: typeof LucideIcons = LucideIcons;

    constructor(initialTocCollapsed: boolean) {
        this.tocCollapsed = initialTocCollapsed;
    }
}
