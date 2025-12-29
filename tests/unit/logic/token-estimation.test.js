import { describe, it, expect } from 'vitest';
import { estimateTokenCount } from '../../../src/logic/token-estimation.js';

describe('estimateTokenCount', () => {
    it('should estimate tokens based on character length / 4', () => {
        expect(estimateTokenCount('Hello world')).toBe(3);
        expect(estimateTokenCount('')).toBe(0);
        expect(estimateTokenCount('a')).toBe(1);
        expect(estimateTokenCount('abcd')).toBe(1);
        expect(estimateTokenCount('abcde')).toBe(2);
    });

    it('should handle whitespace correctly', () => {
        expect(estimateTokenCount('   ')).toBe(1);
        expect(estimateTokenCount('\n\t')).toBe(1);
    });

    it('should handle longer texts', () => {
        expect(estimateTokenCount('a'.repeat(100))).toBe(25);
        expect(estimateTokenCount('a'.repeat(101))).toBe(26);
    });

    it('should always return a positive number for non-empty strings', () => {
        expect(estimateTokenCount('x')).toBe(1);
        expect(estimateTokenCount('xyz')).toBe(1);
    });
});
