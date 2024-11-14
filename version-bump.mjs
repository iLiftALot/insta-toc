import { readFileSync, writeFileSync } from "fs";

// Define paths to the files to update
const packagePath = 'package.json';
const manifestPath = 'manifest.json';
const versionsPath = 'versions.json';

const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
const manifestJson = JSON.parse(readFileSync(manifestPath, 'utf8'));
const versionsJson = JSON.parse(readFileSync(versionsPath, 'utf8'));

const newVersion = packageJson.version;
const minAppVersion = manifestJson.minAppVersion;

console.log(`New Version: ${newVersion}\nMinimum App Version: ${minAppVersion}\n`);

manifestJson.version = newVersion;
writeFileSync(manifestPath, JSON.stringify(manifestJson, null, 4));

console.log(`Changed manifest.json version to ${manifestJson.version}\n`);

versionsJson[newVersion] = minAppVersion;
writeFileSync(versionsPath, JSON.stringify(versionsJson, null, 4));

console.log(`Added "${newVersion}: ${minAppVersion}" versions.json:\n${JSON.stringify(versionsJson, null, 4)}`);
