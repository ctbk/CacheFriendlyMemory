import { getChatStorage, getGlobalSetting } from './storage.js';

export async function calculateBudget() {
    const { getContext } = SillyTavern.getContext();
    const context = getContext();

    const maxContextTokens = context.maxContextTokens || 0;
    const currentContextTokens = context.contextTokens || 0;
    const systemPromptTokens = context.systemPromptTokens || 0;
    const characterPromptTokens = context.characterPromptTokens || 0;

    const availableTokens = maxContextTokens - systemPromptTokens - characterPromptTokens;
    const reservedForGeneration = Math.floor(maxContextTokens * 0.2);
    const budgetForHistory = availableTokens - reservedForGeneration - currentContextTokens;

    return {
        maxContextTokens,
        currentContextTokens,
        availableTokens,
        reservedForGeneration,
        budgetForHistory,
    };
}

export async function selectSummaries(budget) {
    const storage = getChatStorage();
    if (!storage) {
        return { level0: [], level1: [], level2: [], level3: null };
    }

    const { chat } = SillyTavern.getContext();
    const rawMessageCount = 20;

    const recentMessages = chat.slice(-rawMessageCount);
    const recentMessagesTokens = recentMessages.reduce((sum, m) => sum + estimateTokenCount(m.mes), 0);

    let remainingBudget = budget.budgetForHistory - recentMessagesTokens;

    if (remainingBudget <= 0) {
        return { level0: recentMessages, level1: [], level2: [], level3: null };
    }

    const level1Summaries = selectLevel1Summaries(storage.level1.summaries, remainingBudget);
    const usedLevel1Tokens = level1Summaries.reduce((sum, s) => sum + s.tokenCount, 0);

    remainingBudget -= usedLevel1Tokens;

    let level2Summaries = [];
    if (remainingBudget > 0) {
        level2Summaries = selectLevel2Summaries(storage.level2.summaries, remainingBudget);
    }

    const usedLevel2Tokens = level2Summaries.reduce((sum, s) => sum + s.tokenCount, 0);

    let level3Summary = null;
    if (remainingBudget - usedLevel2Tokens > 0 && storage.level3.summary) {
        level3Summary = storage.level3.summary;
    }

    return {
        level0: recentMessages,
        level1: level1Summaries,
        level2: level2Summaries,
        level3: level3Summary,
    };
}

function selectLevel1Summaries(summaries, budget) {
    if (summaries.length === 0) return [];

    const sorted = [...summaries].sort((a, b) => b.timestamp - a.timestamp);
    const selected = [];

    let usedTokens = 0;

    for (const summary of sorted) {
        if (usedTokens + summary.tokenCount <= budget) {
            selected.push(summary);
            usedTokens += summary.tokenCount;
        }
    }

    return selected.reverse();
}

function selectLevel2Summaries(summaries, budget) {
    if (summaries.length === 0) return [];

    const sorted = [...summaries].sort((a, b) => b.timestamp - a.timestamp);
    const selected = [];

    let usedTokens = 0;

    for (const summary of sorted) {
        if (usedTokens + summary.tokenCount <= budget) {
            selected.push(summary);
            usedTokens += summary.tokenCount;
        }
    }

    return selected.reverse();
}

export function buildContextFromSummaries(selected) {
    const contextParts = [];

    if (selected.level3) {
        contextParts.push(`[Story So Far]\n${selected.level3}\n`);
    }

    if (selected.level2.length > 0) {
        contextParts.push('[Previous Chapters]');
        selected.level2.forEach(s => {
            contextParts.push(s.text);
        });
        contextParts.push('');
    }

    if (selected.level1.length > 0) {
        contextParts.push('[Recent Events]');
        selected.level1.forEach(s => {
            contextParts.push(s.text);
        });
        contextParts.push('');
    }

    return contextParts.join('\n');
}

function estimateTokenCount(text) {
    return Math.ceil(text.length / 4);
}
