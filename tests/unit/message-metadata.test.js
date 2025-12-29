import { describe, it, expect, beforeEach } from 'vitest';
import {
    setMessageMetadata,
    getMessageMetadata,
    isMessageSummarized,
    getCompressionLevel,
    markMessageSummarized,
    markMessageActive,
    countMessagesByLevel,
    getUnsummarizedCount,
    getSummarizedCount
} from '../../src/message-metadata.js';

describe('Message Metadata', () => {
    let mockMessage;

    beforeEach(() => {
        mockMessage = { is_system: false, extra: {} };
    });

    describe('setMessageMetadata', () => {
        it('should set metadata on message', () => {
            setMessageMetadata(mockMessage, 'test', 'value');
            expect(getMessageMetadata(mockMessage, 'test')).toBe('value');
        });

        it('should initialize extra object if missing', () => {
            delete mockMessage.extra;
            setMessageMetadata(mockMessage, 'test', 'value');
            expect(mockMessage.extra).toBeDefined();
        });
    });

    describe('getMessageMetadata', () => {
        it('should retrieve stored value', () => {
            setMessageMetadata(mockMessage, 'test', 'value');
            expect(getMessageMetadata(mockMessage, 'test')).toBe('value');
        });

        it('should return undefined for non-existent key', () => {
            expect(getMessageMetadata(mockMessage, 'nonexistent')).toBeUndefined();
        });
    });

    describe('isMessageSummarized', () => {
        it('should return false for new message', () => {
            expect(isMessageSummarized(mockMessage)).toBe(false);
        });

        it('should return true for summarized message', () => {
            markMessageSummarized(mockMessage, 1, 'test-id');
            expect(isMessageSummarized(mockMessage)).toBe(true);
        });

        it('should return false when compressionLevel is null', () => {
            mockMessage.extra = { cacheFriendlyMemory: { compressionLevel: null } };
            expect(isMessageSummarized(mockMessage)).toBe(false);
        });
    });

    describe('getCompressionLevel', () => {
        it('should return null for active message', () => {
            expect(getCompressionLevel(mockMessage)).toBeNull();
        });

        it('should return level for summarized message', () => {
            markMessageSummarized(mockMessage, 1, 'test-id');
            expect(getCompressionLevel(mockMessage)).toBe(1);
        });

        it('should return correct level for each level', () => {
            markMessageSummarized(mockMessage, 2, 'test-id');
            expect(getCompressionLevel(mockMessage)).toBe(2);

            markMessageSummarized(mockMessage, 3, 'test-id');
            expect(getCompressionLevel(mockMessage)).toBe(3);
        });
    });

    describe('markMessageSummarized', () => {
        it('should set all required fields', () => {
            markMessageSummarized(mockMessage, 1, 'summary-123');

            expect(getMessageMetadata(mockMessage, 'compressionLevel')).toBe(1);
            expect(getMessageMetadata(mockMessage, 'summaryId')).toBe('summary-123');
            expect(getMessageMetadata(mockMessage, 'included')).toBe(false);
            expect(getMessageMetadata(mockMessage, 'timestamp')).toBeGreaterThan(0);
        });
    });

    describe('markMessageActive', () => {
        it('should clear all summary fields', () => {
            markMessageSummarized(mockMessage, 1, 'summary-123');
            markMessageActive(mockMessage);

            expect(getMessageMetadata(mockMessage, 'compressionLevel')).toBeNull();
            expect(getMessageMetadata(mockMessage, 'summaryId')).toBeNull();
            expect(getMessageMetadata(mockMessage, 'included')).toBe(true);
            expect(getMessageMetadata(mockMessage, 'timestamp')).toBeNull();
        });
    });

    describe('countMessagesByLevel', () => {
        it('should count messages correctly', () => {
            const chat = [
                { is_system: false, extra: {} },
                { is_system: true, extra: {} },
                { is_system: false, extra: { cacheFriendlyMemory: { compressionLevel: 1 } } },
                { is_system: false, extra: {} },
                { is_system: false, extra: { cacheFriendlyMemory: { compressionLevel: 2 } } }
            ];

            const counts = countMessagesByLevel(chat);
            expect(counts.total).toBe(4);
            expect(counts.level0).toBe(2);
            expect(counts.level1).toBe(1);
            expect(counts.level2).toBe(1);
            expect(counts.level3).toBe(0);
        });

        it('should handle empty chat', () => {
            const counts = countMessagesByLevel([]);
            expect(counts.total).toBe(0);
            expect(counts.level0).toBe(0);
        });

        it('should count messages with null compressionLevel as level0', () => {
            const chat = [
                { is_system: false, extra: { cacheFriendlyMemory: { compressionLevel: null } } },
                { is_system: false, extra: { cacheFriendlyMemory: { compressionLevel: 1 } } }
            ];

            const counts = countMessagesByLevel(chat);
            expect(counts.total).toBe(2);
            expect(counts.level0).toBe(1);
            expect(counts.level1).toBe(1);
        });
    });

    describe('getUnsummarizedCount', () => {
        it('should count only level0 messages', () => {
            const chat = [
                { is_system: false, extra: { cacheFriendlyMemory: { compressionLevel: null } } },
                { is_system: false, extra: { cacheFriendlyMemory: { compressionLevel: 1 } } },
                { is_system: true, extra: { cacheFriendlyMemory: { compressionLevel: null } } },
                { is_system: false, extra: { cacheFriendlyMemory: { compressionLevel: null } } }
            ];

            const count = getUnsummarizedCount(chat);
            expect(count).toBe(2);
        });
    });

    describe('getSummarizedCount', () => {
        it('should count messages with any compression level', () => {
            const chat = [
                { is_system: false, extra: { cacheFriendlyMemory: { compressionLevel: null } } },
                { is_system: false, extra: { cacheFriendlyMemory: { compressionLevel: 1 } } },
                { is_system: false, extra: { cacheFriendlyMemory: { compressionLevel: 2 } } },
                { is_system: false, extra: { cacheFriendlyMemory: { compressionLevel: 3 } } }
            ];

            const count = getSummarizedCount(chat);
            expect(count).toBe(3);
        });
    });
});
