import { describe, it, expect } from 'vitest';
import { selectLevel1Summaries, selectLevel2Summaries } from '../../../src/logic/summary-selection.js';

describe('selectLevel1Summaries', () => {
    it('should return empty array for no summaries', () => {
        const result = selectLevel1Summaries([], 1000);
        expect(result).toEqual([]);
    });

    it('should select summaries within budget (most recent first)', () => {
        const summaries = [
            { text: 'Old summary', tokenCount: 100, timestamp: 1000 },
            { text: 'New summary', tokenCount: 100, timestamp: 2000 }
        ];
        const result = selectLevel1Summaries(summaries, 200);

        expect(result).toHaveLength(2);
        expect(result[0].text).toBe('New summary');
        expect(result[1].text).toBe('Old summary');
    });

    it('should stop when budget is exceeded', () => {
        const summaries = [
            { text: 'Summary 1', tokenCount: 100, timestamp: 3000 },
            { text: 'Summary 2', tokenCount: 250, timestamp: 2000 },
            { text: 'Summary 3', tokenCount: 100, timestamp: 1000 }
        ];
        const result = selectLevel1Summaries(summaries, 200);

        expect(result).toHaveLength(2);
        expect(result[0].text).toBe('Summary 1');
        expect(result[1].text).toBe('Summary 3');
    });

    it('should sort by timestamp descending', () => {
        const summaries = [
            { text: 'Oldest', tokenCount: 50, timestamp: 1000 },
            { text: 'Newest', tokenCount: 50, timestamp: 3000 },
            { text: 'Middle', tokenCount: 50, timestamp: 2000 }
        ];
        const result = selectLevel1Summaries(summaries, 200);

        expect(result[0].text).toBe('Newest');
        expect(result[1].text).toBe('Middle');
        expect(result[2].text).toBe('Oldest');
    });

    it('should return summaries in chronological order (oldest first)', () => {
        const summaries = [
            { text: 'Old', tokenCount: 50, timestamp: 1000 },
            { text: 'New', tokenCount: 50, timestamp: 2000 }
        ];
        const result = selectLevel1Summaries(summaries, 200);

        expect(result[0].text).toBe('New');
        expect(result[1].text).toBe('Old');
    });
});

describe('selectLevel2Summaries', () => {
    it('should return empty array for no summaries', () => {
        const result = selectLevel2Summaries([], 1000);
        expect(result).toEqual([]);
    });

    it('should select summaries within budget', () => {
        const summaries = [
            { text: 'Old L2 summary', tokenCount: 200, timestamp: 1000 },
            { text: 'New L2 summary', tokenCount: 200, timestamp: 2000 }
        ];
        const result = selectLevel2Summaries(summaries, 400);

        expect(result).toHaveLength(2);
        expect(result[0].text).toBe('New L2 summary');
        expect(result[1].text).toBe('Old L2 summary');
    });

    it('should stop when budget is exceeded', () => {
        const summaries = [
            { text: 'Summary 1', tokenCount: 300, timestamp: 3000 },
            { text: 'Summary 2', tokenCount: 250, timestamp: 2000 }
        ];
        const result = selectLevel2Summaries(summaries, 400);

        expect(result).toHaveLength(1);
        expect(result[0].text).toBe('Summary 1');
    });
});
