import { describe, it, expect, vi, beforeEach } from 'vitest';
import { injectSummaries, clearInjection } from '../../src/injection.js';
import { getChatStorage } from '../../src/storage.js';

const mockSetExtensionPrompt = vi.fn();

vi.mock('../../../../script.js', () => ({
    setExtensionPrompt: vi.fn((...args) => mockSetExtensionPrompt(...args)),
    extension_prompt_types: { IN_CHAT: 0 }
}));

vi.mock('../../src/storage.js', () => ({
    getChatStorage: vi.fn()
}));

describe('Injection Integration', () => {
    beforeEach(() => {
        mockSetExtensionPrompt.mockClear();
        vi.mocked(getChatStorage).mockReset();
    });

    it('should inject summaries when enabled', async () => {
        const storage = {
            injection: { enabled: true, position: 0, depth: 0, scan: true, role: 'system' },
            level1: { summaries: [{ text: 'Chapter 1 summary' }] },
            level2: { summaries: [] },
            level3: { summary: null }
        };

        vi.mocked(getChatStorage).mockReturnValue(storage);

        await injectSummaries();

        expect(mockSetExtensionPrompt).toHaveBeenCalledWith(
            'cacheFriendlyMemory',
            expect.stringContaining('[Chapter 1 summary]'),
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

        expect(mockSetExtensionPrompt).toHaveBeenCalledWith('cacheFriendlyMemory', '', 0);
    });

    it('should clear injection explicitly', async () => {
        await clearInjection();

        expect(mockSetExtensionPrompt).toHaveBeenCalledWith('cacheFriendlyMemory', '', 0);
    });

    it('should inject multi-level summaries', async () => {
        const storage = {
            injection: { enabled: true, position: 0, depth: 0, scan: true, role: 'system' },
            level1: { summaries: [{ text: 'Chapter 1' }, { text: 'Chapter 2' }] },
            level2: { summaries: [{ text: 'Section 1' }] },
            level3: { summary: 'Overall story summary' }
        };

        vi.mocked(getChatStorage).mockReturnValue(storage);

        await injectSummaries();

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
        vi.mocked(getChatStorage).mockReturnValue(null);

        await injectSummaries();

        expect(mockSetExtensionPrompt).toHaveBeenCalled();
    });
});
