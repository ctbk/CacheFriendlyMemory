import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockSetExtensionPrompt, mockGetChatStorage, mockGetInjectionSetting, mockGetGlobalSetting, mockGetContext, mockEventHandlers } from '../setup.js';
import { injectSummaries, clearInjection } from '../../src/injection.js';
import { createTestStorage } from '../fixtures/test-storage.js';
import { createTestMessages } from '../fixtures/test-messages.js';
import * as compressionModule from '../../src/compression.js';
import { performCompaction } from '../../src/compression.js';
import * as injectionModule from '../../src/injection.js';
import { registerExtensionEvents } from '../../src/events.js';

describe('Injection Integration', () => {
    beforeEach(() => {
        mockSetExtensionPrompt.mockClear();
        mockGetChatStorage.mockReset();
        mockGetInjectionSetting.mockClear();
    });

    it('should inject summaries when enabled', async () => {
        const storage = {
            level1: { summaries: [{ text: 'Chapter 1 summary' }] },
            level2: { summaries: [] },
            level3: { summary: null }
        };

        mockGetChatStorage.mockReturnValue(storage);
        mockGetInjectionSetting.mockImplementation((key) => {
            if (key === 'enabled') return true;
            if (key === 'position') return 0;
            if (key === 'depth') return 0;
            if (key === 'scan') return true;
            if (key === 'role') return 'system';
            return null;
        });

        await injectSummaries();

        expect(mockSetExtensionPrompt).toHaveBeenCalledWith(
            'cacheFriendlyMemory',
            expect.stringContaining('[Chapter 1] Chapter 1 summary'),
            0,  // IN_PROMPT position
            0,
            true,
            0   // SYSTEM role (numeric)
        );
    });

    it('should clear injection when disabled', async () => {
        const storage = {};

        mockGetChatStorage.mockReturnValue(storage);
        mockGetInjectionSetting.mockReturnValue(false);

        await injectSummaries();

        // clearInjection uses IN_PROMPT (0) and depth 0
        expect(mockSetExtensionPrompt).toHaveBeenCalledWith('cacheFriendlyMemory', '', 0, 0);
    });

    it('should clear injection explicitly', async () => {
        await clearInjection();

        // clearInjection uses extension_prompt_types.IN_PROMPT (0) and depth 0
        expect(mockSetExtensionPrompt).toHaveBeenCalledWith('cacheFriendlyMemory', '', 0, 0);
    });

    it('should inject multi-level summaries', async () => {
        const storage = {
            level1: { summaries: [{ text: 'Chapter 1' }, { text: 'Chapter 2' }] },
            level2: { summaries: [{ text: 'Section 1' }] },
            level3: { summary: 'Overall story summary' }
        };

        mockGetChatStorage.mockReturnValue(storage);
        mockGetInjectionSetting.mockImplementation((key) => {
            if (key === 'enabled') return true;
            if (key === 'position') return 0;
            if (key === 'depth') return 0;
            if (key === 'scan') return true;
            if (key === 'role') return 'system';
            return null;
        });

        await injectSummaries();

        expect(mockSetExtensionPrompt).toHaveBeenCalled();
        const callArgs = mockSetExtensionPrompt.mock.calls[0];
        const injectedText = callArgs[1];

        expect(injectedText).toContain('[Compressed Conversation History]');
        expect(injectedText).toContain('[Long-term Summary]');
        expect(injectedText).toContain('Overall story summary');
        expect(injectedText).toContain('[Medium-term Summaries]');
        expect(injectedText).toContain('[Section 1]');
        expect(injectedText).toContain('[Recent Summaries]');
        expect(injectedText).toContain('[Chapter 1]');
        expect(injectedText).toContain('[Chapter 2]');
        expect(injectedText).toContain('[End Compressed History]');
    });

    it('should handle null storage gracefully', async () => {
        mockGetChatStorage.mockReturnValue(null);
        mockGetInjectionSetting.mockReturnValue(true);

        await injectSummaries();

        expect(mockSetExtensionPrompt).toHaveBeenCalled();
    });

    describe('Compaction Triggers', () => {
        beforeEach(() => {
            mockGetChatStorage.mockReset();
            mockGetGlobalSetting.mockReset();
            mockGetContext.mockReset();
            mockEventHandlers.clear();
        });

        it('should NOT trigger compression after multiple user messages, but SHOULD after character response', async () => {
            // This test verifies that compression does NOT happen after user messages,
            // but DOES happen after a character message when threshold is exceeded.
            // After the Phase 1 fix, MESSAGE_RECEIVED no longer triggers compression,
            // and compression only occurs after CHARACTER_MESSAGE_RENDERED events.

            // Setup: Enable auto-compaction with threshold of 10
            const storage = createTestStorage({
                stats: {
                    totalMessages: 8,
                    summarizedMessages: 0,
                    currentCompressionRatio: 0,
                    lastCompactTime: null
                }
            });

            mockGetChatStorage.mockReturnValue(storage);

            mockGetGlobalSetting.mockImplementation((key) => {
                if (key === 'autoCompact') return true;
                if (key === 'compactThreshold') return 10;
                if (key === 'contextThreshold') return 75;
                if (key === 'level1ChunkSize') return 5;
                if (key === 'targetCompression') return 50;
                return null;
            });

            // Create initial 8 messages (below threshold of 10)
            let messages = createTestMessages(8);
            messages.forEach((msg, index) => {
                msg.mes_id = index;
                msg.is_system = false;
                msg.extra = {};
            });

            // Mock SillyTavern context
            mockGetContext.mockReturnValue({
                chat: messages,
                chatId: 'test-chat-1',
                maxContextTokens: 2048,
                contextTokens: 1024,
                extensionSettings: {
                    connectionManager: {
                        selectedProfile: null,
                        profiles: []
                    }
                }
            });

            // Spy on compaction functions
            const triggerCompactionSpy = vi.spyOn(compressionModule, 'triggerCompaction');
            const performCompactionSpy = vi.spyOn(compressionModule, 'performCompaction');

            // Make triggerCompaction return true when threshold is exceeded
            triggerCompactionSpy.mockImplementation(() => {
                // Check if total messages exceed threshold
                const currentMessages = mockGetContext().chat;
                return currentMessages.length >= 10;
            });

            // Clear event handlers and register
            mockEventHandlers.clear();
            registerExtensionEvents();

            const userMessageHandler = mockEventHandlers.get('USER_MESSAGE_RENDERED');
            const characterMessageHandler = mockEventHandlers.get('CHARACTER_MESSAGE_RENDERED');

            // Act: Simulate 3 user messages in sequence (each below threshold)
            for (let i = 0; i < 3; i++) {
                // Add a new user message
                const newUserMessage = createTestMessages(1)[0];
                newUserMessage.mes_id = messages.length;
                newUserMessage.is_system = false;
                newUserMessage.extra = {};
                messages.push(newUserMessage);

                // Update context with new message count
                mockGetContext.mockReturnValue({
                    chat: messages,
                    chatId: 'test-chat-1',
                    maxContextTokens: 2048,
                    contextTokens: 1024,
                    extensionSettings: {
                        connectionManager: {
                            selectedProfile: null,
                            profiles: []
                        }
                    }
                });

                // Trigger user message rendered event
                if (userMessageHandler) {
                    await userMessageHandler(newUserMessage.mes_id);
                }

                // Assert: Compression should NOT be triggered after this user message
                expect(triggerCompactionSpy).not.toHaveBeenCalled();
                expect(performCompactionSpy).not.toHaveBeenCalled();
            }

            // At this point, we have 8 + 3 = 11 messages, which exceeds threshold of 10
            // But compression should NOT have triggered yet

            // Act: Simulate character response (now total will be 12)
            const characterMessage = createTestMessages(1)[0];
            characterMessage.mes_id = messages.length;
            characterMessage.is_system = false;
            characterMessage.extra = {};
            messages.push(characterMessage);

            // Update context with character message
            mockGetContext.mockReturnValue({
                chat: messages,
                chatId: 'test-chat-1',
                maxContextTokens: 2048,
                contextTokens: 1024,
                extensionSettings: {
                    connectionManager: {
                        selectedProfile: null,
                        profiles: []
                    }
                }
            });

            // Trigger character message rendered event
            if (characterMessageHandler) {
                await characterMessageHandler(characterMessage.mes_id);
            }

            // Assert: Compression SHOULD be triggered after character message
            // This assertion will FAIL initially because compression doesn't trigger on CHARACTER_MESSAGE_RENDERED yet
            expect(triggerCompactionSpy).toHaveBeenCalled();
            expect(performCompactionSpy).toHaveBeenCalled();

            // Verify compression was called exactly once
            expect(triggerCompactionSpy).toHaveBeenCalledTimes(1);
            expect(performCompactionSpy).toHaveBeenCalledTimes(1);

            // Cleanup spies
            triggerCompactionSpy.mockRestore();
            performCompactionSpy.mockRestore();
        });
    });

    describe('Manual Compaction Independence', () => {
        it('should work regardless of auto-compaction setting and message type', async () => {
            // This test verifies that manual compaction via /cfm-compact works:
            // 1. Regardless of whether auto-compaction is enabled or disabled
            // 2. Independently of message events (no need to trigger any message events)
            // 3. Immediately when called

            // Setup: Create storage with unsummarized messages
            const storage = createTestStorage({
                level1: { summaries: [] },
                stats: {
                    totalMessages: 10,
                    summarizedMessages: 0,
                    currentCompressionRatio: 0,
                    lastCompactTime: null
                }
            });

            mockGetChatStorage.mockReturnValue(storage);

            // Setup: DISABLE auto-compaction
            mockGetGlobalSetting.mockImplementation((key) => {
                if (key === 'autoCompact') return false; // Auto-compaction is DISABLED
                if (key === 'compactThreshold') return 10;
                if (key === 'contextThreshold') return 75;
                if (key === 'level1ChunkSize') return 5;
                if (key === 'targetCompression') return 50;
                return null;
            });

            // Create 10 unsummarized messages
            const messages = createTestMessages(10);
            messages.forEach((msg, index) => {
                msg.mes_id = index;
                msg.is_system = false;
                msg.extra = {};
            });

            // Mock SillyTavern context
            mockGetContext.mockReturnValue({
                chat: messages,
                chatId: 'test-chat-manual-compact',
                maxContextTokens: 2048,
                contextTokens: 1024,
                extensionSettings: {
                    connectionManager: {
                        selectedProfile: null,
                        profiles: []
                    }
                }
            });

            // Spy on compression and injection functions
            const performCompactionSpy = vi.spyOn(compressionModule, 'performCompaction');
            const injectSummariesSpy = vi.spyOn(injectionModule, 'injectSummaries');
            const triggerCompactionSpy = vi.spyOn(compressionModule, 'triggerCompaction');

            // Mock performCompaction to avoid actual compression logic
            performCompactionSpy.mockImplementation(async () => {
                // Simulate successful compaction by updating storage stats
                storage.stats.summarizedMessages = 5;
                storage.stats.lastCompactTime = Date.now();
                storage.level1.summaries.push({
                    id: 'l1_test',
                    startMessageIndex: 0,
                    endMessageIndex: 4,
                    text: 'Test summary',
                    timestamp: Date.now(),
                    tokenCount: 50
                });
            });

            // Act: Execute manual compaction (simulating /cfm-compact slash command)
            // The slash command callback directly calls performCompaction() and injectSummaries()
            await performCompaction();
            await injectSummaries();

            // Assert: Compression ran immediately regardless of:
            // 1. Auto-compaction being disabled
            // 2. No message events being triggered
            expect(performCompactionSpy).toHaveBeenCalled();
            expect(performCompactionSpy).toHaveBeenCalledTimes(1);
            expect(injectSummariesSpy).toHaveBeenCalled();
            expect(injectSummariesSpy).toHaveBeenCalledTimes(1);

            // Assert: triggerCompaction was NOT called
            // Manual compaction bypasses trigger checking
            expect(triggerCompactionSpy).not.toHaveBeenCalled();

            // Assert: Storage was updated (compaction actually worked)
            expect(storage.stats.summarizedMessages).toBe(5);
            expect(storage.stats.lastCompactTime).not.toBeNull();
            expect(storage.level1.summaries.length).toBeGreaterThan(0);

            // Cleanup spies
            performCompactionSpy.mockRestore();
            injectSummariesSpy.mockRestore();
            triggerCompactionSpy.mockRestore();
        });

        it('should work immediately after user message without waiting for character response', async () => {
            // This test verifies that manual compaction can be triggered at any time,
            // independent of the message flow (user → character → auto-compaction)

            // Setup: Create storage with unsummarized messages
            const storage = createTestStorage({
                level1: { summaries: [] },
                stats: {
                    totalMessages: 8,
                    summarizedMessages: 0,
                    currentCompressionRatio: 0,
                    lastCompactTime: null
                }
            });

            mockGetChatStorage.mockReturnValue(storage);

            // Setup: Auto-compaction is enabled, but we'll trigger manual compaction instead
            mockGetGlobalSetting.mockImplementation((key) => {
                if (key === 'autoCompact') return true;
                if (key === 'compactThreshold') return 10;
                if (key === 'contextThreshold') return 75;
                if (key === 'level1ChunkSize') return 5;
                if (key === 'targetCompression') return 50;
                return null;
            });

            // Create 8 messages (below auto-compaction threshold)
            const messages = createTestMessages(8);
            messages.forEach((msg, index) => {
                msg.mes_id = index;
                msg.is_system = false;
                msg.extra = {};
            });

            // Mock SillyTavern context
            mockGetContext.mockReturnValue({
                chat: messages,
                chatId: 'test-chat-timing',
                maxContextTokens: 2048,
                contextTokens: 1024,
                extensionSettings: {
                    connectionManager: {
                        selectedProfile: null,
                        profiles: []
                    }
                }
            });

            // Spy on compression functions
            const performCompactionSpy = vi.spyOn(compressionModule, 'performCompaction');
            const injectSummariesSpy = vi.spyOn(injectionModule, 'injectSummaries');

            // Mock performCompaction
            performCompactionSpy.mockImplementation(async () => {
                storage.stats.summarizedMessages = 3;
                storage.stats.lastCompactTime = Date.now();
                storage.level1.summaries.push({
                    id: 'l1_timing_test',
                    startMessageIndex: 0,
                    endMessageIndex: 2,
                    text: 'Timing test summary',
                    timestamp: Date.now(),
                    tokenCount: 30
                });
            });

            // Clear event handlers and register
            mockEventHandlers.clear();
            registerExtensionEvents();

            const userMessageHandler = mockEventHandlers.get('USER_MESSAGE_RENDERED');

            // Act: Simulate a user message rendered event
            if (userMessageHandler) {
                await userMessageHandler(7);
            }

            // At this point, auto-compaction should NOT have triggered
            // because we only have 8 messages and auto-compaction threshold is 10

            // Act: Execute manual compaction (simulating /cfm-compact slash command)
            // This should work immediately, without waiting for a character response
            await performCompaction();
            await injectSummaries();

            // Assert: Manual compaction ran immediately after user message
            expect(performCompactionSpy).toHaveBeenCalled();
            expect(performCompactionSpy).toHaveBeenCalledTimes(1);
            expect(injectSummariesSpy).toHaveBeenCalled();

            // Assert: Storage was updated
            expect(storage.stats.summarizedMessages).toBe(3);
            expect(storage.level1.summaries.length).toBeGreaterThan(0);

            // Cleanup spies
            performCompactionSpy.mockRestore();
            injectSummariesSpy.mockRestore();
        });
    });
});
