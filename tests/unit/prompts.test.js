import { describe, it, expect } from 'vitest';
import { loadCompressionPrompt, loadLevel2Prompt, loadLevel3Prompt } from '../../src/prompts.js';

describe('loadCompressionPrompt', () => {
    it('should return compression prompt string', () => {
        const prompt = loadCompressionPrompt();
        expect(typeof prompt).toBe('string');
        expect(prompt.length).toBeGreaterThan(0);
    });

    it('should contain required guidelines', () => {
        const prompt = loadCompressionPrompt();
        expect(prompt).toContain('story summarizer');
        expect(prompt).toContain('roleplay conversation');
        expect(prompt).toContain('[Chapter N]');
    });

    it('should mention 20-30% compression target', () => {
        const prompt = loadCompressionPrompt();
        expect(prompt).toContain('20-30%');
    });
});

describe('loadLevel2Prompt', () => {
    it('should return level2 prompt string', () => {
        const prompt = loadLevel2Prompt();
        expect(typeof prompt).toBe('string');
        expect(prompt.length).toBeGreaterThan(0);
    });

    it('should mention long-term summary', () => {
        const prompt = loadLevel2Prompt();
        expect(prompt).toContain('long-term summary');
        expect(prompt).toContain('chapter summaries');
    });

    it('should mention 30-40% compression target', () => {
        const prompt = loadLevel2Prompt();
        expect(prompt).toContain('30-40%');
    });
});

describe('loadLevel3Prompt', () => {
    it('should return level3 prompt string', () => {
        const prompt = loadLevel3Prompt();
        expect(typeof prompt).toBe('string');
        expect(prompt.length).toBeGreaterThan(0);
    });

    it('should mention story so far', () => {
        const prompt = loadLevel3Prompt();
        expect(prompt).toContain('story so far');
        expect(prompt).toContain('[Story So Far]');
    });

    it('should specify 500-800 words limit', () => {
        const prompt = loadLevel3Prompt();
        expect(prompt).toContain('500-800');
    });
});
