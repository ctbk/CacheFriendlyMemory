import { getContext } from '../../../../extensions.js';
import { getChatStorage, getInjectionSetting } from './storage.js';
import { getCompressionLevel } from './message-metadata.js';
import { injectSummaries, hasSummaries } from './injection.js';
import { debugLog } from './utils/debug.js';

export async function cacheFriendlyMemoryInterceptor(chat, contextSize, abort, type) {
    debugLog('[CacheFriendlyMemory] Interceptor START - type:', type);
    const storage = getChatStorage();
    if (!storage) {
        debugLog('[CacheFriendlyMemory] Interceptor - no storage');
        return;
    }

    if (!getInjectionSetting('enabled')) {
        debugLog('[CacheFriendlyMemory] Interceptor - injection disabled');
        return;
    }

    if (!hasSummaries(storage)) {
        console.warn('[CacheFriendlyMemory] Interceptor: No summaries in storage - will not filter messages');
        return;
    }

    const summarizedMessagesExist = chat.some(m => getCompressionLevel(m) !== null);
    const summariesExist = hasSummaries(storage);

    if (summarizedMessagesExist && !summariesExist) {
        console.error('[CacheFriendlyMemory] CRITICAL: Messages marked as summarized but no summaries in storage!');
        console.error('[CacheFriendlyMemory] This is a sync issue - not filtering to prevent data loss');
        return;
    }

    debugLog('[CacheFriendlyMemory] Interceptor - awaiting injectSummaries()');
    await injectSummaries();
    debugLog('[CacheFriendlyMemory] Interceptor - injectSummaries() completed');

    const context = getContext();
    const IGNORE_SYMBOL = context.symbols.ignore;
    debugLog('[CacheFriendlyMemory] Interceptor - IGNORE_SYMBOL:', IGNORE_SYMBOL);

    let start = chat.length - 1;
    if (type === 'continue') {
        start--;
    }

    debugLog('[CacheFriendlyMemory] Interceptor - scanning messages from', start, 'to 0');
    let ignoredCount = 0;

    for (let i = start; i >= 0; i--) {
        const message = chat[i];
        const compressionLevel = getCompressionLevel(message);

        if (compressionLevel === null) {
            continue;
        }

        chat[i] = structuredClone(chat[i]);
        chat[i].extra[IGNORE_SYMBOL] = true;

        ignoredCount++;
        debugLog(`[CacheFriendlyMemory] Ignoring message ${i} (level ${compressionLevel})`);
    }

    debugLog(`[CacheFriendlyMemory] Interceptor complete - ignored ${ignoredCount} messages`);
}

globalThis.cacheFriendlyMemoryInterceptor = cacheFriendlyMemoryInterceptor;
