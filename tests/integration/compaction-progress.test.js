import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { performCompaction } from '../../src/compression.js';
import * as progressModule from '../../src/progress.js';
import * as uiProgressModule from '../../ui/progress.js';
import {
    mockGetChatStorage,
    mockGetContext,
    mockGetGlobalSetting,
    mockGenerateQuietPrompt,
    mockExtensionSettings
} from '../setup.js';
import * as messageMetadataModule from '../../src/message-metadata.js';

describe('performCompaction progress tracking integration', () => {
    let getUnsummarizedCountSpy;
    let getCompressionLevelSpy;
    let hideProgressToastSpy;
    let hideInlineProgressSpy;
    let showInlineProgressSpy;

    /**
     * Common test setup helper to reduce code duplication
     */
    function setupCommonTestMocks(options = {}) {
        // Reset progress state
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
                totalMessages: options.totalMessages || 20,
                summarizedMessages: 0
            }
        });

        const chat = options.chat || Array.from({ length: options.totalMessages || 20 }, (_, i) => ({
            mes_id: i,
            name: 'User',
            mes: `Message ${i}`,
            is_system: false,
            extra: {}
        }));

        mockGetContext.mockReturnValue({
            chat,
            chatId: 'test-chat',
            maxContextTokens: 4000,
            contextTokens: 2100,
            extensionSettings: mockExtensionSettings
        });

        mockGetGlobalSetting.mockImplementation((key) => {
            if (key === 'level1ChunkSize') return options.chunkSize || 10;
            if (key === 'targetCompression') return options.targetCompression || 50;
            if (key === 'compressionProfileId') return null;
            if (key === 'showProgressBar') return options.showProgressBar !== undefined ? options.showProgressBar : true;
            return null;
        });

        getUnsummarizedCountSpy.mockReturnValue(options.totalMessages || 20);
        getCompressionLevelSpy.mockReturnValue(null);

        // Mock compressChunk to return fake summary
        if (options.compressShouldFail) {
            mockGenerateQuietPrompt.mockResolvedValue(null);
        } else {
            mockGenerateQuietPrompt.mockResolvedValue('[Test] Summary of messages');
        }
    }

    beforeEach(() => {
        vi.clearAllMocks();
        mockGetChatStorage.mockReset();
        mockGetContext.mockReset();
        mockGetGlobalSetting.mockReset();
        mockGenerateQuietPrompt.mockReset();

        // Spy on progress module functions
        vi.spyOn(progressModule, 'startCompactionProgress');
        vi.spyOn(progressModule, 'updateCompactionProgress');
        vi.spyOn(progressModule, 'completeCompactionProgress');
        vi.spyOn(progressModule, 'hideCompactionProgress');

        // Spy on UI progress functions to verify they're called
        hideProgressToastSpy = vi.spyOn(uiProgressModule, 'hideProgressToast');
        hideInlineProgressSpy = vi.spyOn(uiProgressModule, 'hideInlineProgress');
        showInlineProgressSpy = vi.spyOn(uiProgressModule, 'showInlineProgress');

        // Spy on message metadata functions
        getUnsummarizedCountSpy = vi.spyOn(messageMetadataModule, 'getUnsummarizedCount');
        getCompressionLevelSpy = vi.spyOn(messageMetadataModule, 'getCompressionLevel');

        // Mock injectSummaries
        vi.doMock('../../src/injection.js', () => ({
            injectSummaries: vi.fn().mockResolvedValue(undefined)
        }));
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('totalBatches calculation', () => {
        it('should calculate total batches correctly for exact division', async () => {
            setupCommonTestMocks({ totalMessages: 20, chunkSize: 10, targetCompression: 50 });

            // level1ChunkSize = 10, targetCompression = 50, so targetMessages = 10
            // Total batches = Math.ceil(10 / 10) = 1
            await performCompaction();

            expect(progressModule.startCompactionProgress).toHaveBeenCalledWith(1);
        });

        it('should calculate total batches correctly for partial chunk', async () => {
            setupCommonTestMocks({ totalMessages: 25, chunkSize: 10, targetCompression: 50 });

            // level1ChunkSize = 10, targetCompression = 50, so targetMessages = 12 (floor of 25 * 0.5)
            // Total batches = Math.ceil(12 / 10) = 2
            await performCompaction();

            expect(progressModule.startCompactionProgress).toHaveBeenCalledWith(2);
        });

        it('should handle edge case with less than half chunk remaining', async () => {
            setupCommonTestMocks({ totalMessages: 10, chunkSize: 10, targetCompression: 50 });

            // With 10 messages and targetCompression 50%, targetMessages = 5
            // Total batches = Math.ceil(5 / 10) = 1
            await performCompaction();

            expect(progressModule.startCompactionProgress).toHaveBeenCalledWith(1);
        });
    });

    describe('startCompactionProgress call', () => {
        it('should call startCompactionProgress before loop starts', async () => {
            const callOrder = [];
            progressModule.startCompactionProgress.mockImplementation(() => callOrder.push('start'));
            mockGenerateQuietPrompt.mockImplementation(() => {
                callOrder.push('compress');
                return Promise.resolve('[Test] Summary');
            });

            setupCommonTestMocks({ totalMessages: 20 });

            await performCompaction();

            expect(callOrder).toContain('start');
            expect(callOrder[0]).toBe('start');
        });

        it('should not call startCompactionProgress if no messages to compact', async () => {
            getUnsummarizedCountSpy.mockReturnValue(0);
            mockGetContext.mockReturnValue({
                chat: [],
                chatId: 'test-chat',
                maxContextTokens: 4000,
                contextTokens: 2100,
                extensionSettings: mockExtensionSettings
            });

            await performCompaction();

            expect(progressModule.startCompactionProgress).not.toHaveBeenCalled();
        });
    });

    describe('updateCompactionProgress calls', () => {
        it('should call updateCompactionProgress after each successful chunk compression', async () => {
            setupCommonTestMocks({ totalMessages: 30, chunkSize: 10, targetCompression: 50 });

            await performCompaction();

            // With 30 messages and targetCompression 50%, targetMessages = 15
            // With chunk size 10, we should compress 15 messages in 2 batches
            // First batch: 10 messages, second batch: 5 messages
            expect(progressModule.updateCompactionProgress).toHaveBeenCalledTimes(2);
            expect(progressModule.updateCompactionProgress).toHaveBeenNthCalledWith(1, 1, 2);
            expect(progressModule.updateCompactionProgress).toHaveBeenNthCalledWith(2, 2, 2);
        });

        it('should not call updateCompactionProgress if chunk compression fails', async () => {
            setupCommonTestMocks({ totalMessages: 20, compressShouldFail: true });

            await performCompaction();

            expect(progressModule.updateCompactionProgress).not.toHaveBeenCalled();
        });
    });

    describe('completeCompactionProgress on success', () => {
        it('should call completeCompactionProgress with success=true after loop completes', async () => {
            setupCommonTestMocks({ totalMessages: 20 });

            await performCompaction();

            expect(progressModule.completeCompactionProgress).toHaveBeenCalledWith(true, expect.any(String));
            expect(progressModule.completeCompactionProgress).toHaveBeenCalledTimes(1);
        });

        it('should include compacted message count in completion message', async () => {
            setupCommonTestMocks({ totalMessages: 20 });

            await performCompaction();

            expect(progressModule.completeCompactionProgress).toHaveBeenCalledWith(true, expect.stringContaining('Compacted'));
        });
    });

    describe('completeCompactionProgress on failure', () => {
        it('should call completeCompactionProgress when compression fails (returns null)', async () => {
            setupCommonTestMocks({ totalMessages: 20, compressShouldFail: true });

            await performCompaction();

            // When compression fails, it completes with success=true but with 0 messages compacted
            expect(progressModule.completeCompactionProgress).toHaveBeenCalledWith(true, expect.stringContaining('0 messages'));
        });

        it('should handle chunk compression failure gracefully and still complete progress', async () => {
            setupCommonTestMocks({ totalMessages: 20, compressShouldFail: true });

            // Mock API error (compressChunk catches and returns null)
            mockGenerateQuietPrompt.mockRejectedValue(new Error('API failed'));

            await performCompaction();

            // When API fails, compressChunk returns null, loop breaks, completion is called
            expect(progressModule.completeCompactionProgress).toHaveBeenCalledTimes(1);
            expect(progressModule.completeCompactionProgress).toHaveBeenCalledWith(true, expect.stringContaining('0 messages'));
        });
    });

    describe('batch index tracking', () => {
        it('should increment batch index correctly after each chunk', async () => {
            setupCommonTestMocks({ totalMessages: 30, chunkSize: 10, targetCompression: 50 });

            await performCompaction();

            // Verify that update was called with incrementing batch indices
            const calls = progressModule.updateCompactionProgress.mock.calls;
            expect(calls[0]).toEqual([1, 2]);
            expect(calls[1]).toEqual([2, 2]);
        });
    });

    describe('end-to-end compaction flow', () => {
        it('should track full compaction flow from start to completion', async () => {
            setupCommonTestMocks({ totalMessages: 30, chunkSize: 10, targetCompression: 50 });

            await performCompaction();

            // Full flow verification
            expect(progressModule.startCompactionProgress).toHaveBeenCalledTimes(1);
            expect(progressModule.startCompactionProgress).toHaveBeenCalledWith(2); // 2 batches

            expect(progressModule.updateCompactionProgress).toHaveBeenCalledTimes(2);
            expect(progressModule.updateCompactionProgress).toHaveBeenNthCalledWith(1, 1, 2);
            expect(progressModule.updateCompactionProgress).toHaveBeenNthCalledWith(2, 2, 2);

            expect(progressModule.completeCompactionProgress).toHaveBeenCalledTimes(1);
            expect(progressModule.completeCompactionProgress).toHaveBeenCalledWith(true, expect.stringContaining('Compacted'));
        });

        it('should reflect accurate progress updates during compaction', async () => {
            const progressUpdates = [];
            progressModule.updateCompactionProgress.mockImplementation((current, total) => {
                progressUpdates.push({ current, total, percentage: Math.floor((current / total) * 100) });
            });

            setupCommonTestMocks({ totalMessages: 25, chunkSize: 10, targetCompression: 50 });

            await performCompaction();

            // Verify progress accuracy: 25 messages * 50% = 12.5 -> 12 target messages
            // 12 messages / 10 chunk size = 2 batches
            expect(progressUpdates).toHaveLength(2);
            expect(progressUpdates[0]).toEqual({ current: 1, total: 2, percentage: 50 });
            expect(progressUpdates[1]).toEqual({ current: 2, total: 2, percentage: 100 });
        });
    });

    describe('progress indicator visibility', () => {
        it('should hide progress toast after successful completion', async () => {
            setupCommonTestMocks({ totalMessages: 20 });

            await performCompaction();

            // Verify hide functions are called via completeCompactionProgress
            expect(progressModule.completeCompactionProgress).toHaveBeenCalledWith(true, expect.any(String));

            // The completeCompactionProgress function calls hideProgressToast and hideInlineProgress
            expect(hideProgressToastSpy).toHaveBeenCalled();
            expect(hideInlineProgressSpy).toHaveBeenCalled();
        });

        it('should hide progress indicator after compaction failure', async () => {
            setupCommonTestMocks({ totalMessages: 20, compressShouldFail: true });

            await performCompaction();

            // Verify hide functions are called even on failure
            expect(progressModule.completeCompactionProgress).toHaveBeenCalledWith(true, expect.stringContaining('0 messages'));

            // The completeCompactionProgress function calls hide functions regardless of success
            expect(hideProgressToastSpy).toHaveBeenCalled();
            expect(hideInlineProgressSpy).toHaveBeenCalled();
        });

        it('should hide progress toast when no messages to compact', async () => {
            getUnsummarizedCountSpy.mockReturnValue(0);
            mockGetContext.mockReturnValue({
                chat: [],
                chatId: 'test-chat',
                maxContextTokens: 4000,
                contextTokens: 2100,
                extensionSettings: mockExtensionSettings
            });

            await performCompaction();

            // start should not be called, so hide shouldn't be called either
            expect(progressModule.startCompactionProgress).not.toHaveBeenCalled();
            expect(hideProgressToastSpy).not.toHaveBeenCalled();
        });
    });

    describe('showProgressBar setting affects inline progress', () => {
        it('should show inline progress when showProgressBar is true', async () => {
            setupCommonTestMocks({ totalMessages: 20, showProgressBar: true });

            await performCompaction();

            // Verify showInlineProgress is called
            expect(showInlineProgressSpy).toHaveBeenCalled();

            // Verify it's called multiple times (start + updates)
            expect(showInlineProgressSpy.mock.calls.length).toBeGreaterThan(0);

            // Verify it's called with proper progress values
            const firstCall = showInlineProgressSpy.mock.calls[0];
            expect(firstCall[0]).toBe(0); // current batch
            expect(firstCall[1]).toBeGreaterThanOrEqual(1); // total batches
        });

        it('should call showInlineProgress regardless of setting (function handles the check internally)', async () => {
            setupCommonTestMocks({ totalMessages: 20, showProgressBar: false });

            await performCompaction();

            // The progress module calls showInlineProgress regardless of the setting
            // The showInlineProgress function itself checks the setting and returns early
            // This test verifies the integration works correctly
            expect(showInlineProgressSpy).toHaveBeenCalled();

            // Verify that the progress module still functions correctly
            expect(progressModule.startCompactionProgress).toHaveBeenCalled();
            expect(progressModule.updateCompactionProgress).toHaveBeenCalled();
            expect(progressModule.completeCompactionProgress).toHaveBeenCalled();
        });

        it('should call hideInlineProgress regardless of showProgressBar setting', async () => {
            setupCommonTestMocks({ totalMessages: 20, showProgressBar: false });

            await performCompaction();

            // Hide should be called even if show never was
            expect(hideInlineProgressSpy).toHaveBeenCalled();
        });
    });

    describe('progress updates reflect actual batch count', () => {
        it('should track batches correctly with multiple updates', async () => {
            setupCommonTestMocks({ totalMessages: 35, chunkSize: 10, targetCompression: 60 });

            await performCompaction();

            // 35 messages * 60% = 21 target messages
            // 21 / 10 = 3 batches (Math.ceil)
            expect(progressModule.startCompactionProgress).toHaveBeenCalledWith(3);
            expect(progressModule.updateCompactionProgress).toHaveBeenCalledTimes(3);

            // Verify each batch was tracked
            expect(progressModule.updateCompactionProgress).toHaveBeenNthCalledWith(1, 1, 3);
            expect(progressModule.updateCompactionProgress).toHaveBeenNthCalledWith(2, 2, 3);
            expect(progressModule.updateCompactionProgress).toHaveBeenNthCalledWith(3, 3, 3);
        });

        it('should handle single batch compaction', async () => {
            setupCommonTestMocks({ totalMessages: 10, chunkSize: 10, targetCompression: 50 });

            await performCompaction();

            // 10 messages * 50% = 5 target messages
            // 5 / 10 = 1 batch (Math.ceil)
            expect(progressModule.startCompactionProgress).toHaveBeenCalledWith(1);
            expect(progressModule.updateCompactionProgress).toHaveBeenCalledTimes(1);
            expect(progressModule.updateCompactionProgress).toHaveBeenCalledWith(1, 1);
        });
    });
});
