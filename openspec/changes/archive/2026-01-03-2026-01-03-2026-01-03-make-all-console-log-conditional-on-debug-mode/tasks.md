# Tasks: Make all console.log conditional on debug mode

## Implementation Tasks

### Phase 0: Create Debug Helper Module
- [x] Create `src/utils/debug.js` with debugLog helper function
  - Import `getGlobalSetting` from '../storage.js'
  - Export `debugLog(...args)` function that checks debugMode and calls console.log
  - Include `typeof console !== 'undefined'` check for safety

- [x] Create `src/utils/` directory if it doesn't exist

### Phase 1: Core Storage and Compression
- [x] Update `src/compression.js` - Replace console.log with debugLog calls
  - Lines 68-150 contain ~20 console.log statements
  - Import `debugLog` from './utils/debug.js'
  - Replace each `console.log(...)` with `debugLog(...)`
  - Keep all console.warn and console.error unconditional

- [x] Update `src/storage.js` - Replace console.log with debugLog calls
  - Lines 14, 47, 66 contain console.log statements
  - Line 72 uses console.debug - replace with debugLog for consistency
  - Import `debugLog` from './utils/debug.js'
  - Replace each `console.log(...)` with `debugLog(...)`
  - Keep console.error and console.warn unconditional

- [x] Update `src/message-metadata.js` - Replace console.log with debugLog calls
  - Lines 36, 41 contain console.log statements
  - Import `debugLog` from './utils/debug.js'
  - Replace each `console.log(...)` with `debugLog(...)`

### Phase 2: Injection and Interceptor
- [x] Update `src/injection.js` - Replace console.log with debugLog calls
  - Lines 11-17, 67-110, 116-150, 155-161, 177 contain console.log statements
  - Import `debugLog` from './utils/debug.js'
  - Replace each `console.log(...)` with `debugLog(...)`
  - **IMPORTANT**: Preserve `debugInjection()` function behavior - it should always log (manual debugging), do not use debugLog
  - Keep console.error and console.warn unconditional

- [x] Update `src/interceptor.js` - Replace console.log with debugLog calls
  - Lines 7-10, 15, 20, 28-29, 33-35, 39, 46, 61, 64 contain console.log statements
  - Import `debugLog` from './utils/debug.js'
  - Replace each `console.log(...)` with `debugLog(...)`
  - Keep console.error and console.warn unconditional

### Phase 3: Events and Initialization
- [x] Update `src/events.js` - Replace console.log with debugLog calls
  - Lines 11, 17, 35, 44, 53, 62-80 contain console.log statements
  - Import `debugLog` from './utils/debug.js'
  - Replace each `console.log(...)` with `debugLog(...)`

- [x] Update `index.js` - Replace console.log with debugLog calls
  - Lines 28, 36, 50 contain console.log statements
  - Import `debugLog` from './src/utils/debug.js'
  - Replace each `console.log(...)` with `debugLog(...)`

### Phase 4: UI Components
- [x] Update `ui/settings.js` - Replace console.log with debugLog calls
  - Lines 32, 84, 105, 120 contain console.log statements (unconditional)
  - Lines 320, 331, 340 already use conditional console.debug - replace with debugLog for consistency
  - Import `debugLog` from '../src/utils/debug.js'
  - Replace each `console.log(...)` with `debugLog(...)`
  - Note: Lines 320, 331, 340 currently have `if (settings?.debugMode)` wrapper - remove these and just use debugLog

- [x] Update `ui/status.js` - Verify no changes needed
  - Only contains console.warn on line 56
  - Should remain unconditional (warnings always show)

### Phase 5: Testing
- [x] Create unit tests for `src/utils/debug.js`
  - Test debugLog calls console.log when debugMode is true
  - Test debugLog does NOT call console.log when debugMode is false
  - Test debugLog handles missing debugMode setting (undefined)
  - Test debugLog handles console being undefined

- [x] Update unit tests for `src/compression.js`
  - Mock debugLog instead of console.log
  - Ensure tests cover both debugMode true and false scenarios
  - Verify debugLog mocks are called/not called accordingly

- [x] Update unit tests for `src/injection.js`
  - Mock debugLog instead of console.log for regular logging
  - Keep console.log mock for debugInjection() (it should always log)
  - Ensure tests cover both debugMode true and false scenarios
  - Verify `debugInjection()` always logs regardless of debugMode

- [x] Update unit tests for `src/interceptor.js`
  - Mock debugLog instead of console.log
  - Ensure tests cover both debugMode true and false scenarios
  - Verify debugLog mocks behavior

- [x] Update unit tests for `src/events.js`
  - Mock debugLog instead of console.log
  - Ensure tests cover both debugMode true and false scenarios
  - Verify event logging behavior

- [x] Update unit tests for `src/storage.js`
  - Mock debugLog instead of console.log
  - Ensure tests cover both debugMode true and false scenarios
  - Verify storage logging behavior

- [x] Update unit tests for `src/message-metadata.js`
  - Mock debugLog instead of console.log
  - Ensure tests cover both debugMode true and false scenarios
  - Verify metadata logging behavior

- [x] Update integration tests
  - Test with debugMode enabled - verify verbose console output
  - Test with debugMode disabled - verify minimal console output
  - Test error paths - verify console.error always appears
  - Test warning paths - verify console.warn always appears

### Phase 6: Validation
- [x] Run linter: `npm run lint`
  - Verify no import errors
  - Verify no code style violations

- [x] Run all tests: `npm test -- --run`
  - Ensure all unit tests pass
  - Ensure all integration tests pass

- [x] Manual testing - Debug mode disabled
  - Set debugMode to false in settings
  - Perform normal operations (compaction, injection, etc.)
  - Open browser console
  - Verify only errors and warnings appear
  - Verify no informational console.log statements appear

- [x] Manual testing - Debug mode enabled
  - Set debugMode to true in settings
  - Perform normal operations (compaction, injection, etc.)
  - Open browser console
  - Verify detailed console.log statements appear
  - Verify errors and warnings also appear

- [x] Manual testing - Manual debug functions
  - Disable debugMode
  - Call `window.cfmDebugInjection()` from console
  - Verify it logs output regardless of debugMode setting

- [x] Manual testing - Error scenarios
  - Disable debugMode
  - Trigger error conditions (e.g., invalid settings, missing data)
  - Verify console.error statements appear in console

- [x] Manual testing - Warning scenarios
  - Disable debugMode
  - Trigger warning conditions (e.g., no storage, missing summaries)
  - Verify console.warn statements appear in console

## Dependencies
- Phase 0 (create debug helper) must be completed first
- Phase 1, 2, 3, and 4 all depend on Phase 0
- Phase 5 (testing) depends on phases 0-4 being complete
- Phase 6 (validation) depends on phase 5 being complete

## Parallelizable Work
- Files in Phase 1, 2, 3, and 4 can be worked on in parallel by different developers (after Phase 0 is complete)
- Phase 5 (testing) depends on phases 1-4 being complete
- Phase 6 (validation) depends on phase 5 being complete

## Rollback Plan
If issues are found after implementation:
- Each file change is independent and can be reverted individually
- Git can be used to revert specific commits
- The changes are simple enough that manual rollback is also feasible
