import { extension_prompt_types, setExtensionPrompt } from '../../../../../script.js';
import { getChatStorage } from './storage.js';

const EXTENSION_NAME = 'cacheFriendlyMemory';

function collectSummaries() {
    const storage = getChatStorage();
    if (!storage) return '';

    const lines = [];
    lines.push('[Compressed Conversation History]');
    lines.push('');

    if (storage.level3?.summary) {
        lines.push('[Long-term Summary]');
        lines.push(storage.level3.summary);
        lines.push('');
    }

    if (storage.level2?.summaries?.length > 0) {
        lines.push('[Medium-term Summaries]');
        for (let i = 0; i < storage.level2.summaries.length; i++) {
            const summary = storage.level2.summaries[i];
            lines.push(`[Section ${i + 1}] ${summary.text}`);
        }
        lines.push('');
    }

    if (storage.level1?.summaries?.length > 0) {
        lines.push('[Recent Summaries]');
        for (let i = 0; i < storage.level1.summaries.length; i++) {
            const summary = storage.level1.summaries[i];
            lines.push(`[Chapter ${i + 1}] ${summary.text}`);
        }
        lines.push('');
    }

    lines.push('[End Compressed History]');

    return lines.join('\n');
}

export async function injectSummaries() {
    const storage = getChatStorage();
    if (!storage || !storage.injection?.enabled) {
        try {
            setExtensionPrompt(EXTENSION_NAME, '', extension_prompt_types.IN_CHAT, 0);
        } catch (error) {
            console.warn('[CacheFriendlyMemory] Failed to clear injection:', error);
        }
        return;
    }

    const summaryText = collectSummaries();

    if (!summaryText) {
        try {
            setExtensionPrompt(EXTENSION_NAME, '', extension_prompt_types.IN_CHAT, 0);
        } catch (error) {
            console.warn('[CacheFriendlyMemory] Failed to clear injection:', error);
        }
        return;
    }

    try {
        setExtensionPrompt(
            EXTENSION_NAME,
            summaryText,
            storage.injection.position || extension_prompt_types.IN_CHAT,
            storage.injection.depth || 0,
            storage.injection.scan !== false,
            storage.injection.role || 'system'
        );
        console.log('[CacheFriendlyMemory] Summaries injected into context');
    } catch (error) {
        console.error('[CacheFriendlyMemory] Failed to inject summaries:', error);
    }
}

export async function updateInjection() {
    await injectSummaries();
}

export async function clearInjection() {
    try {
        setExtensionPrompt(EXTENSION_NAME, '', extension_prompt_types.IN_CHAT, 0);
        console.log('[CacheFriendlyMemory] Injection cleared');
    } catch (error) {
        console.error('[CacheFriendlyMemory] Failed to clear injection:', error);
    }
}
