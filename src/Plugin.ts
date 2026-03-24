import type {
    App,
    CachedMetadata,
    Debouncer,
    Editor,
    EditorPosition,
    EventRef,
    MarkdownPostProcessorContext,
    PluginManifest
} from "obsidian";
import { Component, debounce, MarkdownRenderer, MarkdownView, TFile } from "obsidian";
import { PluginBase } from "obsidian-dev-utils/obsidian/Plugin/PluginBase";
import { initPluginContext } from "obsidian-dev-utils/obsidian/Plugin/PluginContext";
import { ManageToc } from "./ManageToc";
import { deepMerge, handleCodeblockListItem } from "./Utils";
import { listRegex, localTocSettingsRegex } from "./constants";
import { PluginSettingsManager } from "./settings/PluginSettingManager";
import type { InstaTocSettings } from "./settings/Settings";
import { DEFAULT_SETTINGS, getDefaultLocalSettings } from "./settings/Settings";
import { SettingTab } from "./settings/SettingsTab";
import type { Context } from "./svelte/ComponentTypes";
import {
    configureRenderedIndent,
    mountRenderedTocActionButtons
} from "./svelte/TocMount.svelte";
import { LocalSettingsModal } from "./svelte/components/settings/LocalSettingsModal";
import type {
    BulletType,
    EditorData,
    LocalTocSettings,
    PluginTypes,
    ReloadedTocState,
    ReloadValidatorField,
    ReloadValidatorOpts,
    ReloadWorkflowOpts,
    ViewState
} from "./types";
import { Validator } from "./validator";

export default class InstaTocPlugin extends PluginBase<PluginTypes> {
    private _validator: Validator | undefined;

    private modifyEventRef: EventRef | undefined;
    private debouncer!: Debouncer<[fileCache: CachedMetadata], void>;
    private tocFoldState: Record<string, boolean> = {};
    private tocBlockCollapseState: Record<string, boolean> = {};
    private tocLocalListTypeOverrideByPath: Record<string, BulletType> = {};

    public override get settings(): InstaTocSettings {
        return this.settingsManager.settingsWrapper.settings as InstaTocSettings;
    }

    constructor(app: App, manifest: PluginManifest) {
        super(app, manifest);
    }

    public get validator(): Validator {
        assert(this._validator, "Validator is not initialized yet.");
        return this._validator;
    }

    public set validator(validator: Validator) {
        this._validator = validator;
    }

    public get context(): Context {
        return {
            plugin: this,
            componentClassInstance: undefined
        } satisfies Context;
    }

    public getViewState(): ViewState {
        const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
        const state = markdownView?.getState();

        if (!state) return null;

        if (state.mode === "preview") {
            return "preview";
        } else if (state.mode === "source") {
            return state.source === false ? "live-preview" : "source";
        }

        return null;
    }

    public get isMobile(): boolean {
        return this.app.isMobile;
    }

    protected override createSettingsManager(): PluginSettingsManager {
        return new PluginSettingsManager(this);
    }

    protected override createSettingsTab(): SettingTab {
        return new SettingTab(this);
    }

