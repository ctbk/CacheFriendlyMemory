import { extension_settings } from '../../../../extensions.js';
import { extensionName, extensionFolderPath, defaultSettings } from '../src/constants.js';
import { getGlobalSetting, setGlobalSetting, getChatStorage, exportChatData, importChatData, restoreDefaults } from '../src/storage.js';

export async function loadSettings() {
    extension_settings[extensionName] = extension_settings[extensionName] || {};
    

    Object.assign(extension_settings[extensionName], {
        ...defaultSettings,
        ...extension_settings[extensionName],
    });

    const settingsHtml = await $.get(`${extensionFolderPath}/templates/settings.html`);
    $('#extensions_settings2').append(settingsHtml);

    bindUIElements();

    updateUI();

    refreshStatus();

    console.log(`[${extensionName}] Settings loaded`);
}

function bindUIElements() {
    const settings = extension_settings[extensionName];

    $('#cfm_enabled').on('change', function() {
        settings.enabled = $(this).is(':checked');
        setGlobalSetting('enabled', settings.enabled);
    });

    $('#cfm_autoCompact').on('change', function() {
        settings.autoCompact = $(this).is(':checked');
        setGlobalSetting('autoCompact', settings.autoCompact);
    });

    $('#cfm_debugMode').on('change', function() {
        settings.debugMode = $(this).is(':checked');
        setGlobalSetting('debugMode', settings.debugMode);
    });

    $('#cfm_showProgressBar').on('change', function() {
        settings.showProgressBar = $(this).is(':checked');
        setGlobalSetting('showProgressBar', settings.showProgressBar);
    });

    $('#cfm_compactThreshold').on('change', function() {
        const value = parseInt($(this).val());
        settings.compactThreshold = isNaN(value) ? 120 : value;
        $(this).val(settings.compactThreshold);
        setGlobalSetting('compactThreshold', settings.compactThreshold);
    });

    $('#cfm_contextThreshold').on('change', function() {
        const value = parseInt($(this).val());
        settings.contextThreshold = isNaN(value) ? 75 : value;
        $(this).val(settings.contextThreshold);
        setGlobalSetting('contextThreshold', settings.contextThreshold);
    });

    $('#cfm_level1ChunkSize').on('change', function() {
        const value = parseInt($(this).val());
        settings.level1ChunkSize = isNaN(value) ? 10 : value;
        $(this).val(settings.level1ChunkSize);
        setGlobalSetting('level1ChunkSize', settings.level1ChunkSize);
    });

    $('#cfm_level2ChunkSize').on('change', function() {
        const value = parseInt($(this).val());
        settings.level2ChunkSize = isNaN(value) ? 5 : value;
        $(this).val(settings.level2ChunkSize);
        setGlobalSetting('level2ChunkSize', settings.level2ChunkSize);
    });

    $('#cfm_targetCompression').on('change', function() {
        const value = parseInt($(this).val());
        settings.targetCompression = isNaN(value) ? 55 : value;
        $(this).val(settings.targetCompression);
        setGlobalSetting('targetCompression', settings.targetCompression);
    });

    $('#cfm_compressionModel').on('change', function() {
        settings.compressionModel = $(this).val();
        setGlobalSetting('compressionModel', settings.compressionModel);
    });

    $('#cfm_compressionPreset').on('change', function() {
        settings.compressionPreset = $(this).val();
        setGlobalSetting('compressionPreset', settings.compressionPreset);
    });

    $('#cfm_compact_btn').on('click', async () => {
        const { performCompaction } = await import('../src/compression.js');
        await performCompaction();
        refreshStatus();
    });

    $('#cfm_export_btn').on('click', () => {
        exportChatData();
    });

    $('#cfm_import_btn').on('click', () => {
        const input = $('<input type="file" accept="application/json">');
        input.on('change', (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                importChatData(event.target.result);
            };
            reader.readAsText(file);
        });
        input.click();
    });

    $('#cfm_restore_btn').on('click', async () => {
        try {
            const restored = await restoreDefaults();
            if (restored) {
                updateUI();
                refreshStatus();
            }
        } catch (error) {
            console.error(`[${extensionName}] Error restoring defaults:`, error);
        }
    });

    $('#cfm-injection-enabled').on('change', async function() {
        const { getInjectionSetting, setInjectionSetting } = await import('../src/storage.js');
        const { injectSummaries, clearInjection } = await import('../src/injection.js');

        await setInjectionSetting('enabled', $(this).is(':checked'));

        if ($(this).is(':checked')) {
            await injectSummaries();
        } else {
            await clearInjection();
        }
    });
}

function updateUI() {
    const settings = extension_settings[extensionName];

    if (settings?.debugMode) {
        console.debug(`[${extensionName}] updateUI called with:`, JSON.stringify(settings, null, 2));
    }

    $('#cfm_enabled').prop('checked', settings.enabled);
    $('#cfm_autoCompact').prop('checked', settings.autoCompact);
    $('#cfm_debugMode').prop('checked', settings.debugMode);
    $('#cfm_showProgressBar').prop('checked', settings.showProgressBar);

    $('#cfm_compactThreshold').val(settings.compactThreshold);
    $('#cfm_contextThreshold').val(settings.contextThreshold);
    $('#cfm_level1ChunkSize').val(settings.level1ChunkSize);
    $('#cfm_level2ChunkSize').val(settings.level2ChunkSize);
    $('#cfm_targetCompression').val(settings.targetCompression);
    $('#cfm_compressionModel').val(settings.compressionModel);
    $('#cfm_compressionPreset').val(settings.compressionPreset);

    const storage = getChatStorage();
    if (storage) {
        $('#cfm-injection-enabled').prop('checked', storage.injection?.enabled ?? true);
    }
}

function refreshStatus() {
    const storage = getChatStorage();

    if (storage) {
        const unsummarized = storage.stats.totalMessages - storage.stats.summarizedMessages;
        
        $('#cfm_stat_totalMessages').text(storage.stats.totalMessages);
        $('#cfm_stat_summarizedMessages').text(storage.stats.summarizedMessages);
        $('#cfm_stat_unsummarizedMessages').text(unsummarized);
        $('#cfm_stat_compressionRatio').text((storage.stats.currentCompressionRatio * 100).toFixed(1));
        
        if (storage.stats.lastCompactTime) {
            $('#cfm_stat_lastCompactTime').text(new Date(storage.stats.lastCompactTime).toLocaleString());
        } else {
            $('#cfm_stat_lastCompactTime').text('Never');
        }
        
        $('#cfm_stat_level1Count').text(storage.level1.summaries.length);
        $('#cfm_stat_level2Count').text(storage.level2.summaries.length);
    } else {
        $('#cfm_status').html('<p>No chat loaded</p>');
    }
}
