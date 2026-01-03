import { getGlobalSetting } from '../storage.js';

/**
 * Logs messages to console only when debug mode is enabled.
 * Includes safety checks for console availability.
 *
 * @param {...any} args - Arguments to pass to console.log
 */
export function debugLog(...args) {
    if (typeof console === 'undefined') {
        return;
    }

    const debugMode = getGlobalSetting('debugMode');

    if (debugMode) {
        console.log(...args);
    }
}
