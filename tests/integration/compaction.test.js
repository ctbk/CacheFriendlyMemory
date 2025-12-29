import { describe, it, expect, vi, beforeEach } from 'vitest';
import { performCompaction } from '../../src/compression.js';
import { getChatStorage, saveChatStorage } from '../../src/storage.js';

vi.mock('../../src/storage.js', () => ({
    getChatStorage: vi.fn(),
    saveChatStorage: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('../../../../extensions.js', () => ({
    getContext: vi.fn()
}));

vi.mock('../../../../script.js', () => ({
    generateQuietPrompt: vi.fn()
}));

describe('Compaction Integration', () => {
    let mockStorage;
    let mockChat;

    beforeEach(() => {
        mockChat = [];
        for (let i = 0; i < 120; i++) {
            mockChat.push({
                is_system: false,
                extra: {},
                mes: `Message ${i}`,
                name: 'User'
            });
        }

        mockStorage = {
            level1: { summaries: [] },
            stats: { lastCompactTime: null }
        };

        vi.mocked(getChatStorage).mockReturnValue(mockStorage);
    });

    it('should compact messages and mark them as summarized', async () => {
        vi.mocked(getContext).mockReturnValue({
            chat: mockChat,
            maxContextTokens: 2048,
            contextTokens: 512
        });

        await performCompaction();

        expect(mockStorage.level1.summaries.length).toBeGreaterThan(0);
        expect(mockStorage.stats.lastCompactTime).toBeGreaterThan(0);

        let summarizedCount = 0;
        for (const message of mockChat) {
            if (message.extra?.cacheFriendlyMemory?.compressionLevel === 1) {
                summarizedCount++;
            }
        }
        expect(summarizedCount).toBeGreaterThan(0);
    });

    it('should handle empty chat gracefully', async () => {
        vi.mocked(getContext).mockReturnValue({
            chat: [],
            maxContextTokens: 2048,
            contextTokens: 0
        });

        await performCompaction();

        expect(mockStorage.level1.summaries.length).toBe(0);
    });

    it('should handle no unsummarized messages', async () => {
        const allSummarizedChat = mockChat.map(msg => ({
            ...msg,
            extra: { cacheFriendlyMemory: { compressionLevel: 1 } }
        }));

        vi.mocked(getContext).mockReturnValue({
            chat: allSummarizedChat,
            maxContextTokens: 2048,
            contextTokens: 512
        });

        await performCompaction();

        expect(mockStorage.level1.summaries.length).toBe(0);
    });
});
