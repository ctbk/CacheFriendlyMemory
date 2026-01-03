# Proposal: Make all console.log conditional on debug mode

## Summary
All `console.log()` statements in the CacheFriendlyMemory extension should only output to the browser console when the DEBUG option (`debugMode` setting) is enabled in the preference panel. `console.error()` and `console.warn()` statements should always appear regardless of debug mode, and manually-invoked debug functions should continue to work.

## Why
The extension currently has inconsistent logging behavior across the codebase. Some files already check the `debugMode` setting before logging, while many others output console.log unconditionally. This results in verbose console output during normal operation, making it difficult for users to identify actual issues and errors. A centralized, consistent logging approach controlled by a single setting will improve the user experience by providing clean console output during normal operation while enabling detailed logging for troubleshooting when needed.

## What Changes
1. Create a new centralized debug logging helper module (`src/utils/debug.js`) with a `debugLog()` function that checks the `debugMode` setting before logging
2. Replace all unconditional `console.log()` statements in the following files with calls to `debugLog()`:
   - `index.js` (3 statements)
   - `src/compression.js` (22 statements)
   - `src/storage.js` (4 statements)
   - `src/message-metadata.js` (2 statements)
   - `src/injection.js` (11 statements, excluding the manually-invoked `debugInjection()` function)
   - `src/interceptor.js` (9 statements)
   - `src/events.js` (9 statements)
   - `ui/settings.js` (7 statements)
3. Preserve all `console.error()` and `console.warn()` statements unconditionally
4. Preserve manual debug functions (e.g., `debugInjection()`) that use regular `console.log()` to always work
5. Create comprehensive unit tests for the new `debugLog()` helper function
6. Update existing tests to work with the new debug logging pattern

## Problem Statement
Currently, the extension has inconsistent logging behavior:
- Some files (compression.js, parts of settings.js) already conditionally log based on `debugMode`
- Many other files (injection.js, interceptor.js, events.js, storage.js, message-metadata.js, index.js) output console.log unconditionally
- This results in verbose console output during normal operation, making it difficult for users to identify actual issues

## Goals
1. All informational `console.log()` calls should only appear when `debugMode` is `true`
2. All `console.error()` calls should always appear (never suppressed)
3. All `console.warn()` calls should always appear (never suppressed)
4. Manually-invoked debug functions (e.g., `window.cfmDebugInjection()`) should work regardless of debug mode setting
5. Maintain consistent logging pattern across the codebase

## Non-Goals
- Changing the content or format of log messages
- Modifying how errors are handled or reported
- Changing the debug mode UI or setting persistence

## Scope
This change affects the following files that contain `console.log()` statements:
- `index.js` - Initialization logging
- `src/compression.js` - Compaction process logging (partially implemented)
- `src/injection.js` - Injection process logging
- `src/interceptor.js` - Context interceptor logging
- `src/storage.js` - Storage operations logging
- `src/message-metadata.js` - Message metadata logging
- `src/events.js` - Event handler logging
- `ui/settings.js` - Settings UI logging (partially implemented)
- `src/utils/debug.js` - NEW centralized debug logging helper module

Files that only contain `console.error()` or `console.warn()` are not affected.

## Success Criteria
- All `console.log()` statements are wrapped in a condition checking `debugMode`
- All tests pass with debug mode both enabled and disabled
- Manual debugging functions (like `window.cfmDebugInjection()`) still work
- Error and warning messages still appear regardless of debug mode
- Console output is silent during normal operation (debug mode disabled)
- Console output is verbose during development/troubleshooting (debug mode enabled)

## Dependencies
- Phase 0 (create `src/utils/debug.js` helper module) must be completed first
- All other phases depend on the helper module being available
- No external dependencies - this is a self-contained refactoring

## Risks
- If a critical log message is incorrectly marked as debug-only, important information could be hidden from users
- If the condition check fails silently, users might see no output at all even with debug mode enabled

## Mitigations
- Careful code review to distinguish between informational logs (debug-only) and operational logs (always show)
- Testing with both debug mode enabled and disabled
- Manual verification that errors and warnings still appear
- Manual verification that manual debug functions still work

## Alternatives Considered
1. **Use console.debug() instead of console.log()**: Browser dev tools have a filter to hide console.debug() messages, but this would require users to configure their browser instead of using extension settings
2. **Add a logging level system**: Over-engineering for the current needs - debug on/off is sufficient
3. **Remove all console.log statements**: Would lose debugging capability entirely

## Rationale
This approach provides:
- Clean console output for users during normal operation
- Easy access to detailed logging for troubleshooting when needed
- Consistent behavior across entire codebase (single pattern using centralized helper)
- Minimal code complexity (single helper function with simple boolean check)
- Easy maintenance - logging behavior changes only require updating helper module
- Simple testing - mock single helper function instead of many conditional checks
- Future extensibility - additional logging features can be added centrally without touching calling code
