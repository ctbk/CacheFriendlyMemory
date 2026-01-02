import { getChatStorage, saveChatStorage, getGlobalSetting } from './storage.js';
import { getContext } from '../../../../extensions.js';
import { generateQuietPrompt, saveChatDebounced } from '../../../../../script.js';
import { estimateTokenCount } from './logic/token-estimation.js';
import { shouldTriggerCompaction } from './logic/compaction-triggers.js';
import { createFakeSummary } from './logic/fake-summarizer.js';
import { getUnsummarizedCount, markMessageSummarized, getCompressionLevel } from './message-metadata.js';
import { injectSummaries } from './injection.js';

const MODULE_NAME = 'CacheFriendlyMemory';
const USE_FAKE_SUMMARIZER = true;

export async function triggerCompaction() {
    const storage = getChatStorage();
    if (!storage) {
        console.warn(`[${MODULE_NAME}] No storage available for compaction`);
        return false;
    }

    const context = getContext();
    const chat = context.chat || [];

    const unsummarizedCount = getUnsummarizedCount(chat);

    const compactThreshold = getGlobalSetting('compactThreshold');
    const contextThreshold = getGlobalSetting('contextThreshold');
    const autoCompact = getGlobalSetting('autoCompact');

    const contextSize = context.maxContextTokens || 0;
    const currentContext = context.contextTokens || 0;

    return shouldTriggerCompaction(
        unsummarizedCount,
        contextSize,
        currentContext,
        compactThreshold,
        contextThreshold,
        autoCompact
    );
}

export async function performCompaction() {
    const storage = getChatStorage();
    if (!storage) {
        console.warn(`[${MODULE_NAME}] No storage available for compaction`);
        return;
    }

    console.log(`[${MODULE_NAME}] Starting compaction`);

    const context = getContext();
    const chat = context.chat;

    const unsummarizedMessages = chat.filter((m, _idx) =>
        !m.is_system && getCompressionLevel(m) === null
    );

    console.log(`[${MODULE_NAME}] Total messages in chat:`, chat.length);
    console.log(`[${MODULE_NAME}] Unsummarized messages:`, unsummarizedMessages.length);
    console.log(`[${MODULE_NAME}] Storage stats - totalMessages:`, storage.stats?.totalMessages, 'summarizedMessages:', storage.stats?.summarizedMessages);

    if (unsummarizedMessages.length === 0) {
        console.log(`[${MODULE_NAME}] No messages to compact`);
        return;
    }

    const level1ChunkSize = getGlobalSetting('level1ChunkSize');
    const targetCompression = getGlobalSetting('targetCompression');

    let totalMessagesCompacted = 0;
    const targetMessages = Math.floor(unsummarizedMessages.length * (targetCompression / 100));

    console.log(`[${MODULE_NAME}] Target messages to compact:`, targetMessages, 'out of', unsummarizedMessages.length);

    let summaryIndex = storage.level1.summaries.length;

    while (totalMessagesCompacted < targetMessages && totalMessagesCompacted < unsummarizedMessages.length) {
        let chunkSize = level1ChunkSize;
        const remaining = unsummarizedMessages.length - totalMessagesCompacted;

        if (remaining < chunkSize && totalMessagesCompacted > 0) {
            chunkSize = remaining;
        } else if (remaining < chunkSize * 0.5) {
            break;
        }

        const chunk = unsummarizedMessages.slice(totalMessagesCompacted, totalMessagesCompacted + chunkSize);
        console.log(`[${MODULE_NAME}] Compressing chunk:`, chunk.length, 'messages');

        const summary = await compressChunk(chunk);

        if (summary) {
            const summaryId = `l1_${Date.now()}_${summaryIndex}`;
            storage.level1.summaries.push({
                id: summaryId,
                startMessageIndex: chat.indexOf(chunk[0]),
                endMessageIndex: chat.indexOf(chunk[chunk.length - 1]),
                text: summary,
                timestamp: Date.now(),
                tokenCount: estimateTokenCount(summary),
            });

            console.log(`[${MODULE_NAME}] Marking`, chunk.length, 'messages as summarized with level 1');
            for (const message of chunk) {
                markMessageSummarized(message, 1, summaryId);
                console.log(`[${MODULE_NAME}] Marked message with id:`, message.mes_id, 'extra keys:', Object.keys(message.extra || {}));
            }

            totalMessagesCompacted += chunk.length;
            summaryIndex++;
            console.log(`[${MODULE_NAME}] Created summary:`, summary.substring(0, 50) + '...', 'Total summaries:', storage.level1.summaries.length);
        } else {
            console.warn(`[${MODULE_NAME}] Failed to compress chunk`);
            break;
        }
    }

    storage.stats.lastCompactTime = Date.now();

    const totalSummaryTokens = storage.level1.summaries.reduce((sum, s) => sum + s.tokenCount, 0);
    const rawMessagesTokens = totalMessagesCompacted * 100;
    storage.stats.currentCompressionRatio = totalSummaryTokens / rawMessagesTokens;

    console.log(`[${MODULE_NAME}] Final stats - summarizedMessages:`, storage.stats.summarizedMessages);
    console.log(`[${MODULE_NAME}] Total summaries:`, storage.level1.summaries.length);
    console.log(`[${MODULE_NAME}] Compression ratio:`, storage.stats.currentCompressionRatio.toFixed(2));

    await saveChatStorage();
    console.log(`[${MODULE_NAME}] Compacted ${totalMessagesCompacted} messages - Storage saved`);
    saveChatDebounced();
    console.log(`[${MODULE_NAME}] Chat save triggered to persist message markings`);
    await injectSummaries();
}

