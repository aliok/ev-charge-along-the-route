// scripts/build-html.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { execSync } from 'node:child_process';

// --- Load .env file into process.env ---
// This is for LOCAL builds (`npm run build`).
// It reads '.env' in the project root.
// IMPORTANT: It will NOT override variables already set in the environment (like by Netlify build).
dotenv.config();
console.log('Attempted to load variables from .env file for local build.');
// --- End .env loading ---


// --- Configuration ---
const SOURCE_HTML = 'index.template.html'; // Template file in root
const OUTPUT_DIR = 'dist'; // Output directory
const OUTPUT_HTML = 'index.html'; // Output file name
// Directories in root to copy to the output dir (relative to project root)
const ASSETS_TO_COPY = ['css', 'js', 'images', 'data'];
// Environment variable name expected (from .env locally or Netlify UI deployed)
const API_KEY_ENV_VAR = 'GOOGLE_MAPS_API_KEY';
// Placeholder strings used in the template HTML
const API_KEY_PLACEHOLDER = '__GOOGLE_MAPS_API_KEY__';
const VERSION_PLACEHOLDER = '__APP_VERSION__';
const TRANSLATIONS_PLACEHOLDER = '__TRANSLATIONS_JSON__';
// --------------------


// Define paths relative to this script file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..'); // Go up one level from /scripts
const templatePath = path.join(projectRoot, SOURCE_HTML);
const outputDir = path.join(projectRoot, OUTPUT_DIR);
const outputPath = path.join(outputDir, OUTPUT_HTML);


// NEW: Function to generate the version string
function getVersionString() {
    let commitHash = 'nogit';
    try {
        // Execute 'git rev-parse --short HEAD' to get the short commit hash
        commitHash = execSync('git rev-parse --short HEAD').toString().trim();
    } catch (error) {
        console.warn('Could not get git commit hash. Falling back to "nogit". This is normal if not in a git repo.');
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateString = `${year}${month}${day}`;

    return `${commitHash}-${dateString}`;
}

async function copyAssets() {
    console.log('Copying static assets...');
    for (const assetDir of ASSETS_TO_COPY) {
        const sourceDir = path.join(projectRoot, assetDir);
        const destDir = path.join(outputDir, assetDir);
        try {
            await fs.access(sourceDir); // Check if source exists
            console.log(`Copying: ${sourceDir} -> ${destDir}`);
            await fs.mkdir(destDir, { recursive: true }); // Ensure destination exists
            await fs.cp(sourceDir, destDir, { recursive: true });
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log(`Source directory not found, skipping: ${sourceDir}`);
            } else {
                console.error(`Error copying directory ${sourceDir}:`, error);
                process.exit(1); // Fail the build if essential asset copying fails
            }
        }
    }
    console.log('Asset copying finished.');
}


async function buildHtml() {
    console.log('Starting HTML build process...');

    // --- Get Environment Variable ---
    // This will now read from .env when run locally via `npm run build`
    // OR read from Netlify's injected variables when run during Netlify build.
    const apiKey = process.env[API_KEY_ENV_VAR];

    if (!apiKey) {
        console.error(`ERROR: Required environment variable "${API_KEY_ENV_VAR}" is not set!`);
        console.error('Check your local .env file or Netlify environment variables.');
        console.error('Build failed.');
        process.exit(1); // Fail the build if key is missing
    } else {
        // Avoid logging the key itself in build logs
        console.log(`Found environment variable "${API_KEY_ENV_VAR}".`);
    }

    // generate the version string for cache busting
    const versionString = getVersionString();
    console.log(`Generated version string for cache busting: "${versionString}"`);

    // --- Load Translations from external file ---
    let translations;
    const translationsPath = path.join(projectRoot, 'translations.js');
    try {
        console.log(`Loading translations from: ${translationsPath}`);
        const translationsModule = await import(translationsPath);
        translations = translationsModule.default; // Assuming a default export
    } catch (err) {
        console.error(`Failed to load translations file: ${translationsPath}`, err);
        process.exit(1);
    }
    const translationsJsonString = JSON.stringify(translations);
    console.log(`Translations loaded and stringified successfully.`);

    // --- Read Template ---
    let templateContent;
    try {
        console.log(`Reading template: ${templatePath}`);
        templateContent = await fs.readFile(templatePath, 'utf-8');
    } catch (err) {
        console.error(`Failed to read template file: ${templatePath}`, err);
        process.exit(1);
    }

    // --- Substitute Placeholders ---
    console.log(`Substituting placeholders...`);
    const outputContent = templateContent
        .replace(new RegExp(API_KEY_PLACEHOLDER, 'g'), apiKey)
        .replace(new RegExp(VERSION_PLACEHOLDER, 'g'), versionString)
        .replace(TRANSLATIONS_PLACEHOLDER, translationsJsonString);

    // Verification steps
    if (outputContent.includes(API_KEY_PLACEHOLDER)) {
        console.warn(`WARN: Placeholder "${API_KEY_PLACEHOLDER}" might still be present.`);
    }
    if (outputContent.includes(VERSION_PLACEHOLDER)) {
        console.warn(`WARN: Placeholder "${VERSION_PLACEHOLDER}" might still be present.`);
    }
    if (outputContent.includes(TRANSLATIONS_PLACEHOLDER)) {
        console.warn(`WARN: Placeholder "${TRANSLATIONS_PLACEHOLDER}" might still be present.`);
    } else {
        console.log(`Placeholders substituted successfully.`);
    }

    // --- Write Output File ---
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

    // --- Copy Static Assets (after HTML processing) ---
    await copyAssets();

    console.log('Build process completed successfully.');
}

// Run the build process
buildHtml();
