# Restore Defaults Button Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "Restore Defaults" button in the settings panel that resets all global settings to their original default values with confirmation dialog.

**Architecture:**
- Export `defaultSettings` object from `index.js` to make it accessible to other modules
- Add `restoreDefaults()` function in `storage.js` that resets `extensionSettings[METADATA_KEY]` to defaults and saves
- Add "Restore Defaults" button in `ui/settings.js` that calls `restoreDefaults()` and refreshes the UI
- Show confirmation dialog before restoring to prevent accidental resets
- Use `toastr` for success notification after restore

**Tech Stack:** Vanilla JavaScript ES6, SillyTavern extension API, localStorage for settings

---

## Task 1: Export defaultSettings from index.js

**Files:**
- Modify: `index.js:3-15`

**Step 1: Export defaultSettings object**

Add `export` keyword to make `defaultSettings` accessible to other modules:

```javascript
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
});
```

**Step 2: Verify export**

The `defaultSettings` object is now available for import by other modules. No test needed for this change.

**Step 3: Commit**

```bash
git add index.js
git commit -m "refactor: export defaultSettings for use by other modules"
```

---

## Task 2: Add restoreDefaults function to storage.js

**Files:**
- Modify: `src/storage.js:124` (add at end of file)

**Step 1: Import defaultSettings**

Add import at top of file (after line 1):

```javascript
import { defaultSettings } from '../index.js';
```

**Step 2: Implement restoreDefaults function**

Add function at end of file (before or after line 124):

```javascript
export async function restoreDefaults() {
    const { extensionSettings, saveSettingsDebounced, toastr } = SillyTavern.getContext();

    try {
        if (!confirm('Are you sure you want to restore all settings to default values? This cannot be undone.')) {
            return;
        }

        extensionSettings[METADATA_KEY] = structuredClone(defaultSettings);
        saveSettingsDebounced();
        toastr.success('Settings restored to defaults', 'CacheFriendlyMemory');
        console.log(`[${METADATA_KEY}] Settings restored to defaults`);
    } catch (error) {
        console.error(`[${METADATA_KEY}] Failed to restore defaults:`, error);
        toastr.error('Failed to restore defaults: ' + error.message, 'CacheFriendlyMemory');
        throw error;
    }
}
```

**Step 3: Manually test restore function**

1. Open browser console in SillyTavern
2. Change some settings manually
3. Run: `await import('/scripts/extensions/third-party/CacheFriendlyMemory/src/storage.js').then(m => m.restoreDefaults())`
4. Accept the confirmation dialog
5. Check that settings are reset to defaults
6. Check console for success message
7. Check for toastr notification

**Step 4: Commit**

```bash
git add src/storage.js
git commit -m "feat: add restoreDefaults function to reset global settings"
```

---

## Task 3: Add Restore Defaults button to settings panel

**Files:**
- Modify: `ui/settings.js:63` (add after importButton)

**Step 1: Import restoreDefaults function**

Add to imports at top of file (after line 1):

```javascript
import { getGlobalSetting, setGlobalSetting, getChatStorage, exportChatData, importChatData, restoreDefaults } from '../src/storage.js';
```

**Step 2: Add Restore Defaults button**

Add button after importButton (after line 63, before buttonsDiv.appendChild):

```javascript
const restoreButton = document.createElement('button');
restoreButton.textContent = 'Restore Defaults';
restoreButton.className = 'menu_button';
restoreButton.onclick = async () => {
    await restoreDefaults();
    location.reload();
};
buttonsDiv.appendChild(restoreButton);
```

**Step 3: Test button functionality**

1. Open SillyTavern settings for CacheFriendlyMemory extension
2. Change several settings to non-default values
3. Click "Restore Defaults" button
4. Confirm the dialog
5. Verify page reloads
6. Check that all settings are back to default values
7. Verify toastr success notification appeared before reload

**Step 4: Commit**

```bash
git add ui/settings.js
git commit -m "feat: add Restore Defaults button to settings panel"
```

---

## Task 4: Test edge cases and validate behavior

**Files:**
- No file modifications

**Step 1: Test with no existing settings**

1. Clear extension settings via localStorage or fresh install
2. Open settings panel
3. Click Restore Defaults
4. Should still work correctly (creates default settings)

**Step 2: Test cancel on confirmation**

1. Change some settings
2. Click Restore Defaults
3. Click "Cancel" on confirmation dialog
4. Verify settings remain unchanged

**Step 3: Test with corrupted settings**

1. Manually set `extensionSettings['cacheFriendlyMemory'] = null` via console
2. Click Restore Defaults
3. Verify settings are properly recreated

**Step 4: Verify console logs**

1. Enable Debug Mode in settings
2. Click Restore Defaults
3. Accept confirmation
4. Check console for `[CacheFriendlyMemory] Settings restored to defaults` message

**Step 5: Commit**

```bash
git commit -m "test: validate restore defaults edge cases"
```

---

## Testing Checklist

Before considering complete, verify:
- [ ] Restore Defaults button appears in settings panel
- [ ] Button position is correct (after Import button)
- [ ] Confirmation dialog appears when clicked
- [ ] Settings reset to default values after confirmation
- [ ] Cancel on confirmation dialog leaves settings unchanged
- [ ] Toastr success notification appears
- [ ] Console logs appear with `[CacheFriendlyMemory]` prefix
- [ ] Page reloads after restore to refresh UI
- [ ] All form fields show correct default values after reload
- [ ] Existing chat metadata is not affected (only global settings)
- [ ] Works with extension disabled/enabled