export async function applyProfileSwitch(profileId) {
    const { extensionSettings, executeSlashCommandsWithOptions } = getContext();

    if (!extensionSettings.connectionManager?.profiles) {
        console.warn(`[${MODULE_NAME}] Connection Manager profiles not available`);
        return false;
    }

    const profile = extensionSettings.connectionManager.profiles.find(p => p.id === profileId);

    if (!profile) {
        console.warn(`[${MODULE_NAME}] Profile not found: ${profileId}`);
        return false;
    }

    try {
        console.log(`[${MODULE_NAME}] Switching to profile: ${profile.name}`);
        await executeSlashCommandsWithOptions(`/profile "${profile.name}"`, {
            handleParserErrors: true,
            handleExecutionErrors: false,
        });
        return true;
    } catch (error) {
        console.error(`[${MODULE_NAME}] Failed to switch to profile ${profile.name}:`, error);
        return false;
    }
}

export async function compressChunk(messages) {
    const { extensionSettings } = getContext();
    const compressionProfileId = getGlobalSetting('compressionProfileId');
    const currentProfileId = extensionSettings.connectionManager?.selectedProfile;
    let profileSwitched = false;

    if (compressionProfileId && compressionProfileId !== currentProfileId) {
        profileSwitched = await applyProfileSwitch(compressionProfileId);
    }

    try {
        if (USE_FAKE_SUMMARIZER) {
            console.log(`[${MODULE_NAME}] Using fake summarizer (test mode)`);
            return createFakeSummary(messages);
        }

        const chapterNumber = getChapterNumber();
        const prompt = buildCompressionPrompt(messages, chapterNumber);

        try {
            const result = await generateQuietPrompt({
                quietPrompt: prompt,
            });

            return result;
        } catch (error) {
            console.error(`[${MODULE_NAME}] Compression failed:`, error);
            return null;
        }
    } finally {
        if (profileSwitched && currentProfileId) {
            const { extensionSettings } = getContext();
            const originalProfile = extensionSettings.connectionManager?.profiles.find(p => p.id === currentProfileId);

            if (originalProfile) {
                console.log(`[${MODULE_NAME}] Restoring original profile: ${originalProfile.name}`);
                const { executeSlashCommandsWithOptions } = getContext();
                try {
                    await executeSlashCommandsWithOptions(`/profile "${originalProfile.name}"`, {
                        handleParserErrors: true,
                        handleExecutionErrors: false,
                    });
                } catch (error) {
                    console.error(`[${MODULE_NAME}] Failed to restore profile ${originalProfile.name}:`, error);
                }
            }
        }
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
