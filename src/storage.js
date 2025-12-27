const METADATA_KEY = 'cacheFriendlyMemory';

export function getChatStorage() {
    const context = SillyTavern.getContext();

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
        const { saveMetadata } = SillyTavern.getContext();
        await saveMetadata();
        console.debug(`[${METADATA_KEY}] Data saved to chat file`);
    } catch (error) {
        console.error(`[${METADATA_KEY}] Failed to save:`, error);
        throw error;
    }
}

export function getGlobalSetting(key) {
    const { extensionSettings } = SillyTavern.getContext();
    return extensionSettings[METADATA_KEY]?.[key];
}

export function setGlobalSetting(key, value) {
    const { extensionSettings, saveSettingsDebounced } = SillyTavern.getContext();

    if (!extensionSettings[METADATA_KEY]) {
        extensionSettings[METADATA_KEY] = {};
    }

    extensionSettings[METADATA_KEY][key] = value;
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
        chatId: SillyTavern.getContext().chatId,
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
    const { toastr } = SillyTavern.getContext();

    try {
        const data = JSON.parse(jsonString);
        const storage = getChatStorage();

        if (!storage) {
            throw new Error('No storage available');
        }

        Object.assign(storage, data);
        saveChatStorage();
        toastr.success('Import successful', 'CacheFriendlyMemory');
    } catch (error) {
        console.error('Import failed:', error);
        toastr.error('Import failed: ' + error.message, 'CacheFriendlyMemory');
    }
}
