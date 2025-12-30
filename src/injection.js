import { extension_prompt_types, extension_prompt_roles, setExtensionPrompt, extension_prompts } from '../../../../../script.js';
import { getChatStorage } from './storage.js';
import { getContext } from '../../../../extensions.js';

/**
 * Debug function to verify injection is in extension_prompts
 * Call this from console: window.cfmDebugInjection()
 */
export function debugInjection() {
    const prompt = extension_prompts['cacheFriendlyMemory'];
    console.log('[CacheFriendlyMemory] DEBUG - extension_prompts keys:', Object.keys(extension_prompts));
    console.log('[CacheFriendlyMemory] DEBUG - our prompt entry:', prompt);
    if (prompt) {
        console.log('[CacheFriendlyMemory] DEBUG - prompt value length:', prompt.value?.length);
        console.log('[CacheFriendlyMemory] DEBUG - prompt position:', prompt.position, '(IN_CHAT=1, IN_PROMPT=0, BEFORE_PROMPT=2)');
        console.log('[CacheFriendlyMemory] DEBUG - prompt depth:', prompt.depth);
        console.log('[CacheFriendlyMemory] DEBUG - prompt role:', prompt.role, '(SYSTEM=0, USER=1, ASSISTANT=2)');
    }
    return prompt;
}

// Expose to window for console debugging
if (typeof window !== 'undefined') {
    window.cfmDebugInjection = debugInjection;
}

const EXTENSION_NAME = 'cacheFriendlyMemory';

/**
 * Convert a role string to the extension_prompt_roles enum value
 * @param {string|number} role - Role as string ('system', 'user', 'assistant') or number
 * @returns {number} The numeric role value
 */
function getRoleValue(role) {
    if (typeof role === 'number') {
        return role;
    }

    switch (role) {
        case 'user':
            return extension_prompt_roles.USER;
        case 'assistant':
            return extension_prompt_roles.ASSISTANT;
        case 'system':
        default:
            return extension_prompt_roles.SYSTEM;
    }
}

export function hasSummaries(storage) {
    if (!storage) return false;

    const hasLevel1 = storage.level1?.summaries?.length > 0;
    const hasLevel2 = storage.level2?.summaries?.length > 0;
    const hasLevel3 = !!storage.level3?.summary;

    return hasLevel1 || hasLevel2 || hasLevel3;
}

function collectSummaries() {
    const storage = getChatStorage();
    if (!storage) {
        console.warn('[CacheFriendlyMemory] collectSummaries - no storage available');
        return '';
    }

    console.log('[CacheFriendlyMemory] collectSummaries - storage state:', {
        level1Count: storage.level1?.summaries?.length || 0,
        level2Count: storage.level2?.summaries?.length || 0,
        hasLevel3: !!storage.level3?.summary,
        chatId: getContext().chatId
    });

    const lines = [];
    lines.push('[Compressed Conversation History]');
    lines.push('');

    console.log('[CacheFriendlyMemory] collectSummaries - level3 summary:', !!storage.level3?.summary);
    if (storage.level3?.summary) {
        lines.push('[Long-term Summary]');
        lines.push(storage.level3.summary);
        lines.push('');
    }

    console.log('[CacheFriendlyMemory] collectSummaries - level2 summaries count:', storage.level2?.summaries?.length || 0);
    if (storage.level2?.summaries?.length > 0) {
        lines.push('[Medium-term Summaries]');
        for (let i = 0; i < storage.level2.summaries.length; i++) {
            const summary = storage.level2.summaries[i];
            lines.push(`[Section ${i + 1}] ${summary.text}`);
        }
        lines.push('');
    }

    console.log('[CacheFriendlyMemory] collectSummaries - level1 summaries count:', storage.level1?.summaries?.length || 0);
    if (storage.level1?.summaries?.length > 0) {
        lines.push('[Recent Summaries]');
        for (let i = 0; i < storage.level1.summaries.length; i++) {
            const summary = storage.level1.summaries[i];
            lines.push(`[Chapter ${i + 1}] ${summary.text}`);
        }
        lines.push('');
    }

    lines.push('[End Compressed History]');

    const result = lines.join('\n');
    console.log('[CacheFriendlyMemory] Summary text length:', result.length);
    if (result.length > 60) {
        console.log('[CacheFriendlyMemory] Summary text preview:', result.substring(0, 100));
    }
    return result;
}

export async function injectSummaries() {
    console.log('[CacheFriendlyMemory] injectSummaries() - START');
    const storage = getChatStorage();
    console.log('[CacheFriendlyMemory] injectSummaries() - storage:', !!storage, 'injection enabled:', storage?.injection?.enabled);
    if (!storage || !storage.injection?.enabled) {
        console.log('[CacheFriendlyMemory] injectSummaries - injection disabled or no storage');
        clearInjection();
        return;
    }

    if (!hasSummaries(storage)) {
        console.log('[CacheFriendlyMemory] No summaries in storage - nothing to inject');
        clearInjection();
        return;
    }

    const summaryText = collectSummaries();

    try {
        const position = storage.injection.position ?? extension_prompt_types.IN_CHAT;
        const depth = storage.injection.depth ?? 0;
        const scan = storage.injection.scan !== false;
        const roleString = storage.injection.role ?? 'system';
        const role = getRoleValue(roleString);

        console.log('[CacheFriendlyMemory] Injection params -- position:', position, 'depth:', depth, 'scan:', scan, 'role:', role, `(${roleString})`);
        setExtensionPrompt(
            EXTENSION_NAME,
            summaryText,
            position,
            depth,
            scan,
            role
        );
        console.log('[CacheFriendlyMemory] Summaries injected into context - text length:', summaryText.length);

        // Verify it was actually set
        const verification = extension_prompts[EXTENSION_NAME];
        if (verification) {
            console.log('[CacheFriendlyMemory] VERIFIED - prompt is in extension_prompts:', {
                hasValue: !!verification.value,
                valueLength: verification.value?.length,
                position: verification.position,
                depth: verification.depth,
                role: verification.role
            });
        } else {
            console.error('[CacheFriendlyMemory] ERROR - prompt NOT found in extension_prompts after setExtensionPrompt!');
        }
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
