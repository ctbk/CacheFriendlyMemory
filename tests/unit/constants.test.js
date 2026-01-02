import { describe, it, expect } from 'vitest';
import {
    extensionName,
    extensionFolderPath,
    METADATA_KEY,
    defaultSettings
} from '../../src/constants.js';

describe('Constants', () => {
    it('should have correct extension name', () => {
        expect(extensionName).toBe('cacheFriendlyMemory');
    });

    it('should have correct extension folder path', () => {
        expect(extensionFolderPath).toBe('scripts/extensions/third-party/CacheFriendlyMemory');
    });

    it('should have correct metadata key', () => {
        expect(METADATA_KEY).toBe('cacheFriendlyMemory');
    });

    it('should have frozen default settings', () => {
        expect(Object.isFrozen(defaultSettings)).toBe(true);
    });

    it('should have all required default settings', () => {
        expect(defaultSettings.enabled).toBe(true);
        expect(defaultSettings.autoCompact).toBe(true);
        expect(defaultSettings.compactThreshold).toBe(120);
        expect(defaultSettings.contextThreshold).toBe(75);
        expect(defaultSettings.level1ChunkSize).toBe(10);
        expect(defaultSettings.level2ChunkSize).toBe(5);
        expect(defaultSettings.targetCompression).toBe(55);
        expect(defaultSettings.compressionProfileId).toBe('');
        expect(defaultSettings.debugMode).toBe(false);
        expect(defaultSettings.showProgressBar).toBe(true);
    });

    it('should not allow modification of default settings', () => {
        expect(() => {
            defaultSettings.enabled = false;
        }).toThrow();
    });
});
