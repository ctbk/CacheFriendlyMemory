import { describe, it, expect, vi, beforeEach } from 'vitest';
import { debugLog } from '../../../src/utils/debug.js';
import { mockGetGlobalSetting } from '../../setup.js';

describe('debugLog', () => {
    const originalConsole = global.console;

    beforeEach(() => {
        vi.clearAllMocks();
        mockGetGlobalSetting.mockReset();
        global.console = originalConsole;
        // Ensure console.log is a mock function from setup
        global.console.log = vi.fn();
    });

    it('should call console.log when debugMode is true', () => {
        mockGetGlobalSetting.mockReturnValue(true);

        debugLog('Test message', { data: 'value' });

        expect(mockGetGlobalSetting).toHaveBeenCalledWith('debugMode');
        expect(console.log).toHaveBeenCalledWith('Test message', { data: 'value' });
    });

    it('should NOT call console.log when debugMode is false', () => {
        mockGetGlobalSetting.mockReturnValue(false);

        debugLog('This should not be logged');

        expect(mockGetGlobalSetting).toHaveBeenCalledWith('debugMode');
        expect(console.log).not.toHaveBeenCalled();
    });

    it('should handle missing debugMode setting (undefined)', () => {
        mockGetGlobalSetting.mockReturnValue(undefined);

        debugLog('This should not be logged');

        expect(mockGetGlobalSetting).toHaveBeenCalledWith('debugMode');
        expect(console.log).not.toHaveBeenCalled();
    });

    it('should handle console being undefined', () => {
        mockGetGlobalSetting.mockReturnValue(true);

        // Temporarily set console to undefined
        const originalConsole = global.console;
        global.console = undefined;

        // Should not throw an error
        expect(() => {
            debugLog('This should not cause an error');
        }).not.toThrow();

        // Restore console
        global.console = originalConsole;

        // Verify that the global console.log mock was not called
        // (since console was undefined when debugLog was called)
        expect(console.log).not.toHaveBeenCalled();
    });

    it('should handle multiple arguments correctly', () => {
        mockGetGlobalSetting.mockReturnValue(true);

        debugLog('First', 'Second', { third: 'object' }, 4, ['array']);

        expect(console.log).toHaveBeenCalledWith(
            'First',
            'Second',
            { third: 'object' },
            4,
            ['array']
        );
    });

    it('should handle empty arguments', () => {
        mockGetGlobalSetting.mockReturnValue(true);

        debugLog();

        expect(console.log).toHaveBeenCalledWith();
    });

    it('should call getGlobalSetting only once per call', () => {
        mockGetGlobalSetting.mockReturnValue(true);

        debugLog('Test message');

        expect(mockGetGlobalSetting).toHaveBeenCalledTimes(1);
    });
});
