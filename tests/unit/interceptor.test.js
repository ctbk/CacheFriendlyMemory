import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cacheFriendlyMemoryInterceptor } from '../../src/interceptor.js';
import { getChatStorage } from '../../src/storage.js';

vi.mock('../../../../extensions.js', () => ({
    getContext: vi.fn(() => ({
        chat: [],
        symbols: { ignore: Symbol('IGNORE') }
    }))
}));

vi.mock('../../src/storage.js', () => ({
    getChatStorage: vi.fn()
}));

describe('Interceptor Module', () => {
    let mockChat;
    let mockContext;
    let IGNORE_SYMBOL;

    beforeEach(() => {
        IGNORE_SYMBOL = Symbol('IGNORE');
        mockContext = {
            chat: [],
            symbols: { ignore: IGNORE_SYMBOL }
        };

        mockChat = [
            { is_system: false, extra: {} },
            { is_system: false, extra: { cacheFriendlyMemory: { compressionLevel: 1 } } },
            { is_system: false, extra: { cacheFriendlyMemory: { compressionLevel: null } } },
            { is_system: false, extra: { cacheFriendlyMemory: { compressionLevel: 2 } } }
        ];

        vi.mocked(getContext).mockReturnValue(mockContext);
    });

    describe('cacheFriendlyMemoryInterceptor', () => {
        it('should filter out summarized messages when injection enabled', () => {
            const storage = { injection: { enabled: true } };
            vi.mocked(getChatStorage).mockReturnValue(storage);

            const chat = [...mockChat];
            cacheFriendlyMemoryInterceptor(chat, 2048, () => {}, 'generate');

            expect(chat[0].extra).not.toHaveProperty(IGNORE_SYMBOL);
            expect(chat[1].extra).toHaveProperty(IGNORE_SYMBOL);
            expect(chat[2].extra).not.toHaveProperty(IGNORE_SYMBOL);
            expect(chat[3].extra).toHaveProperty(IGNORE_SYMBOL);
        });

        it('should not filter when injection disabled', () => {
            const storage = { injection: { enabled: false } };
            vi.mocked(getChatStorage).mockReturnValue(storage);

            const chat = [...mockChat];
            cacheFriendlyMemoryInterceptor(chat, 2048, () => {}, 'generate');

            expect(chat[0].extra).not.toHaveProperty(IGNORE_SYMBOL);
            expect(chat[1].extra).not.toHaveProperty(IGNORE_SYMBOL);
            expect(chat[2].extra).not.toHaveProperty(IGNORE_SYMBOL);
            expect(chat[3].extra).not.toHaveProperty(IGNORE_SYMBOL);
        });

        it('should clone messages to avoid permanent changes', () => {
            const storage = { injection: { enabled: true } };
            vi.mocked(getChatStorage).mockReturnValue(storage);

            const chat = [...mockChat];
            const originalChat = structuredClone(mockChat);
            cacheFriendlyMemoryInterceptor(chat, 2048, () => {}, 'generate');

            expect(originalChat[1].extra).not.toHaveProperty(IGNORE_SYMBOL);
            expect(chat[1].extra).toHaveProperty(IGNORE_SYMBOL);
        });

        it('should handle continue type correctly', () => {
            const storage = { injection: { enabled: true } };
            vi.mocked(getChatStorage).mockReturnValue(storage);

            const chat = [...mockChat];
            cacheFriendlyMemoryInterceptor(chat, 2048, () => {}, 'continue');

            expect(chat[0].extra).not.toHaveProperty(IGNORE_SYMBOL);
            expect(chat[1].extra).toHaveProperty(IGNORE_SYMBOL);
            expect(chat[2].extra).not.toHaveProperty(IGNORE_SYMBOL);
        });

        it('should handle null storage gracefully', () => {
            vi.mocked(getChatStorage).mockReturnValue(null);

            const chat = [...mockChat];
            cacheFriendlyMemoryInterceptor(chat, 2048, () => {}, 'generate');

            expect(chat[0].extra).not.toHaveProperty(IGNORE_SYMBOL);
        });

        it('should export interceptor to global scope', () => {
            expect(globalThis.cacheFriendlyMemoryInterceptor).toBeDefined();
        });
    });
});
