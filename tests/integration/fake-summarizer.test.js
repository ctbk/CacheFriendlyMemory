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

        expect(summary).toContain('[Test Compressed Chunk]');
        expect(summary).toContain('[0] First message with several words');
        expect(summary).toContain('[1] Second message in between');
        expect(summary).toContain('[2] Last message with several words');
    });

    it('should work with realistic message chunks', () => {
        const messages = Array.from({ length: 10 }, (_, i) => ({
            mes: `This is message number ${i} with some content to make it more realistic. It contains multiple sentences.`
        }));

        const summary = createFakeSummary(messages);

        expect(summary).toContain('[Test Compressed Chunk]');
        expect(summary).toContain('[0] This is message number 0');
        expect(summary).toContain('[9] This is message number 9');
    });

    it('should handle chunk boundaries correctly', () => {
        const chunkStart = [
            { mes: 'First message of the chunk' },
            { mes: 'Second message of the chunk' },
            { mes: 'Third message of the chunk' }
        ];

        const summary = createFakeSummary(chunkStart);

        const lines = summary.split('\n');
        expect(lines[0]).toBe('[Test Compressed Chunk]');
        expect(lines[1]).toBe('[0] First message of the chunk');
        expect(lines[2]).toBe('[1] Second message of the chunk');
        expect(lines[3]).toBe('[2] Third message of the chunk');
    });
});
