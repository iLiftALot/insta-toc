import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import svelte from 'eslint-plugin-svelte';
import svelteConfig from './svelte.config.js';

export default [
    ...svelte.configs.recommended,
    {
        ignores: ["dist/**", "help/**", "main.js", "node_modules/**", "esbuild.config.mjs", "version-bump.mjs", "**/*.d.ts"],
    },
    {
        files: ["src/**/*.ts", "src/**/*.tsx", "test/**/*.ts", "test/**/*.tsx"],
        languageOptions: {
            parser: tsparser,
            parserOptions: {
                ecmaVersion: "latest",
                sourceType: "module",
                project: "./tsconfig.json",
            },
        },
        plugins: {
            "@typescript-eslint": tseslint,
        },
        rules: {
            // TypeScript-specific rules
            "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-unsafe-assignment": "off",
            "@typescript-eslint/explicit-function-return-type": [
                "warn",
                {
                    allowExpressions: true,
                    allowTypedFunctionExpressions: true,
                    allowHigherOrderFunctions: true,
                },
            ],
            "@typescript-eslint/no-floating-promises": "warn",
            "@typescript-eslint/await-thenable": "warn",
            "@typescript-eslint/no-misused-promises": [
                "warn",
                {
                    checksVoidReturn: false,
                },
            ],
            "@typescript-eslint/consistent-type-imports": [
                "warn",
                {
                    prefer: "type-imports",
                    fixStyle: "separate-type-imports",
                },
            ],
            "@typescript-eslint/no-non-null-assertion": "off",
            "@typescript-eslint/ban-ts-comment": [
                "warn",
                {
                    "ts-ignore": "allow-with-description",
                    "ts-expect-error": "allow-with-description",
                },
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
            "no-unused-expressions": "off",
        },
    },
    {
        files: ["test/**/*.ts", "test/**/*.tsx"],
        languageOptions: {
            parser: tsparser,
            parserOptions: {
                ecmaVersion: "latest",
                sourceType: "module",
                project: "./tsconfig.json",
            },
        },
        plugins: {
            "@typescript-eslint": tseslint,
        },
        rules: {
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-floating-promises": "off",
            "@typescript-eslint/no-non-null-assertion": "off",
            "@typescript-eslint/explicit-function-return-type": "off",
        },
    },
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: ['.svelte', '.svelte.ts', '.svelte.js'],
                parser: tsparser,
				svelteConfig
			}
		}
	}
];
