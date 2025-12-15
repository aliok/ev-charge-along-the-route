import {
    LANGUAGE_STORAGE_KEY,
    translations
} from './config.js';
import type { TranslationParams } from './types.js';
import { getStorageItem, setStorageItem } from './storage-utils.js';
import { createLogger } from './logger.js';

// Create logger for i18n operations
const logger = createLogger('i18n');

// --- Internationalization (i18n) ---
const DEFAULT_LANGUAGE = 'en';
const LANGUAGE_SEPARATOR = '-';

export let currentLang: string = DEFAULT_LANGUAGE; // Default language, may be overridden by loadLanguage()

// The translations object is now injected by the build script

/**
 * Extracts the primary language code from a browser language string.
 */
function extractLanguageCode(browserLang: string): string {
    return browserLang.split(LANGUAGE_SEPARATOR)[0]?.toLowerCase() ?? DEFAULT_LANGUAGE;
}

/**
 * Checks if a language code is supported.
 */
function isLanguageSupported(lang: string): boolean {
    return lang in translations;
}

export function loadLanguage(): void {
    const savedLang = getStorageItem<string>(LANGUAGE_STORAGE_KEY);

    if (savedLang && isLanguageSupported(savedLang)) {
        currentLang = savedLang;
        logger.info(`Loaded language from localStorage: ${currentLang}`);
    } else {
        // Try detecting browser language
        const browserLang = navigator.language ? extractLanguageCode(navigator.language) : DEFAULT_LANGUAGE;

        if (isLanguageSupported(browserLang)) {
            currentLang = browserLang;
            logger.info(`Detected browser language: ${currentLang}. No preference saved yet.`);
        } else {
            currentLang = DEFAULT_LANGUAGE;
            logger.info(`Browser language (${browserLang}) not supported or undetectable, defaulting to: ${currentLang}`);
        }
    }

    document.documentElement.lang = currentLang;
}

function setLanguage(lang: string): void {
    if (lang && translations[lang] && lang !== currentLang) {
        currentLang = lang;
        setStorageItem(LANGUAGE_STORAGE_KEY, currentLang);
        logger.info(`Language preference set to: ${currentLang}. Reloading page.`);
        window.location.reload(); // Reload the page
    } else if (lang === currentLang) {
        logger.debug(`Language already set to: ${lang}. No action needed.`);
    } else {
        logger.warn(`Attempted to set invalid language: ${lang}`);
    }
}

// --- Helper to get translation key for a parsed location type ---
export function getParsedTypeTranslationKey(parsedTypeString: string): string {
    // Map the internal string representation to the translation key
    switch (parsedTypeString) {
        case 'Coordinates':
            return 'locationTypeCoordinates';
        case 'Place ID':
        case 'Place ID (from URL query)':
        case 'Place ID (from URL path)':
        case 'Place ID (standalone)':
            return 'locationTypePlaceId';
        case 'Map Click':
            return 'locationTypeMapClick';
        case 'Feature Click':
            return 'locationTypeFeatureClick';
        case 'Current Location':
            return 'locationTypeCurrentLocation';
        case 'Search Term':
        case 'Search Term (from URL query)':
        case 'Search Term (from URL path)':
            return 'locationTypeSearchTerm';
        case 'Address/Name':
        case 'Place Name (from URL path)':
            return 'locationTypeAddressName';
        case 'Plus Code':
            return 'locationTypePlusCode';
        case 'Pasted':
            return 'locationTypePasted';
        default:
            return 'locationTypeUnknown';
    }
}

const TURKISH_LANG = 'tr';
const ENGLISH_LANG = 'en';

/**
 * Replaces placeholders in text with parameter values.
 */
function replacePlaceholders(text: string, params: TranslationParams): string {
    let result = text;
    
    for (const [paramKey, paramValue] of Object.entries(params)) {
        let replacement = paramValue;
        
        // Special handling for 'parsedType' to translate it first
        if (paramKey === 'parsedType' && typeof replacement === 'string') {
            const typeKey = getParsedTypeTranslationKey(replacement);
            replacement = translate(typeKey);
        }
        
        const regex = new RegExp(`\\{${paramKey}\\}`, 'g');
        result = result.replace(regex, String(replacement));
    }
    
    return result;
}

/**
 * Handles pluralization for station-related translations.
 */
function handlePluralization(text: string, key: string, params: TranslationParams): string {
    const hasStationKeyword = key.includes('station') || key.includes('Stations');
    if (!hasStationKeyword || params.count === undefined) {
        return text;
    }
    
    const count = Number(params.count);
    
    if (currentLang === TURKISH_LANG) {
        return text
            .replace('{count} station(s)', `${count} istasyon`)
            .replace('{count} istasyon', `${count} istasyon`);
    }
    
    // English pluralization
    const singular = count === 1 ? `${count} station` : `${count} stations`;
    return text
        .replace('{count} station(s)', singular)
        .replace('{count} station', singular);
}

