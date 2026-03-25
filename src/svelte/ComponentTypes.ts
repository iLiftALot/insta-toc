import type { icons } from "lucide-svelte/icons";
import type InstaTocPlugin from "src/Plugin";
import type { Component, unmount } from "svelte";

export type PropsOf<TComponent extends Component<any>> = TComponent extends Component<infer TProps> ? TProps : never;
export type MountedSvelteComponent = Parameters<typeof unmount>[0];
export type YamlSchemaNode =
    | { kind: "object"; children: Record<string, YamlSchemaNode>; }
    | { kind: "enum"; values: string[]; }
    | { kind: "array"; itemValues?: string[]; }
    | { kind: "string"; };
export type ParseResult<T> = { ok: true; value: T; } | { ok: false; message: string; };
export type LucideIcon = typeof icons[keyof typeof icons];
export type LucideIconName = keyof typeof icons;
export type ToolbarIconName = "code-2";

/**
 * @example
 *
 *      type OnSubmit = MaybeAsyncFn<[string], boolean>;
 *      // equivalent to: (result: string) => boolean | Promise<boolean>
 */
export type MaybeAsyncFn<TArgs extends any[], TReturn> = (
    ...args: TArgs
) => TReturn | Promise<TReturn>;

export interface ModalComponentClass {
    submit: (content: string) => Promise<void>;
    close: () => Promise<void>;
}

export interface Context {
    plugin: InstaTocPlugin;
    componentClassInstance?: ModalComponentClass;
}
