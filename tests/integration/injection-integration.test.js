import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockSetExtensionPrompt, mockGetChatStorage, mockGetInjectionSetting } from '../setup.js';
import { injectSummaries, clearInjection } from '../../src/injection.js';

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
});
