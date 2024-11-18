// /** @type {import('ts-jest').JestConfigWithTsJest} **/

// module.exports = {
//     testMatch: ["**/*.test.(js|ts)", "**/*.(js|ts)"],
//     testTimeout: 1000,
//     testEnvironment: "node",
//     transform: {
//         "^.+\\.tsx?$": ["ts-jest", { useESM: true }], // Transform TS files
//     },
//     transformIgnorePatterns: [
//         "/node_modules/(?!obsidian/)", // Transpile the `obsidian` package
//     ],
//     extensionsToTreatAsEsm: [".ts"], // Treat `.ts` files as ESM
//     moduleNameMapper: {
//         '^obsidian$': 'node_modules/obsidian/obsidian.d.ts',
//     },
//     moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"]
// };
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