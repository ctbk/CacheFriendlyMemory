import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockSetExtensionPrompt } from '../setup.js';
import { injectSummaries, clearInjection } from '../../src/injection.js';
import { getChatStorage } from '../../src/storage.js';

vi.mock('../../src/storage.js', () => ({
    getChatStorage: vi.fn()
}));

describe('Injection Module', () => {
    beforeEach(() => {
        mockSetExtensionPrompt.mockClear();
        vi.mocked(getChatStorage).mockReset();
    });

    describe('injectSummaries', () => {
        it('should call mockSetExtensionPrompt with correct text when enabled', async () => {
            const storage = {
                injection: { enabled: true, position: 1, depth: 0, scan: true, role: 'system' },
                level1: { summaries: [{ text: 'Chapter 1' }] },
                level2: { summaries: [] },
                level3: { summary: null }
            };
            vi.mocked(getChatStorage).mockReturnValue(storage);

            await injectSummaries();

            expect(mockSetExtensionPrompt).toHaveBeenCalledWith(
                'cacheFriendlyMemory',
                expect.stringContaining('[Chapter 1]'),
                1,  // IN_CHAT position
                0,
                true,
                0   // SYSTEM role (numeric)
            );
        });

        it('should clear injection when disabled', async () => {
            const storage = {
                injection: { enabled: false }
            };
            vi.mocked(getChatStorage).mockReturnValue(storage);

            await injectSummaries();

            // When disabled, clearInjection is called which uses IN_CHAT (1)
            expect(mockSetExtensionPrompt).toHaveBeenCalledWith('cacheFriendlyMemory', '', 1, 0);
        });

        it('should handle null storage gracefully', async () => {
            vi.mocked(getChatStorage).mockReturnValue(null);

            await injectSummaries();

            expect(mockSetExtensionPrompt).toHaveBeenCalled();
        });

        it('should format all summary levels correctly', async () => {
            const storage = {
                injection: { enabled: true, position: 1, depth: 0, scan: true, role: 'system' },
                level1: { summaries: [{ text: 'Chapter 1' }, { text: 'Chapter 2' }] },
                level2: { summaries: [{ text: 'Section 1' }] },
                level3: { summary: 'Story summary' }
            };
            vi.mocked(getChatStorage).mockReturnValue(storage);

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
                injection: { enabled: true, position: 1, depth: 0, scan: true, role: 'system' },
                level1: { summaries: [{ text: 'Chapter 1' }] },
                level2: { summaries: [] },
                level3: { summary: null }
            };
            vi.mocked(getChatStorage).mockReturnValue(storage);

            await injectSummaries();

            expect(mockSetExtensionPrompt).toHaveBeenCalled();
            const callArgs = mockSetExtensionPrompt.mock.calls[0];
            const injectedText = callArgs[1];

            expect(injectedText).toContain('[Chapter 1]');
            expect(injectedText).not.toContain('[Medium-term Summaries]');
        });

        it('should clear injection when no summaries available', async () => {
            const storage = {
                injection: { enabled: true, position: 1, depth: 0, scan: true, role: 'system' },
                level1: { summaries: [] },
                level2: { summaries: [] },
                level3: { summary: null }
            };
            vi.mocked(getChatStorage).mockReturnValue(storage);

            await injectSummaries();

            // When no summaries exist, injection should be cleared
            expect(mockSetExtensionPrompt).toHaveBeenCalledWith('cacheFriendlyMemory', '', 1, 0);
        });
    });

    describe('clearInjection', () => {
        it('should clear extension prompt', async () => {
            await clearInjection();

            // clearInjection uses extension_prompt_types.IN_CHAT (1) and depth 0
            expect(mockSetExtensionPrompt).toHaveBeenCalledWith('cacheFriendlyMemory', '', 1, 0);
        });
    });
});
