/** @type {import('ts-jest').JestConfigWithTsJest} **/

export const testMatch = ["**/*.test.(ts|js)"];
export const testTimeout = 1000;
export const testEnvironment = "node";
export const transform = {
    "^.+\\.tsx?$": "ts-jest", // Use ts-jest to transform TS files
};
export const transformIgnorePatterns = [
    "/node_modules/(?!obsidian/)", // Transpile the `obsidian` package
];
export const extensionsToTreatAsEsm = [".ts"];
export const moduleNameMapper = {
    '^obsidian$': '../node_modules/obsidian/obsidian',
};
export const moduleFileExtensions = ["ts", "tsx", "js", "jsx", "json", "node"];
