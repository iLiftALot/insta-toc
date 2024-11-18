/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
    testMatch: ["**/*.test.(ts|js)"],
    testTimeout: 1000,
    testEnvironment: "node",
    transform: {
        "^.+\\.tsx?$": "ts-jest", // Use ts-jest to transform TS files
    },
    transformIgnorePatterns: [
        "/node_modules/(?!obsidian/)", // Transpile the `obsidian` package
    ],
    extensionsToTreatAsEsm: [".ts"],
    moduleNameMapper: {
        '^obsidian$': '../node_modules/obsidian/obsidian',
    },
    moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
};