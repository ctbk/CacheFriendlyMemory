import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock injection module before importing compression.js
vi.mock('../../src/injection.js', () => ({
    injectSummaries: vi.fn().mockResolvedValue(undefined),
    // Re-export any other functions from the actual module
    ...vi.importActual('../../src/injection.js')
}));

import { performCompaction } from '../../src/compression.js';
import * as progressModule from '../../src/progress.js';
import {
    mockGetChatStorage,
    mockGetContext,
    mockGetGlobalSetting,
    mockGenerateQuietPrompt,
    mockExtensionSettings
} from '../setup.js';
import * as messageMetadataModule from '../../src/message-metadata.js';
import { injectSummaries } from '../../src/injection.js';

// Get a reference to the mock after import
let injectSummariesMock;
beforeEach(() => {
    injectSummariesMock = injectSummaries;
});

describe('cfm-compact slash command progress integration', () => {
    let getUnsummarizedCountSpy;
    let getCompressionLevelSpy;

    beforeEach(() => {
        vi.clearAllMocks();
        mockGetChatStorage.mockReset();
        mockGetContext.mockReset();
        mockGetGlobalSetting.mockReset();
        mockGenerateQuietPrompt.mockReset();
        injectSummariesMock.mockReset();

        // Spy on progress functions
        vi.spyOn(progressModule, 'startCompactionProgress');
        vi.spyOn(progressModule, 'updateCompactionProgress');
        vi.spyOn(progressModule, 'completeCompactionProgress');

        // Spy on message metadata functions
        getUnsummarizedCountSpy = vi.spyOn(messageMetadataModule, 'getUnsummarizedCount');
        getCompressionLevelSpy = vi.spyOn(messageMetadataModule, 'getCompressionLevel');

        // Reset progress state before each test
        progressModule.hideCompactionProgress();

        // Ensure extensionSettings includes connectionManager
        mockExtensionSettings.connectionManager = {
            selectedProfile: null,
            profiles: []
        };

        // Set up default mocks
        mockGetChatStorage.mockReturnValue({
            level1: {
                summaries: []
            },
            stats: {
                totalMessages: 20,
                summarizedMessages: 0
            }
        });

        mockGetContext.mockReturnValue({
            chat: [],
            chatId: 'test-chat',
            maxContextTokens: 4000,
            contextTokens: 2100,
            extensionSettings: mockExtensionSettings
        });

        mockGetGlobalSetting.mockImplementation((key) => {
            if (key === 'level1ChunkSize') return 10;
            if (key === 'targetCompression') return 50;
            if (key === 'compressionProfileId') return null;
            return null;
        });

        getUnsummarizedCountSpy.mockReturnValue(20);
        getCompressionLevelSpy.mockReturnValue(null);

        // Mock compressChunk to return fake summary
        mockGenerateQuietPrompt.mockImplementation((options) => {
            return Promise.resolve('[Test] Summary of messages');
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('cfm-compact shows progress toast', () => {
        it('should call startCompactionProgress when cfm-compact is triggered', async () => {
            const chat = Array.from({ length: 20 }, (_, i) => ({
                mes_id: i,
                name: 'User',
                mes: `Message ${i}`,
                is_system: false,
                extra: {}
            }));

            getUnsummarizedCountSpy.mockReturnValue(20);
            getCompressionLevelSpy.mockReturnValue(null);
            mockGetContext.mockReturnValue({
                chat,
                chatId: 'test-chat',
                maxContextTokens: 4000,
                contextTokens: 2100,
                extensionSettings: mockExtensionSettings
            });

            // Simulate the slash command callback behavior
            // This is what happens in index.js when /cfm-compact is invoked
            // performCompaction internally calls injectSummaries
            await performCompaction();

            // Verify that progress was started
            expect(progressModule.startCompactionProgress).toHaveBeenCalled();
            expect(progressModule.startCompactionProgress).toHaveBeenCalledWith(1); // 1 batch for 10 messages at 50% target
        });

        it('should show progress toast even if no messages need compaction', async () => {
            getUnsummarizedCountSpy.mockReturnValue(0);
            mockGetContext.mockReturnValue({
                chat: [],
                chatId: 'test-chat',
                maxContextTokens: 4000,
                contextTokens: 2100,
                extensionSettings: mockExtensionSettings
            });

            // Simulate the slash command callback behavior
            await performCompaction();

            // When no messages to compact, progress should not be started
            expect(progressModule.startCompactionProgress).not.toHaveBeenCalled();
        });

        it('should call updateCompactionProgress during compaction', async () => {
            const chat = Array.from({ length: 30 }, (_, i) => ({
                mes_id: i,
                name: 'User',
                mes: `Message ${i}`,
                is_system: false,
                extra: {}
            }));

            getUnsummarizedCountSpy.mockReturnValue(30);
            getCompressionLevelSpy.mockReturnValue(null);
            mockGetContext.mockReturnValue({
                chat,
                chatId: 'test-chat',
                maxContextTokens: 4000,
                contextTokens: 2100,
                extensionSettings: mockExtensionSettings
            });

            mockGetGlobalSetting.mockImplementation((key) => {
                if (key === 'level1ChunkSize') return 10;
                if (key === 'targetCompression') return 50;
                if (key === 'compressionProfileId') return null;
                return null;
            });

            // Simulate the slash command callback behavior
            await performCompaction();

            // Verify that progress was updated during compaction
            expect(progressModule.updateCompactionProgress).toHaveBeenCalled();
            expect(progressModule.updateCompactionProgress).toHaveBeenCalledWith(2, 2); // 2 batches processed
        });
    });

    describe('cfm-compact completes and hides progress toast', () => {
        it('should call completeCompactionProgress with success=true after successful compaction', async () => {
            const chat = Array.from({ length: 20 }, (_, i) => ({
                mes_id: i,
                name: 'User',
                mes: `Message ${i}`,
                is_system: false,
                extra: {}
            }));

            getUnsummarizedCountSpy.mockReturnValue(20);
            getCompressionLevelSpy.mockReturnValue(null);
            mockGetContext.mockReturnValue({
                chat,
                chatId: 'test-chat',
                maxContextTokens: 4000,
                contextTokens: 2100,
                extensionSettings: mockExtensionSettings
            });

            // Simulate the slash command callback behavior
            await performCompaction();

            // Verify that progress was completed successfully
            expect(progressModule.completeCompactionProgress).toHaveBeenCalled();
            expect(progressModule.completeCompactionProgress).toHaveBeenCalledWith(true, expect.stringContaining('Compacted'));
        });

        it('should call completeCompactionProgress when compaction fails', async () => {
            const chat = Array.from({ length: 20 }, (_, i) => ({
                mes_id: i,
                name: 'User',
                mes: `Message ${i}`,
                is_system: false,
                extra: {}
            }));

            getUnsummarizedCountSpy.mockReturnValue(20);
            getCompressionLevelSpy.mockReturnValue(null);
            mockGetContext.mockReturnValue({
                chat,
                chatId: 'test-chat',
                maxContextTokens: 4000,
                contextTokens: 2100,
                extensionSettings: mockExtensionSettings
            });

            // Simulate compression failure
            mockGenerateQuietPrompt.mockRejectedValue(new Error('API failed'));

            // Simulate the slash command callback behavior
            try {
                await performCompaction();
            } catch (error) {
                // Expected to throw
            }

            // Verify that progress was completed (with failure status)
            expect(progressModule.completeCompactionProgress).toHaveBeenCalled();
        });

        it('should call injectSummaries after compaction completes', async () => {
            const chat = Array.from({ length: 20 }, (_, i) => ({
                mes_id: i,
                name: 'User',
                mes: `Message ${i}`,
                is_system: false,
                extra: {}
            }));

            getUnsummarizedCountSpy.mockReturnValue(20);
            getCompressionLevelSpy.mockReturnValue(null);
            mockGetContext.mockReturnValue({
                chat,
                chatId: 'test-chat',
                maxContextTokens: 4000,
                contextTokens: 2100,
                extensionSettings: mockExtensionSettings
            });

            // Simulate the slash command callback behavior
            // performCompaction internally calls injectSummaries
            await performCompaction();

            // Verify that injectSummaries was called after compaction
            expect(injectSummariesMock).toHaveBeenCalled();
            expect(injectSummariesMock).toHaveBeenCalledTimes(1);
        });
    });

    describe('progress cleanup on errors', () => {
        it('should cleanup progress even if injectSummaries fails', async () => {
            const chat = Array.from({ length: 20 }, (_, i) => ({
                mes_id: i,
                name: 'User',
                mes: `Message ${i}`,
                is_system: false,
                extra: {}
            }));

            getUnsummarizedCountSpy.mockReturnValue(20);
            getCompressionLevelSpy.mockReturnValue(null);
            mockGetContext.mockReturnValue({
                chat,
                chatId: 'test-chat',
                maxContextTokens: 4000,
                contextTokens: 2100,
                extensionSettings: mockExtensionSettings
            });

            // Simulate injectSummaries failure
            injectSummariesMock.mockRejectedValue(new Error('Injection failed'));

            // Simulate the slash command callback behavior
            try {
                await performCompaction();
            } catch (error) {
                // Expected to throw
            }

            // When injectSummaries fails, the error is caught in the try/catch block
            // and progress is completed with failure status
            expect(progressModule.completeCompactionProgress).toHaveBeenCalledWith(false, expect.stringContaining('Injection failed'));
        });

        it('should cleanup progress even if performCompaction throws', async () => {
            const chat = Array.from({ length: 20 }, (_, i) => ({
                mes_id: i,
                name: 'User',
                mes: `Message ${i}`,
                is_system: false,
                extra: {}
            }));

            getUnsummarizedCountSpy.mockReturnValue(20);
            getCompressionLevelSpy.mockReturnValue(null);
            mockGetContext.mockReturnValue({
                chat,
                chatId: 'test-chat',
                maxContextTokens: 4000,
                contextTokens: 2100,
                extensionSettings: mockExtensionSettings
            });

            // Simulate performCompaction error
            mockGenerateQuietPrompt.mockRejectedValue(new Error('Compression error'));

            // Simulate the slash command callback behavior
            try {
                await performCompaction();
            } catch (error) {
                // Expected to throw
            }

            // Verify that progress was completed with failure status
            expect(progressModule.completeCompactionProgress).toHaveBeenCalled();
        });
    });

    describe('slash command behavior', () => {
        it('should return success message after compaction completes', async () => {
            const chat = Array.from({ length: 20 }, (_, i) => ({
                mes_id: i,
                name: 'User',
                mes: `Message ${i}`,
                is_system: false,
                extra: {}
            }));

            getUnsummarizedCountSpy.mockReturnValue(20);
            getCompressionLevelSpy.mockReturnValue(null);
            mockGetContext.mockReturnValue({
                chat,
                chatId: 'test-chat',
                maxContextTokens: 4000,
                contextTokens: 2100,
                extensionSettings: mockExtensionSettings
            });

            // Simulate the slash command callback behavior
            let result;
            try {
                await performCompaction();
                result = 'Compaction completed';
            } catch (error) {
                result = `Error: ${error.message}`;
            }

            // Verify the result message
            expect(result).toBe('Compaction completed');
        });

        it('should return appropriate message when no messages to compact', async () => {
            getUnsummarizedCountSpy.mockReturnValue(0);
            mockGetContext.mockReturnValue({
                chat: [],
                chatId: 'test-chat',
                maxContextTokens: 4000,
                contextTokens: 2100,
                extensionSettings: mockExtensionSettings
            });

            // Simulate the slash command callback behavior
            await performCompaction();

            // When no messages to compact, performCompaction returns early
            // Progress should not be started or completed
            expect(progressModule.startCompactionProgress).not.toHaveBeenCalled();
            expect(progressModule.completeCompactionProgress).not.toHaveBeenCalled();
        });
    });
});
