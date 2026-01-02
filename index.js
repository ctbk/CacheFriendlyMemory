import { extension_settings, getContext } from '../../../extensions.js';
import { eventSource, event_types } from '../../../../script.js';
import { extensionName, defaultSettings } from './src/constants.js';

import { injectSummaries } from './src/injection.js';
import { cacheFriendlyMemoryInterceptor } from './src/interceptor.js';
import { registerExtensionEvents } from './src/events.js';

const MODULE_NAME = 'cacheFriendlyMemory';
let isInitialized = false;

export function migrateDeprecatedSettings() {
    if (!extension_settings[MODULE_NAME]) {
        return;
    }

    const deprecatedKeys = ['compressionModel', 'compressionPreset'];
    const removedKeys = [];

    for (const key of deprecatedKeys) {
        if (key in extension_settings[MODULE_NAME]) {
            delete extension_settings[MODULE_NAME][key];
            removedKeys.push(key);
        }
    }

    if (removedKeys.length > 0) {
        console.log(`[${MODULE_NAME}] Removed deprecated settings: ${removedKeys.join(', ')}`);
    }
}

if (typeof jQuery !== 'undefined') {
    jQuery(() => {
    eventSource.on(event_types.APP_READY, async () => {
        if (isInitialized) {
            console.log(`[${extensionName}] Already initialized`);
            return;
        }

        migrateDeprecatedSettings();

        extension_settings[extensionName] = extension_settings[extensionName] || structuredClone(defaultSettings);

        for (const key of Object.keys(defaultSettings)) {
            if (!Object.hasOwn(extension_settings[extensionName], key)) {
                extension_settings[extensionName][key] = defaultSettings[key];
            }
        }

        console.log(`[${extensionName}] Module initialized`);

        const { loadSettings } = await import('./ui/settings.js');
        await loadSettings();

        await registerExtensionEvents();
        await registerSlashCommands();

        isInitialized = true;
    });
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
            await injectSummaries();
            return 'Compaction completed';
        },
        helpString: 'Manually trigger compaction of chat history',
    }));

    parser.addCommandObject(command.fromProps({
        name: 'cfm-status',
        callback: async () => {
            const { getChatStorage } = await import('./src/storage.js');
            const storage = getChatStorage();
            if (!storage) {
                return 'No storage available';
            }
            const output = {
                stats: storage.stats,
                injection: storage.injection,
                level1Count: storage.level1?.summaries?.length || 0,
                level2Count: storage.level2?.summaries?.length || 0,
                level3Summary: !!storage.level3?.summary
            };
            return JSON.stringify(output, null, 2);
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
