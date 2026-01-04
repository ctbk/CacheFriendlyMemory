import { describe, it, expect } from 'vitest';
import { createFakeSummary } from '../../../src/logic/fake-summarizer.js';

describe('createFakeSummary - Multi-Line Format Tests', () => {
    // Task 1.1: Test single message with less than 25 words
    it('should include all words when message has less than 25 words', () => {
        // Arrange
        const messages = [
            { mes: 'Hello world this is a test message' }
        ];

        // Act
        const result = createFakeSummary(messages);

        // Assert
        expect(result).toContain('[Test Compressed Chunk]');
        expect(result).toContain('[0]');
        expect(result).toContain('Hello world this is a test message');
    });

    // Task 1.2: Test single message with exactly 25 words
    it('should include exactly 25 words when message has 25 words', () => {
        // Arrange
        const words = Array.from({ length: 25 }, (_, i) => `word${i}`);
        const messages = [
            { mes: words.join(' ') }
        ];

        // Act
        const result = createFakeSummary(messages);

        // Assert
        expect(result).toContain('[Test Compressed Chunk]');
        expect(result).toContain('[0]');
        expect(result).toContain(words.join(' '));
    });

    // Task 1.3: Test single message with more than 25 words (truncation)
    it('should truncate to first 25 words when message has more than 25 words', () => {
        // Arrange
        const allWords = Array.from({ length: 30 }, (_, i) => `word${i}`);
        const first25Words = allWords.slice(0, 25).join(' ');
        const twentySixthWord = allWords[25];
        const messages = [
            { mes: allWords.join(' ') }
        ];

        // Act
        const result = createFakeSummary(messages);

        // Assert
        expect(result).toContain('[Test Compressed Chunk]');
        expect(result).toContain('[0]');
        expect(result).toContain(first25Words);
        expect(result).not.toContain(twentySixthWord);
    });

    // Task 1.4: Test multiple messages (3-5 messages)
    it('should include each message on a separate line with correct indices', () => {
        // Arrange
        const messages = [
            { mes: 'First message here' },
            { mes: 'Second message content' },
            { mes: 'Third message text' },
            { mes: 'Fourth message data' },
            { mes: 'Fifth message words' }
        ];

        // Act
        const result = createFakeSummary(messages);

        // Assert
        expect(result).toContain('[Test Compressed Chunk]');
        expect(result).toContain('[0] First message here');
        expect(result).toContain('[1] Second message content');
        expect(result).toContain('[2] Third message text');
        expect(result).toContain('[3] Fourth message data');
        expect(result).toContain('[4] Fifth message words');
    });

    // Task 1.5: Test empty message content
    it('should show only index when message has empty content', () => {
        // Arrange
        const messages = [
            { mes: '' }
        ];

        // Act
        const result = createFakeSummary(messages);

        // Assert
        expect(result).toContain('[Test Compressed Chunk]');
        expect(result).toContain('[0]');
        // The line should be "[0]" with no text after it
        const lines = result.split('\n');
        const messageLine = lines.find(line => line.startsWith('[0]'));
        expect(messageLine).toBe('[0]');
    });

    // Task 1.6: Test missing `mes` field
    it('should show only index when message is missing mes field', () => {
        // Arrange
        const messages = [
            { name: 'User' } // No mes field
        ];

        // Act
        const result = createFakeSummary(messages);

        // Assert
        expect(result).toContain('[Test Compressed Chunk]');
        expect(result).toContain('[0]');
        // The line should be "[0]" with no text after it
        const lines = result.split('\n');
        const messageLine = lines.find(line => line.startsWith('[0]'));
        expect(messageLine).toBe('[0]');
    });

    // Task 1.7: Test whitespace-only message
    it('should show only index when message has only whitespace', () => {
        // Arrange
        const messages = [
            { mes: '   ' }
        ];

        // Act
        const result = createFakeSummary(messages);

        // Assert
        expect(result).toContain('[Test Compressed Chunk]');
        expect(result).toContain('[0]');
        // The line should be "[0]" with no text after it
        const lines = result.split('\n');
        const messageLine = lines.find(line => line.startsWith('[0]'));
        expect(messageLine).toBe('[0]');
    });

    // Task 1.8: Test fixed header format
    it('should always use fixed header format [Test Compressed Chunk]', () => {
        // Arrange
        const messages = [
            { mes: 'Any message' }
        ];

        // Act
        const result = createFakeSummary(messages);

        // Assert
        const lines = result.split('\n');
        expect(lines[0]).toBe('[Test Compressed Chunk]');
    });

    // Task 1.9: Test null/undefined input (existing behavior)
    it('should return [Test Summary] No messages for null input', () => {
        // Arrange
        const messages = null;

        // Act
        const result = createFakeSummary(messages);

        // Assert
        expect(result).toBe('[Test Summary] No messages');
    });

    it('should return [Test Summary] No messages for undefined input', () => {
        // Arrange
        const messages = undefined;

        // Act
        const result = createFakeSummary(messages);

        // Assert
        expect(result).toBe('[Test Summary] No messages');
    });

    // Task 1.10: Test empty array input (existing behavior)
    it('should return [Test Summary] No messages for empty array', () => {
        // Arrange
        const messages = [];

        // Act
        const result = createFakeSummary(messages);

        // Assert
        expect(result).toBe('[Test Summary] No messages');
    });

    // Additional test: Verify word splitting on multiple spaces
    it('should handle multiple spaces between words', () => {
        // Arrange
        const messages = [
            { mes: 'Word1    Word2     Word3' }
        ];

        // Act
        const result = createFakeSummary(messages);

        // Assert
        expect(result).toContain('[0]');
        expect(result).toContain('Word1 Word2 Word3'); // Single spaces in output
    });

    // Additional test: Verify correct index order
    it('should maintain correct index order for messages', () => {
        // Arrange
        const messages = [
            { mes: 'Alpha' },
            { mes: 'Beta' },
            { mes: 'Gamma' }
        ];

        // Act
        const result = createFakeSummary(messages);
        const lines = result.split('\n');

        // Assert
        const alphaIndex = lines.findIndex(l => l.includes('[0]'));
        const betaIndex = lines.findIndex(l => l.includes('[1]'));
        const gammaIndex = lines.findIndex(l => l.includes('[2]'));

        expect(alphaIndex).toBeGreaterThan(0); // After header
        expect(betaIndex).toBeGreaterThan(alphaIndex);
        expect(gammaIndex).toBeGreaterThan(betaIndex);
    });
});
