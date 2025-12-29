import { getChatStorage, saveChatStorage, getGlobalSetting } from './storage.js';
import { getContext } from '../../../../extensions.js';
import { generateQuietPrompt } from '../../../../../script.js';
import { estimateTokenCount } from './logic/token-estimation.js';
import { shouldTriggerCompaction } from './logic/compaction-triggers.js';

export async function triggerCompaction() {
    const storage = getChatStorage();
    if (!storage) {
        console.warn('[CacheFriendlyMemory] No storage available for compaction');
        return false;
    }

    const context = getContext();

    const compactThreshold = getGlobalSetting('compactThreshold');
    const contextThreshold = getGlobalSetting('contextThreshold');
    const autoCompact = getGlobalSetting('autoCompact');

    const unsummarizedCount = storage.stats.totalMessages - storage.stats.summarizedMessages;
    const contextSize = context.maxContextTokens || 0;
    const currentContext = context.contextTokens || 0;

    return shouldTriggerCompaction(unsummarizedCount, contextSize,
                                     currentContext, compactThreshold,
                                     contextThreshold, autoCompact);
}

export async function performCompaction() {
    const storage = getChatStorage();
    if (!storage) {
        console.warn('[CacheFriendlyMemory] No storage available for compaction');
        return;
    }

    const context = getContext();
    const chat = context.chat;

    const startIndex = storage.lastSummarizedIndex + 1;
    const messagesToCompact = chat.slice(startIndex);

    if (messagesToCompact.length === 0) {
        console.log('[CacheFriendlyMemory] No messages to compact');
        return;
    }

    const level1ChunkSize = getGlobalSetting('level1ChunkSize');
    const targetCompression = getGlobalSetting('targetCompression');

    let totalMessagesCompacted = 0;
    const targetMessages = Math.floor(messagesToCompact.length * (targetCompression / 100));

    while (totalMessagesCompacted < targetMessages && totalMessagesCompacted < messagesToCompact.length) {
        const remainingMessages = messagesToCompact.slice(totalMessagesCompacted);

        let chunkSize = level1ChunkSize;

        if (remainingMessages.length < chunkSize && totalMessagesCompacted > 0) {
            chunkSize = remainingMessages.length;
        } else if (remainingMessages.length < chunkSize * 0.5) {
            break;
        }

        const chunk = remainingMessages.slice(0, chunkSize);
        const summary = await compressChunk(chunk);

        if (summary) {
            storage.level1.summaries.push({
                id: Date.now().toString(),
                startMessageIndex: startIndex + totalMessagesCompacted,
                endMessageIndex: startIndex + totalMessagesCompacted + chunk.length - 1,
                text: summary,
                timestamp: Date.now(),
                tokenCount: estimateTokenCount(summary),
            });

            totalMessagesCompacted += chunk.length;
        } else {
            console.warn('[CacheFriendlyMemory] Failed to compress chunk');
            break;
        }
    }

    storage.lastSummarizedIndex = startIndex + totalMessagesCompacted - 1;
    storage.stats.summarizedMessages += totalMessagesCompacted;
    storage.stats.lastCompactTime = Date.now();

    const totalSummaryTokens = storage.level1.summaries.reduce((sum, s) => sum + s.tokenCount, 0);
    const rawMessagesTokens = totalMessagesCompacted * 100;
    storage.stats.currentCompressionRatio = totalSummaryTokens / rawMessagesTokens;

    await saveChatStorage();
    console.log(`[CacheFriendlyMemory] Compacted ${totalMessagesCompacted} messages`);
}

async function compressChunk(messages) {

    const chapterNumber = getChapterNumber();
    const prompt = buildCompressionPrompt(messages, chapterNumber);

    try {
        const result = await generateQuietPrompt({
            quietPrompt: prompt,
        });

        return result;
    } catch (error) {
        console.error('[CacheFriendlyMemory] Compression failed:', error);
        return null;
    }
}

function buildCompressionPrompt(messages, chapterNumber) {
    const { loadCompressionPrompt } = import('./prompts.js');
    const compressionPrompt = loadCompressionPrompt();

    const messageText = messages.map(m => `${m.name}: ${m.mes}`).join('\n\n');

    return `${compressionPrompt}\n\nChapter Number: ${chapterNumber}\n\nConversation:\n${messageText}`;
}

function getChapterNumber() {
    const storage = getChatStorage();
    return storage.level1.summaries.length + 1;
}

// Removed duplicate estimateTokenCount - now imported from logic/token-estimation.js
