import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockSetExtensionPrompt, mockGetChatStorage, mockGetInjectionSetting } from '../setup.js';
import { injectSummaries, clearInjection } from '../../src/injection.js';

describe('Injection Module', () => {
    beforeEach(() => {
        mockSetExtensionPrompt.mockClear();
        mockGetChatStorage.mockReset();
        mockGetInjectionSetting.mockClear();
    });

    describe('injectSummaries', () => {
        it('should call mockSetExtensionPrompt with correct text when enabled', async () => {
            const storage = {
                level1: { summaries: [{ text: 'Chapter 1' }] },
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
                expect.stringContaining('[Chapter 1]'),
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

            // When disabled, clearInjection is called which uses IN_PROMPT (0)
            expect(mockSetExtensionPrompt).toHaveBeenCalledWith('cacheFriendlyMemory', '', 0, 0);
        });

        it('should handle null storage gracefully', async () => {
            mockGetChatStorage.mockReturnValue(null);
            mockGetInjectionSetting.mockReturnValue(true);

            await injectSummaries();

            // clearInjection uses IN_PROMPT (0) and depth 0
            expect(mockSetExtensionPrompt).toHaveBeenCalledWith('cacheFriendlyMemory', '', 0, 0);
        });

        it('should format all summary levels correctly', async () => {
            const storage = {
                level1: { summaries: [{ text: 'Chapter 1' }, { text: 'Chapter 2' }] },
                level2: { summaries: [{ text: 'Section 1' }] },
                level3: { summary: 'Story summary' }
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
            expect(injectedText).toContain('Story summary');
            expect(injectedText).toContain('[Medium-term Summaries]');
            expect(injectedText).toContain('[Section 1]');
            expect(injectedText).toContain('[Recent Summaries]');
            expect(injectedText).toContain('[Chapter 1]');
            expect(injectedText).toContain('[Chapter 2]');
            expect(injectedText).toContain('[End Compressed History]');
        });

        it('should handle missing levels', async () => {
            const storage = {
                level1: { summaries: [{ text: 'Chapter 1' }] },
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

            expect(mockSetExtensionPrompt).toHaveBeenCalled();
            const callArgs = mockSetExtensionPrompt.mock.calls[0];
            const injectedText = callArgs[1];

            expect(injectedText).toContain('[Chapter 1]');
            expect(injectedText).not.toContain('[Medium-term Summaries]');
        });

        it('should clear injection when no summaries available', async () => {
            const storage = {
                level1: { summaries: [] },
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

            // When no summaries exist, injection should be cleared
            expect(mockSetExtensionPrompt).toHaveBeenCalledWith('cacheFriendlyMemory', '', 0, 0);
        });
    });

    describe('clearInjection', () => {
        it('should clear extension prompt', async () => {
            await clearInjection();

            // clearInjection uses extension_prompt_types.IN_PROMPT (0) and depth 0
            expect(mockSetExtensionPrompt).toHaveBeenCalledWith('cacheFriendlyMemory', '', 0, 0);
        });
    });
});
