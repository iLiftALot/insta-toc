import { readFileSync, writeFileSync } from "fs";
import * as path from 'path';
import * as packageJson from './package.json';
import * as manifestJson from './manifest.json';
import * as versionsJson from './versions.json';

const newVersion = packageJson.version;

// Define paths to the files to update
const manifestPath = path.join(__dirname, 'manifest.json');
const versionsPath = path.join(__dirname, 'versions.json');

// read minAppVersion from manifest.json and bump version to target version
//let manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
//const { minAppVersion } = manifest;
manifest.version = newVersion;
writeFileSync(manifestPath, JSON.stringify(manifestJson, null, 4));

// Update version in versions.json if it exists
if (existsSync(versionsPath)) {
    versionsJson[newVersion] = "0.15.0";
    writeFileSync(versionsPath, JSON.stringify(versionsJson, null, 4));
}

console.log(`Updated manifest.json and versions.json to version ${newVersion}`);
