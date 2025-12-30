import { getContext } from '../../../../extensions.js';
import { eventSource, event_types } from '../../../../../script.js';
import { getChatStorage, saveChatStorage } from './storage.js';
import { markMessageActive } from './message-metadata.js';
import { triggerCompaction, performCompaction } from './compression.js';
import { injectSummaries, clearInjection } from './injection.js';

export function registerExtensionEvents() {

    eventSource.on(event_types.CHAT_CHANGED, async () => {
        console.log('[CacheFriendlyMemory] Chat changed event');
        getChatStorage();
        await injectSummaries();
    });

    eventSource.on(event_types.MESSAGE_RECEIVED, async (mesId) => {
        console.log('[CacheFriendlyMemory] Message received event:', mesId);
        const storage = getChatStorage();
        if (!storage) return;

        const context = getContext();
        const message = context.chat?.[mesId];
        if (message) {
            markMessageActive(message);
        }

        if (await triggerCompaction()) {
            await performCompaction();
            await saveChatStorage();
            await injectSummaries();
        }
    });

    eventSource.on(event_types.USER_MESSAGE_RENDERED, async (mesId) => {
        console.log('[CacheFriendlyMemory] User message rendered event:', mesId);
        const context = getContext();
        const message = context.chat?.[mesId];
        if (message) {
            markMessageActive(message);
        }
    });

    eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, async (mesId) => {
        console.log('[CacheFriendlyMemory] Character message rendered event:', mesId);
        const context = getContext();
        const message = context.chat?.[mesId];
        if (message) {
            markMessageActive(message);
        }
    });

    eventSource.on(event_types.GENERATION_AFTER_COMMANDS, async () => {
        console.log('[CacheFriendlyMemory] Generation after commands event');
        const storage = getChatStorage();
        if (storage?.injection?.enabled) {
            await injectSummaries();
        }
    });
}

export function unregisterExtensionEvents() {
    eventSource.removeListener(event_types.CHAT_CHANGED);
    eventSource.removeListener(event_types.MESSAGE_RECEIVED);
    eventSource.removeListener(event_types.USER_MESSAGE_RENDERED);
    eventSource.removeListener(event_types.CHARACTER_MESSAGE_RENDERED);
    eventSource.removeListener(event_types.GENERATION_AFTER_COMMANDS);

    clearInjection();
}