export function translate(key: string, params: TranslationParams = {}): string {
    const langDict = translations[currentLang] ?? translations[ENGLISH_LANG];
    const englishDict = translations[ENGLISH_LANG];

    let text = langDict[key] ?? englishDict[key] ?? key;

    // Warn if translation is missing
    if (text === key && !(key in langDict) && !(key in englishDict)) {
        logger.warn(`Translation missing for key: ${key} in lang: ${currentLang}`);
    }

    // Replace placeholders
    text = replacePlaceholders(text, params);

    // Handle pluralization
    text = handlePluralization(text, key, params);

    return text;
}

// Updates elements marked with data-i18n-key
export function applyTranslations(): void {
    document.querySelectorAll('[data-i18n-key]').forEach(element => {
        const keyAttr = element.getAttribute('data-i18n-key');
        if (!keyAttr) return;
        // Format: "key" or "[attr]key1;[attr2]key2"
        const translationsToApply = keyAttr.split(';').map(part => {
            const match = part.match(/^\[([^\]]+)\](.+)$/);
            if (match) {
                return {
                    attr: match[1],
                    key: match[2]
                };
            } else {
                // Default to textContent if no attribute specified
                return {
                    attr: 'textContent',
                    key: part
                };
            }
        });

        translationsToApply.forEach(({
                                         attr,
                                         key
                                     }) => {
            const translatedText = translate(key);
            try {
                if (attr === 'textContent') {
                    // Simplified: Set textContent directly for most elements
                    // Use innerHTML only if translation itself contains HTML (like hints)
                    if (element.classList.contains('shortcut-hint-x') || element.classList.contains('esc-hint')) {
                        element.innerHTML = translatedText;
                    } else if (element.id === 'loading-text') { // Target specific loading text span
                        element.textContent = translatedText;
                    } else {
                        element.textContent = translatedText;
                    }
                } else if (attr === 'innerHTML') {
                    element.innerHTML = translatedText; // Use carefully
                } else {
                    element.setAttribute(attr, translatedText);
                }
            } catch (e) {
                console.error(`Error applying translation key "${key}" (attr: ${attr}) to element:`, element, e);
            }
        });
    });
    // Update language dropdown button text/flag
    updateLanguageDropdownUI();
    // Update dynamically generated content if needed
    // updateDynamicTranslations(); // No longer needed due to page refresh on lang change
}

// Language UI elements - will be initialized from main.js
let languageControlContainer: HTMLElement | null = null;
let languageSelectorButton: HTMLElement | null = null;
let languageDropdown: HTMLElement | null = null;
let languageFlagDisplay: HTMLElement | null = null;

// Function to initialize language UI elements (called from main.js)
export function initLanguageUI(controlContainer: HTMLElement | null, selectorButton: HTMLElement | null, dropdown: HTMLElement | null, flagDisplay: HTMLElement | null): void {
    languageControlContainer = controlContainer;
    languageSelectorButton = selectorButton;
    languageDropdown = dropdown;
    languageFlagDisplay = flagDisplay;
}

// --- Language Dropdown Logic ---
export function setupLanguageDropdown(): void {
    if (!languageDropdown || !languageSelectorButton) return;

    languageDropdown.innerHTML = ''; // Clear previous options

    Object.keys(translations).forEach(langCode => {
        const langData = translations[langCode];
        const button = document.createElement('button');
        button.setAttribute('role', 'menuitem');
        button.setAttribute('data-lang', langCode);
        // Only include the flag span
        button.innerHTML = `
                <span class="flag">${langData.langFlag || '🏳️'}</span>
            `;
        button.classList.toggle('active', langCode === currentLang);
        button.addEventListener('click', () => {
            setLanguage(langCode); // This will now reload the page
            // No need to manually close dropdown as page reloads
        });
        if (languageDropdown) {
            languageDropdown.appendChild(button);
        }
    });

    languageSelectorButton.addEventListener('click', (event) => {
        event.stopPropagation(); // Prevent document click handler from closing it immediately
        const isExpanded = languageSelectorButton?.getAttribute('aria-expanded') === 'true';
        languageDropdown?.classList.toggle('show', !isExpanded);
        if (languageSelectorButton) {
            languageSelectorButton.setAttribute('aria-expanded', String(!isExpanded));
        }
    });
}

function updateLanguageDropdownUI(): void {
    if (!languageFlagDisplay || !languageDropdown) return;
    // Update button display based on currentLang
    if (languageFlagDisplay) {
        languageFlagDisplay.textContent = translations[currentLang]?.langFlag || '🏳️';
    }
    // Update active item in dropdown (useful for initial load)
    languageDropdown.querySelectorAll('button').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-lang') === currentLang);
    });
}

export function handleDocumentClickForDropdown(event: MouseEvent): void {
    // Close dropdown if click is outside the language control area
    if (!languageControlContainer?.contains(event.target as Node) && languageDropdown?.classList.contains('show')) {
        languageDropdown.classList.remove('show');
        if (languageSelectorButton) {
            languageSelectorButton.setAttribute('aria-expanded', 'false');
        }
    }
}

