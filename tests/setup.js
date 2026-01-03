import { vi } from 'vitest';

global.console = {
    ...console,
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
};

// Create mock functions that can be accessed by tests
export const mockSetExtensionPrompt = vi.fn();
export const mockGenerateQuietPrompt = vi.fn();
export const mockGetContext = vi.fn(() => ({
    chat: [],
    chatId: 'test-chat',
    symbols: { ignore: Symbol('ignore') },
    extensionSettings: mockExtensionSettings
}));

// Mock functions for storage module
export const mockGetChatStorage = vi.fn();
export const mockGetInjectionSetting = vi.fn();
export const mockGetGlobalSetting = vi.fn();
export const mockExtensionSettings = {
    connectionManager: {
        selectedProfile: null,
        profiles: []
    }
};

// Mock event source with tracking for event handlers
export const mockEventHandlers = new Map();
export const mockEventSource = {
    on: vi.fn((eventType, handler) => {
        mockEventHandlers.set(eventType, handler);
    }),
    removeListener: vi.fn((eventType) => {
        mockEventHandlers.delete(eventType);
    })
};

// Mock SillyTavern modules globally to prevent browser-dependent imports
vi.mock('../../../../../script.js', () => ({
    setExtensionPrompt: mockSetExtensionPrompt,
    generateQuietPrompt: mockGenerateQuietPrompt,
    eventSource: mockEventSource,
    event_types: {
        APP_READY: 'APP_READY',
        CHAT_CHANGED: 'CHAT_CHANGED',
        USER_MESSAGE_RENDERED: 'USER_MESSAGE_RENDERED',
        CHARACTER_MESSAGE_RENDERED: 'CHARACTER_MESSAGE_RENDERED',
        MESSAGE_RECEIVED: 'MESSAGE_RECEIVED',
        GENERATION_AFTER_COMMANDS: 'GENERATION_AFTER_COMMANDS',
        GENERATE_BEFORE_COMBINE_PROMPTS: 'GENERATE_BEFORE_COMBINE_PROMPTS'
    },
    extension_prompts: {},
    saveChatDebounced: vi.fn(),
    extension_prompt_types: { NONE: -1, IN_PROMPT: 0, IN_CHAT: 1, BEFORE_PROMPT: 2 },
    extension_prompt_roles: { SYSTEM: 0, USER: 1, ASSISTANT: 2 }
}));

vi.mock('../../../../extensions.js', () => ({
    getContext: mockGetContext,
    extension_settings: mockExtensionSettings
}));

// Mock storage module globally so all tests can access these mocks
vi.mock('../src/storage.js', () => ({
    getChatStorage: mockGetChatStorage,
    getInjectionSetting: mockGetInjectionSetting,
    saveChatStorage: vi.fn(),
    getGlobalSetting: mockGetGlobalSetting,
    setGlobalSetting: vi.fn(),
    setInjectionSetting: vi.fn()
}));
