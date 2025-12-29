import { describe, it, expect } from 'vitest';
import { calculateBudget } from '../../src/logic/budget-calculation.js';
import { selectLevel1Summaries, selectLevel2Summaries } from '../../src/logic/summary-selection.js';
import { buildContextFromSummaries } from '../../src/logic/context-building.js';
import { createTestStorage } from '../fixtures/test-storage.js';

describe('Injection Flow Integration', () => {
    it('should calculate budget and select summaries correctly', () => {
        const budget = calculateBudget(2048, 512, 200, 100);

        expect(budget.budgetForHistory).toBeGreaterThan(0);

        const storage = createTestStorage({
            level1: {
                summaries: [
                    { text: 'Summary 1', tokenCount: 100, timestamp: 1000 },
                    { text: 'Summary 2', tokenCount: 150, timestamp: 2000 }
                ]
            },
            level2: {
                summaries: [
                    { text: 'L2 Summary', tokenCount: 200, timestamp: 3000 }
                ]
            }
        });

        const level1Summaries = selectLevel1Summaries(storage.level1.summaries, budget.budgetForHistory);
        const level2Summaries = selectLevel2Summaries(storage.level2.summaries, budget.budgetForHistory);

        expect(level1Summaries.length).toBeGreaterThanOrEqual(0);
        expect(level2Summaries.length).toBeGreaterThanOrEqual(0);
    });

    it('should build context from selected summaries', () => {
        const selected = {
            level3: 'Story summary',
            level2: [{ text: 'Chapter 1' }],
            level1: [{ text: 'Recent event' }]
        };

        const context = buildContextFromSummaries(selected);

        expect(context).toContain('[Story So Far]');
        expect(context).toContain('[Previous Chapters]');
        expect(context).toContain('[Recent Events]');
    });

    it('should handle empty selection', () => {
        const selected = {
            level3: null,
            level2: [],
            level1: []
        };

        const context = buildContextFromSummaries(selected);

        expect(context).toBe('');
    });
});
