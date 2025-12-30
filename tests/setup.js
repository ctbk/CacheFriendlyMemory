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
    extension_prompt_types: { IN_CHAT: 0, AFTER_SYSTEM: 1, BEFORE_USER: 2 }
}));

vi.mock('../../../../extensions.js', () => ({
    getContext: mockGetContext
}));
