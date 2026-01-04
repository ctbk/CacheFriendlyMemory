export function createFakeSummary(messages) {
    if (!messages || messages.length === 0) {
        return '[Test Summary] No messages';
    }

    const lines = ['[Test Compressed Chunk]'];

    for (let i = 0; i < messages.length; i++) {
        const message = messages[i];
        const content = message.mes || '';
        const words = content.split(/\s+/).filter(w => w).slice(0, 25).join(' ');

        // Only add space and content if there are words
        if (words) {
            lines.push(`[${i}] ${words}`);
        } else {
            lines.push(`[${i}]`);
        }
    }

    return lines.join('\n');
}
