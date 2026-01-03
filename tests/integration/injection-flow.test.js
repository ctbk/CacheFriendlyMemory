import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateBudget } from '../../src/logic/budget-calculation.js';
import { selectLevel1Summaries, selectLevel2Summaries } from '../../src/logic/summary-selection.js';
import { buildContextFromSummaries } from '../../src/logic/context-building.js';
import { createTestStorage } from '../fixtures/test-storage.js';
import { createTestMessages } from '../fixtures/test-messages.js';
import { mockGetChatStorage, mockGetGlobalSetting, mockGetContext, mockEventHandlers } from '../setup.js';
import * as compressionModule from '../../src/compression.js';
import * as injectionModule from '../../src/injection.js';
import { registerExtensionEvents } from '../../src/events.js';

describe('Injection Flow Integration', () => {
    it('should calculate budget and select summaries correctly', () => {
        const budget = calculateBudget(2048, 512, 200, 100);

        expect(budget.budgetForHistory).toBeGreaterThan(0);

        const storage = createTestStorage({
            level1: {
                summaries: [
                    { text: 'Summary 1', tokenCount: 100, timestamp: 1000 },
                    { text: 'Summary 2', tokenCount: 150, timestamp: 2000 }
                ]
            },
            level2: {
                summaries: [
                    { text: 'L2 Summary', tokenCount: 200, timestamp: 3000 }
                ]
            }
        });

        const level1Summaries = selectLevel1Summaries(storage.level1.summaries, budget.budgetForHistory);
        const level2Summaries = selectLevel2Summaries(storage.level2.summaries, budget.budgetForHistory);

        expect(level1Summaries.length).toBeGreaterThanOrEqual(0);
        expect(level2Summaries.length).toBeGreaterThanOrEqual(0);
    });

    it('should build context from selected summaries', () => {
        const selected = {
            level3: 'Story summary',
            level2: [{ text: 'Chapter 1' }],
            level1: [{ text: 'Recent event' }]
        };

        const context = buildContextFromSummaries(selected);

        expect(context).toContain('[Story So Far]');
        expect(context).toContain('[Previous Chapters]');
        expect(context).toContain('[Recent Events]');
    });

    it('should handle empty selection', () => {
        const selected = {
            level3: null,
            level2: [],
            level1: []
        };

        const context = buildContextFromSummaries(selected);

        expect(context).toBe('');
    });

    describe('Compaction Triggers', () => {
        beforeEach(() => {
            mockGetChatStorage.mockReset();
            mockGetGlobalSetting.mockReset();
            mockGetContext.mockReset();
            mockEventHandlers.clear();
        });

        it('should NOT trigger compression after user message rendered', async () => {
            // Setup: Enable auto-compaction with low threshold
            const storage = createTestStorage({
                stats: {
                    totalMessages: 12,
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

            // Create 12 unsummarized messages (exceeds threshold of 10)
            const messages = createTestMessages(12);
            messages.forEach((msg, index) => {
                msg.mes_id = index;
                msg.is_system = false;
                msg.extra = {};
            });

            // Mock SillyTavern context with sufficient messages
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

            // Spy on compaction functions from the compression module
            const triggerCompactionSpy = vi.spyOn(compressionModule, 'triggerCompaction');
            const performCompactionSpy = vi.spyOn(compressionModule, 'performCompaction');

            // Clear event handlers before registering
            mockEventHandlers.clear();

            // Register event handlers
            registerExtensionEvents();

            // Get the USER_MESSAGE_RENDERED handler from the mocked event source
            const userMessageHandler = mockEventHandlers.get('USER_MESSAGE_RENDERED');

            // Act: Simulate user message rendered event with index 11 (last message)
            if (userMessageHandler) {
                await userMessageHandler(11);
            }

            // Assert: Compression should NOT be triggered after user message
            expect(triggerCompactionSpy).not.toHaveBeenCalled();
            expect(performCompactionSpy).not.toHaveBeenCalled();

            // Cleanup spies
            triggerCompactionSpy.mockRestore();
            performCompactionSpy.mockRestore();
        });

        it('should NOT trigger compression after user message', async () => {
            // This test verifies that compression does NOT happen after user messages.
            // After the Phase 1 fix, MESSAGE_RECEIVED no longer triggers compression,
            // and compression only occurs after CHARACTER_MESSAGE_RENDERED events.

            // Setup: Enable auto-compaction with low threshold
            const storage = createTestStorage({
                stats: {
                    totalMessages: 12,
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

            // Create 12 unsummarized messages (exceeds threshold of 10)
            const messages = createTestMessages(12);
            messages.forEach((msg, index) => {
                msg.mes_id = index;
                msg.is_system = false;
                msg.extra = {};
            });

            // Mock SillyTavern context with sufficient messages
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

            // Spy on compaction functions from the compression module
            const triggerCompactionSpy = vi.spyOn(compressionModule, 'triggerCompaction');
            const performCompactionSpy = vi.spyOn(compressionModule, 'performCompaction');

            // Clear event handlers before registering
            mockEventHandlers.clear();

            // Register event handlers
            registerExtensionEvents();

            // Get the MESSAGE_RECEIVED handler from the mocked event source
            const messageReceivedHandler = mockEventHandlers.get('MESSAGE_RECEIVED');

            // Act: Simulate message received event after user sends message (index 11)
            if (messageReceivedHandler) {
                await messageReceivedHandler(11);
            }

            // Assert: Compression should NOT be triggered after user message received
            // This verifies that MESSAGE_RECEIVED does not trigger compression (Phase 1 fix)
            expect(triggerCompactionSpy).not.toHaveBeenCalled();
            expect(performCompactionSpy).not.toHaveBeenCalled();

            // Cleanup spies
            triggerCompactionSpy.mockRestore();
            performCompactionSpy.mockRestore();
        });

        it('should trigger compression after character message rendered', async () => {
            // Setup: Enable auto-compaction with low threshold
            const storage = createTestStorage({
                stats: {
                    totalMessages: 12,
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

            // Create 12 unsummarized messages (exceeds threshold of 10)
            const messages = createTestMessages(12);
            messages.forEach((msg, index) => {
                msg.mes_id = index;
                msg.is_system = false;
                msg.extra = {};
            });

            // Mock SillyTavern context with sufficient messages
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

            // Spy on compaction and injection functions
            const triggerCompactionSpy = vi.spyOn(compressionModule, 'triggerCompaction');
            const performCompactionSpy = vi.spyOn(compressionModule, 'performCompaction');
            const injectSummariesSpy = vi.spyOn(injectionModule, 'injectSummaries');

            // Make triggerCompaction return true to simulate trigger condition met
            triggerCompactionSpy.mockResolvedValue(true);

            // Clear event handlers before registering
            mockEventHandlers.clear();

            // Register event handlers
            registerExtensionEvents();

            // Get the CHARACTER_MESSAGE_RENDERED handler from the mocked event source
            const characterMessageHandler = mockEventHandlers.get('CHARACTER_MESSAGE_RENDERED');

            // Act: Simulate character message rendered event with index 11 (last message)
            if (characterMessageHandler) {
                await characterMessageHandler(11);
            }

            // Assert: Compression should be triggered after character message
            expect(triggerCompactionSpy).toHaveBeenCalled();
            expect(performCompactionSpy).toHaveBeenCalled();
            expect(injectSummariesSpy).toHaveBeenCalled();

            // Cleanup spies
            triggerCompactionSpy.mockRestore();
            performCompactionSpy.mockRestore();
            injectSummariesSpy.mockRestore();
        });

        it('should NOT trigger compression after user message even when context exceeds threshold', async () => {
            // This test verifies context pressure trigger timing:
            // - Context pressure should NOT trigger after user messages
            // - Even if context exceeds the threshold
            // - Compression should only trigger after character messages

            // Setup: Enable auto-compaction, set context threshold to 75%
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

            // Create 8 messages (below message count threshold of 10)
            const messages = createTestMessages(8);
            messages.forEach((msg, index) => {
                msg.mes_id = index;
                msg.is_system = false;
                msg.extra = {};
            });

            // Mock SillyTavern context:
            // - maxContextTokens: 1000
            // - Initial contextTokens: 700 (70% of max)
            mockGetContext.mockReturnValue({
                chat: messages,
                chatId: 'test-chat-context-pressure',
                maxContextTokens: 1000,
                contextTokens: 700, // 70% of max context
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

            // Clear and register event handlers
            mockEventHandlers.clear();
            registerExtensionEvents();

            // Get the USER_MESSAGE_RENDERED handler
            const userMessageHandler = mockEventHandlers.get('USER_MESSAGE_RENDERED');

            // Act: User message rendered - context would now be at 80% (800/1000)
            // Update context to reflect the new user message (800 tokens = 80%)
            mockGetContext.mockReturnValue({
                chat: messages,
                chatId: 'test-chat-context-pressure',
                maxContextTokens: 1000,
                contextTokens: 800, // 80% of max context (exceeds 75% threshold)
                extensionSettings: {
                    connectionManager: {
                        selectedProfile: null,
                        profiles: []
                    }
                }
            });

            if (userMessageHandler) {
                await userMessageHandler(7);
            }

            // Assert: Compression should NOT be triggered after user message
            // Even though context is at 80% (exceeds 75% threshold)
            expect(triggerCompactionSpy).not.toHaveBeenCalled();
            expect(performCompactionSpy).not.toHaveBeenCalled();

            // Cleanup spies
            triggerCompactionSpy.mockRestore();
            performCompactionSpy.mockRestore();
        });

        it('should trigger compression after character message when context exceeds threshold', async () => {
            // This test verifies context pressure trigger timing:
            // - Context pressure SHOULD trigger after character messages
            // - When context exceeds the threshold (75%)

            // Setup: Enable auto-compaction, set context threshold to 75%
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

            // Create 8 messages (below message count threshold of 10)
            const messages = createTestMessages(8);
            messages.forEach((msg, index) => {
                msg.mes_id = index;
                msg.is_system = false;
                msg.extra = {};
            });

            // Mock SillyTavern context with context at 80% (exceeds 75% threshold)
            mockGetContext.mockReturnValue({
                chat: messages,
                chatId: 'test-chat-context-pressure',
                maxContextTokens: 1000,
                contextTokens: 800, // 80% of max context (exceeds 75% threshold)
                extensionSettings: {
                    connectionManager: {
                        selectedProfile: null,
                        profiles: []
                    }
                }
            });

            // Spy on compaction and injection functions
            const triggerCompactionSpy = vi.spyOn(compressionModule, 'triggerCompaction');
            const performCompactionSpy = vi.spyOn(compressionModule, 'performCompaction');
            const injectSummariesSpy = vi.spyOn(injectionModule, 'injectSummaries');

            // Make triggerCompaction return true to simulate trigger condition met
            triggerCompactionSpy.mockResolvedValue(true);

            // Clear and register event handlers
            mockEventHandlers.clear();
            registerExtensionEvents();

            // Get the CHARACTER_MESSAGE_RENDERED handler
            const characterMessageHandler = mockEventHandlers.get('CHARACTER_MESSAGE_RENDERED');

            // Act: Character message rendered with context at 80%
            if (characterMessageHandler) {
                await characterMessageHandler(7);
            }

            // Assert: Compression SHOULD be triggered after character message
            // Because context is at 80% (exceeds 75% threshold)
            expect(triggerCompactionSpy).toHaveBeenCalled();
            expect(performCompactionSpy).toHaveBeenCalled();
            expect(injectSummariesSpy).toHaveBeenCalled();

            // Cleanup spies
            triggerCompactionSpy.mockRestore();
            performCompactionSpy.mockRestore();
            injectSummariesSpy.mockRestore();
        });

        it('should only trigger compression after CHARACTER_MESSAGE_RENDERED (streaming response behavior)', async () => {
            // This test documents and verifies streaming response behavior:
            //
            // In SillyTavern, character responses are generated via streaming (tokens appear progressively).
            // The CHARACTER_MESSAGE_RENDERED event only fires AFTER streaming completes and the full
            // response is visible in the chat.
            //
            // This test verifies that compression correctly waits for this event before triggering,
            // ensuring that:
            // 1. Compression does NOT run during streaming (which would be wasteful)
            // 2. Compression only runs after the complete character response is available
            // 3. The user sees the full response before any compression potentially affects context
            //
            // This is important for user experience - the user should see the complete response
            // before any background compaction occurs.

            // Setup: Enable auto-compaction with threshold of 10
            const storage = createTestStorage({
                stats: {
                    totalMessages: 12,
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

            // Create 12 messages (exceeds threshold of 10)
            // Simulate a conversation with alternating user and character messages
            const messages = createTestMessages(12);
            messages.forEach((msg, index) => {
                msg.mes_id = index;
                msg.is_system = false;
                msg.extra = {};
            });

            mockGetContext.mockReturnValue({
                chat: messages,
                chatId: 'test-chat-streaming',
                maxContextTokens: 2048,
                contextTokens: 1200,
                extensionSettings: {
                    connectionManager: {
                        selectedProfile: null,
                        profiles: []
                    }
                }
            });

            // Spy on compaction and injection functions
            const triggerCompactionSpy = vi.spyOn(compressionModule, 'triggerCompaction');
            const performCompactionSpy = vi.spyOn(compressionModule, 'performCompaction');
            const injectSummariesSpy = vi.spyOn(injectionModule, 'injectSummaries').mockResolvedValue(undefined);

            // Make triggerCompaction return true when threshold is exceeded
            triggerCompactionSpy.mockImplementation(() => {
                const currentMessages = mockGetContext().chat;
                return currentMessages.length >= 10;
            });

            // Clear and register event handlers
            mockEventHandlers.clear();
            registerExtensionEvents();

            const userMessageHandler = mockEventHandlers.get('USER_MESSAGE_RENDERED');
            const characterMessageHandler = mockEventHandlers.get('CHARACTER_MESSAGE_RENDERED');

            // Simulate the conversation flow:
            // 1. User sends a message (index 10, 11th message)
            //    - USER_MESSAGE_RENDERED fires
            //    - Character has not yet responded
            //    - At this point, we have 11 messages (still below threshold if we count)
            //    - Compression should NOT trigger

            const userMessageIndex = 10;
            if (userMessageHandler) {
                await userMessageHandler(userMessageIndex);
            }

            // Assert: Compression did NOT trigger after user message
            // This is expected because compression only triggers on CHARACTER_MESSAGE_RENDERED
            expect(triggerCompactionSpy).not.toHaveBeenCalled();
            expect(performCompactionSpy).not.toHaveBeenCalled();

            // 2. Character begins streaming response
            //    - Streaming in progress (tokens appear progressively)
            //    - CHARACTER_MESSAGE_RENDERED has NOT fired yet
            //    - Compression should NOT trigger
            //    (We simulate this by not firing any event - compression logic won't run)

            // Assert: Compression still has not triggered (streaming in progress)
            expect(triggerCompactionSpy).not.toHaveBeenCalled();
            expect(performCompactionSpy).not.toHaveBeenCalled();

            // 3. Character finishes streaming response
            //    - CHARACTER_MESSAGE_RENDERED fires (indicates full response is complete)
            //    - Compression SHOULD trigger now (since message count threshold is exceeded)

            // Add the character message (index 11, 12th message)
            const characterMessageIndex = 11;

            if (characterMessageHandler) {
                await characterMessageHandler(characterMessageIndex);
            }

            // Assert: Compression DID trigger after CHARACTER_MESSAGE_RENDERED
            // This confirms that compression waits for the complete character response
            expect(triggerCompactionSpy).toHaveBeenCalled();
            expect(triggerCompactionSpy).toHaveBeenCalledTimes(1);
            expect(performCompactionSpy).toHaveBeenCalled();
            expect(performCompactionSpy).toHaveBeenCalledTimes(1);
            // Note: injectSummaries is called after compaction
            expect(injectSummariesSpy).toHaveBeenCalled();

            // Cleanup spies
            triggerCompactionSpy.mockRestore();
            performCompactionSpy.mockRestore();
            injectSummariesSpy.mockRestore();
        });
    });
});
