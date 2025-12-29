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
