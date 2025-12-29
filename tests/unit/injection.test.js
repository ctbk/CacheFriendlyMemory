import { describe, it, expect, vi, beforeEach } from 'vitest';
import { injectSummaries, clearInjection } from '../../src/injection.js';
import { getChatStorage } from '../../src/storage.js';

const mockSetExtensionPrompt = vi.fn();

vi.mock('../../../../script.js', () => ({
    getContext: vi.fn(() => ({ chat: [], symbols: { ignore: Symbol('ignore') } })),
    setExtensionPrompt: vi.fn((...args) => mockSetExtensionPrompt(...args)),
    extension_prompt_types: { IN_CHAT: 0, AFTER_SYSTEM: 1, BEFORE_USER: 2 }
}));

vi.mock('../../src/storage.js', () => ({
    getChatStorage: vi.fn()
}));

describe('Injection Module', () => {
    beforeEach(() => {
        mockSetExtensionPrompt.mockClear();
        vi.mocked(getChatStorage).mockReset();
    });

    describe('injectSummaries', () => {
        it('should call setExtensionPrompt with correct text when enabled', async () => {
            const storage = {
                injection: { enabled: true, position: 0, depth: 0, scan: true, role: 'system' },
                level1: { summaries: [{ text: 'Chapter 1' }] },
                level2: { summaries: [] },
                level3: { summary: null }
            };
            vi.mocked(getChatStorage).mockReturnValue(storage);

            await injectSummaries();

            expect(mockSetExtensionPrompt).toHaveBeenCalledWith(
                'cacheFriendlyMemory',
                expect.stringContaining('[Chapter 1]'),
                0,
                0,
                true,
                'system'
            );
        });

        it('should clear injection when disabled', async () => {
            const storage = {
                injection: { enabled: false }
            };
            vi.mocked(getChatStorage).mockReturnValue(storage);

            await injectSummaries();

            expect(mockSetExtensionPrompt).toHaveBeenCalledWith('cacheFriendlyMemory', '', 0, 0);
        });

        it('should handle null storage gracefully', async () => {
            vi.mocked(getChatStorage).mockReturnValue(null);

            await injectSummaries();

            expect(mockSetExtensionPrompt).toHaveBeenCalled();
        });

        it('should format all summary levels correctly', async () => {
            const storage = {
                injection: { enabled: true, position: 0, depth: 0, scan: true, role: 'system' },
                level1: { summaries: [{ text: 'Chapter 1' }, { text: 'Chapter 2' }] },
                level2: { summaries: [{ text: 'Section 1' }] },
                level3: { summary: 'Story summary' }
            };
            vi.mocked(getChatStorage).mockReturnValue(storage);

            await injectSummaries();

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
                injection: { enabled: true, position: 0, depth: 0, scan: true, role: 'system' },
                level1: { summaries: [{ text: 'Chapter 1' }] },
                level3: { summary: null }
            };
            vi.mocked(getChatStorage).mockReturnValue(storage);

            await injectSummaries();

            const callArgs = mockSetExtensionPrompt.mock.calls[0];
            const injectedText = callArgs[1];

            expect(injectedText).toContain('[Chapter 1]');
            expect(injectedText).not.toContain('[Medium-term Summaries]');
        });

        it('should clear injection when no summaries available', async () => {
            const storage = {
                injection: { enabled: true, position: 0, depth: 0, scan: true, role: 'system' },
                level1: { summaries: [] },
                level2: { summaries: [] },
                level3: { summary: null }
            };
            vi.mocked(getChatStorage).mockReturnValue(storage);

            await injectSummaries();

            expect(mockSetExtensionPrompt).toHaveBeenCalledWith(
                'cacheFriendlyMemory',
                expect.stringContaining('[Compressed Conversation History]'),
                0,
                0,
                true,
                'system'
            );
        });
    });

    describe('clearInjection', () => {
        it('should clear extension prompt', async () => {
            await clearInjection();

            expect(mockSetExtensionPrompt).toHaveBeenCalledWith('cacheFriendlyMemory', '', 0, 0);
        });
    });
});
