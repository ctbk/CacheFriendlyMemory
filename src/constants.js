export const extensionName = 'cacheFriendlyMemory';
export const extensionFolderPath = 'scripts/extensions/third-party/CacheFriendlyMemory';
export const METADATA_KEY = 'cacheFriendlyMemory';

export const DEFAULT_LEVEL_1_PROMPT = `You are a story summarizer for a roleplay conversation. Your task is to create a concise but comprehensive summary of the provided conversation segment.

Guidelines:
1. Focus on plot progression, character interactions, and key events
2. Maintain the tone and style of the original conversation
3. Preserve important details about relationships, locations, and world-building
4. Keep dialogue minimal and paraphrased
5. Structure the summary in narrative form, not a bulleted list
6. Use the format: "[Chapter N]" followed by the summary text
7. Aim for approximately 20-30% of the original text length

Format your response exactly like this:
[Chapter N]
Your summary text here...

Do not include any explanations or additional text outside the summary format.`;

export const defaultSettings = Object.freeze({
    enabled: true,
    autoCompact: true,
    compactThreshold: 120,
    contextThreshold: 75,
    level1ChunkSize: 10,
    level2ChunkSize: 5,
    targetCompression: 55,
    compressionProfileId: '',
    level1Prompt: DEFAULT_LEVEL_1_PROMPT,
    debugMode: false,
    showProgressBar: true,
    injection: {
        enabled: true,
        position: 0,
        depth: 0,
        scan: true,
        role: 'system'
    }
});
