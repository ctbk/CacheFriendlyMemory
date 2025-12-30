import { getContext } from '../../../../extensions.js';
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
    const context = getContext();

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

    import('../src/message-metadata.js').then(({ countMessagesByLevel }) => {
        const chat = context.chat || [];
        const counts = countMessagesByLevel(chat);
        const unsummarized = counts.level0;
        const summarized = counts.level1 + counts.level2 + counts.level3;
        const ratio = storage.stats?.currentCompressionRatio ? (storage.stats.currentCompressionRatio * 100).toFixed(1) : '0.0';

        statusBar.innerHTML = `
            <div>CacheFriendlyMemory: ${counts.total} messages</div>
            <div>Unsummarized: ${unsummarized}</div>
            <div>Compression: ${ratio}%</div>
        `;
    }).catch(err => {
        console.warn('[CacheFriendlyMemory] Failed to update status bar:', err);
    });
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
