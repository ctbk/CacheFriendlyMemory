import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    startCompactionProgress,
    updateCompactionProgress,
    completeCompactionProgress,
    hideCompactionProgress,
    getProgressPercentage
} from '../../src/progress.js';

// Mock UI functions
vi.mock('../../ui/progress.js', () => ({
    showProgressToast: vi.fn(),
    updateProgressToast: vi.fn(),
    hideProgressToast: vi.fn(),
    showInlineProgress: vi.fn(),
    hideInlineProgress: vi.fn()
}));

// Mock storage module for getGlobalSetting
vi.mock('../../src/storage.js', () => ({
    getGlobalSetting: vi.fn(),
    setGlobalSetting: vi.fn()
}));

describe('Progress Manager', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset progress state before each test
        hideCompactionProgress();
    });

    describe('initialization', () => {
        it('should initialize with zero progress when no compaction has started', () => {
            expect(getProgressPercentage()).toBe(0);
        });
    });

    describe('startCompactionProgress', () => {
        it('should set total batches and reset counter to zero', () => {
            startCompactionProgress(10);

            expect(getProgressPercentage()).toBe(0);
        });

        it('should handle zero batches gracefully', () => {
            startCompactionProgress(0);

            expect(getProgressPercentage()).toBe(0);
        });

        it('should handle single batch', () => {
            startCompactionProgress(1);

            expect(getProgressPercentage()).toBe(0);
        });

        it('should override existing progress state when called again', () => {
            // Start with 10 batches
            startCompactionProgress(10);
            updateCompactionProgress(5, 10);
            expect(getProgressPercentage()).toBe(50);

            // Restart with different batch count
            startCompactionProgress(5);
            expect(getProgressPercentage()).toBe(0);
        });
    });

    describe('updateCompactionProgress', () => {
        beforeEach(() => {
            startCompactionProgress(10);
        });

        it('should update progress correctly when batch increments', () => {
            updateCompactionProgress(3, 10);
            expect(getProgressPercentage()).toBe(30);
        });

        it('should handle progress reaching 100%', () => {
            updateCompactionProgress(10, 10);
            expect(getProgressPercentage()).toBe(100);
        });

        it('should handle partial progress correctly', () => {
            updateCompactionProgress(1, 3);
            expect(getProgressPercentage()).toBe(33);
        });

        it('should handle decimal percentage by flooring', () => {
            updateCompactionProgress(1, 7);
            expect(getProgressPercentage()).toBe(14); // 1/7 ≈ 14.2857%, floored to 14%
        });

        it('should handle zero current batch', () => {
            updateCompactionProgress(0, 10);
            expect(getProgressPercentage()).toBe(0);
        });

        it('should update total batches when provided', () => {
            startCompactionProgress(5);
            updateCompactionProgress(3, 8); // Update with different total
            expect(getProgressPercentage()).toBe(37); // 3/8 = 37.5%, floored to 37%
        });
    });

    describe('getProgressPercentage', () => {
        it('should calculate percentage correctly for various fractions', () => {
            const testCases = [
                { current: 0, total: 10, expected: 0 },
                { current: 1, total: 10, expected: 10 },
                { current: 2, total: 10, expected: 20 },
                { current: 5, total: 10, expected: 50 },
                { current: 10, total: 10, expected: 100 },
                { current: 1, total: 3, expected: 33 },
                { current: 2, total: 3, expected: 66 },
                { current: 1, total: 7, expected: 14 },
                { current: 99, total: 100, expected: 99 }
            ];

            testCases.forEach(({ current, total, expected }) => {
                startCompactionProgress(total);
                updateCompactionProgress(current, total);
                expect(getProgressPercentage()).toBe(expected);
            });
        });

        it('should return 0 when total batches is 0 (avoid division by zero)', () => {
            startCompactionProgress(0);
            expect(getProgressPercentage()).toBe(0);
        });

        it('should return 0 when no progress has been started', () => {
            expect(getProgressPercentage()).toBe(0);
        });
    });

    describe('completeCompactionProgress', () => {
        beforeEach(() => {
            startCompactionProgress(10);
            updateCompactionProgress(5, 10);
        });

        it('should handle successful completion', () => {
            expect(() => {
                completeCompactionProgress(true, 'Compaction completed');
            }).not.toThrow();
        });

        it('should handle failed completion with error message', () => {
            expect(() => {
                completeCompactionProgress(false, 'Compaction failed');
            }).not.toThrow();
        });

        it('should handle completion with null message', () => {
            expect(() => {
                completeCompactionProgress(true, null);
            }).not.toThrow();
        });

        it('should handle completion with undefined message', () => {
            expect(() => {
                completeCompactionProgress(false, undefined);
            }).not.toThrow();
        });
    });

    describe('hideCompactionProgress', () => {
        beforeEach(() => {
            startCompactionProgress(10);
            updateCompactionProgress(5, 10);
        });

        it('should reset progress state', () => {
            hideCompactionProgress();

            expect(getProgressPercentage()).toBe(0);
        });

        it('should be callable multiple times without errors', () => {
            expect(() => {
                hideCompactionProgress();
                hideCompactionProgress();
                hideCompactionProgress();
            }).not.toThrow();
        });

        it('should reset progress even when compaction was at 100%', () => {
            updateCompactionProgress(10, 10);
            expect(getProgressPercentage()).toBe(100);

            hideCompactionProgress();

            expect(getProgressPercentage()).toBe(0);
        });
    });

    describe('integration scenarios', () => {
        it('should simulate full compaction flow', () => {
            // Calculate total batches (10 messages, chunk size 3)
            const targetMessages = 10;
            const chunkSize = 3;
            const totalBatches = Math.ceil(targetMessages / chunkSize); // Should be 4

            // Start compaction
            startCompactionProgress(totalBatches);
            expect(getProgressPercentage()).toBe(0);

            // Process each batch
            for (let i = 1; i <= totalBatches; i++) {
                updateCompactionProgress(i, totalBatches);
                const expectedPercent = Math.floor((i / totalBatches) * 100);
                expect(getProgressPercentage()).toBe(expectedPercent);
            }

            // Complete compaction
            completeCompactionProgress(true, 'Compacted 10 messages');
        });

        it('should handle restarting compaction after completion', () => {
            // First compaction
            startCompactionProgress(5);
            updateCompactionProgress(5, 5);
            expect(getProgressPercentage()).toBe(100);

            completeCompactionProgress(true, 'Done');

            // Second compaction with different batch count
            startCompactionProgress(3);
            expect(getProgressPercentage()).toBe(0);

            updateCompactionProgress(1, 3);
            expect(getProgressPercentage()).toBe(33);
        });

        it('should handle compaction interruption and restart', () => {
            startCompactionProgress(10);
            updateCompactionProgress(7, 10);
            expect(getProgressPercentage()).toBe(70);

            // Interrupt (e.g., error)
            completeCompactionProgress(false, 'Error occurred');

            // Restart
            startCompactionProgress(8);
            expect(getProgressPercentage()).toBe(0);
        });
    });

    describe('error handling (Task 6)', () => {
        let consoleWarnSpy;

        beforeEach(() => {
            consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            startCompactionProgress(10);
        });

        afterEach(() => {
            consoleWarnSpy.mockRestore();
        });

        it('should handle UI errors in startCompactionProgress gracefully', async () => {
            // Mock UI function to throw an error
            const { showProgressToast } = await import('../../ui/progress.js');
            vi.mocked(showProgressToast).mockImplementation(() => {
                throw new Error('UI error');
            });

            // Should not throw
            expect(() => {
                startCompactionProgress(5);
            }).not.toThrow();

            // Should log warning
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                '[CacheFriendlyMemory] Failed to show progress UI:',
                expect.any(Error)
            );

            // Progress state should still be updated
            expect(getProgressPercentage()).toBe(0);
        });

        it('should handle UI errors in updateCompactionProgress gracefully', async () => {
            const { updateProgressToast } = await import('../../ui/progress.js');
            vi.mocked(updateProgressToast).mockImplementation(() => {
                throw new Error('UI update error');
            });

            // Should not throw
            expect(() => {
                updateCompactionProgress(3, 10);
            }).not.toThrow();

            // Should log warning
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                '[CacheFriendlyMemory] Failed to update progress UI:',
                expect.any(Error)
            );

            // Progress state should still be updated
            expect(getProgressPercentage()).toBe(30);
        });

        it('should handle UI errors in completeCompactionProgress gracefully', async () => {
            const { hideProgressToast, hideInlineProgress } = await import('../../ui/progress.js');
            vi.mocked(hideProgressToast).mockImplementation(() => {
                throw new Error('Hide toast error');
            });
            vi.mocked(hideInlineProgress).mockImplementation(() => {
                throw new Error('Hide inline error');
            });

            // Should not throw
            expect(() => {
                completeCompactionProgress(true, 'Done');
            }).not.toThrow();

            // Should log warning
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                '[CacheFriendlyMemory] Failed to complete progress UI:',
                expect.any(Error)
            );

            // Progress state should still be reset
            expect(getProgressPercentage()).toBe(0);
        });

        it('should always reset progress state even when UI hide fails', async () => {
            const { hideProgressToast } = await import('../../ui/progress.js');
            vi.mocked(hideProgressToast).mockImplementation(() => {
                throw new Error('Hide error');
            });

            updateCompactionProgress(5, 10);
            expect(getProgressPercentage()).toBe(50);

            completeCompactionProgress(false, 'Error');

            // Progress should be reset despite UI error
            expect(getProgressPercentage()).toBe(0);
        });
    });

    describe('debug logging (Task 7)', () => {
        let consoleLogSpy;
        let getGlobalSettingMock;

        beforeEach(async () => {
            consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            // Get the mock for getGlobalSetting
            const storageModule = await import('../../src/storage.js');
            getGlobalSettingMock = vi.mocked(storageModule.getGlobalSetting);
        });

        afterEach(() => {
            consoleLogSpy.mockRestore();
            getGlobalSettingMock.mockReset();
        });

        it('should log progress start when debug mode is enabled', () => {
            getGlobalSettingMock.mockReturnValue(true);

            startCompactionProgress(5);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                '[CacheFriendlyMemory] DEBUG - Starting compaction progress: totalBatches=5'
            );
        });

        it('should suppress progress start logging when debug mode is disabled', () => {
            getGlobalSettingMock.mockReturnValue(false);

            startCompactionProgress(5);

            expect(consoleLogSpy).not.toHaveBeenCalled();
        });

        it('should log progress updates when debug mode is enabled', () => {
            getGlobalSettingMock.mockReturnValue(true);

            startCompactionProgress(10);
            consoleLogSpy.mockClear(); // Clear previous logs

            updateCompactionProgress(3, 10);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                '[CacheFriendlyMemory] DEBUG - Compaction progress: 3/10 batches (30%)'
            );
        });

        it('should suppress progress updates logging when debug mode is disabled', () => {
            getGlobalSettingMock.mockReturnValue(false);

            startCompactionProgress(10);
            updateCompactionProgress(3, 10);

            expect(consoleLogSpy).not.toHaveBeenCalled();
        });

        it('should log progress completion when debug mode is enabled', () => {
            getGlobalSettingMock.mockReturnValue(true);

            startCompactionProgress(5);
            updateCompactionProgress(5, 5);
            consoleLogSpy.mockClear(); // Clear previous logs

            completeCompactionProgress(true, 'Compacted 10 messages');

            expect(consoleLogSpy).toHaveBeenCalledWith(
                '[CacheFriendlyMemory] DEBUG - Compaction progress completed: Compacted 10 messages'
            );
        });

        it('should log progress completion without message when debug mode is enabled', () => {
            getGlobalSettingMock.mockReturnValue(true);

            startCompactionProgress(5);
            consoleLogSpy.mockClear(); // Clear previous logs

            completeCompactionProgress(true, null);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                '[CacheFriendlyMemory] DEBUG - Compaction progress completed'
            );
        });

        it('should suppress progress completion logging when debug mode is disabled', () => {
            getGlobalSettingMock.mockReturnValue(false);

            startCompactionProgress(5);
            updateCompactionProgress(5, 5);
            completeCompactionProgress(true, 'Compacted 10 messages');

            expect(consoleLogSpy).not.toHaveBeenCalled();
        });

        it('should log all debug messages during full compaction flow when debug mode is enabled', () => {
            getGlobalSettingMock.mockReturnValue(true);

            // Start
            startCompactionProgress(4);
            expect(consoleLogSpy).toHaveBeenCalledWith(
                '[CacheFriendlyMemory] DEBUG - Starting compaction progress: totalBatches=4'
            );

            consoleLogSpy.mockClear();

            // Update batches
            updateCompactionProgress(1, 4);
            expect(consoleLogSpy).toHaveBeenCalledWith(
                '[CacheFriendlyMemory] DEBUG - Compaction progress: 1/4 batches (25%)'
            );

            consoleLogSpy.mockClear();
            updateCompactionProgress(2, 4);
            expect(consoleLogSpy).toHaveBeenCalledWith(
                '[CacheFriendlyMemory] DEBUG - Compaction progress: 2/4 batches (50%)'
            );

            consoleLogSpy.mockClear();
            updateCompactionProgress(3, 4);
            expect(consoleLogSpy).toHaveBeenCalledWith(
                '[CacheFriendlyMemory] DEBUG - Compaction progress: 3/4 batches (75%)'
            );

            consoleLogSpy.mockClear();
            updateCompactionProgress(4, 4);
            expect(consoleLogSpy).toHaveBeenCalledWith(
                '[CacheFriendlyMemory] DEBUG - Compaction progress: 4/4 batches (100%)'
            );

            consoleLogSpy.mockClear();

            // Complete
            completeCompactionProgress(true, 'Compacted 12 messages');
            expect(consoleLogSpy).toHaveBeenCalledWith(
                '[CacheFriendlyMemory] DEBUG - Compaction progress completed: Compacted 12 messages'
            );
        });
    });
});
