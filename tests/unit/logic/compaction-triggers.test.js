import { describe, it, expect } from 'vitest';
import { shouldTriggerCompaction } from '../../../src/logic/compaction-triggers.js';

describe('shouldTriggerCompaction', () => {
    it('should not trigger when autoCompact is disabled', () => {
        const result = shouldTriggerCompaction(150, 2048, 1024, 120, 75, false);
        expect(result).toBe(false);
    });

    it('should trigger when unsummarized count exceeds threshold', () => {
        const result = shouldTriggerCompaction(130, 2048, 512, 120, 75, true);
        expect(result).toBe(true);
    });

    it('should trigger when context percentage exceeds threshold', () => {
        const result = shouldTriggerCompaction(100, 2048, 1600, 120, 75, true);
        expect(result).toBe(true);
    });

    it('should not trigger when neither threshold exceeded', () => {
        const result = shouldTriggerCompaction(100, 2048, 1024, 120, 75, true);
        expect(result).toBe(false);
    });

    it('should handle zero context size', () => {
        const result = shouldTriggerCompaction(100, 0, 0, 120, 75, true);
        expect(result).toBe(false);
    });

    it('should trigger on message count threshold exactly', () => {
        const result = shouldTriggerCompaction(120, 2048, 512, 120, 75, true);
        expect(result).toBe(true);
    });

    it('should trigger on context percentage threshold exactly', () => {
        const result = shouldTriggerCompaction(100, 2048, 1536, 120, 75, true);
        expect(result).toBe(true);
    });
});
