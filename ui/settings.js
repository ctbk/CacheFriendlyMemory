import { extension_settings, getContext } from '../../../../extensions.js';
import { eventSource, event_types } from '../../../../../script.js';
import { extensionName, extensionFolderPath, defaultSettings } from '../src/constants.js';
import { setGlobalSetting, getChatStorage, exportChatData, importChatData, restoreDefaults } from '../src/storage.js';

export function getConnectionProfiles() {
    return extension_settings.connectionManager?.profiles || [];
}

export async function loadSettings() {
    extension_settings[extensionName] = extension_settings[extensionName] || {};
    

    Object.assign(extension_settings[extensionName], {
        ...defaultSettings,
        ...extension_settings[extensionName],
    });

    const settingsHtml = await $.get(`${extensionFolderPath}/templates/settings.html`);
    $('#extensions_settings2').append(settingsHtml);

    bindUIElements();

    bindProfileEvents();

    updateUI();

    refreshStatus();

    refreshCompressionProfileStatus();

    console.log(`[${extensionName}] Settings loaded`);
}

function bindCompressionProfileDropdown() {
    const settings = extension_settings[extensionName];

    function populateDropdown() {
        const profiles = getConnectionProfiles();
        const dropdown = $('#cfm_compressionProfile');
        const currentValue = dropdown.val();

        dropdown.empty();

        const noneOption = $('<option>', {
            value: '',
            text: 'Current'
        });
        dropdown.append(noneOption);

        profiles.forEach(profile => {
            const option = $('<option>', {
                value: profile.id,
                text: profile.name || profile.id
            });
            dropdown.append(option);
        });

        dropdown.val(currentValue);
    }

    populateDropdown();

    $('#cfm_compressionProfile').on('change', function() {
        const value = $(this).val();
        setGlobalSetting('compressionProfileId', value);
        populateDropdown();
        refreshCompressionProfileStatus();
    });

    $('#cfm_compressionProfile').val(settings.compressionProfileId || '');
}

export function updateCompressionProfileUI() {
    const settings = extension_settings[extensionName];
    $('#cfm_compressionProfile').val(settings.compressionProfileId || '');
}

function bindProfileEvents() {
    eventSource.on(event_types.CONNECTION_PROFILE_DELETED, (profileId) => {
        const settings = extension_settings[extensionName];
        if (settings.compressionProfileId === profileId) {
            setGlobalSetting('compressionProfileId', '');
            console.log(`[${extensionName}] Deleted profile ${profileId} was selected, cleared setting`);
            refreshCompressionProfileStatus();
        }
    });

    eventSource.on(event_types.CONNECTION_PROFILE_CREATED, () => {
        const dropdown = $('#cfm_compressionProfile');
        const profiles = getConnectionProfiles();
        const currentValue = dropdown.val();

        profiles.forEach(profile => {
            const option = $('<option>', {
                value: profile.id,
                text: profile.name || profile.id
            });
            if (!dropdown.find(`option[value="${profile.id}"]`).length) {
                dropdown.append(option);
            }
        });

        dropdown.val(currentValue);
        console.log(`[${extensionName}] Refreshed dropdown on profile creation`);
    });

    eventSource.on(event_types.CONNECTION_PROFILE_UPDATED, (profileId) => {
        const settings = extension_settings[extensionName];
        if (settings.compressionProfileId === profileId) {
            const dropdown = $('#cfm_compressionProfile');
            const profiles = getConnectionProfiles();
            const profile = profiles.find(p => p.id === profileId);

            if (profile) {
                const option = dropdown.find(`option[value="${profileId}"]`);
                if (option.length) {
                    option.text(profile.name || profile.id);
                }
                console.log(`[${extensionName}] Updated profile ${profileId} in dropdown`);
                refreshCompressionProfileStatus();
            }
        }
    });
}

export function refreshCompressionProfileStatus() {
    const settings = extension_settings[extensionName];
    const profileId = settings.compressionProfileId;

    if (!profileId) {
        $('#cfm_stat_compressionProfile').text('Current');
        return;
    }

    const profiles = getConnectionProfiles();
    const profile = profiles.find(p => p.id === profileId);

    if (profile) {
        $('#cfm_stat_compressionProfile').text(profile.name || profileId);
    } else {
        $('#cfm_stat_compressionProfile').text('Unknown');
    }
}

