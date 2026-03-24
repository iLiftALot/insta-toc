import { BaseComponent } from "obsidian";
import { type Component, mount, unmount } from "svelte";
import type {
    Context,
    MountedSvelteComponent,
    PropsOf
} from "./ComponentTypes";
import { createSvelteContext } from "./Context";

export default class ComponentMounter extends BaseComponent {
    private readonly hostEl: HTMLElement;
    private _mounted: MountedSvelteComponent | null = null;

    constructor(hostEl: HTMLElement) {
        super();
        this.hostEl = hostEl;
    }

    public async setup<TComponent extends Component<any, any>>(
        component: TComponent,
        props: PropsOf<TComponent>,
        ctx: Context
    ): Promise<void> {
        await this.destroy();

        this._mounted = mount(component, {
            target: this.hostEl,
            props,
            context: createSvelteContext(ctx)
        });
    }

    public get mounted(): MountedSvelteComponent {
        if (!this._mounted) throw new Error("Component is not mounted");
        return this._mounted;
    }

    public async destroy(): Promise<void> {
        if (!this._mounted) return;

        const mounted = this._mounted;
        this._mounted = null;
        await unmount(mounted);
    }
}