    public override async onloadImpl(): Promise<void> {
        await super.onloadImpl();
        initPluginContext(this.app, "insta-toc");
        console.log(`Loading Insta TOC Plugin`);

        // Custom codeblock processor for the insta-toc codeblock
        this.registerMarkdownCodeBlockProcessor(
            "insta-toc",
            async (
                source: string,
                el: HTMLElement,
                ctx: MarkdownPostProcessorContext
            ): Promise<void> => {
                const pathWithFileExtension: string = ctx.sourcePath; // Includes .md
                const filePath: string = pathWithFileExtension.substring(
                    0,
                    pathWithFileExtension.lastIndexOf(".")
                );
                const file: TFile = this.app.vault.getAbstractFileByPath(
                    pathWithFileExtension
                ) as TFile;

                if (!(file instanceof TFile)) return;

                // TOC codeblock content
                const lines: string[] = source
                    // Process only the ToC content without local settings
                    .replace(localTocSettingsRegex, "")
                    .split("\n");
                // Process the codeblock text by converting each line into a markdown link list item
                const processedSource: string = lines
                    .map((line) => {
                        const match: RegExpMatchArray | null = line.match(listRegex);
                        if (!match) return line;

                        const { indent, bullet, navLink } = handleCodeblockListItem(
                            this.app,
                            this,
                            file,
                            match,
                            filePath
                        );
                        return `${indent}${bullet} ${navLink}`;
                    })
                    .join("\n");

                el.dataset.sourcePath = pathWithFileExtension;

                await MarkdownRenderer.render(
                    this.app,
                    processedSource,
                    el,
                    pathWithFileExtension,
                    new Component()
                );
                await configureRenderedIndent(
                    el,
                    this.settings.indentSize,
                    this,
                    pathWithFileExtension
                );
                await mountRenderedTocActionButtons(this, pathWithFileExtension, el);

                // Determine if local settings override global
                el.style.setProperty(
                    "--insta-toc-list-style",
                    this.getEffectiveListStyle(pathWithFileExtension)
                );
            }
        );

        this.updateModifyEventListener();

        // Force immediate TOC update on file open to ensure TOC is rendered for the newly opened file
        this.registerEvent(
            this.app.workspace.on("file-open", (file: TFile | null) => {
                if (!(file instanceof TFile)) return;

                const fileCache = this.app.metadataCache.getFileCache(file);

                if (!fileCache) return;

                this.debouncer.cancel();
                this.debouncer(fileCache).run();
                this.refreshRenderedTocStyles(file.path, false);
            })
        );
    }

    protected override async onunloadImpl(): Promise<void> {
        this.debouncer?.run(); // flush pending TOC update
        await this.settingsManager.saveToFile();
        await this.settingsManager.savePersistedData();
        await super.onunloadImpl();

        console.log(`Insta TOC Plugin Unloaded.`);
    }

    /** No-arg default — returns editor + cursorPos only */
    public reload(): Pick<EditorData, "editor" | "cursorPos">;
    /** Select specific fields without updating the validator — always returns the requested fields */
    public reload<F extends ReloadValidatorField>(
        opts: ReloadValidatorOpts<F> & { select: readonly F[]; updateValidator?: false; }
    ): Pick<EditorData, F>;
    /** Select specific fields and update the validator — returns undefined when required context is missing */
    public reload<F extends ReloadValidatorField>(
        opts: ReloadValidatorOpts<F> & { select: readonly F[]; updateValidator: true; }
    ): Pick<EditorData, F> | undefined;
    /** Update the validator only — returns nothing */
    public reload(
        opts: Omitted<ReloadValidatorOpts, "select"> & { updateValidator: true; }
    ): void;
    public reload<F extends ReloadValidatorField>(
        opts?: ReloadValidatorOpts<F>
    ): Pick<EditorData, F> | Pick<EditorData, "editor" | "cursorPos"> | undefined {
        const shouldUpdateValidator = opts?.updateValidator === true;
        const hasExplicitSelect = opts?.select !== undefined;
        const selectedFields: readonly ReloadValidatorField[] | undefined = hasExplicitSelect
            ? opts.select
            : !opts
            ? ["editor", "cursorPos"]
            : undefined;
        const requestedFields = new Set<ReloadValidatorField>(selectedFields ?? []);

        // Determine which values are actually needed
        const needsEditor = requestedFields.has("editor")
            || requestedFields.has("cursorPos")
            || shouldUpdateValidator;
        const needsActiveFile = requestedFields.has("activeFile")
            || requestedFields.has("metadataCache")
            || shouldUpdateValidator;
        const needsMetadata = requestedFields.has("metadataCache")
            || shouldUpdateValidator;

        // Lazily compute only what is required
        const editor: Editor | undefined = needsEditor
            ? this.app.workspace.activeEditor?.editor
            : undefined;
        const cursorPos: EditorPosition | undefined = needsEditor
            ? editor?.getCursor()
            : undefined;
        const activeFile: TFile | null = needsActiveFile
            ? this.app.workspace.getActiveFile()
            : null;
        const metadataCache: CachedMetadata | null = opts?.metadataCache
            ?? (needsMetadata && activeFile
                ? this.app.metadataCache.getFileCache(activeFile)
                : null);

        if (shouldUpdateValidator) {
            const resolvedPath = opts?.sourcePath ?? activeFile?.path;

            if (!editor || !cursorPos || !resolvedPath || !metadataCache) {
                return undefined;
            }

            if (this._validator) {
                // access private property to avoid throwing error during initial loads
                this.validator.update(
                    this,
                    metadataCache,
                    editor,
                    cursorPos,
                    resolvedPath
                );
            } else {
                this.validator = new Validator(
                    this,
                    metadataCache,
                    editor,
                    cursorPos,
                    resolvedPath
                );
            }
        }

        if (selectedFields === undefined) return undefined;

        if (requestedFields.size === 0) {
            return {} as Pick<EditorData, F>;
        }

        // Build result containing only the requested fields
        const result: Partial<EditorData> = {};
        if (requestedFields.has("editor")) result.editor = editor;
        if (requestedFields.has("cursorPos")) result.cursorPos = cursorPos;
        if (requestedFields.has("activeFile")) result.activeFile = activeFile ?? null;
        if (requestedFields.has("metadataCache")) {
            result.metadataCache = metadataCache ?? null;
        }

        return result as Pick<EditorData, F> | Pick<EditorData, "editor" | "cursorPos">;
    }

