# CacheFriendlyMemory - Agent Development Guide

This file provides guidelines for agentic coding assistants working on CacheFriendlyMemory SillyTavern extension.

## Build, Lint, and Test Commands

Currently, this extension uses pure JavaScript ES modules with no build pipeline or testing framework.

**Testing locally:**
1. Place the extension in `public/scripts/extensions/third-party/CacheFriendlyMemory/`
2. Reload SillyTavern (the extension will auto-load)
3. Test functionality through the UI and slash commands
4. Check browser console for errors and debug messages

**Debug mode:** Enable "Debug Mode" in settings for verbose console logging prefixed with `[CacheFriendlyMemory]`

## Code Style Guidelines

### File Organization
- `index.js` - Main entry point, initialization, event/slash command registration
- `src/` - Core functionality (storage, compression, injection, events, prompts)
- `ui/` - UI components (settings, status, styles)
- `i18n/` - Translation files
- `presets/` - Configuration presets

### Imports and Exports
Use ES6 module syntax: `import { foo } from './file.js'`, named exports: `export function foo() {}`. Import from SillyTavern via `SillyTavern.getContext()`. Avoid importing from internal SillyTavern modules (unstable API). Use relative paths for local imports: `'./storage.js'`, `'../src/storage.js'`.

```javascript
// Good
import { getChatStorage } from './storage.js';
const { getContext, eventSource, event_types } = SillyTavern.getContext();
// Avoid
import { chat } from '../../../script.js'; // Internal, may break
```

### SillyTavern API Usage
Always access SillyTavern APIs through `SillyTavern.getContext()`:
```javascript
const {
    getContext, extensionSettings, chatMetadata, eventSource, event_types,
    SlashCommandParser, registerExtensionSettings, saveSettingsDebounced,
    saveMetadata, generateQuietPrompt, toastr
} = SillyTavern.getContext();
```

### Naming Conventions
- **Constants:** UPPER_SNAKE_CASE (`MODULE_NAME`, `METADATA_KEY`)
- **Functions/Variables:** camelCase (`getChatStorage`, `storage`)
- **CSS classes:** kebab-case with prefix (`cfm-settings-form`, `cfm-button`)
- **Event handlers:** `onEventName`, `handleEventName`

### Logging
Use consistent console prefix: `` `[MODULE_NAME]` `` with `console.log()` for info, `console.warn()` for warnings, `console.error()` for errors.

```javascript
const MODULE_NAME = 'cacheFriendlyMemory';
console.log(`[${MODULE_NAME}] Module initialized`);
console.error(`[${MODULE_NAME}] Failed to save:`, error);
```

### Error Handling
Use try/catch for async operations, return null/undefined for non-critical failures, log errors with context, throw only for critical failures.

```javascript
try {
    await saveMetadata();
    console.debug(`[${MODULE_NAME}] Data saved`);
} catch (error) {
    console.error(`[${MODULE_NAME}] Failed to save:`, error);
    throw error; // Only for critical failures
}
```

### Async/Await
Always use async/await over Promise chains and mark async functions clearly.
```javascript
async function performCompaction() {
    const storage = getChatStorage();
    await saveChatStorage();
}
```

### Storage Patterns
- **Global settings:** `extensionSettings[MODULE_NAME]` → saved via `saveSettingsDebounced()`
- **Per-chat data:** `chatMetadata[METADATA_KEY]` → saved via `saveMetadata()`
- Initialize storage lazily (on first access), use structuredClone for defaults

```javascript
export function getGlobalSetting(key) {
    const { extensionSettings } = SillyTavern.getContext();
    return extensionSettings[MODULE_NAME]?.[key];
}
export function setGlobalSetting(key, value) {
    const { extensionSettings, saveSettingsDebounced } = SillyTavern.getContext();
    extensionSettings[MODULE_NAME] = extensionSettings[MODULE_NAME] || {};
    extensionSettings[MODULE_NAME][key] = value;
    saveSettingsDebounced();
}
```

### UI Components
Use document fragments for DOM manipulation, template strings for HTML (sanitize user input), bind events with `onchange`, `onclick` handlers, use CSS classes from `ui/style.css`.

```javascript
export function createSettingsPanel(container) {
    const fragment = document.createDocumentFragment();
    const button = document.createElement('button');
    button.className = 'menu_button';
    button.onclick = async () => { /* handler */ };
    fragment.appendChild(button);
    container.appendChild(fragment);
}
```

### Slash Commands
Register via `SlashCommandParser.addCommandObject()`, use `SlashCommand.fromProps()` for consistency, prefix commands with `cfm-`.

```javascript
SlashCommandParser.addCommandObject(SlashCommand.fromProps({
    name: 'cfm-compact',
    callback: async () => {
        await performCompaction();
        return 'Compaction completed';
    },
    helpString: 'Manually trigger compaction of chat history',
}));
```

### Event Handling
Register events in `index.js` or `src/events.js`, use async functions for event handlers, don't block the event loop.

```javascript
eventSource.on(event_types.USER_MESSAGE_RENDERED, async (mesId) => {
    const storage = getChatStorage();
    if (storage) {
        storage.stats.totalMessages++;
    }
});
```

### CSS Guidelines
Use `cfm-` prefix for all classes, follow SillyTavern's dark theme colors (#222, #333, #444, #eee), use flexbox for layouts.

### Version Management
Update manifest.json version for releases, update CHANGELOG.md with meaningful entries, follow semantic versioning (MAJOR.MINOR.PATCH).

### Testing Checklist
When implementing features:
1. Test with different chat states (new, existing, no metadata)
2. Test with debug mode enabled
3. Verify console logs appear correctly
4. Check browser console for errors
5. Test edge cases (empty arrays, null values, missing context)
6. Verify storage persists across page reloads
7. Test slash commands manually
8. Verify UI controls function correctly
