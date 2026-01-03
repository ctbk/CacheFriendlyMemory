import { getContext } from '../../../../extensions.js';
import { eventSource, event_types, extension_prompts } from '../../../../../script.js';
import { getChatStorage, saveChatStorage, getInjectionSetting } from './storage.js';
import { markMessageActive } from './message-metadata.js';
import { triggerCompaction, performCompaction } from './compression.js';
import { injectSummaries, clearInjection } from './injection.js';
import { debugLog } from './utils/debug.js';

export function registerExtensionEvents() {

    eventSource.on(event_types.CHAT_CHANGED, async () => {
        debugLog('[CacheFriendlyMemory] Chat changed event');
        getChatStorage();
        await injectSummaries();
    });

    eventSource.on(event_types.MESSAGE_RECEIVED, async (mesId) => {
        debugLog('[CacheFriendlyMemory] Message received event:', mesId);
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
        debugLog('[CacheFriendlyMemory] User message rendered event:', mesId);
        const context = getContext();
        const message = context.chat?.[mesId];
        if (message) {
            markMessageActive(message);
        }
    });

    eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, async (mesId) => {
        debugLog('[CacheFriendlyMemory] Character message rendered event:', mesId);
        const context = getContext();
        const message = context.chat?.[mesId];
        if (message) {
            markMessageActive(message);
        }
    });

    eventSource.on(event_types.GENERATION_AFTER_COMMANDS, async () => {
        debugLog('[CacheFriendlyMemory] Generation after commands event');
        if (getInjectionSetting('enabled')) {
            await injectSummaries();
        }
    });

    // Debug: Check if our prompt is present when context is being combined
    eventSource.on(event_types.GENERATE_BEFORE_COMBINE_PROMPTS, async (data) => {
        const ourPrompt = extension_prompts['cacheFriendlyMemory'];
        debugLog('[CacheFriendlyMemory] GENERATE_BEFORE_COMBINE_PROMPTS - checking our prompt:');
        debugLog('[CacheFriendlyMemory] - All extension_prompts keys:', Object.keys(extension_prompts));
        if (ourPrompt) {
            debugLog('[CacheFriendlyMemory] - Our prompt IS present:', {
                valueLength: ourPrompt.value?.length,
                position: ourPrompt.position,
                depth: ourPrompt.depth,
                role: ourPrompt.role,
                preview: ourPrompt.value?.substring(0, 100)
            });
        } else {
            console.warn('[CacheFriendlyMemory] - Our prompt is NOT in extension_prompts at context combine time!');
        }

        // Also check if extensionPrompts in data contains ours
        if (data?.extensionPrompts) {
            const inData = data.extensionPrompts['cacheFriendlyMemory'];
            debugLog('[CacheFriendlyMemory] - In data.extensionPrompts:', !!inData);
        }
    });
}

export function unregisterExtensionEvents() {
    eventSource.removeListener(event_types.CHAT_CHANGED);
    eventSource.removeListener(event_types.MESSAGE_RECEIVED);
    eventSource.removeListener(event_types.USER_MESSAGE_RENDERED);
    eventSource.removeListener(event_types.CHARACTER_MESSAGE_RENDERED);
    eventSource.removeListener(event_types.GENERATION_AFTER_COMMANDS);
    eventSource.removeListener(event_types.GENERATE_BEFORE_COMBINE_PROMPTS);

    clearInjection();
}