    private reloadValidatedState({
        forceValidate = false,
        ...reloadOpts
    }: ReloadWorkflowOpts = {}): ReloadedTocState | undefined {
        const activeFile = this.reload({
            ...reloadOpts,
            updateValidator: true,
            select: ["activeFile"]
        })?.activeFile;

        if (!activeFile) return;

        const validator = this.validator;
        const isValid = validator.isValid(forceValidate);
        const effectiveSourcePath = reloadOpts.sourcePath ?? activeFile.path;

        this.syncLocalListTypeOverride(effectiveSourcePath);

        return { activeFile, validator, isValid };
    }

    private async reloadAndManageToc(
        opts: ReloadWorkflowOpts = {}
    ): Promise<ReloadedTocState | undefined> {
        const state = this.reloadValidatedState(opts);

        if (!state) return;

        if (state.isValid) {
            await ManageToc.run(this, state.validator);
        }

        return state;
    }

    public setPersistedUiState(
        tocFoldState: Record<string, boolean>,
        tocBlockCollapseState: Record<string, boolean>
    ): void {
        this.tocFoldState = tocFoldState;
        this.tocBlockCollapseState = tocBlockCollapseState;
    }

    public getPersistedUiState(): {
        tocFoldState: Record<string, boolean>;
        tocBlockCollapseState: Record<string, boolean>;
    } {
        return {
            tocFoldState: { ...this.tocFoldState },
            tocBlockCollapseState: { ...this.tocBlockCollapseState }
        };
    }

    private syncLocalListTypeOverride(sourcePath: string): void {
        if (this.validator.hasLocalListTypeOverride) {
            this.tocLocalListTypeOverrideByPath[sourcePath] = this.validator.localTocSettings.style?.listType
                ?? this.settings.bulletType;
        } else {
            delete this.tocLocalListTypeOverrideByPath[sourcePath];
        }
    }

    private getEffectiveListStyle(sourcePath: string): BulletType {
        return (
            this.tocLocalListTypeOverrideByPath[sourcePath] ?? this.settings.bulletType
        );
    }

    // Dynamically update the debounce delay for ToC updates
    public updateModifyEventListener(): void {
        if (this.modifyEventRef) {
            // Unregister the previous event listener
            this.app.metadataCache.offref(this.modifyEventRef);
        }

        this.setDebouncer();

        // Register the new event listener with the updated debounce delay
        this.modifyEventRef = this.app.metadataCache.on(
            "changed", // file cache (containing heading cache) has been updated
            (file: TFile, data: string, cache: CachedMetadata) => {
                const activeFile: TFile | null = this.app.workspace.getActiveFile();

                if (!activeFile || activeFile.path !== file.path) return;

                this.debouncer(cache);
            }
        );

        this.registerEvent(this.modifyEventRef);
    }

