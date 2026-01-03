import { getContext } from '../../../../extensions.js';
import { eventSource, event_types, extension_prompts } from '../../../../../script.js';
import { getChatStorage, saveChatStorage, getInjectionSetting } from './storage.js';
import { markMessageActive } from './message-metadata.js';
import { triggerCompaction, performCompaction } from './compression.js';
import { injectSummaries, clearInjection } from './injection.js';
import { debugLog } from './utils/debug.js';

/**
 * Event Flow and Compression Triggering Strategy
 * ================================================
 *
 * The extension follows a specific event flow for compression:
 *
 * 1. USER_MESSAGE_RENDERED → Mark message as active (NO compression)
 * 2. CHARACTER_MESSAGE_RENDERED → Mark message as active + CHECK compression
 *
 * Why compression only triggers after CHARACTER_MESSAGE_RENDERED:
 * -------------------------------------------------------------
 *
 * 1. **Complete User Experience**: Users should see the full character response
 *    before any compression affects the context. Triggering compression immediately
 *    after user messages would make the AI's response feel disjointed.
 *
 * 2. **Streaming Behavior**: CHARACTER_MESSAGE_RENDERED fires AFTER streaming completes.
 *    This ensures compression doesn't run during streaming (which would be wasteful
 *    and potentially disruptive). The user sees the complete response before any
 *    background compression operations occur.
 *
 * 3. **Natural Conversation Flow**: In a typical conversation:
 *    - User sends message → AI receives → AI generates response → User reads response
 *    - Compression at this point (after character response) aligns with when the
 *      conversation naturally reaches a checkpoint
 *
 * 4. **Efficiency**: Multiple user messages can be sent in quick succession.
 *    Waiting until the character's response consolidates the conversation state
 *    before deciding on compression reduces unnecessary compression cycles.
 *
 * 5. **Context Stability**: After the character responds, the immediate context
 *    is stable. This is the optimal time to evaluate whether compression is needed
 *    based on message count, context pressure, or other triggers.
 *
 * Example Flow:
 * - User sends message 1
 * - User sends message 2
 * - User sends message 3
 * - Character responds (CHARACTER_MESSAGE_RENDERED fires)
 * - Compression check runs (may trigger if thresholds exceeded)
 * - Summaries injected if compression occurred
 */

/**
 * Marks a message as active if it exists in the chat
 * @param {number} mesId - Message ID
 */
function markMessageAsActive(mesId) {
    const context = getContext();
    const message = context.chat?.[mesId];
    if (message) {
        markMessageActive(message);
    }
}

export function registerExtensionEvents() {

    eventSource.on(event_types.CHAT_CHANGED, async () => {
        debugLog('[CacheFriendlyMemory] Chat changed event');
        getChatStorage();
        await injectSummaries();
    });

    /**
     * MESSAGE_RECEIVED handler - Defensive message tracking
     *
     * This event fires when ANY message (user or character) is received.
     * It serves as defensive programming to ensure messages are tracked
     * even if rendering events fail or don't fire.
     *
     * Note: This does NOT trigger compression. Compression only happens
     * in CHARACTER_MESSAGE_RENDERED (see rationale above).
     *
     * This handler provides redundancy - if USER_MESSAGE_RENDERED or
     * CHARACTER_MESSAGE_RENDERED fail to fire for any reason, this
     * ensures the message is still marked as active.
     */
    eventSource.on(event_types.MESSAGE_RECEIVED, async (mesId) => {
        debugLog('[CacheFriendlyMemory] Message received event:', mesId);
        const storage = getChatStorage();
        if (!storage) return;

        markMessageAsActive(mesId);
    });

    /**
     * USER_MESSAGE_RENDERED handler - No compression trigger
     *
     * User messages do NOT trigger compression.
     * See module-level documentation for rationale.
     *
     * Event sequence for user messages:
     * 1. User sends message
     * 2. USER_MESSAGE_RENDERED fires
     * 3. Mark message as active (not summarized)
     * 4. NO compression evaluation (wait for character response)
     *
     * This ensures the conversation flow is:
     * - User sends → Character responds → Compression check
     *
     * Not:
     * - User sends → Compression check → Character responds
     *
     * The latter would feel disruptive and potentially waste computation
     * on compression before the character's response is even generated.
     */
    eventSource.on(event_types.USER_MESSAGE_RENDERED, async (mesId) => {
        debugLog('[CacheFriendlyMemory] User message rendered event:', mesId);
        markMessageAsActive(mesId);
    });

    /**
     * CHARACTER_MESSAGE_RENDERED handler - Compression trigger point
     *
     * This is the only event that triggers compression evaluation.
     * See module-level documentation for rationale.
     *
     * Event sequence for character messages:
     * 1. Message generated (streaming occurs)
     * 2. CHARACTER_MESSAGE_RENDERED fires (after streaming completes)
     * 3. Mark message as active (not summarized)
     * 4. Evaluate compression triggers (message count, context pressure, etc.)
     * 5. If triggered: perform compaction, save storage, inject summaries
     *
     * Note: This ensures users see the complete response before compression
     * affects the context, providing a better user experience.
     */
    eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, async (mesId) => {
        debugLog('[CacheFriendlyMemory] Character message rendered event:', mesId);
        markMessageAsActive(mesId);

        // Compression only triggers after character messages (not user messages)
        // This allows users to see the full response before context changes
        if (await triggerCompaction()) {
            await performCompaction();
            await saveChatStorage();
            await injectSummaries();
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
