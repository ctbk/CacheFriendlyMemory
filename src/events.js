import { eventSource, event_types } from '../../../../../script.js';

export function registerExtensionEvents() {

    eventSource.on(event_types.CHAT_CHANGED, async () => {
        console.log('[CacheFriendlyMemory] Chat changed event');
        const { getChatStorage } = await import('./storage.js');
        getChatStorage();
    });

    eventSource.on(event_types.MESSAGE_RECEIVED, async () => {
        console.log('[CacheFriendlyMemory] Message received event');
        const { getChatStorage } = await import('./storage.js');
        const storage = getChatStorage();

        if (storage) {
            storage.stats.totalMessages++;
        }
    });

    eventSource.on(event_types.USER_MESSAGE_RENDERED, async () => {
        console.log('[CacheFriendlyMemory] User message rendered event');
        const { getChatStorage } = await import('./storage.js');
        const storage = getChatStorage();

        if (storage) {
            storage.stats.totalMessages++;
        }
    });

    eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, async () => {
        console.log('[CacheFriendlyMemory] Character message rendered event');
        const { getChatStorage } = await import('./storage.js');
        const storage = getChatStorage();

        if (storage) {
            storage.stats.totalMessages++;
        }
    });
}

export function unregisterExtensionEvents() {

    eventSource.removeListener(event_types.CHAT_CHANGED);
    eventSource.removeListener(event_types.MESSAGE_RECEIVED);
    eventSource.removeListener(event_types.USER_MESSAGE_RENDERED);
    eventSource.removeListener(event_types.CHARACTER_MESSAGE_RENDERED);
}
