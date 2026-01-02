export const extensionName = 'cacheFriendlyMemory';
export const extensionFolderPath = 'scripts/extensions/third-party/CacheFriendlyMemory';
export const METADATA_KEY = 'cacheFriendlyMemory';

export const defaultSettings = Object.freeze({
    enabled: true,
    autoCompact: true,
    compactThreshold: 120,
    contextThreshold: 75,
    level1ChunkSize: 10,
    level2ChunkSize: 5,
    targetCompression: 55,
    compressionModel: '',
    compressionPreset: '',
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
