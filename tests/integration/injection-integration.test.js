import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockSetExtensionPrompt } from '../setup.js';
import { injectSummaries, clearInjection } from '../../src/injection.js';
import { getChatStorage } from '../../src/storage.js';

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
            injection: { enabled: true, position: 1, depth: 0, scan: true, role: 'system' },
            level1: { summaries: [{ text: 'Chapter 1 summary' }] },
            level2: { summaries: [] },
            level3: { summary: null }
        };

        vi.mocked(getChatStorage).mockReturnValue(storage);

        await injectSummaries();

        expect(mockSetExtensionPrompt).toHaveBeenCalledWith(
            'cacheFriendlyMemory',
            expect.stringContaining('[Chapter 1] Chapter 1 summary'),
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

        // clearInjection uses IN_CHAT (1) and depth 0
        expect(mockSetExtensionPrompt).toHaveBeenCalledWith('cacheFriendlyMemory', '', 1, 0);
    });

    it('should clear injection explicitly', async () => {
        await clearInjection();

        // clearInjection uses extension_prompt_types.IN_CHAT (1) and depth 0
        expect(mockSetExtensionPrompt).toHaveBeenCalledWith('cacheFriendlyMemory', '', 1, 0);
    });

    it('should inject multi-level summaries', async () => {
        const storage = {
            injection: { enabled: true, position: 1, depth: 0, scan: true, role: 'system' },
            level1: { summaries: [{ text: 'Chapter 1' }, { text: 'Chapter 2' }] },
            level2: { summaries: [{ text: 'Section 1' }] },
            level3: { summary: 'Overall story summary' }
        };

        vi.mocked(getChatStorage).mockReturnValue(storage);

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
        vi.mocked(getChatStorage).mockReturnValue(null);

        await injectSummaries();

        expect(mockSetExtensionPrompt).toHaveBeenCalled();
    });
});
