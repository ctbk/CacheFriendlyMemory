/**
 * Progress UI Module
 *
 * Manages visual progress indicators for compaction operations.
 * Displays progress via toast notifications and optional inline progress bar.
 */

import { getGlobalSetting } from '../src/storage.js';

// Progress toast options - no auto-hide (persists during compaction)
const PROGRESS_TOAST_OPTIONS = {
    timeOut: 0,
    extendedTimeOut: 0,
    closeButton: true
};

// Completion toast options - 2-second auto-dismiss
const COMPLETION_TOAST_OPTIONS = {
    timeOut: 2000,
    extendedTimeOut: 0,
    closeButton: false
};

// Store jQuery object for direct updates
let currentToast = null;

/**
 * Format progress text.
 * @param {number} current - Current batch number
 * @param {number} total - Total number of batches
 * @param {number} percentage - Progress percentage (0-100)
 * @returns {string} Formatted progress text with spinner icon
 */
function formatProgressText(current, total, percentage) {
    return `Compacting: ${current}/${total} batches (${percentage}%)`;
}

/**
 * Show progress toast notification.
 * @param {number} current - Current batch number
 * @param {number} total - Total number of batches
 * @param {number} percentage - Progress percentage (0-100)
 */
export function showProgressToast(current, total, percentage) {
    if (typeof toastr === 'undefined') {
        console.warn('[CacheFriendlyMemory] toastr not available');
        return;
    }

    const message = formatProgressText(current, total, percentage);
    currentToast = toastr.info(message, 'Compaction Progress', PROGRESS_TOAST_OPTIONS);
}

/**
 * Update existing progress toast with new values.
 * @param {number} current - Current batch number
 * @param {number} total - Total number of batches
 * @param {number} percentage - Progress percentage (0-100)
 */
export function updateProgressToast(current, total, percentage) {
    if (typeof toastr === 'undefined') {
        console.warn('[CacheFriendlyMemory] toastr not available');
        return;
    }

    if (!currentToast) {
        showProgressToast(current, total, percentage);
        return;
    }

    const message = formatProgressText(current, total, percentage);
    const messageElement = currentToast.find('.toast-message');
    if (messageElement.length > 0) {
        messageElement[0].textContent = message;
    }
}

/**
 * Hide progress toast notification.
 */
export function hideProgressToast() {
    if (typeof toastr === 'undefined') {
        console.warn('[CacheFriendlyMemory] toastr not available');
        return;
    }

    if (currentToast) {
        currentToast.remove();
        currentToast = null;
    }
}

/**
 * Show completion/error toast with auto-dismiss.
 * @param {string} message - Completion or error message
 * @param {boolean} isError - True for error toast, false for success toast
 */
export function showCompletionToast(message, isError = false) {
    if (typeof toastr === 'undefined') {
        console.warn('[CacheFriendlyMemory] toastr not available');
        return;
    }

    const type = isError ? 'error' : 'success';
    const title = isError ? 'Compaction Failed' : 'Compaction Complete';
    toastr[type](message, title, COMPLETION_TOAST_OPTIONS);
}

/**
 * Show inline progress in settings panel.
 * Only displays if showProgressBar setting is enabled.
 * @param {number} current - Current batch number
 * @param {number} total - Total number of batches
 * @param {number} percentage - Progress percentage (0-100)
 */
export function showInlineProgress(current, total, percentage) {
    // Check if inline progress is enabled
    const showProgressBar = getGlobalSetting('showProgressBar');
    if (!showProgressBar) {
        return;
    }

    const element = document.querySelector('#cfm_stat_compactionProgress');
    if (!element) {
        return;
    }

    element.textContent = formatProgressText(current, total, percentage);
}

/**
 * Hide inline progress in settings panel.
 */
export function hideInlineProgress() {
    const element = document.querySelector('#cfm_stat_compactionProgress');
    if (!element) {
        return;
    }

    element.style.display = 'none';
    element.textContent = '';
}
