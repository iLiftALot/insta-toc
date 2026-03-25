import type { HeadingCache } from "obsidian";
import { describe, expect, test } from "vitest";
import { ManageToc } from "../src/ManageToc";
import { getDefaultLocalSettings } from "../src/settings/Settings";
import { createPluginMock, createValidatorMock } from "./mocks/pluginClassMocks";

describe("ManageToc global/local setting precedence", () => {
    test("falls back to global tocTitle when local title.name is null", async () => {
        const localSettings = getDefaultLocalSettings();
        localSettings.title.name = null;
        localSettings.title.level = null;
        localSettings.title.center = null;

        const fileHeadings = [
            { heading: "Heading 1", level: 1 },
            { heading: "Heading 2", level: 2 }
        ] as HeadingCache[];

        const { validator } = createValidatorMock(localSettings, fileHeadings);
        const { plugin, getCapturedContent } = createPluginMock({
            tocTitle: "Global Table of Contents",
            indentSize: 2
        });

        await ManageToc.run(plugin, validator);

        const generatedTocBlock = getCapturedContent();

        expect(generatedTocBlock).toContain("Global Table of Contents");
        expect(generatedTocBlock).not.toContain("null Global Table of Contents");
        expect(generatedTocBlock).toContain("\n    - Heading 2");
    });

    test("prefers local title settings over global defaults when provided", async () => {
        const localSettings = getDefaultLocalSettings();
        localSettings.title.name = "Local TOC";
        localSettings.title.level = 2;
        localSettings.title.center = true;

        const fileHeadings = [{ heading: "Heading 1", level: 1 }] as HeadingCache[];

        const { validator } = createValidatorMock(localSettings, fileHeadings);
        const { plugin, getCapturedContent } = createPluginMock({
            tocTitle: "Global Table of Contents"
        });

        await ManageToc.run(plugin, validator);

        const generatedTocBlock = getCapturedContent();

        expect(generatedTocBlock).toContain("## <center>Local TOC</center>");
        expect(generatedTocBlock).not.toContain("Global Table of Contents");
    });
});
