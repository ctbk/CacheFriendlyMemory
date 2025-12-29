# Fix Restore Defaults UI Update Bug

## Bug Description
When clicking "Restore Defaults", the settings values ARE reset (verified by page reload showing correct values), but the UI continues to display the old values until the page is manually reloaded.

## Root Cause Analysis

### Issue 1: Missing Error Handling in Button Handler
The async button handler in `ui/settings.js:117-121` has no error handling:

```javascript
$('#cfm_restore_btn').on('click', async () => {
    await restoreDefaults();
    updateUI();
    refreshStatus();
});
```

If `restoreDefaults()` throws an error, the promise rejects silently and `updateUI()` never runs.

### Issue 2: Potential Stale Module Reference
Both `ui/settings.js` and `src/storage.js` import `extension_settings` from `extensions.js`. While they use the same key (`'cacheFriendlyMemory'`), the module import might result in stale references in certain scenarios.

### Issue 3: Inconsistent API Usage
The codebase mixes direct imports (`import { extension_settings }`) with context API (`SillyTavern.getContext()`). The AGENTS.md recommends using `SillyTavern.getContext()` consistently.

## Implementation Plan

### Task 1: Add Error Handling to Button Handler

**File:** `ui/settings.js`

**Current code (lines 117-121):**
```javascript
$('#cfm_restore_btn').on('click', async () => {
    await restoreDefaults();
    updateUI();
    refreshStatus();
});
```

**Updated code:**
```javascript
$('#cfm_restore_btn').on('click', async () => {
    try {
        const restored = await restoreDefaults();
        // Only update UI if restore actually happened (user confirmed)
        if (restored) {
            updateUI();
            refreshStatus();
        }
    } catch (error) {
        console.error('[cacheFriendlyMemory] Error restoring defaults:', error);
    }
});
```

### Task 2: Update restoreDefaults to Return Success Status

**File:** `src/storage.js`

**Current code (lines 125-146):**
```javascript
export async function restoreDefaults() {
    const { toastr } = SillyTavern.getContext();

    try {
        if (!confirm('Are you sure you want to restore all settings to default values? This cannot be undone.')) {
            return;
        }

        const settings = extension_settings[METADATA_KEY];
        for (const key of Object.keys(defaultSettings)) {
            settings[key] = defaultSettings[key];
        }

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

**Updated code:**
```javascript
export async function restoreDefaults() {
    const { toastr } = SillyTavern.getContext();

    try {
        if (!confirm('Are you sure you want to restore all settings to default values? This cannot be undone.')) {
            return false;
        }

        const settings = extension_settings[METADATA_KEY];
        if (!settings) {
            throw new Error('Settings object not initialized');
        }

        for (const key of Object.keys(defaultSettings)) {
            settings[key] = defaultSettings[key];
        }

        saveSettingsDebounced();
        toastr.success('Settings restored to defaults', 'CacheFriendlyMemory');
        console.log(`[${METADATA_KEY}] Settings restored to defaults`);
        return true;
    } catch (error) {
        console.error(`[${METADATA_KEY}] Failed to restore defaults:`, error);
        toastr.error('Failed to restore defaults: ' + error.message, 'CacheFriendlyMemory');
        throw error;
    }
}
```

### Task 3: Ensure updateUI Reads Fresh Values

**File:** `ui/settings.js`

The `updateUI()` function should read directly from `extension_settings[extensionName]` at call time, which it already does. However, we can add logging to verify values are correct:

**Current code (lines 124-139):**
```javascript
function updateUI() {
    const settings = extension_settings[extensionName];

    $('#cfm_enabled').prop('checked', settings.enabled);
    // ... rest of updates
}
```

**Updated code (with debug logging):**
```javascript
function updateUI() {
    const settings = extension_settings[extensionName];
    
    if (extension_settings[extensionName]?.debugMode) {
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
}
```

## Testing Checklist

After implementing the fix:

1. [ ] Change several settings to non-default values
2. [ ] Click "Restore Defaults"
3. [ ] Click "Cancel" on confirmation - UI should remain unchanged
4. [ ] Click "Restore Defaults" again
5. [ ] Click "OK" on confirmation
6. [ ] Verify UI immediately shows default values (no page reload needed)
7. [ ] Verify toastr success message appears
8. [ ] Verify console shows success log with `[cacheFriendlyMemory]` prefix
9. [ ] Change a setting value - verify event handlers still work
10. [ ] Reload page - verify default values persist

## Files Modified

1. `ui/settings.js` - Add error handling to button handler, add debug logging to updateUI
2. `src/storage.js` - Return boolean from restoreDefaults, add defensive null check

## Alternative Fix (if above doesn't work)

If the primary fix doesn't resolve the issue, the problem may be deeper in how ES modules cache imports. In that case, use `SillyTavern.getContext()` for all settings access:

```javascript
function updateUI() {
    const { extensionSettings } = SillyTavern.getContext();
    const settings = extensionSettings[extensionName];
    // ... rest of updates
}
```

This ensures we always get the live reference from SillyTavern's context rather than a potentially stale module import.
