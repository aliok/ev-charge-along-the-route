import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { execSync } from 'node:child_process';

// --- Load .env file into process.env ---
dotenv.config();
console.log('Attempted to load variables from .env file for local build.');

// --- Configuration ---
const SOURCE_HTML = 'index.template.html';
const OUTPUT_DIR = 'dist';
const OUTPUT_HTML = 'index.html';
const ASSETS_TO_COPY = ['css', 'images', 'data']; // 'js' is now handled by buildJs
const API_KEY_ENV_VAR = 'GOOGLE_MAPS_API_KEY';
const API_KEY_PLACEHOLDER = '__GOOGLE_MAPS_API_KEY__';
const MAP_ID_ENV_VAR = 'GOOGLE_MAPS_MAP_ID';
const MAP_ID_PLACEHOLDER = '__GOOGLE_MAPS_MAP_ID__';
const VERSION_PLACEHOLDER = '__APP_VERSION__';
const TRANSLATIONS_PLACEHOLDER = '__TRANSLATIONS_JSON__';
// --------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const templatePath = path.join(projectRoot, SOURCE_HTML);
const outputDir = path.join(projectRoot, OUTPUT_DIR);
const outputPath = path.join(outputDir, OUTPUT_HTML);

function getVersionString() {
    let commitHash = 'nogit';
    try {
        commitHash = execSync('git rev-parse --short HEAD').toString().trim();
    } catch (error) {
        console.warn('Could not get git commit hash. Falling back to "nogit".');
    }
    const now = new Date();
    const dateString = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
    return `${commitHash}-${dateString}`;
}

async function copyAssets() {
    console.log('Copying static assets...');
    for (const assetDir of ASSETS_TO_COPY) {
        const sourceDir = path.join(projectRoot, assetDir);
        const destDir = path.join(outputDir, assetDir);
        try {
            await fs.access(sourceDir);
            console.log(`Copying: ${sourceDir} -> ${destDir}`);
            await fs.mkdir(destDir, { recursive: true });
            await fs.cp(sourceDir, destDir, { recursive: true });
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log(`Source directory not found, skipping: ${sourceDir}`);
            } else {
                console.error(`Error copying directory ${sourceDir}:`, error);
                process.exit(1);
            }
        }
    }
    console.log('Asset copying finished.');
}

async function buildJs(versionString, translationsJsonString, mapId) {
    console.log('Starting TypeScript compilation and JS build process...');
    const sourceJsDir = path.join(projectRoot, 'js');
    const outputJsDir = path.join(outputDir, 'js');

    try {
        // First, compile TypeScript to JavaScript
        console.log('Compiling TypeScript files...');
        execSync('npx tsc', { cwd: projectRoot, stdio: 'inherit' });
        console.log('TypeScript compilation completed.');

        await fs.mkdir(outputJsDir, { recursive: true });
        
        // Process all JS files including those in subdirectories
        await processJsFilesRecursively(outputJsDir, versionString, translationsJsonString, mapId);
        
        console.log('JS build process finished successfully.');

    } catch (err) {
        console.error('Failed during JS build process:', err);
        process.exit(1);
    }
}

async function processJsFilesRecursively(dir, versionString, translationsJsonString, mapId) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
            await processJsFilesRecursively(fullPath, versionString, translationsJsonString, mapId);
        } else if (entry.name.endsWith('.js')) {
            let content = await fs.readFile(fullPath, 'utf-8');

            // --- Substitute Placeholders ---
            content = content.replace(new RegExp(VERSION_PLACEHOLDER, 'g'), versionString);
            content = content.replace(TRANSLATIONS_PLACEHOLDER, translationsJsonString);
            content = content.replace(new RegExp(MAP_ID_PLACEHOLDER, 'g'), mapId);

            await fs.writeFile(fullPath, content, 'utf-8');
            console.log(`Processed and wrote: ${fullPath}`);
        }
    }
}


async function buildHtml() {
    console.log('Starting HTML build process...');

    const apiKey = process.env[API_KEY_ENV_VAR];
    if (!apiKey) {
        console.error(`ERROR: Required environment variable "${API_KEY_ENV_VAR}" is not set!`);
        process.exit(1);
    } else {
        console.log(`Found environment variable "${API_KEY_ENV_VAR}".`);
    }

    const mapId = process.env[MAP_ID_ENV_VAR] || 'DEMO_MAP_ID';
    console.log(`Using Map ID: "${mapId}" (from ${process.env[MAP_ID_ENV_VAR] ? MAP_ID_ENV_VAR : 'default'}).`);

    const versionString = getVersionString();
    console.log(`Generated version string: "${versionString}"`);

    let translations;
    const translationsPath = path.join(projectRoot, 'translations.js');
    try {
        console.log(`Loading translations from: ${translationsPath}`);
        const translationsModule = await import(translationsPath);
        translations = translationsModule.default;
    } catch (err) {
        console.error(`Failed to load translations file: ${translationsPath}`, err);
        process.exit(1);
    }
    const translationsJsonString = JSON.stringify(translations);
    console.log(`Translations loaded successfully.`);

    let templateContent;
    try {
        templateContent = await fs.readFile(templatePath, 'utf-8');
    } catch (err) {
        console.error(`Failed to read template file: ${templatePath}`, err);
        process.exit(1);
    }

    console.log(`Substituting placeholders in HTML...`);
    const outputContent = templateContent
        .replace(new RegExp(API_KEY_PLACEHOLDER, 'g'), apiKey)
        .replace(new RegExp(VERSION_PLACEHOLDER, 'g'), versionString);

    try {
        console.log(`Ensuring output directory exists: ${outputDir}`);
        await fs.mkdir(outputDir, { recursive: true });
        console.log(`Writing processed HTML: ${outputPath}`);
        await fs.writeFile(outputPath, outputContent, 'utf-8');
        console.log('Processed HTML written successfully.');
    } catch (err) {
        console.error(`Failed to write output file: ${outputPath}`, err);
        process.exit(1);
    }

    // Process all JavaScript files
    await buildJs(versionString, translationsJsonString, mapId);

    // Copy static assets
    await copyAssets();

    console.log('Build process completed successfully.');
}

buildHtml();