function bindUIElements() {
    const settings = extension_settings[extensionName];

    bindCompressionProfileDropdown();

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
        const { setInjectionSetting } = await import('../src/storage.js');
        const { injectSummaries, clearInjection } = await import('../src/injection.js');

        await setInjectionSetting('enabled', $(this).is(':checked'));

        if ($(this).is(':checked')) {
            await injectSummaries();
        } else {
            await clearInjection();
        }
    });

    $('#cfm-injection-position').on('change', async function() {
        const { setInjectionSetting, getInjectionSetting } = await import('../src/storage.js');
        const { injectSummaries } = await import('../src/injection.js');

        const value = parseInt($(this).val());
        await setInjectionSetting('position', value);

        if (getInjectionSetting('enabled')) {
            await injectSummaries();
        }
    });

    $('#cfm-injection-depth').on('change', async function() {
        const { setInjectionSetting, getInjectionSetting } = await import('../src/storage.js');
        const { injectSummaries } = await import('../src/injection.js');

        const value = parseInt($(this).val());
        await setInjectionSetting('depth', isNaN(value) ? 0 : value);

        if (getInjectionSetting('enabled')) {
            await injectSummaries();
        }
    });

    $('#cfm-injection-scan').on('change', async function() {
        const { setInjectionSetting, getInjectionSetting } = await import('../src/storage.js');
        const { injectSummaries } = await import('../src/injection.js');

        await setInjectionSetting('scan', $(this).is(':checked'));

        if (getInjectionSetting('enabled')) {
            await injectSummaries();
        }
    });

    $('#cfm-injection-role').on('change', async function() {
        const { setInjectionSetting, getInjectionSetting } = await import('../src/storage.js');
        const { injectSummaries } = await import('../src/injection.js');

        await setInjectionSetting('role', $(this).val());

        if (getInjectionSetting('enabled')) {
            await injectSummaries();
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
    updateCompressionProfileUI();

    const storage = getChatStorage();
    if (storage) {
        import('../src/storage.js').then(({ getInjectionSetting }) => {
            $('#cfm-injection-enabled').prop('checked', getInjectionSetting('enabled') ?? true);
            $('#cfm-injection-position').val(getInjectionSetting('position') ?? 0);
            $('#cfm-injection-depth').val(getInjectionSetting('depth') ?? 0);
            $('#cfm-injection-scan').prop('checked', getInjectionSetting('scan') !== false);
            $('#cfm-injection-role').val(getInjectionSetting('role') ?? 'system');
        }).catch(err => {
            console.warn('[CacheFriendlyMemory] Failed to get injection settings:', err);
        });
    }
}

function refreshStatus() {
    const storage = getChatStorage();

    if (storage) {
        import('../src/message-metadata.js').then(({ countMessagesByLevel }) => {
            const context = getContext();
            const chat = context.chat || [];
            const counts = countMessagesByLevel(chat);
            const unsummarized = counts.level0;
            const summarized = counts.level1 + counts.level2 + counts.level3;

            $('#cfm_stat_totalMessages').text(counts.total);
            $('#cfm_stat_summarizedMessages').text(summarized);
            $('#cfm_stat_unsummarizedMessages').text(unsummarized);

            const ratio = storage.stats?.currentCompressionRatio ? (storage.stats.currentCompressionRatio * 100).toFixed(1) : '0.0';
            $('#cfm_stat_compressionRatio').text(ratio);

            if (storage.stats.lastCompactTime) {
                $('#cfm_stat_lastCompactTime').text(new Date(storage.stats.lastCompactTime).toLocaleString());
            } else {
                $('#cfm_stat_lastCompactTime').text('Never');
            }

            $('#cfm_stat_level1Count').text(storage.level1.summaries.length);
            $('#cfm_stat_level2Count').text(storage.level2.summaries.length);
        }).catch(err => {
            console.warn('[CacheFriendlyMemory] Failed to refresh status:', err);
        });
    } else {
        $('#cfm_status').html('<p>No chat loaded</p>');
    }
}
