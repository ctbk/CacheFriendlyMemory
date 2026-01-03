import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock storage module
vi.mock('../../../src/storage.js', () => ({
    getGlobalSetting: vi.fn((key) => {
        if (key === 'showProgressBar') return true;
        return undefined;
    })
}));

import {
    showProgressToast,
    updateProgressToast,
    hideProgressToast,
    showInlineProgress,
    hideInlineProgress,
    showCompletionToast
} from '../../../ui/progress.js';

describe('Progress UI', () => {
    const mockElement = {
        style: {},
        textContent: ''
    };

    // Mock jQuery find chain
    const mockFindResult = {
        length: 1
    };
    mockFindResult[0] = mockElement;

    const mockToast = {
        find: vi.fn().mockReturnValue(mockFindResult),
        remove: vi.fn()
    };

    // Mock toastr
    const mockToastr = {
        info: vi.fn().mockReturnValue(mockToast),
        success: vi.fn(),
        error: vi.fn(),
        remove: vi.fn()
    };

    beforeEach(() => {
        vi.clearAllMocks();

        // Reset element state
        mockElement.style = {};
        mockElement.textContent = '';

        // Mock global toastr
        global.toastr = mockToastr;

        // Mock document.querySelector
        global.document = {
            querySelector: vi.fn()
        };
    });

    afterEach(() => {
        // Clean up mocks
        delete global.toastr;
        delete global.document;
    });

    describe('showProgressToast', () => {
        it('should create toast with plain text (no spinner icon)', () => {
            showProgressToast(1, 10, 10);

            expect(mockToastr.info).toHaveBeenCalledWith(
                expect.not.stringContaining('fa-circle-notch'),
                'Compaction Progress',
                expect.any(Object)
            );
        });

        it('should create toast with correct progress text', () => {
            showProgressToast(3, 10, 30);

            expect(mockToastr.info).toHaveBeenCalledWith(
                'Compacting: 3/10 batches (30%)',
                'Compaction Progress',
                expect.any(Object)
            );
        });

        it('should create toast with close button', () => {
            showProgressToast(1, 10, 10);

            expect(mockToastr.info).toHaveBeenCalledWith(
                expect.any(String),
                'Compaction Progress',
                expect.objectContaining({
                    closeButton: true
                })
            );
        });

        it('should handle different progress values', () => {
            showProgressToast(5, 20, 25);

            expect(mockToastr.info).toHaveBeenCalledWith(
                expect.stringContaining('Compacting: 5/20 batches (25%)'),
                'Compaction Progress',
                expect.any(Object)
            );
        });
    });

    describe('updateProgressToast', () => {
        it('should update existing toast text via DOM manipulation', () => {
            // Show initial toast
            mockToastr.info.mockReturnValueOnce(mockToast);
            showProgressToast(1, 10, 10);

            // Update toast
            updateProgressToast(3, 10, 30);

            // Verify direct DOM update (no remove/recreate)
            expect(mockToastr.remove).not.toHaveBeenCalled();
            expect(mockToastr.info).toHaveBeenCalledTimes(1);
            expect(mockToast.find).toHaveBeenCalledWith('.toast-message');
            expect(mockElement.textContent).toBe('Compacting: 3/10 batches (30%)');
        });

        it('should handle update with new total batches', () => {
            mockToastr.info.mockReturnValueOnce(mockToast);
            showProgressToast(1, 10, 10);
            updateProgressToast(2, 15, 13);

            expect(mockElement.textContent).toBe('Compacting: 2/15 batches (13%)');
        });

        it('should handle update to 100%', () => {
            mockToastr.info.mockReturnValueOnce(mockToast);
            showProgressToast(1, 10, 10);
            updateProgressToast(10, 10, 100);

            expect(mockElement.textContent).toBe('Compacting: 10/10 batches (100%)');
        });
    });

    describe('hideProgressToast', () => {
        it('should remove the toast', () => {
            showProgressToast(1, 10, 10);
            hideProgressToast();

            expect(mockToast.remove).toHaveBeenCalled();
        });

        it('should be callable multiple times without errors', () => {
            showProgressToast(1, 10, 10);

            expect(() => {
                hideProgressToast();
                hideProgressToast();
                hideProgressToast();
            }).not.toThrow();
        });

        it('should handle case when no toast exists', () => {
            expect(() => {
                hideProgressToast();
            }).not.toThrow();
        });
    });

    describe('edge cases', () => {
        it('should handle toastr not being defined', () => {
            delete global.toastr;

            expect(() => {
                showProgressToast(1, 10, 10);
                updateProgressToast(2, 10, 20);
                hideProgressToast();
            }).not.toThrow();
        });
    });

    describe('showInlineProgress', () => {
        it('should update settings panel element if visible', () => {
            global.document = {
                querySelector: vi.fn().mockReturnValue(mockElement)
            };

            showInlineProgress(3, 10, 30);

            expect(mockElement.textContent).toBe('Compacting: 3/10 batches (30%)');
        });

        it('should do nothing if element missing', () => {
            global.document = {
                querySelector: vi.fn().mockReturnValue(null)
            };

            expect(() => {
                showInlineProgress(3, 10, 30);
            }).not.toThrow();
        });

        it('should handle different progress values', () => {
            global.document = {
                querySelector: vi.fn().mockReturnValue(mockElement)
            };

            showInlineProgress(5, 20, 25);

            expect(mockElement.textContent).toContain('Compacting: 5/20 batches (25%)');
        });
    });

    describe('hideInlineProgress', () => {
        it('should hide the inline progress element', () => {
            global.document = {
                querySelector: vi.fn().mockReturnValue(mockElement)
            };

            // Show progress first
            showInlineProgress(3, 10, 30);
            expect(mockElement.textContent).toContain('Compacting: 3/10 batches (30%)');

            // Hide progress
            hideInlineProgress();
            expect(mockElement.style.display).toBe('none');
        });

        it('should handle case when element missing', () => {
            global.document = {
                querySelector: vi.fn().mockReturnValue(null)
            };

            expect(() => {
                hideInlineProgress();
            }).not.toThrow();
        });

        it('should be callable multiple times without errors', () => {
            global.document = {
                querySelector: vi.fn().mockReturnValue(mockElement)
            };

            expect(() => {
                hideInlineProgress();
                hideInlineProgress();
                hideInlineProgress();
            }).not.toThrow();
        });
    });

    describe('showCompletionToast', () => {
        it('should show success toast with 2-second TTL', () => {
            showCompletionToast('Compacted 50 messages', false);

            expect(mockToastr.success).toHaveBeenCalledWith(
                'Compacted 50 messages',
                'Compaction Complete',
                expect.objectContaining({
                    timeOut: 2000,
                    closeButton: false
                })
            );
        });

        it('should show error toast with 2-second TTL', () => {
            showCompletionToast('API error occurred', true);

            expect(mockToastr.error).toHaveBeenCalledWith(
                'API error occurred',
                'Compaction Failed',
                expect.objectContaining({
                    timeOut: 2000,
                    closeButton: false
                })
            );
        });

        it('should use default message if none provided', () => {
            showCompletionToast('', false);

            expect(mockToastr.success).toHaveBeenCalledWith(
                expect.any(String),
                'Compaction Complete',
                expect.any(Object)
            );
        });

        it('should handle toastr not being defined', () => {
            delete global.toastr;

            expect(() => {
                showCompletionToast('Test message', false);
            }).not.toThrow();
        });
    });
});
