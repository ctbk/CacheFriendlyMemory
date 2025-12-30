# CacheFriendlyMemory - Agent Development Guide

This file provides guidelines for agentic coding assistants working on CacheFriendlyMemory SillyTavern extension.

## Build, Lint, and Test Commands

**Testing locally:**
1. Install test dependencies: `npm install`
2. Run tests: `npm test` (but remember that vitest uses watch mode by default, you should use `--run` or `-- --run`)
3. Run tests with UI: `npm run test:ui`
4. Run tests with coverage: `npm run test:coverage -- --run`
5. Run linter to check for import errors: `npm run lint`
6. Place extension in `public/scripts/extensions/third-party/CacheFriendlyMemory/`
7. Reload SillyTavern (the extension will auto-load)
8. Test functionality through the UI and slash commands
9. Check browser console for errors and debug messages

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
import { getContext } from '../../../extensions.js';
import { eventSource, event_types } from '../../../script.js';
const { extensionSettings, saveSettingsDebounced } = SillyTavern.getContext();
// Avoid
import { chat } from '../../../script.js'; // Internal, may break
import { getContext } from '../../../script.js'; // WRONG! getContext is in extensions.js
```

**CRITICAL IMPORT RULES:**
- `getContext`, `extension_settings` → import from `extensions.js`
- `eventSource`, `event_types`, `saveSettingsDebounced`, `generateQuietPrompt` → import from `script.js`
- Local modules → use relative paths: `./storage.js`, `'../src/storage.js'`

**IMPORTANT:** Always run `npm run lint` after making changes. The linter catches:
- Incorrect import paths that would cause the extension to fail loading
- Named imports that don't exist in the source module (e.g., importing `getContext` from `script.js`)

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

### Message Metadata
Extension uses `message.extra.cacheFriendlyMemory` for per-message tracking:

```javascript
message.extra = {
    cacheFriendlyMemory: {
        compressionLevel: null | 1 | 2 | 3,
        summaryId: string | null,
        included: boolean,
        timestamp: number | null
    }
}
```

Use `import { getCompressionLevel, markMessageSummarized } from './src/message-metadata.js'` to access message metadata functions:

```javascript
import {
    getCompressionLevel,
    markMessageSummarized,
    markMessageActive,
    countMessagesByLevel
} from './message-metadata.js';

// Check compression level
const level = getCompressionLevel(message); // Returns null | 1 | 2 | 3

// Mark message as summarized
markMessageSummarized(message, 1, 'summary-123');

// Mark message as active (not summarized)
markMessageActive(message);

// Count messages by level
const counts = countMessagesByLevel(chat);
// Returns: { total: 100, level0: 70, level1: 20, level2: 10, level3: 0 }
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
When possible, rely on SillyTavern CSS classes.

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

## Test-Driven Development (TDD)

**TDD Workflow:**
1. Write a failing test for new functionality
2. Run the test to verify it fails
3. Write minimal code to make the test pass
4. Run the test to verify it passes
5. Refactor if needed
6. Commit the changes

**Test Structure:**
- `tests/unit/` - Pure function unit tests (fast, no dependencies)
- `tests/integration/` - Workflow integration tests (slower, test complete flows)
- `tests/fixtures/` - Mock objects and test data
- `tests/setup.js` - Global test configuration

**Coverage Target:** 80% for all logic modules in `src/logic/`

**Writing Tests:**
- Use Vitest with describe/it/expect syntax
- Test happy path and edge cases
- Mock external dependencies (SillyTavern APIs)
- Keep tests independent and deterministic
- Follow AAA pattern: Arrange, Act, Assert

**Example:**
```javascript
describe('functionName', () => {
    it('should do X when Y', () => {
        // Arrange
        const input = 'test';
        // Act
        const result = functionName(input);
        // Assert
        expect(result).toBe('expected');
    });
});
```