    // Needed for dynamically setting the debounce delay
    public setDebouncer(): void {
        this.debouncer = debounce(
            async (fileCache: CachedMetadata) => {
                const state = await this.reloadAndManageToc({ metadataCache: fileCache });

                if (!state) {
                    this.consoleDebug(
                        "Unable to reload the active TOC state during the debounced update."
                    );
                    return;
                }

                this.refreshRenderedTocStyles(state.activeFile.path, false);
            },
            this.settings.updateDelay,
            false
        );
    }

    public async openLocalSettingsModal(sourcePath: string): Promise<void> {
        const state = this.reloadValidatedState({ forceValidate: true, sourcePath });

        assert(state, "TOC state is required before opening the local settings modal.");

        const initialSettings = state.isValid
            ? state.validator.localTocSettings
            : getDefaultLocalSettings();
        const mergedInitialSettings = deepMerge<LocalTocSettings>(
            getDefaultLocalSettings(),
            initialSettings,
            false
        );

        state.validator.localTocSettings = mergedInitialSettings;
        state.validator.updatedLocalSettings = mergedInitialSettings;
        state.validator.hasLocalListTypeOverride = mergedInitialSettings.style.listType !== null;

        await new LocalSettingsModal(this, async (result: string): Promise<boolean> => {
            const didApply = this.validator.applyLocalSettingsYaml(result);

            if (!didApply) return false;

            this.syncLocalListTypeOverride(sourcePath);
            this.refreshRenderedTocStyles(sourcePath, false);
            await ManageToc.run(this, this.validator);

            return true;
        }).open();
    }

    private async refreshActiveTocContent(): Promise<void> {
        await this.reloadAndManageToc({ forceValidate: true });
    }

    public refreshRenderedTocStyles(sourcePath?: string, refreshContent = true): void {
        if (refreshContent) {
            void this.refreshActiveTocContent();
        }

        const selector = sourcePath
            ? `.insta-toc-rendered[data-source-path="${CSS.escape(sourcePath)}"]`
            : ".insta-toc-rendered";

        document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
            const path = el.dataset.sourcePath;
            const style = path
                ? this.getEffectiveListStyle(path)
                : this.settings.bulletType;
            el.style.setProperty("--insta-toc-list-style", style);
            el.style.setProperty(
                "--insta-toc-indent-size",
                `${this.settings.indentSize * 6}px`
            );
        });
    }

    public getTocFoldState(key: string): boolean | undefined {
        return this.tocFoldState[key];
    }

    public setTocFoldState(key: string, isCollapsed: boolean): void {
        if (this.tocFoldState[key] === isCollapsed) return;

        this.tocFoldState[key] = isCollapsed;
        void this.settingsManager.savePersistedData();
    }

    public getTocBlockCollapsed(sourcePath: string): boolean {
        return this.tocBlockCollapseState[sourcePath] ?? false;
    }

    public setTocBlockCollapsed(sourcePath: string, isCollapsed: boolean): void {
        const current = this.tocBlockCollapseState[sourcePath] ?? false;
        if (current === isCollapsed) return;

        this.tocBlockCollapseState[sourcePath] = isCollapsed;
        void this.settingsManager.savePersistedData();
    }

    public pruneTocFoldStateForPath(
        sourcePath: string,
        activeModernFoldKeys: Set<string>
    ): void {
        let foldStateChanged = false;

        for (const key of Object.keys(this.tocFoldState)) {
            if (key.startsWith(`${sourcePath}::`) && !activeModernFoldKeys.has(key)) {
                delete this.tocFoldState[key];

                if (!foldStateChanged) foldStateChanged = true;
            }
        }

        if (!foldStateChanged) return;

        void this.settingsManager.savePersistedData();
    }

    public static getGlobalSetting<
        K extends keyof InstaTocSettings = keyof InstaTocSettings
    >(key: K): InstaTocSettings[K] {
        const plugin = (window as any)?.app?.plugins?.getPlugin?.("insta-toc") as
            | InstaTocPlugin
            | undefined;
        const value = plugin?.settings?.[key];
        return (value ?? DEFAULT_SETTINGS[key]) as InstaTocSettings[K];
    }
}
