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

    const storage = context.chatMetadata[METADATA_KEY];

    import('./message-metadata.js').then(({ countMessagesByLevel }) => {
        const counts = countMessagesByLevel(context.chat || []);
        storage.stats = storage.stats || {};
        storage.stats.totalMessages = counts.total;
        storage.stats.summarizedMessages = counts.level1 + counts.level2 + counts.level3;

        if (storage.stats.summarizedMessages > 0 && storage.stats.totalMessages > 0) {
            const totalSummaryTokens = storage.level1.summaries.reduce((sum, s) => sum + s.tokenCount, 0);
            const rawMessagesTokens = storage.stats.summarizedMessages * 100;
            storage.stats.currentCompressionRatio = totalSummaryTokens / rawMessagesTokens;
        }
    }).catch(err => {
        console.warn(`[${METADATA_KEY}] Failed to calculate stats:`, err);
    });

    console.log(`[${METADATA_KEY}] getChatStorage - totalMessages: ${storage.stats?.totalMessages || 0}, summarizedMessages: ${storage.stats?.summarizedMessages || 0}`);

    return storage;
}

function initializeStorage(metadata) {
    const context = getContext();
    const existingMessageCount = context?.chat?.length || 0;

    metadata[METADATA_KEY] = {
        level0: { startIndex: 0, messages: [] },
        level1: { summaries: [] },
        level2: { summaries: [] },
        level3: { summary: null },
        stats: {
            lastCompactTime: null,
        }
    };

    console.log(`[${METADATA_KEY}] Initialized storage with ${existingMessageCount} existing messages`);
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

export function getInjectionSetting(key) {
    return extension_settings[METADATA_KEY]?.injection?.[key];
}

export function setInjectionSetting(key, value) {
    if (!extension_settings[METADATA_KEY]) {
        extension_settings[METADATA_KEY] = {};
    }

    extension_settings[METADATA_KEY].injection = extension_settings[METADATA_KEY].injection || {};
    extension_settings[METADATA_KEY].injection[key] = value;
    saveSettingsDebounced();
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
