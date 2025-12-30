export function createFakeSummary(messages) {
    if (!messages || messages.length === 0) {
        return '[Test Summary] No messages';
    }

    const firstMessage = messages[0].mes || '';
    const lastMessage = messages[messages.length - 1].mes || '';

    const firstWords = firstMessage.split(/\s+/).filter(w => w).slice(0, 5).join(' ');
    const lastWords = lastMessage.split(/\s+/).filter(w => w).slice(-5).join(' ');

    return `[Test] ${firstWords} ... ${lastWords}`;
}
