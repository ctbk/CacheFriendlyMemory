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
export const mockGetContext = vi.fn(() => ({ chat: [], chatId: 'test-chat', symbols: { ignore: Symbol('ignore') } }));

// Mock SillyTavern modules globally to prevent browser-dependent imports
vi.mock('../../../../../script.js', () => ({
    setExtensionPrompt: mockSetExtensionPrompt,
    extension_prompt_types: { NONE: -1, IN_PROMPT: 0, IN_CHAT: 1, BEFORE_PROMPT: 2 },
    extension_prompt_roles: { SYSTEM: 0, USER: 1, ASSISTANT: 2 }
}));

vi.mock('../../../../extensions.js', () => ({
    getContext: mockGetContext
}));
