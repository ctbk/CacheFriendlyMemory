import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFakeSummary } from '../../src/logic/fake-summarizer.js';
import { triggerCompaction, buildCompressionPrompt, compressChunk } from '../../src/compression.js';
import { mockGetChatStorage, mockGetContext, mockGetGlobalSetting, mockExtensionSettings, mockGenerateQuietPrompt } from '../setup.js';
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

    it('should extract first 25 words from single message', () => {
        const messages = [{ mes: 'This is a test message' }];
        const result = createFakeSummary(messages);
        expect(result).toContain('[Test Compressed Chunk]');
        expect(result).toContain('[0] This is a test message');
    });

    it('should include each message on separate line with index', () => {
        const messages = [
            { mes: 'First message with some words here' },
            { mes: 'Second message in between' },
            { mes: 'Last message with words too' }
        ];
        const result = createFakeSummary(messages);
        expect(result).toContain('[Test Compressed Chunk]');
        expect(result).toContain('[0] First message with some words here');
        expect(result).toContain('[1] Second message in between');
        expect(result).toContain('[2] Last message with words too');
    });

    it('should handle messages with fewer than 25 words', () => {
        const messages = [
            { mes: 'Hi there' },
            { mes: 'Bye now' }
        ];
        const result = createFakeSummary(messages);
        expect(result).toContain('[Test Compressed Chunk]');
        expect(result).toContain('[0] Hi there');
        expect(result).toContain('[1] Bye now');
    });

    it('should handle very short single word messages', () => {
        const messages = [
            { mes: 'Hello' },
            { mes: 'World' }
        ];
        const result = createFakeSummary(messages);
        expect(result).toContain('[Test Compressed Chunk]');
        expect(result).toContain('[0] Hello');
        expect(result).toContain('[1] World');
    });

    it('should handle missing mes field gracefully', () => {
        const messages = [
            {},
            { mes: 'Valid message' }
        ];
        const result = createFakeSummary(messages);
        const lines = result.split('\n');
        expect(result).toContain('[Test Compressed Chunk]');
        expect(lines[1]).toBe('[0]');
        expect(lines[2]).toContain('[1] Valid message');
    });

    it('should handle special characters and punctuation', () => {
        const messages = [
            { mes: 'Hello, world! How are you?' },
            { mes: 'Goodbye, see you later!' }
        ];
        const result = createFakeSummary(messages);
        expect(result).toContain('[Test Compressed Chunk]');
        expect(result).toContain('[0] Hello, world! How are you?');
        expect(result).toContain('[1] Goodbye, see you later!');
    });

    it('should handle messages with only whitespace', () => {
        const messages = [
            { mes: '   ' },
            { mes: '   ' }
        ];
        const result = createFakeSummary(messages);
        const lines = result.split('\n');
        expect(result).toContain('[Test Compressed Chunk]');
        expect(lines[1]).toBe('[0]');
        expect(lines[2]).toBe('[1]');
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

describe('buildCompressionPrompt', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetContext.mockReturnValue({
            chat: [],
            chatId: 'test-chat',
            extensionSettings: mockExtensionSettings
        });
    });

    it('should load compression prompt and format messages correctly', () => {
        const messages = [
            { name: 'User', mes: 'Hello world' },
            { name: 'Bot', mes: 'Hi there' }
        ];

        const prompt = buildCompressionPrompt(messages, 1);

        expect(prompt).toContain('User: Hello world');
        expect(prompt).toContain('Bot: Hi there');
        expect(prompt).toContain('Chapter Number: 1');
    });

    it('should handle single message', () => {
        const messages = [
            { name: 'User', mes: 'Test message' }
        ];

        const prompt = buildCompressionPrompt(messages, 5);

        expect(prompt).toContain('User: Test message');
        expect(prompt).toContain('Chapter Number: 5');
    });

    it('should handle empty message array', () => {
        const messages = [];

        const prompt = buildCompressionPrompt(messages, 1);

        expect(prompt).toContain('Chapter Number: 1');
    });

    it('should handle messages with special characters', () => {
        const messages = [
            { name: 'User', mes: 'Hello! How are you?' },
            { name: 'Bot', mes: 'I\'m great, thanks!' }
        ];

        const prompt = buildCompressionPrompt(messages, 1);

        expect(prompt).toContain('User: Hello! How are you?');
        expect(prompt).toContain('Bot: I\'m great, thanks!');
    });

    it('should use custom prompt from settings if available', () => {
        mockExtensionSettings.cacheFriendlyMemory = {
            level1Prompt: 'Custom summary instructions'
        };

        const messages = [
            { name: 'User', mes: 'Test' }
        ];

        const prompt = buildCompressionPrompt(messages, 1);

        expect(prompt).toContain('Custom summary instructions');
        expect(prompt).toContain('User: Test');

        mockExtensionSettings.cacheFriendlyMemory = undefined;
    });
});

describe('compressChunk', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGenerateQuietPrompt.mockResolvedValue('[Test] Summary of messages');

        mockGetChatStorage.mockReturnValue({
            level1: { summaries: [] }
        });

        mockGetContext.mockReturnValue({
            chat: [],
            chatId: 'test-chat',
            extensionSettings: mockExtensionSettings
        });

        mockGetGlobalSetting.mockImplementation((key) => {
            if (key === 'compressionProfileId') return null;
            return null;
        });
    });

    it('should compress messages and return summary', async () => {
        const messages = [
            { name: 'User', mes: 'First message' },
            { name: 'Bot', mes: 'Second message' }
        ];

        mockGenerateQuietPrompt.mockResolvedValue('[Test] Summary result');

        const result = await compressChunk(messages);

        expect(result).toBe('[Test] Summary result');
        expect(mockGenerateQuietPrompt).toHaveBeenCalled();
    });

    it('should return null on error', async () => {
        mockGenerateQuietPrompt.mockRejectedValue(new Error('API failed'));

        const messages = [{ name: 'User', mes: 'Test' }];

        const result = await compressChunk(messages);

        expect(result).toBeNull();
    });

    it('should handle profile switching when compression profile is different', async () => {
        mockExtensionSettings.connectionManager = {
            selectedProfile: 'profile1',
            profiles: [
                { id: 'profile1', name: 'Profile 1' },
                { id: 'profile2', name: 'Profile 2' }
            ]
        };

        mockGetGlobalSetting.mockImplementation((key) => {
            if (key === 'compressionProfileId') return 'profile2';
            return null;
        });

        const messages = [{ name: 'User', mes: 'Test' }];
        mockGenerateQuietPrompt.mockResolvedValue('[Test] Summary');

        const result = await compressChunk(messages);

        expect(result).toBe('[Test] Summary');
    });

    it('should handle empty message array', async () => {
        const messages = [];

        const result = await compressChunk(messages);

        expect(result).toBeTruthy();
    });
});
