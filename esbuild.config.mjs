import esbuild from "esbuild";
import process from "process";
import builtins from "builtin-modules";
import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import {
	existsSync,
	writeFileSync,
	readFileSync,
	symlinkSync,
	unlinkSync
} from "fs";

const banner =
	`/*
THIS IS A GENERATED/BUNDLED FILE BY ESBUILD
if you want to view the source, please visit the github repository of this plugin
*/
`;

const prod = process.argv.includes('production');

// Correctly handle the file URL to path conversion
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the package.json file
const packageJsonPath = path.join(__dirname, 'package.json'); // use path.join instead of resolve
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

const manifestJsonPath = path.join(__dirname, 'manifest.json');
const manifestJson = JSON.parse(readFileSync(manifestJsonPath, 'utf-8'));

if (!existsSync(`${__dirname}/data.json`)) {
	writeFileSync(`${__dirname}/data.json`, "{}", 'utf-8');
}
const dataJsonPath = path.join(__dirname, 'data.json');
const dataJson = JSON.parse(readFileSync(dataJsonPath, 'utf-8'));

// Retrieve the name of the package
const packageName = packageJson.name;
const packageMain = prod ? "dist/build/main.js" : "dist/dev/main.js";
packageJson.main = packageMain;
writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 4), 'utf-8');

console.log('Package Name:', packageName);
console.log(`Set main.js directory to ${packageJson.main}`);

// Function to find .env file by traversing upward
function findEnvFile(startDir) {
	let currentDir = startDir;

	while (currentDir !== path.parse(currentDir).root) {
		const envPath = path.join(currentDir, '.env');
		if (existsSync(envPath)) {
			return envPath;
		}
		currentDir = path.dirname(currentDir);
		console.log(`CURRENT DIR: ${currentDir}`);
	}
	return null;
}

// Start searching from the current directory
const dirYielder = path.resolve(path.dirname(import.meta.url));
let envFilePath = findEnvFile(dirYielder);

if (!envFilePath) {
	envFilePath = `${dirYielder.split('/file:')[0]}/.env`;
	writeFileSync(envFilePath, '');
}
console.log(`Found .env file at ${envFilePath}`);

const { pluginRoot, projectRoot, vaultRoot, envPath } = {
	pluginRoot: `${path.dirname(dirYielder.split('/file:')[0])}/${packageName}`,
	projectRoot: decodeURI(dirYielder.split('/file:')[1]),
	vaultRoot: decodeURI(dirYielder.split('/file:')[1].replace(/\/\.obsidian.*/, '')),
	envPath: envFilePath
};
console.log(`pluginRoot: ${pluginRoot}\nprojectRoot: ${projectRoot}\nvaultRoot: ${vaultRoot}\nenvPath: ${envPath}`);
const vaultName = decodeURI(vaultRoot.split('/').pop().trim());

let parsedEnv = {};
if (envFilePath) {
	const envConfig = config({ path: envFilePath });
	if (envConfig?.parsed) {
		console.log(`Loaded .env file from ${envFilePath}`);
		parsedEnv = envConfig.parsed;
		parsedEnv["envPath"] = envPath;
		parsedEnv["pluginRoot"] = pluginRoot;
		parsedEnv["projectRoot"] = projectRoot;
		parsedEnv["vaultRoot"] = vaultRoot;
		parsedEnv["pluginManifest"] = manifestJson;
		parsedEnv["vaultName"] = vaultName;
	}
}
console.log(`parsedEnv: ${JSON.stringify(parsedEnv, null, 4)}`);

const sourcePath = `${pluginRoot}/${packageMain}`;
const targetPath = `${pluginRoot}/main.js`;

const context = await esbuild.context({
	banner: {
		js: banner,
	},
	entryPoints: ["src/main.ts"],
	bundle: true,
	external: [
		"obsidian",
		"electron",
		"@codemirror/autocomplete",
		"@codemirror/collab",
		"@codemirror/commands",
		"@codemirror/language",
		"@codemirror/lint",
		"@codemirror/search",
		"@codemirror/state",
		"@codemirror/view",
		"@lezer/common",
		"@lezer/highlight",
		"@lezer/lr",
		...builtins],
	define: {
		"Process.env": JSON.stringify(parsedEnv),
	},
	platform: "node",
	format: "cjs",
	target: "es2021",
	logLevel: "info",
	sourcemap: prod ? false : "inline",
	treeShaking: true,
	outfile: packageMain,
	minify: prod,
}).catch((error) => {
	console.error(error);
	process.exit(1);
})

try {
	if (existsSync(targetPath)) {
		unlinkSync(targetPath); // Remove existing symlink or file
	}
	symlinkSync(sourcePath, targetPath);
	console.log(`Symlink created: ${targetPath} -> ${sourcePath}`);
} catch (error) {
	console.error('Error creating symlink:', error);
	process.exit(1);
}

if (prod) {
	await context.rebuild();
	process.exit(0);
} else {
	await context.watch();
}
