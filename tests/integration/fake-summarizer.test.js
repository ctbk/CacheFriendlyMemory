import { describe, it, expect } from 'vitest';
import { createFakeSummary } from '../../src/logic/fake-summarizer.js';

describe('Fake Summarizer Integration', () => {
    it('should generate summaries in correct format', () => {
        const messages = [
            { mes: 'First message with several words' },
            { mes: 'Second message in between' },
            { mes: 'Last message with several words' }
        ];

        const summary = createFakeSummary(messages);

        expect(summary).toContain('[Test]');
        expect(summary).toContain('...');
        expect(summary).toContain('First message with several');
        expect(summary).toContain('Last message with several');
    });

    it('should work with realistic message chunks', () => {
        const messages = Array.from({ length: 10 }, (_, i) => ({
            mes: `This is message number ${i} with some content to make it more realistic. It contains multiple sentences.`
        }));

        const summary = createFakeSummary(messages);

        expect(summary).toContain('[Test]');
        expect(summary).toContain('This is message number 0');
        expect(summary).toContain('realistic. It contains multiple sentences.');
    });

    it('should handle chunk boundaries correctly', () => {
        const chunkStart = [
            { mes: 'First message of the chunk' },
            { mes: 'Second message of the chunk' },
            { mes: 'Third message of the chunk' }
        ];

        const summary = createFakeSummary(chunkStart);

        expect(summary).toBe('[Test] First message of the chunk ... Third message of the chunk');
    });
});
