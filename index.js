import { extension_settings, getContext } from '../../../extensions.js';
import { eventSource, event_types, saveSettingsDebounced } from '../../../../script.js';
import { extensionName, defaultSettings } from './src/constants.js';

let isInitialized = false;

jQuery(() => {
    eventSource.on(event_types.APP_READY, async () => {
        if (isInitialized) {
            console.log(`[${extensionName}] Already initialized`);
            return;
        }

        extension_settings[extensionName] = extension_settings[extensionName] || structuredClone(defaultSettings);

        for (const key of Object.keys(defaultSettings)) {
            if (!Object.hasOwn(extension_settings[extensionName], key)) {
                extension_settings[extensionName][key] = defaultSettings[key];
            }
        }

        console.log(`[${extensionName}] Module initialized`);

        const { loadSettings } = await import('./ui/settings.js');
        await loadSettings();

        await registerEvents();
        await registerSlashCommands();

        isInitialized = true;
    });
});

async function registerEvents() {
    eventSource.on(event_types.APP_READY, () => {
        console.log(`[${extensionName}] App ready`);
    });

    eventSource.on(event_types.CHAT_CHANGED, async () => {
        console.log(`[${extensionName}] Chat changed`);
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
            console.log(`[${extensionName}] Triggering auto-compaction (${unsummarizedCount} messages)`);
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
            console.log(`[${extensionName}] Triggering auto-compaction (${unsummarizedCount} messages)`);
            const { performCompaction } = await import('./src/compression.js');
            await performCompaction();
        }
    });
}

async function registerSlashCommands() {
    const context = getContext();
    const parser = context.SlashCommandParser;
    const command = context.SlashCommand;

    parser.addCommandObject(command.fromProps({
        name: 'cfm-compact',
        callback: async () => {
            const { performCompaction } = await import('./src/compression.js');
            await performCompaction();
            return 'Compaction completed';
        },
        helpString: 'Manually trigger compaction of chat history',
    }));

    parser.addCommandObject(command.fromProps({
        name: 'cfm-status',
        callback: async () => {
            const { getChatStorage } = await import('./src/storage.js');
            const storage = getChatStorage();
            return JSON.stringify(storage?.stats || { error: 'No storage available' }, null, 2);
        },
        helpString: 'Show compression status and statistics',
    }));

    parser.addCommandObject(command.fromProps({
        name: 'cfm-export',
        callback: async () => {
            const { exportChatData } = await import('./src/storage.js');
            await exportChatData();
            return 'Data exported';
        },
        helpString: 'Export chat compression data to JSON file',
    }));
}
