declare module "Process" {
    global {
        //@ts-ignore
        const Process: CustomJS.Process;
        namespace CustomJS {
            interface Dict<T> {
                [key: string]: T | undefined;
            }

            interface PluginSettings extends Dict<any> {
                [key: string]: any;
            }

            interface ProcessEnv extends Dict<string> {
                envPath: string;
                pluginRoot: string;
                projectRoot: string;
                vaultRoot: string;
                pluginManifest: PluginManifest;
                pluginSettings: PluginSettings;
                pluginVersion: string;
                vaultName: string;
            }

            interface Process {
                env: ProcessEnv;
            }
        }
    }
    //@ts-ignore
    export = Process;
}