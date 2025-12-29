export function createTestStorage(overrides = {}) {
    return {
        enabled: true,
        lastSummarizedIndex: -1,
        level0: { startIndex: 0, messages: [] },
        level1: { summaries: [] },
        level2: { summaries: [] },
        level3: { summary: null },
        stats: {
            totalMessages: 0,
            summarizedMessages: 0,
            currentCompressionRatio: 0,
            lastCompactTime: null
        },
        ...overrides
    };
}
