import sveltePlugin from "eslint-plugin-svelte";
import svelteParser from "svelte-eslint-parser";
import tsESLint from "typescript-eslint";
import svelteConfig from "./svelte.config.js";

/** @type {import('eslint').Linter.Config[]} */
export default [
    ...sveltePlugin.configs.recommended,
    {
        ignores: [
            "dist/**",
            "help/**",
            "main.js",
            "node_modules/**",
            "esbuild.config.js",
            "version-bump.mjs",
            "**/*.d.ts"
        ]
    },
    {
        files: ["src/**/*.ts", "test/**/*.ts"],
        languageOptions: {
            parser: tsESLint.parser,
            parserOptions: {
                ecmaVersion: "latest",
                sourceType: "module",
                projectService: true
            }
        },
        plugins: {
            "@typescript-eslint": tsESLint.plugin
        },
        rules: {
            // TypeScript-specific rules
            "@typescript-eslint/no-unused-vars": [
                "warn",
                { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
            ],
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-unsafe-assignment": "off",
            "@typescript-eslint/explicit-function-return-type": [
                "warn",
                {
                    allowExpressions: true,
                    allowTypedFunctionExpressions: true,
                    allowHigherOrderFunctions: true
                }
            ],
            "@typescript-eslint/no-floating-promises": "warn",
            "@typescript-eslint/await-thenable": "warn",
            "@typescript-eslint/no-misused-promises": [
                "warn",
                {
                    checksVoidReturn: false
                }
            ],
            "@typescript-eslint/consistent-type-imports": [
                "warn",
                {
                    prefer: "type-imports",
                    fixStyle: "separate-type-imports"
                }
            ],
            "@typescript-eslint/no-non-null-assertion": "off",
            "@typescript-eslint/ban-ts-comment": [
                "warn",
                {
                    "ts-ignore": "allow-with-description",
                    "ts-expect-error": "allow-with-description"
                }
            ],

            // General rules
            "no-console": "off",
            "no-constant-condition": "warn",
            "no-debugger": "warn",
            "prefer-const": "warn",
            "no-var": "error",
            eqeqeq: ["warn", "always", { null: "ignore" }],
            curly: ["warn", "multi-line"],
            "no-throw-literal": "warn",
            "no-unused-expressions": "off"
        }
    },
    {
        files: ["**/*.svelte"],
        languageOptions: {
            parser: svelteParser,
            parserOptions: {
                parser: tsESLint.parser,
                projectService: true,
                extraFileExtensions: [".svelte"],
                svelteConfig
            }
        }
    }
];
