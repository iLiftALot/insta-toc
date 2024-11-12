import { App, Editor, TFile } from "obsidian";
import InstaToc from "./main";
import { InstaTocSettings } from "./settings/Settings";


export class TocGenerator {
    app: App;
    plugin: InstaToc;
    settings: InstaTocSettings;
    file: TFile;
    editor: Editor;

    constructor(
        app: App,
        plugin: InstaToc,
        settings: InstaTocSettings,
        file: TFile,
        editor: Editor
    ) {
        this.app = app;
        this.plugin = plugin;
        this.settings = settings;
        this.file = file;
    }

    // Get the initial TOC from the current file
    async getInitialToc(): Promise<string> {
        const fileContent = await this.app.vault.read(this.file);
        const tocString = this.settings.tocString;
        const headers = fileContent
            .split('\n')
            .filter((fileContent: string) => fileContent.match(/^[#]+\s+/gm)) // only get headers
            .map((headingLine: string) => {
                const header_level = headingLine.split(' ')[0]?.match(/#/g)?.length;

                // get header text without special characters like '[' and ']'
                const header_text = headingLine.substring(headingLine.indexOf(' ') + 1)
                    .replace(/[\[\]]+/g, '')
                    .replace(/`+/g, '');
                const header_link = `[[${this.file.basename}#${header_text}|${header_text}]]`

                // prepend block-quote (>), indentation and bullet-point (-)
                if (typeof header_level === "number") return `>${'\t'.repeat(header_level - 1)} - ${header_link}`;
            })
            .join('\n');
        return tocString + headers;
    }

    async insertToc() {

    }
}
