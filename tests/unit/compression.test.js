import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFakeSummary } from '../../src/logic/fake-summarizer.js';
import { triggerCompaction } from '../../src/compression.js';
import { mockGetChatStorage, mockGetContext, mockGetGlobalSetting } from '../setup.js';
import * as messageMetadataModule from '../../src/message-metadata.js';

describe('createFakeSummary', () => {
    it('should return placeholder for empty message array', () => {
        const result = createFakeSummary([]);
        expect(result).toBe('[Test Summary] No messages');
    });

    it('should return placeholder for null or undefined input', () => {
        expect(createFakeSummary(null)).toBe('[Test Summary] No messages');
        expect(createFakeSummary(undefined)).toBe('[Test Summary] No messages');
    });

    it('should extract first 5 words from single message', () => {
        const messages = [{ mes: 'This is a test message' }];
        const result = createFakeSummary(messages);
        expect(result).toBe('[Test] This is a test message ... This is a test message');
    });

    it('should extract first 5 words from first message and last 5 from last', () => {
        const messages = [
            { mes: 'First message with some words here' },
            { mes: 'Second message in between' },
            { mes: 'Last message with words too' }
        ];
        const result = createFakeSummary(messages);
        expect(result).toBe('[Test] First message with some words ... Last message with words too');
    });

    it('should handle messages with fewer than 5 words', () => {
        const messages = [
            { mes: 'Hi there' },
            { mes: 'Bye now' }
        ];
        const result = createFakeSummary(messages);
        expect(result).toBe('[Test] Hi there ... Bye now');
    });

    it('should handle very short single word messages', () => {
        const messages = [
            { mes: 'Hello' },
            { mes: 'World' }
        ];
        const result = createFakeSummary(messages);
        expect(result).toBe('[Test] Hello ... World');
    });

    it('should handle missing mes field gracefully', () => {
        const messages = [
            {},
            { mes: 'Valid message' }
        ];
        const result = createFakeSummary(messages);
        expect(result).toBe('[Test]  ... Valid message');
    });

    it('should handle special characters and punctuation', () => {
        const messages = [
            { mes: 'Hello, world! How are you?' },
            { mes: 'Goodbye, see you later!' }
        ];
        const result = createFakeSummary(messages);
        expect(result).toBe('[Test] Hello, world! How are you? ... Goodbye, see you later!');
    });

    it('should handle messages with only whitespace', () => {
        const messages = [
            { mes: '   ' },
            { mes: '   ' }
        ];
        const result = createFakeSummary(messages);
        expect(result).toBe('[Test]  ... ');
    });
});

describe('triggerCompaction debug logging', () => {
    let getUnsummarizedCountSpy;

    beforeEach(() => {
        vi.clearAllMocks();
        mockGetChatStorage.mockReset();
        mockGetContext.mockReset();
        mockGetGlobalSetting.mockReset();
        getUnsummarizedCountSpy = vi.spyOn(messageMetadataModule, 'getUnsummarizedCount');
    });

    it('should log debug information when debug mode is enabled', async () => {
        mockGetChatStorage.mockReturnValue({ stats: {} });
        mockGetContext.mockReturnValue({
            chat: [],
            maxContextTokens: 4000,
            contextTokens: 2100,
            chatId: 'test-chat'
        });

        mockGetGlobalSetting.mockImplementation((key) => {
            if (key === 'debugMode') return true;
            if (key === 'compactThreshold') return 10;
            if (key === 'contextThreshold') return 2000;
            if (key === 'autoCompact') return true;
            return null;
        });

        getUnsummarizedCountSpy.mockReturnValue(15);

        await triggerCompaction();

        expect(console.log).toHaveBeenCalledWith(
            '[CacheFriendlyMemory] DEBUG - triggerCompaction() called with:',
            expect.objectContaining({
                unsummarizedCount: 15,
                contextSize: 4000,
                currentContext: 2100,
                compactThreshold: 10,
                contextThreshold: 2000,
                autoCompact: true
            })
        );
    });

    it('should not log debug information when debug mode is disabled', async () => {
        mockGetChatStorage.mockReturnValue({ stats: {} });
        mockGetContext.mockReturnValue({
            chat: [],
            maxContextTokens: 4000,
            contextTokens: 2100,
            chatId: 'test-chat'
        });

        mockGetGlobalSetting.mockImplementation((key) => {
            if (key === 'debugMode') return false;
            if (key === 'compactThreshold') return 10;
            if (key === 'contextThreshold') return 2000;
            if (key === 'autoCompact') return true;
            return null;
        });

        getUnsummarizedCountSpy.mockReturnValue(15);

        await triggerCompaction();

        const debugLogs = console.log.mock.calls.filter(call =>
            call[0] && call[0].includes('DEBUG')
        );
        expect(debugLogs.length).toBe(0);
    });

    it('should log correct return value when compaction is triggered', async () => {
        mockGetChatStorage.mockReturnValue({ stats: {} });
        mockGetContext.mockReturnValue({
            chat: [],
            maxContextTokens: 4000,
            contextTokens: 2100,
            chatId: 'test-chat'
        });

        mockGetGlobalSetting.mockImplementation((key) => {
            if (key === 'debugMode') return true;
            if (key === 'compactThreshold') return 10;
            if (key === 'contextThreshold') return 2000;
            if (key === 'autoCompact') return true;
            return null;
        });

        getUnsummarizedCountSpy.mockReturnValue(15);

        const result = await triggerCompaction();

        expect(result).toBe(true);
        expect(console.log).toHaveBeenCalledWith(
            '[CacheFriendlyMemory] DEBUG - triggerCompaction() returning:',
            true
        );
    });

    it('should log correct return value when compaction is not triggered', async () => {
        mockGetChatStorage.mockReturnValue({ stats: {} });
        mockGetContext.mockReturnValue({
            chat: [],
            maxContextTokens: 4000,
            contextTokens: 1000,
            chatId: 'test-chat'
        });

        mockGetGlobalSetting.mockImplementation((key) => {
            if (key === 'debugMode') return true;
            if (key === 'compactThreshold') return 10;
            if (key === 'contextThreshold') return 2000;
            if (key === 'autoCompact') return true;
            return null;
        });

        getUnsummarizedCountSpy.mockReturnValue(5);

        const result = await triggerCompaction();

        expect(result).toBe(false);
        expect(console.log).toHaveBeenCalledWith(
            '[CacheFriendlyMemory] DEBUG - triggerCompaction() returning:',
            false
        );
    });
});
