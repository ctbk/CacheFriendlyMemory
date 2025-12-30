import { describe, it, expect } from 'vitest';
import { createFakeSummary } from '../../src/logic/fake-summarizer.js';

describe('createFakeSummary', () => {
    it('should return placeholder for empty message array', () => {
        const result = createFakeSummary([]);
        expect(result).toBe('[Test Summary] No messages');
    });

    it('should return placeholder for null or undefined input', () => {
        expect(createFakeSummary(null)).toBe('[Test Summary] No messages');
        expect(createFakeSummary(undefined)).toBe('[Test Summary] No messages');
    });

    it('should extract first 5 words from single message', () => {
        const messages = [{ mes: 'This is a test message' }];
        const result = createFakeSummary(messages);
        expect(result).toBe('[Test] This is a test message ... This is a test message');
    });

    it('should extract first 5 words from first message and last 5 from last', () => {
        const messages = [
            { mes: 'First message with some words here' },
            { mes: 'Second message in between' },
            { mes: 'Last message with words too' }
        ];
        const result = createFakeSummary(messages);
        expect(result).toBe('[Test] First message with some words ... Last message with words too');
    });

    it('should handle messages with fewer than 5 words', () => {
        const messages = [
            { mes: 'Hi there' },
            { mes: 'Bye now' }
        ];
        const result = createFakeSummary(messages);
        expect(result).toBe('[Test] Hi there ... Bye now');
    });

    it('should handle very short single word messages', () => {
        const messages = [
            { mes: 'Hello' },
            { mes: 'World' }
        ];
        const result = createFakeSummary(messages);
        expect(result).toBe('[Test] Hello ... World');
    });

    it('should handle missing mes field gracefully', () => {
        const messages = [
            {},
            { mes: 'Valid message' }
        ];
        const result = createFakeSummary(messages);
        expect(result).toBe('[Test]  ... Valid message');
    });

    it('should handle special characters and punctuation', () => {
        const messages = [
            { mes: 'Hello, world! How are you?' },
            { mes: 'Goodbye, see you later!' }
        ];
        const result = createFakeSummary(messages);
        expect(result).toBe('[Test] Hello, world! How are you? ... Goodbye, see you later!');
    });

    it('should handle messages with only whitespace', () => {
        const messages = [
            { mes: '   ' },
            { mes: '   ' }
        ];
        const result = createFakeSummary(messages);
        expect(result).toBe('[Test]  ... ');
    });
});
