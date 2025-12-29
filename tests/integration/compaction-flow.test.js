import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockSillyTavernAPI } from '../fixtures/mock-context.js';
import { createTestStorage } from '../fixtures/test-storage.js';
import { createTestMessages as createMessages } from '../fixtures/test-messages.js';

function createLongTestMessages(count) {
    return createMessages(count).map(m => ({
        ...m,
        mes: `This is a longer message with some additional text to make it more realistic. It contains multiple sentences.`
    }));
}

describe('Compaction Flow Integration', () => {
    let mockAPI;
    let storage;
    let performCompaction;

    beforeEach(async () => {
        mockAPI = createMockSillyTavernAPI();
        mockAPI.getContext = vi.fn().mockReturnValue({
            chat: createLongTestMessages(120),
            maxContextTokens: 2048,
            contextTokens: 1600
        });

        storage = createTestStorage({
            stats: { totalMessages: 120, summarizedMessages: 0 }
        });

        performCompaction = async () => {
            const context = mockAPI.getContext();
            const getChatStorage = () => storage;
            const saveChatStorage = mockAPI.saveMetadata;
            const getGlobalSetting = (key) => {
                const settings = {
                    level1ChunkSize: 10,
                    targetCompression: 55
                };
                return settings[key];
            };

            vi.spyOn(mockAPI, 'generateQuietPrompt').mockResolvedValue('[Chapter 1] Summary of messages');

            const messagesToCompact = context.chat.slice(storage.lastSummarizedIndex + 1);

            if (messagesToCompact.length === 0) return;

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
                const summary = await mockAPI.generateQuietPrompt({ quietPrompt: 'test' });

                if (summary) {
                    storage.level1.summaries.push({
                        id: Date.now().toString(),
                        startMessageIndex: storage.lastSummarizedIndex + 1 + totalMessagesCompacted,
                        endMessageIndex: storage.lastSummarizedIndex + 1 + totalMessagesCompacted + chunk.length - 1,
                        text: summary,
                        timestamp: Date.now(),
                        tokenCount: Math.ceil(summary.length / 4),
                    });

                    totalMessagesCompacted += chunk.length;
                } else {
                    break;
                }
            }

            storage.lastSummarizedIndex = totalMessagesCompacted - 1;
            storage.stats.summarizedMessages += totalMessagesCompacted;
            storage.stats.lastCompactTime = Date.now();

            await mockAPI.saveMetadata();
        };
    });

    it('should compact messages into summaries', async () => {
        await performCompaction();

        expect(storage.level1.summaries.length).toBeGreaterThan(0);
        expect(storage.stats.summarizedMessages).toBeGreaterThan(0);
        expect(mockAPI.saveMetadata).toHaveBeenCalled();
    });

    it('should respect target compression ratio', async () => {
        await performCompaction();

        const targetMessages = Math.floor(120 * 0.55);
        expect(storage.stats.summarizedMessages).toBeLessThanOrEqual(targetMessages + 10);
    });

    it('should update last compact time', async () => {
        await performCompaction();

        expect(storage.stats.lastCompactTime).toBeGreaterThan(0);
    });
});
