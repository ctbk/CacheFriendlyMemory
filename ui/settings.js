import { getGlobalSetting, setGlobalSetting, getChatStorage, exportChatData, importChatData } from '../src/storage.js';

export function createSettingsPanel(container) {
    const fragment = document.createDocumentFragment();

    const header = document.createElement('h3');
    header.textContent = 'CacheFriendlyMemory Settings';
    fragment.appendChild(header);

    const form = document.createElement('div');
    form.className = 'cfm-settings-form';

    form.appendChild(createToggle('enabled', 'Enable Extension', true));
    form.appendChild(createToggle('autoCompact', 'Auto Compact', true));
    form.appendChild(createNumberInput('compactThreshold', 'Compact Threshold (messages)', 120, 10, 500));
    form.appendChild(createNumberInput('contextThreshold', 'Context Threshold (%)', 75, 10, 95));
    form.appendChild(createNumberInput('level1ChunkSize', 'Level 1 Chunk Size', 10, 5, 50));
    form.appendChild(createNumberInput('level2ChunkSize', 'Level 2 Chunk Size', 5, 2, 20));
    form.appendChild(createNumberInput('targetCompression', 'Target Compression (%)', 55, 10, 90));
    form.appendChild(createTextInput('compressionModel', 'Compression Model', ''));
    form.appendChild(createTextInput('compressionPreset', 'Compression Preset', ''));
    form.appendChild(createToggle('debugMode', 'Debug Mode', false));
    form.appendChild(createToggle('showProgressBar', 'Show Progress Bar', true));

    fragment.appendChild(form);

    const buttonsDiv = document.createElement('div');
    buttonsDiv.className = 'cfm-buttons';

    const compactButton = document.createElement('button');
    compactButton.textContent = 'Compact Now';
    compactButton.className = 'menu_button';
    compactButton.onclick = async () => {
        const { performCompaction } = await import('../src/compression.js');
        await performCompaction();
        refreshStatus(container);
    };
    buttonsDiv.appendChild(compactButton);

    const exportButton = document.createElement('button');
    exportButton.textContent = 'Export Data';
    exportButton.className = 'menu_button';
    exportButton.onclick = () => exportChatData();
    buttonsDiv.appendChild(exportButton);

    const importButton = document.createElement('button');
    importButton.textContent = 'Import Data';
    importButton.className = 'menu_button';
    importButton.onclick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                importChatData(event.target.result);
            };
            reader.readAsText(file);
        };
        input.click();
    };
    buttonsDiv.appendChild(importButton);

    fragment.appendChild(buttonsDiv);

    container.appendChild(fragment);

    refreshStatus(container);
}

function createToggle(key, label, defaultValue) {
    const wrapper = document.createElement('div');
    wrapper.className = 'cfm-setting-row';

    const labelEl = document.createElement('label');
    labelEl.textContent = label;

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = getGlobalSetting(key) ?? defaultValue;
    input.onchange = () => setGlobalSetting(key, input.checked);

    wrapper.appendChild(labelEl);
    wrapper.appendChild(input);

    return wrapper;
}

function createNumberInput(key, label, defaultValue, min, max) {
    const wrapper = document.createElement('div');
    wrapper.className = 'cfm-setting-row';

    const labelEl = document.createElement('label');
    labelEl.textContent = label;

    const input = document.createElement('input');
    input.type = 'number';
    input.min = min;
    input.max = max;
    input.value = getGlobalSetting(key) ?? defaultValue;
    input.onchange = () => setGlobalSetting(key, parseInt(input.value));

    wrapper.appendChild(labelEl);
    wrapper.appendChild(input);

    return wrapper;
}

function createTextInput(key, label, defaultValue) {
    const wrapper = document.createElement('div');
    wrapper.className = 'cfm-setting-row';

    const labelEl = document.createElement('label');
    labelEl.textContent = label;

    const input = document.createElement('input');
    input.type = 'text';
    input.value = getGlobalSetting(key) ?? defaultValue;
    input.onchange = () => setGlobalSetting(key, input.value);

    wrapper.appendChild(labelEl);
    wrapper.appendChild(input);

    return wrapper;
}

function refreshStatus(container) {
    const storage = getChatStorage();

    let statusDiv = container.querySelector('.cfm-status');
    if (!statusDiv) {
        statusDiv = document.createElement('div');
        statusDiv.className = 'cfm-status';
        container.appendChild(statusDiv);
    }

    if (storage) {
        statusDiv.innerHTML = `
            <h4>Current Status</h4>
            <div>Total Messages: ${storage.stats.totalMessages}</div>
            <div>Summarized: ${storage.stats.summarizedMessages}</div>
            <div>Unsummarized: ${storage.stats.totalMessages - storage.stats.summarizedMessages}</div>
            <div>Compression Ratio: ${(storage.stats.currentCompressionRatio * 100).toFixed(1)}%</div>
            <div>Last Compact: ${storage.stats.lastCompactTime ? new Date(storage.stats.lastCompactTime).toLocaleString() : 'Never'}</div>
            <div>Level 1 Summaries: ${storage.level1.summaries.length}</div>
            <div>Level 2 Summaries: ${storage.level2.summaries.length}</div>
        `;
    } else {
        statusDiv.innerHTML = '<p>No chat loaded</p>';
    }
}
