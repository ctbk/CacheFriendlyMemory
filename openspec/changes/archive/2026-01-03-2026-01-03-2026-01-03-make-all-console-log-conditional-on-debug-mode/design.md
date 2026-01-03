# Design: Make all console.log conditional on debug mode

## Overview
This document describes the design for making all `console.log()` statements conditional on the `debugMode` setting, while preserving error and warning logging.

## Current State
The extension has inconsistent logging behavior:

**Already implemented correctly:**
- `src/compression.js` - `triggerCompaction()` function checks `debugMode` before logging
- `ui/settings.js` - Some console.debug calls are already wrapped in `if (settings?.debugMode)`

**Needs implementation:**
- `index.js` - 3 unconditional console.log statements
- `src/compression.js` - ~20 unconditional console.log statements in `performCompaction()`
- `src/injection.js` - ~20 unconditional console.log statements
- `src/interceptor.js` - ~10 unconditional console.log statements
- `src/storage.js` - 3 unconditional console.log statements
- `src/message-metadata.js` - 2 unconditional console.log statements
- `src/events.js` - ~10 unconditional console.log statements
- `ui/settings.js` - 1 unconditional console.log statement

## Design Approach

### Centralized Debug Logging Helper

All debug logging will use a single helper function from a dedicated utility module. This ensures consistency across the entire codebase and makes the logging behavior easy to maintain and test.

#### Helper Module Location
`src/utils/debug.js` (new file)

#### Helper Function Implementation
```javascript
import { getGlobalSetting } from '../storage.js';

export function debugLog(...args) {
    const debugMode = getGlobalSetting('debugMode');
    if (debugMode && typeof console !== 'undefined') {
        console.log(...args);
    }
}
```

#### Usage Pattern
All files import and use the same helper function:

```javascript
import { debugLog } from './utils/debug.js';

debugLog(`[${MODULE_NAME}] Message`);
```

#### Benefits of This Approach
1. **Single source of truth** - Debug mode logic exists in one place
2. **Consistency** - All debug logging uses identical pattern
3. **Maintainability** - Changes to logging behavior require updates to one file only
4. **Testability** - Easy to mock single function for testing
5. **Extensibility** - Future features (log levels, timestamps, etc.) can be added centrally

### Manual Debug Functions
Functions exposed to `window` for manual debugging should always work, using regular `console.log()`:

```javascript
export function debugInjection() {
    // Always log, regardless of debugMode
    console.log('[CacheFriendlyMemory] DEBUG - ...');
}

if (typeof window !== 'undefined') {
    window.cfmDebugInjection = debugInjection;
}
```

## Log Classification

### Always log (no condition needed)
- `console.error()` - Critical errors, failures
- `console.warn()` - Warnings, non-critical issues
- Functions manually invoked by user (e.g., `window.cfmDebugInjection()`)

### Conditionally log (check debugMode)
- `console.log()` - Informational messages, state dumps
- Progress updates (e.g., "Compacting X messages")
- Entry/exit logging for functions

## Implementation Strategy

### Phase 0: Create debug helper module
1. Create `src/utils/debug.js` with `debugLog()` helper function
2. Export the helper function for use across all modules

### Phase 1: Core modules
3. `src/compression.js` - Replace remaining console.log with debugLog calls in `performCompaction()`
4. `src/storage.js` - Replace console.log with debugLog calls
5. `src/message-metadata.js` - Replace console.log with debugLog calls

### Phase 2: Injection and interceptor
6. `src/injection.js` - Replace console.log with debugLog calls (preserve `debugInjection()` function)
7. `src/interceptor.js` - Replace console.log with debugLog calls

### Phase 3: Events and initialization
8. `src/events.js` - Replace console.log with debugLog calls
9. `index.js` - Replace console.log with debugLog calls

### Phase 4: UI
10. `ui/settings.js` - Replace remaining console.log with debugLog calls

### Phase 5: Testing
11. Update tests to mock debugLog appropriately
12. Verify debugLog only outputs when debugMode is true
13. Verify console.error and console.warn always appear

## Testing Strategy

### Unit Tests
- Mock `debugLog` function from utils/debug.js to verify it's called correctly
- Test `debugLog` directly: verify it checks debugMode and only calls console.log when true
- Mock `getGlobalSetting` in debugLog tests to return both true and false
- Verify console.log is called through debugLog when debugMode is true
- Verify console.log is NOT called through debugLog when debugMode is false
- Verify console.error and console.warn are always called (not through debugLog)

### Integration Tests
- Run with debugMode enabled - verify verbose console output through debugLog
- Run with debugMode disabled - verify minimal console output (only errors/warnings)
- Verify manual debug functions work regardless of debugMode (they don't use debugLog)

### Manual Testing
1. Disable debug mode, perform normal operations
   - Check console: should only see errors/warnings
   - Verify no debugLog output appears
2. Enable debug mode, perform normal operations
   - Check console: should see detailed logging through debugLog
3. Call `window.cfmDebugInjection()` from console
   - Should always work regardless of debug mode (uses console.log directly)

## Edge Cases

### Missing debugMode setting
The `debugLog()` helper already handles this correctly because `getGlobalSetting()` returns `undefined` for missing keys, which is falsy in JavaScript. No additional handling needed.

### Asynchronous debug mode changes
If user toggles debug mode while operations are in progress, existing in-flight operations will use the debug mode value at the time they call `debugLog()`. This is acceptable behavior.

### Console methods not available
The `debugLog()` helper already includes a `typeof console !== 'undefined'` check, so it safely handles environments where console is not available.

### Helper function import errors
If a module fails to import `debugLog` (e.g., incorrect path), the code will fail to load with a clear error. This is acceptable as it's a build/implementation error, not a runtime error.

## Performance Considerations
- Function call overhead of `debugLog()` is minimal compared to `console.log()` itself
- `getGlobalSetting()` is a simple property access, negligible performance impact
- The `if (debugMode)` check in `debugLog()` short-circuits, avoiding function calls when disabled
- Overall performance impact is indistinguishable from direct conditional checks
- Benefits of consistency and maintainability outweigh negligible performance cost

## Backward Compatibility
- No breaking changes
- Existing behavior preserved for errors/warnings
- Users who want to see logs can enable debug mode
- Users who want clean console can keep debug mode disabled

## Security Considerations
- No new security concerns
- Debug logging does not expose sensitive information beyond what's already logged
- No user input is directly logged without sanitization

## Future Extensions
The centralized `debugLog()` helper makes these enhancements trivial:
- Add log levels (info, debug, trace) - add optional parameter and switch statement
- Add timestamps - prepend timestamp to all log messages in helper
- Add logging to external systems - integrate third-party logging service in helper
- Add structured logging - accept metadata objects and format consistently
- Add performance timing - track and log execution times automatically
- Add log filtering/persistence - centralize all log output for easier filtering

All enhancements can be implemented in `src/utils/debug.js` without touching any calling code.
