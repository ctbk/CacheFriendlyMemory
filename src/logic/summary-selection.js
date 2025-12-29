export function selectLevel1Summaries(summaries, budget) {
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

    return selected;
}
