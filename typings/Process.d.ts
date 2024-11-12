declare module "Process" {
    global {
        //@ts-ignore
        const Process: CustomJS.Process;
        namespace CustomJS {
            interface Dict<T> {
                [key: string]: T | undefined;
            }

            interface TempSettings {
                nextUpdateTime: string;
                apiKey: string;
                updateInterval: number;
            }

            interface ProcessEnv extends Dict<string> {
                envPath: string;
                pluginRoot: string;
                projectRoot: string;
                vaultRoot: string;
                pluginManifest: PluginManifest;
                vaultName: string;
                pluginSettings: TempSettings;
            }

            interface Process {
                env: ProcessEnv;
            }
        }
    }
    //@ts-ignore
    export = Process;
}