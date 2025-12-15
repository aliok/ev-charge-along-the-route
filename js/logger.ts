/**
 * Centralized logging utility with categorization and optional debug mode.
 * Provides structured logging with prefixes for better debugging.
 */

/**
 * Log levels for filtering
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Logger categories for different parts of the application
 */
export type LogCategory =
    | 'app'
    | 'map'
    | 'route'
    | 'marker'
    | 'filter'
    | 'storage'
    | 'api'
    | 'ui'
    | 'i18n'
    | 'geolocation';

/**
 * Logger configuration
 */
interface LoggerConfig {
    enabled: boolean;
    minLevel: LogLevel;
    showTimestamp: boolean;
    showCategory: boolean;
}

const DEFAULT_CONFIG: LoggerConfig = {
    enabled: true,
    minLevel: 'debug',
    showTimestamp: false,
    showCategory: true
};

let config: LoggerConfig = { ...DEFAULT_CONFIG };

/**
 * Log level hierarchy for filtering
 */
const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
};

/**
 * Formats a log message with optional timestamp and category
 */
function formatMessage(category: LogCategory | undefined, message: string): string {
    const parts: string[] = [];

    if (config.showTimestamp) {
        parts.push(`[${new Date().toISOString()}]`);
    }

    if (config.showCategory && category) {
        parts.push(`[${category.toUpperCase()}]`);
    }

    parts.push(message);
    return parts.join(' ');
}

/**
 * Checks if a log level should be output based on configuration
 */
function shouldLog(level: LogLevel): boolean {
    if (!config.enabled) return false;
    return LOG_LEVELS[level] >= LOG_LEVELS[config.minLevel];
}

/**
 * Logger class for structured logging
 */
export class Logger {
    constructor(private category?: LogCategory) {}

    /**
     * Debug level logging (verbose, development-only information)
     */
    debug(message: string, ...args: any[]): void {
        if (shouldLog('debug')) {
            console.log(formatMessage(this.category, message), ...args);
        }
    }

    /**
     * Info level logging (general information)
     */
    info(message: string, ...args: any[]): void {
        if (shouldLog('info')) {
            console.log(formatMessage(this.category, message), ...args);
        }
    }

    /**
     * Warning level logging (non-critical issues)
     */
    warn(message: string, ...args: any[]): void {
        if (shouldLog('warn')) {
            console.warn(formatMessage(this.category, message), ...args);
        }
    }

    /**
     * Error level logging (critical issues)
     */
    error(message: string, ...args: any[]): void {
        if (shouldLog('error')) {
            console.error(formatMessage(this.category, message), ...args);
        }
    }

    /**
     * Group logging for related messages
     */
    group(label: string): void {
        if (config.enabled) {
            console.group(formatMessage(this.category, label));
        }
    }

    /**
     * End a logging group
     */
    groupEnd(): void {
        if (config.enabled) {
            console.groupEnd();
        }
    }

    /**
     * Log with timing information
     */
    time(label: string): void {
        if (config.enabled) {
            console.time(formatMessage(this.category, label));
        }
    }

    /**
     * End timing and log duration
     */
    timeEnd(label: string): void {
        if (config.enabled) {
            console.timeEnd(formatMessage(this.category, label));
        }
    }
}

/**
 * Configure the logger
 */
export function configureLogger(options: Partial<LoggerConfig>): void {
    config = { ...config, ...options };
}

/**
 * Create a logger for a specific category
 */
export function createLogger(category: LogCategory): Logger {
    return new Logger(category);
}

/**
 * Default logger without category
 */
export const logger = new Logger();
