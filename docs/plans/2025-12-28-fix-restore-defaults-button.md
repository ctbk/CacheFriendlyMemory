# Fix Restore Defaults Button Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the "Restore Defaults" button so it correctly updates all extension settings to default values without forcing a full page reload.

**Architecture:**
- Remove `location.reload()` from the button handler in `ui/settings.js`
- After restoring defaults, call `updateUI()` and `refreshStatus()` to update the UI immediately
- Ensure `restoreDefaults()` function follows SillyTavern API conventions by using `SillyTavern.getContext()` for toastr notifications
- Maintain confirmation dialog and proper error handling

**Tech Stack:** Vanilla JavaScript ES6, SillyTavern extension API, jQuery for DOM manipulation

---

## Task 1: Update restoreDefaults to use SillyTavern.getContext()

**Files:**
- Modify: `src/storage.js:1-3` (imports)
- Modify: `src/storage.js:125-141` (restoreDefaults function)

**Step 1: Update imports**

Add import for `SillyTavern` at the top of the file:

```javascript
import { defaultSettings } from './constants.js';
import { extension_settings } from '../../../../extensions.js';
import { saveMetadata, saveSettingsDebounced } from '../../../../../script.js';
```

**Step 2: Update restoreDefaults function**

Replace the current function with this version that uses `SillyTavern.getContext()`:

```javascript
export async function restoreDefaults() {
    const { toastr } = SillyTavern.getContext();

    try {
        if (!confirm('Are you sure you want to restore all settings to default values? This cannot be undone.')) {
            return;
        }

        extension_settings[METADATA_KEY] = structuredClone(defaultSettings);
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

**Step 3: Test function manually**

1. Open browser console in SillyTavern
2. Run: `await import('/scripts/extensions/third-party/CacheFriendlyMemory/src/storage.js').then(m => m.restoreDefaults())`
3. Accept confirmation dialog
4. Verify toastr success notification appears
5. Check console for success message
6. Verify `extension_settings['cacheFriendlyMemory']` contains default values

**Step 4: Commit**

```bash
git add src/storage.js
git commit -m "refactor: update restoreDefaults to use SillyTavern.getContext()"
```

---

## Task 2: Update button handler in ui/settings.js

**Files:**
- Modify: `ui/settings.js:117-120` (cfm_restore_btn click handler)

**Step 1: Locate and update the click handler**

Replace the current handler:

```javascript
$('#cfm_restore_btn').on('click', async () => {
    await restoreDefaults();
    location.reload();
});
```

With this updated version:

```javascript
$('#cfm_restore_btn').on('click', async () => {
    await restoreDefaults();
    updateUI();
    refreshStatus();
});
```

**Step 2: Verify function availability**

Ensure `updateUI` and `refreshStatus` functions are in scope (they are defined earlier in the same file).

**Step 3: Test button functionality**

1. Open SillyTavern settings for CacheFriendlyMemory extension
2. Change several settings to non-default values
3. Click "Restore Defaults" button
4. Confirm the dialog
5. Verify page does NOT reload
6. Check that all UI elements update to show default values
7. Verify status display updates
8. Verify toastr success notification appears
9. Check console for success message

**Step 4: Commit**

```bash
git add ui/settings.js
git commit -m "fix: restore defaults button updates UI without page reload"
```

---

## Task 3: Test edge cases and validate behavior

**Files:**
- No file modifications

**Step 1: Test with no existing settings**

1. Clear extension settings via browser console: `delete extension_settings['cacheFriendlyMemory']`
2. Open settings panel
3. Click Restore Defaults
4. Should work correctly (creates default settings)
5. UI should show default values

**Step 2: Test cancel on confirmation**

1. Change some settings
2. Click Restore Defaults
3. Click "Cancel" on confirmation dialog
4. Verify settings remain unchanged
5. UI should not update

**Step 3: Test with corrupted settings**

1. Manually set `extension_settings['cacheFriendlyMemory'] = null` via console
2. Click Restore Defaults
3. Accept confirmation
4. Verify settings are properly recreated with defaults
5. UI should show default values

**Step 4: Verify console logs**

1. Enable Debug Mode in settings
2. Click Restore Defaults
3. Accept confirmation
4. Check console for `[CacheFriendlyMemory] Settings restored to defaults` message
5. No page reload should occur

**Step 5: Commit**

```bash
git commit -m "test: validate restore defaults fix edge cases"
```

---

## Testing Checklist

Before considering complete, verify:
- [ ] Restore Defaults button appears in settings panel
- [ ] Confirmation dialog appears when clicked
- [ ] Settings reset to default values after confirmation
- [ ] Cancel on confirmation dialog leaves settings unchanged
- [ ] Toastr success notification appears
- [ ] Console logs appear with `[CacheFriendlyMemory]` prefix
- [ ] Page does NOT reload after restore
- [ ] All form fields show correct default values immediately after restore
- [ ] Status display updates with current statistics
- [ ] Existing chat metadata is not affected (only global settings)
- [ ] Works with extension disabled/enabled