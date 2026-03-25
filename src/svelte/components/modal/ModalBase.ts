import { type App, Notice } from "obsidian";
import type InstaTocPlugin from "src/Plugin";
import { tick } from "svelte";
import ComponentMounter from "../../ComponentMounter";
import type { MaybeAsyncFn } from "../../ComponentTypes";

export default abstract class ModalBase {
    protected plugin: InstaTocPlugin;
    protected app: App;
    protected mounter: ComponentMounter;
    private onSubmit: MaybeAsyncFn<[...args: any[]], boolean>;

    constructor(
        plugin: InstaTocPlugin,
        onSubmit: MaybeAsyncFn<[...args: any[]], boolean>
    ) {
        this.app = plugin.app;
        this.plugin = plugin;
        this.mounter = new ComponentMounter(document.body);
        this.onSubmit = onSubmit;

        // Maintain `this` context within Svelte component event handlers
        this.close = this.close.bind(this);
        this.submit = this.submit.bind(this);
    }

    public abstract open(): Promise<void>;
    /** Override to run extra logic after a successful save (before close). */
    protected abstract onSaveSuccess(content: string): void | Promise<void>;

    public async submit(content: string): Promise<void> {
        try {
            const didSave = await Promise.resolve(this.onSubmit(content));
            if (didSave) {
                await tick();
                await this.onSaveSuccess(content);
                await this.close();
            }
        } catch (error) {
            this.plugin.consoleDebug("Failed to save.\n", error);
            console.error("Failed to save.\n", error);
            new Notice("Failed to save. Check console for details.");
        }
    }

    public async close(): Promise<void> {
        await this.mounter.destroy();
    }
}
