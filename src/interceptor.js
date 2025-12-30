import { getContext } from '../../../../extensions.js';
import { getChatStorage } from './storage.js';
import { getCompressionLevel } from './message-metadata.js';
import { injectSummaries, hasSummaries } from './injection.js';

export async function cacheFriendlyMemoryInterceptor(chat, contextSize, abort, type) {
    console.log('[CacheFriendlyMemory] Interceptor START - type:', type);
    const storage = getChatStorage();
    if (!storage) {
        console.log('[CacheFriendlyMemory] Interceptor - no storage');
        return;
    }

    if (!storage.injection?.enabled) {
        console.log('[CacheFriendlyMemory] Interceptor - injection disabled');
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

    console.log('[CacheFriendlyMemory] Interceptor - awaiting injectSummaries()');
    await injectSummaries();
    console.log('[CacheFriendlyMemory] Interceptor - injectSummaries() completed');

    const context = getContext();
    const IGNORE_SYMBOL = context.symbols.ignore;
    console.log('[CacheFriendlyMemory] Interceptor - IGNORE_SYMBOL:', IGNORE_SYMBOL);

    let start = chat.length - 1;
    if (type === 'continue') {
        start--;
    }

    console.log('[CacheFriendlyMemory] Interceptor - scanning messages from', start, 'to 0');
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
        console.log(`[CacheFriendlyMemory] Ignoring message ${i} (level ${compressionLevel})`);
    }

    console.log(`[CacheFriendlyMemory] Interceptor complete - ignored ${ignoredCount} messages`);
}

globalThis.cacheFriendlyMemoryInterceptor = cacheFriendlyMemoryInterceptor;
