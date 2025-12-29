export function createTestMessages(count = 10) {
    return Array.from({ length: count }, (_, i) => ({
        name: i % 2 === 0 ? 'User' : 'Bot',
        mes: `Message ${i}`
    }));
}

export function createLongTestMessages(count = 120) {
    return Array.from({ length: count }, (_, i) => ({
        name: i % 2 === 0 ? 'User' : 'Bot',
        mes: `This is a longer message number ${i} with some additional text to make it more realistic. It contains multiple sentences. Each sentence adds more content.`
    }));
}
