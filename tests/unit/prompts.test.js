import { describe, it, expect, beforeEach } from 'vitest';
import { loadCompressionPrompt, loadLevel2Prompt, loadLevel3Prompt } from '../../src/prompts.js';
import { mockExtensionSettings } from '../setup.js';
import { DEFAULT_LEVEL_1_PROMPT } from '../../src/constants.js';

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

describe('loadCompressionPrompt', () => {
    beforeEach(() => {
        mockExtensionSettings.cacheFriendlyMemory = undefined;
    });

    it('should return default prompt when extensionSettings.cacheFriendlyMemory is undefined', () => {
        const prompt = loadCompressionPrompt();
        expect(prompt).toBe(DEFAULT_LEVEL_1_PROMPT);
    });

    it('should return default prompt when extensionSettings.cacheFriendlyMemory.level1Prompt is undefined', () => {
        mockExtensionSettings.cacheFriendlyMemory = {};
        const prompt = loadCompressionPrompt();
        expect(prompt).toBe(DEFAULT_LEVEL_1_PROMPT);
    });

    it('should return default prompt when extensionSettings.cacheFriendlyMemory.level1Prompt is empty string', () => {
        mockExtensionSettings.cacheFriendlyMemory = { level1Prompt: '' };
        const prompt = loadCompressionPrompt();
        expect(prompt).toBe(DEFAULT_LEVEL_1_PROMPT);
    });

    it('should return default prompt when extensionSettings.cacheFriendlyMemory.level1Prompt is whitespace only', () => {
        mockExtensionSettings.cacheFriendlyMemory = { level1Prompt: '   ' };
        const prompt = loadCompressionPrompt();
        expect(prompt).toBe(DEFAULT_LEVEL_1_PROMPT);
    });

    it('should return custom prompt when extensionSettings.cacheFriendlyMemory.level1Prompt has a value', () => {
        const customPrompt = 'This is my custom prompt';
        mockExtensionSettings.cacheFriendlyMemory = { level1Prompt: customPrompt };
        const prompt = loadCompressionPrompt();
        expect(prompt).toBe(customPrompt);
    });

    it('should return custom prompt when extensionSettings.cacheFriendlyMemory.level1Prompt has non-empty value with spaces', () => {
        const customPrompt = '  This is my custom prompt with spaces  ';
        mockExtensionSettings.cacheFriendlyMemory = { level1Prompt: customPrompt };
        const prompt = loadCompressionPrompt();
        expect(prompt).toBe(customPrompt);
    });
});
