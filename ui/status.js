import { getChatStorage } from '../src/storage.js';

export function createStatusBar() {
    const statusBar = document.createElement('div');
    statusBar.className = 'cfm-status-bar';
    statusBar.style.cssText = `
        position: fixed;
        bottom: 60px;
        right: 20px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 10px 15px;
        border-radius: 5px;
        font-size: 12px;
        z-index: 9999;
        display: none;
    `;

    updateStatusBar(statusBar);

    return statusBar;
}

export function updateStatusBar(statusBar) {
    const storage = getChatStorage();

    if (!storage) {
        statusBar.style.display = 'none';
        return;
    }

    const showProgressBar = storage.showProgressBar ?? true;

    if (!showProgressBar) {
        statusBar.style.display = 'none';
        return;
    }

    statusBar.style.display = 'block';

    const unsummarized = storage.stats.totalMessages - storage.stats.summarizedMessages;
    const ratio = storage.stats.currentCompressionRatio * 100;

    statusBar.innerHTML = `
        <div>CacheFriendlyMemory: ${storage.stats.totalMessages} messages</div>
        <div>Unsummarized: ${unsummarized}</div>
        <div>Compression: ${ratio.toFixed(1)}%</div>
    `;
}

export function hideStatusBar(statusBar) {
    statusBar.style.display = 'none';
}

export function showStatusBar(statusBar) {
    const storage = getChatStorage();
    if (storage && (storage.showProgressBar ?? true)) {
        statusBar.style.display = 'block';
        updateStatusBar(statusBar);
    }
}
