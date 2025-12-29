import { describe, it, expect } from 'vitest';
import { buildContextFromSummaries } from '../../../src/logic/context-building.js';

describe('buildContextFromSummaries', () => {
    it('should return empty string for no summaries', () => {
        const result = buildContextFromSummaries({
            level3: null,
            level2: [],
            level1: []
        });

        expect(result).toBe('');
    });

    it('should include level3 story so far', () => {
        const result = buildContextFromSummaries({
            level3: 'The story so far...',
            level2: [],
            level1: []
        });

        expect(result).toContain('[Story So Far]');
        expect(result).toContain('The story so far...');
    });

    it('should include level2 previous chapters', () => {
        const result = buildContextFromSummaries({
            level3: null,
            level2: [
                { text: 'Chapter 1 summary' },
                { text: 'Chapter 2 summary' }
            ],
            level1: []
        });

        expect(result).toContain('[Previous Chapters]');
        expect(result).toContain('Chapter 1 summary');
        expect(result).toContain('Chapter 2 summary');
    });

    it('should include level1 recent events', () => {
        const result = buildContextFromSummaries({
            level3: null,
            level2: [],
            level1: [
                { text: 'Recent event 1' },
                { text: 'Recent event 2' }
            ]
        });

        expect(result).toContain('[Recent Events]');
        expect(result).toContain('Recent event 1');
        expect(result).toContain('Recent event 2');
    });

    it('should combine all levels in correct order', () => {
        const result = buildContextFromSummaries({
            level3: 'Story summary',
            level2: [{ text: 'L2 summary' }],
            level1: [{ text: 'L1 summary' }]
        });

        const lines = result.split('\n');
        expect(lines[0]).toContain('[Story So Far]');
        const l2Index = lines.findIndex(l => l.includes('[Previous Chapters]'));
        const l1Index = lines.findIndex(l => l.includes('[Recent Events]'));
        expect(l2Index).toBeGreaterThan(0);
        expect(l1Index).toBeGreaterThan(l2Index);
    });
});
