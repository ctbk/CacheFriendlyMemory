import { defaultSettings } from './constants.js';
import { getContext, extension_settings } from '../../../../extensions.js';
import { saveMetadata, saveSettingsDebounced } from '../../../../../script.js';

const METADATA_KEY = 'cacheFriendlyMemory';

/**
 * Safe wrapper for toastr notifications
 */
function showToast(type, message) {
    if (typeof toastr !== 'undefined' && toastr[type]) {
        toastr[type](message, 'CacheFriendlyMemory');
    } else {
        console.log(`[${METADATA_KEY}] ${type}: ${message}`);
    }
}

export function getChatStorage() {
    const context = getContext();

    if (!context?.chatMetadata) {
        console.warn(`[${METADATA_KEY}] Context not available`);
        return null;
    }

    if (!context.chatMetadata[METADATA_KEY]) {
        initializeStorage(context.chatMetadata);
    }

    return context.chatMetadata[METADATA_KEY];
}

function initializeStorage(metadata) {
    metadata[METADATA_KEY] = {
        enabled: true,
        lastSummarizedIndex: -1,
        level0: { startIndex: 0, messages: [] },
        level1: { summaries: [] },
        level2: { summaries: [] },
        level3: { summary: null },
        stats: {
            totalMessages: 0,
            summarizedMessages: 0,
            currentCompressionRatio: 0,
            lastCompactTime: null,
        },
    };
}

export async function saveChatStorage() {
    try {
        await saveMetadata();
        console.debug(`[${METADATA_KEY}] Data saved to chat file`);
    } catch (error) {
        console.error(`[${METADATA_KEY}] Failed to save:`, error);
        throw error;
    }
}

export function getGlobalSetting(key) {
    return extension_settings[METADATA_KEY]?.[key];
}

export function setGlobalSetting(key, value) {
    if (!extension_settings[METADATA_KEY]) {
        extension_settings[METADATA_KEY] = {};
    }

    extension_settings[METADATA_KEY][key] = value;
    saveSettingsDebounced();
}

export function getChatSetting(key) {
    const storage = getChatStorage();
    const chatValue = storage?.[key];

    if (chatValue !== undefined) {
        return chatValue;
    }

    return getGlobalSetting(key);
}

export async function setChatSetting(key, value) {
    const storage = getChatStorage();
    if (!storage) return;

    storage[key] = value;
    await saveChatStorage();
}

export function exportChatData() {
    const storage = getChatStorage();
    if (!storage) {
        console.error(`[${METADATA_KEY}] No storage available for export`);
        return;
    }

    const data = {
        exportDate: new Date().toISOString(),
        chatId: getContext().chatId,
        ...storage,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CacheFriendlyMemory_Export_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export function importChatData(jsonString) {
    try {
        const data = JSON.parse(jsonString);
        const storage = getChatStorage();

        if (!storage) {
            throw new Error('No storage available');
        }

        Object.assign(storage, data);
        saveChatStorage();
        showToast('success', 'Import successful');
    } catch (error) {
        console.error(`[${METADATA_KEY}] Import failed:`, error);
        showToast('error', 'Import failed: ' + error.message);
    }
}

export async function restoreDefaults() {
    const settings = extension_settings[METADATA_KEY];
    if (!settings) {
        console.error(`[${METADATA_KEY}] Settings object not initialized`);
        return false;
    }

    for (const key of Object.keys(defaultSettings)) {
        settings[key] = defaultSettings[key];
    }

    saveSettingsDebounced();
    console.log(`[${METADATA_KEY}] Settings restored to defaults`);
    return true;
}
