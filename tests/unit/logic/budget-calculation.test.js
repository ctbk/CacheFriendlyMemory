import { describe, it, expect } from 'vitest';
import { calculateBudget } from '../../../src/logic/budget-calculation.js';

describe('calculateBudget', () => {
    it('should calculate budget correctly with typical values', () => {
        const budget = calculateBudget(2048, 512, 200, 100);

        expect(budget.maxContextTokens).toBe(2048);
        expect(budget.currentContextTokens).toBe(512);
        expect(budget.availableTokens).toBe(1748);
        expect(budget.reservedForGeneration).toBe(409);
        expect(budget.budgetForHistory).toBe(827);
    });

    it('should handle zero values', () => {
        const budget = calculateBudget(0, 0, 0, 0);

        expect(budget.maxContextTokens).toBe(0);
        expect(budget.currentContextTokens).toBe(0);
        expect(budget.availableTokens).toBe(0);
        expect(budget.reservedForGeneration).toBe(0);
        expect(budget.budgetForHistory).toBe(0);
    });

    it('should reserve 20% for generation', () => {
        const budget1 = calculateBudget(1000, 0, 0, 0);
        expect(budget1.reservedForGeneration).toBe(200);

        const budget2 = calculateBudget(2000, 0, 0, 0);
        expect(budget2.reservedForGeneration).toBe(400);
    });

    it('should handle edge case with no budget left', () => {
        const budget = calculateBudget(1000, 800, 100, 50);

        expect(budget.budgetForHistory).toBe(-150);
    });
});
