import { vi } from 'vitest';

export function createMockContext(overrides = {}) {
    return {
        chatId: 'test-chat-1',
        chat: [],
        chatMetadata: {},
        maxContextTokens: 2048,
        contextTokens: 512,
        systemPromptTokens: 200,
        characterPromptTokens: 100,
        SlashCommandParser: {
            addCommandObject: vi.fn()
        },
        SlashCommand: {
            fromProps: vi.fn()
        },
        ...overrides
    };
}

export function createMockSillyTavernAPI(context = null) {
    return {
        getContext: () => context || createMockContext(),
        saveMetadata: vi.fn().mockResolvedValue(undefined),
        saveSettingsDebounced: vi.fn(),
        generateQuietPrompt: vi.fn().mockResolvedValue('[Chapter 1] Summary text'),
        extensionSettings: {},
        eventSource: {
            on: vi.fn(),
            removeListener: vi.fn()
        },
        event_types: {
            APP_READY: 'APP_READY',
            CHAT_CHANGED: 'CHAT_CHANGED',
            USER_MESSAGE_RENDERED: 'USER_MESSAGE_RENDERED',
            CHARACTER_MESSAGE_RENDERED: 'CHARACTER_MESSAGE_RENDERED',
            MESSAGE_RECEIVED: 'MESSAGE_RECEIVED'
        },
        extension_settings: {}
    };
}
