import { getContext } from '../../../../extensions.js';
import { getChatStorage } from './storage.js';
import { getCompressionLevel } from './message-metadata.js';

export function cacheFriendlyMemoryInterceptor(chat, contextSize, abort, type) {
    const storage = getChatStorage();
    if (!storage) return;

    if (!storage.injection?.enabled) {
        return;
    }

    const context = getContext();
    const IGNORE_SYMBOL = context.symbols.ignore;

    console.log('[CacheFriendlyMemory] Interceptor called - type:', type);

    let start = chat.length - 1;
    if (type === 'continue') {
        start--;
    }

    for (let i = start; i >= 0; i--) {
        const message = chat[i];
        const compressionLevel = getCompressionLevel(message);

        if (compressionLevel === null) {
            continue;
        }

        chat[i] = structuredClone(chat[i]);

        chat[i].extra[IGNORE_SYMBOL] = true;

        console.log(`[CacheFriendlyMemory] Ignoring message ${i} (level ${compressionLevel})`);
    }

    console.log(`[CacheFriendlyMemory] Interceptor complete - messages filtered`);
}

globalThis.cacheFriendlyMemoryInterceptor = cacheFriendlyMemoryInterceptor;
