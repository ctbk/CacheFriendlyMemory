/**
 * Progress Manager Module
 *
 * Manages progress tracking during chat compaction operations.
 * Tracks current batch, total batches, and calculates progress percentage.
 * Integrates with UI functions to display progress to the user.
 */

import {
    showProgressToast,
    updateProgressToast,
    hideProgressToast,
    showInlineProgress,
    hideInlineProgress,
    showCompletionToast
} from '../ui/progress.js';

import { debugLog } from './utils/debug.js';

// Debug message constants for maintainability
const DEBUG_MESSAGES = {
    PROGRESS_START: (totalBatches) =>
        `[CacheFriendlyMemory] DEBUG - Starting compaction progress: totalBatches=${totalBatches}`,
    PROGRESS_UPDATE: (current, total, percentage) =>
        `[CacheFriendlyMemory] DEBUG - Compaction progress: ${current}/${total} batches (${percentage}%)`,
    PROGRESS_COMPLETE: (message) =>
        message
            ? `[CacheFriendlyMemory] DEBUG - Compaction progress completed: ${message}`
            : `[CacheFriendlyMemory] DEBUG - Compaction progress completed`
};

// Internal state - not exported
let currentBatch = 0;
let totalBatches = 0;

/**
 * Start progress tracking for a compaction operation.
 * @param {number} totalBatchesCount - Total number of batches to process
 */
export function startCompactionProgress(totalBatchesCount) {
    totalBatches = totalBatchesCount;
    currentBatch = 0;

    // Log debug message
    debugLog(DEBUG_MESSAGES.PROGRESS_START(totalBatches));

    // Show progress UI
    try {
        const percentage = getProgressPercentage();
        showProgressToast(0, totalBatches, percentage);
        showInlineProgress(0, totalBatches, percentage);
    } catch (error) {
        console.warn('[CacheFriendlyMemory] Failed to show progress UI:', error);
    }
}

/**
 * Update progress during compaction.
 * @param {number} batchIndex - Current batch number (1-indexed)
 * @param {number} totalBatchesCount - Total number of batches (optional, uses tracked value if not provided)
 */
export function updateCompactionProgress(batchIndex, totalBatchesCount) {
    currentBatch = batchIndex;
    if (totalBatchesCount !== undefined) {
        totalBatches = totalBatchesCount;
    }

    // Log debug message
    const percentage = getProgressPercentage();
    debugLog(DEBUG_MESSAGES.PROGRESS_UPDATE(currentBatch, totalBatches, percentage));

    // Update progress UI
    try {
        updateProgressToast(currentBatch, totalBatches, percentage);
        showInlineProgress(currentBatch, totalBatches, percentage);
    } catch (error) {
        console.warn('[CacheFriendlyMemory] Failed to update progress UI:', error);
    }
}

/**
 * Complete progress tracking and hide progress indicator.
 * @param {boolean} _success - Whether compaction succeeded (used in Task 2)
 * @param {string} _message - Optional completion/error message (used in Task 2)
 */
export function completeCompactionProgress(_success, _message) {
    // Log debug message
    debugLog(DEBUG_MESSAGES.PROGRESS_COMPLETE(_message));

    // Hide progress UI - always attempt to hide, even if there are errors
    try {
        hideProgressToast();
        hideInlineProgress();
    } catch (error) {
        console.warn('[CacheFriendlyMemory] Failed to complete progress UI:', error);
    }

    // Show completion/error toast with 2-second TTL
    try {
        showCompletionToast(_message || 'Compaction complete', !_success);
    } catch (error) {
        console.warn('[CacheFriendlyMemory] Failed to show completion toast:', error);
    }

    // Always reset progress state, even if UI fails
    hideCompactionProgress();
}

/**
 * Hide progress indicator and reset progress state.
 */
export function hideCompactionProgress() {
    currentBatch = 0;
    totalBatches = 0;
}

/**
 * Get current progress percentage (0-100).
 * @returns {number} Progress percentage
 */
export function getProgressPercentage() {
    if (totalBatches === 0) {
        return 0;
    }
    return Math.floor((currentBatch / totalBatches) * 100);
}
