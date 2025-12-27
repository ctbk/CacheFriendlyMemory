const MODULE_NAME = 'cacheFriendlyMemory';

const defaultSettings = Object.freeze({
    enabled: true,
    autoCompact: true,
    compactThreshold: 120,
    contextThreshold: 75,
    level1ChunkSize: 10,
    level2ChunkSize: 5,
    targetCompression: 55,
    compressionModel: '',
    compressionPreset: '',
    debugMode: false,
    showProgressBar: true,
});

let isInitialized = false;

async function initModule() {
    if (isInitialized) {
        console.log(`[${MODULE_NAME}] Already initialized`);
        return;
    }

    const { extensionSettings, saveSettingsDebounced } = SillyTavern.getContext();

    extensionSettings[MODULE_NAME] = extensionSettings[MODULE_NAME] || structuredClone(defaultSettings);

    for (const key of Object.keys(defaultSettings)) {
        if (!Object.hasOwn(extensionSettings[MODULE_NAME], key)) {
            extensionSettings[MODULE_NAME][key] = defaultSettings[key];
        }
    }

    console.log(`[${MODULE_NAME}] Module initialized`);

    await registerEvents();
    await registerSlashCommands();
    await registerSettingsUI();

    isInitialized = true;
}

async function registerEvents() {
    const { eventSource, event_types } = SillyTavern.getContext();

    eventSource.on(event_types.APP_READY, () => {
        console.log(`[${MODULE_NAME}] App ready`);
    });

    eventSource.on(event_types.CHAT_CHANGED, async () => {
        console.log(`[${MODULE_NAME}] Chat changed`);
        const { getChatStorage } = await import('./src/storage.js');
        getChatStorage();
    });

    eventSource.on(event_types.USER_MESSAGE_RENDERED, async (mesId) => {
        const { getGlobalSetting } = await import('./src/storage.js');
        const autoCompact = getGlobalSetting('autoCompact');
        const compactThreshold = getGlobalSetting('compactThreshold');

        if (!autoCompact) return;

        const { getChatStorage } = await import('./src/storage.js');
        const storage = getChatStorage();

        if (!storage) return;

        const unsummarizedCount = storage.stats.totalMessages - storage.stats.summarizedMessages;

        if (unsummarizedCount >= compactThreshold) {
            console.log(`[${MODULE_NAME}] Triggering auto-compaction (${unsummarizedCount} messages)`);
            const { performCompaction } = await import('./src/compression.js');
            await performCompaction();
        }
    });

    eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, async (mesId) => {
        const { getGlobalSetting } = await import('./src/storage.js');
        const autoCompact = getGlobalSetting('autoCompact');
        const compactThreshold = getGlobalSetting('compactThreshold');

        if (!autoCompact) return;

        const { getChatStorage } = await import('./src/storage.js');
        const storage = getChatStorage();

        if (!storage) return;

        const unsummarizedCount = storage.stats.totalMessages - storage.stats.summarizedMessages;

        if (unsummarizedCount >= compactThreshold) {
            console.log(`[${MODULE_NAME}] Triggering auto-compaction (${unsummarizedCount} messages)`);
            const { performCompaction } = await import('./src/compression.js');
            await performCompaction();
        }
    });
}

async function registerSlashCommands() {
    const { SlashCommandParser, ARGUMENT_TYPE } = SillyTavern.getContext();

    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'cfm-compact',
        callback: async () => {
            const { performCompaction } = await import('./src/compression.js');
            await performCompaction();
            return 'Compaction completed';
        },
        helpString: 'Manually trigger compaction of chat history',
    }));

    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'cfm-status',
        callback: async () => {
            const { getChatStorage } = await import('./src/storage.js');
            const storage = getChatStorage();
            return JSON.stringify(storage?.stats || { error: 'No storage available' }, null, 2);
        },
        helpString: 'Show compression status and statistics',
    }));

    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'cfm-export',
        callback: async () => {
            const { exportChatData } = await import('./src/storage.js');
            await exportChatData();
            return 'Data exported';
        },
        helpString: 'Export chat compression data to JSON file',
    }));
}

async function registerSettingsUI() {
    const { registerExtensionSettings } = SillyTavern.getContext();

    registerExtensionSettings(MODULE_NAME, async (container) => {
        const { createSettingsPanel } = await import('./ui/settings.js');
        createSettingsPanel(container);
    });
}

initModule();
