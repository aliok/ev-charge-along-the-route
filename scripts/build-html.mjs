// scripts/build-html.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv'; // <-- Import dotenv

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
// Placeholder string used in the template HTML
const API_KEY_PLACEHOLDER = '__GOOGLE_MAPS_API_KEY__';
// --------------------


// Define paths relative to this script file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..'); // Go up one level from /scripts
const templatePath = path.join(projectRoot, SOURCE_HTML);
const outputDir = path.join(projectRoot, OUTPUT_DIR);
const outputPath = path.join(outputDir, OUTPUT_HTML);


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

    // --- Read Template ---
    let templateContent;
    try {
        console.log(`Reading template: ${templatePath}`);
        templateContent = await fs.readFile(templatePath, 'utf-8');
    } catch (err) {
        console.error(`Failed to read template file: ${templatePath}`, err);
        process.exit(1);
    }

    // --- Substitute Placeholder ---
    console.log(`Substituting placeholder "${API_KEY_PLACEHOLDER}"...`);
    const outputContent = templateContent.replace(
        new RegExp(API_KEY_PLACEHOLDER, 'g'), // Use RegExp for global replace
        apiKey // Inject the actual key value
    );
    // Verification step
    if (outputContent.includes(API_KEY_PLACEHOLDER)) {
        console.warn(`WARN: Placeholder "${API_KEY_PLACEHOLDER}" might still be present after substitution. Check template/script.`);
    } else if (outputContent === templateContent) {
        console.warn(`WARN: Placeholder "${API_KEY_PLACEHOLDER}" not found in template file. API key was not injected.`);
    } else {
        console.log(`Placeholder substituted successfully.`);
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
