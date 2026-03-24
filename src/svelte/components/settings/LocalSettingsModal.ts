import { stringifyYaml } from "obsidian";
import type { MaybeAsyncFn, PropsOf } from "src/svelte/ComponentTypes";
import type InstaTocPlugin from "src/Plugin";
import { LocalSettingsComponent, Modal, ModalBase } from "../..";
import {
    getLocalSettingsBulletTypeSuggestions,
    getLocalSettingsOmitSuggestions
} from "src/settings/localSettingsCompletionOptions";

export class LocalSettingsModal extends ModalBase {
    private yamlContent: string;

    constructor(
        plugin: InstaTocPlugin,
        onSubmit: MaybeAsyncFn<[string], boolean>
    ) {
        super(plugin, onSubmit);
        this.yamlContent = stringifyYaml(plugin.validator.localTocSettings);
    }

    onSaveSuccess(content: string): void {
        this.yamlContent = content;
    }

    async open(): Promise<void> {
        const darkMode = this.app.isDarkMode();
        const bulletTypeSuggestions = getLocalSettingsBulletTypeSuggestions();
        const omitSuggestions = getLocalSettingsOmitSuggestions(
            this.plugin.validator.metadata?.headings
        );

        await this.mounter.setup(Modal, {
            modalTitle: "Local Settings (YAML)",
            ModalContentComponent: {
                component: LocalSettingsComponent,
                props: {
                    initialYaml: this.yamlContent,
                    darkMode,
                    bulletTypeOptions: bulletTypeSuggestions,
                    omitSuggestions
                } satisfies PropsOf<typeof LocalSettingsComponent>
            }
        }, {
            plugin: this.plugin,
            componentClassInstance: this
        });
    }
}
