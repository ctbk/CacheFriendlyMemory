export function shouldTriggerCompaction(unsummarizedCount, contextSize,
                                          currentContext, compactThreshold,
                                          contextThreshold, autoCompact) {
    if (!autoCompact) {
        return false;
    }

    const contextPercentage = contextSize > 0 ? (currentContext / contextSize) * 100 : 0;

    if (unsummarizedCount >= compactThreshold || contextPercentage >= contextThreshold) {
        return true;
    }

    return false;
}
