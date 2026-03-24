import type { Context } from "./ComponentTypes";

export function createSvelteContext<T extends Context>(ctx: T): Map<string, T[keyof T]> {
    return new Map(Object.entries(ctx)) as Map<string, T[keyof T]>;
}

/* Component-Related */
export { default as ComponentMounter } from "./ComponentMounter";
export { default as ListInputComponent } from "./components/ListInputComponent.svelte";
export { default as Modal } from "./components/modal/Modal.svelte";
export { default as ModalBase } from "./components/modal/ModalBase";
export { default as FoldToggleComponent } from "./components/settings/FoldToggleComponent.svelte";
export {
    default as LocalSettingsComponent
} from "./components/settings/LocalSettingsComponent.svelte";
export { default as TocActionsToolbar } from "./components/settings/TocActionsToolbar.svelte";
export { TocToolbarState } from "./TocToolbarState.svelte";

/* Mounting/Utilities */
export { icon } from "./IconMounter";
export {
    configureRenderedIndent,
    mountRenderedTocActionButtons
} from "./TocMount.svelte";

/* Types/Interfaces */
export type {
    Context,
    MaybeAsyncFn,
    MountedSvelteComponent,
    PropsOf,
    YamlSchemaNode
} from "./ComponentTypes";
export type { ToolbarState } from "./TocToolbarState.svelte";
