const METADATA_KEY = 'cacheFriendlyMemory';

export function setMessageMetadata(message, key, value) {
    if (!message.extra) {
        message.extra = {};
    }
    if (!message.extra[METADATA_KEY]) {
        message.extra[METADATA_KEY] = {};
    }
    message.extra[METADATA_KEY][key] = value;

    if (message.swipe_id && message.swipe_info?.[message.swipe_id]) {
        if (!message.swipe_info[message.swipe_id].extra) {
            message.swipe_info[message.swipe_id].extra = {};
        }
        message.swipe_info[message.swipe_id].extra[METADATA_KEY] =
            structuredClone(message.extra[METADATA_KEY]);
    }
}

export function getMessageMetadata(message, key) {
    return message.extra?.[METADATA_KEY]?.[key];
}

export function isMessageSummarized(message) {
    const level = getMessageMetadata(message, 'compressionLevel');
    return level !== null && level !== undefined;
}

export function getCompressionLevel(message) {
    const level = getMessageMetadata(message, 'compressionLevel');
    return level ?? null;
}

export function markMessageSummarized(message, level, summaryId) {
    setMessageMetadata(message, 'compressionLevel', level);
    setMessageMetadata(message, 'summaryId', summaryId);
    setMessageMetadata(message, 'included', false);
    setMessageMetadata(message, 'timestamp', Date.now());
}

export function markMessageActive(message) {
    setMessageMetadata(message, 'compressionLevel', null);
    setMessageMetadata(message, 'summaryId', null);
    setMessageMetadata(message, 'included', true);
    setMessageMetadata(message, 'timestamp', null);
}

export function countMessagesByLevel(chat) {
    const counts = { total: 0, level0: 0, level1: 0, level2: 0, level3: 0 };

    for (const message of chat) {
        if (message.is_system) continue;
        counts.total++;

        const level = getCompressionLevel(message);
        if (level === null) {
            counts.level0++;
        } else if (level === 1) {
            counts.level1++;
        } else if (level === 2) {
            counts.level2++;
        } else if (level === 3) {
            counts.level3++;
        }
    }

    return counts;
}

export function getUnsummarizedCount(chat) {
    return chat.filter(m => !m.is_system && getCompressionLevel(m) === null).length;
}

export function getSummarizedCount(chat) {
    return chat.filter(m => !m.is_system && getCompressionLevel(m) !== null).length;
}
