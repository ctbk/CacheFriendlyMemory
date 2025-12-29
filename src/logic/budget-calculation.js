export function calculateBudget(maxContextTokens, currentContextTokens,
                                 systemPromptTokens, characterPromptTokens) {
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
