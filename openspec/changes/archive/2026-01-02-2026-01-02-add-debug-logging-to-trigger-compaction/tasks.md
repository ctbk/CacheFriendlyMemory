# Tasks: Add Debug Logging to triggerCompaction()

## Implementation Tasks

- [x] Add debug logging at function entry in `src/compression.js`
  - Import `getGlobalSetting` if not already imported
  - Check `getGlobalSetting('debugMode')` before logging
  - Log all input parameters used in the compaction decision
  - Use existing debug logging pattern: `console.log('[CacheFriendlyMemory] DEBUG - ...')`

- [x] Add debug logging at function exit in `src/compression.js`
  - Log the return value after calling `shouldTriggerCompaction()`
  - Use existing debug logging pattern

- [x] Write unit tests for debug logging in `tests/unit/compression.test.js`
  - Test that logs appear when debug mode is enabled
  - Test that no logs appear when debug mode is disabled
  - Test that logged parameters are correct
  - Test that logged return value is correct
  - Mock console.log and getGlobalSetting for testing

- [x] Run tests: `npm test -- --run` to ensure no regressions
- [x] Run linter: `npm run lint` to verify no import errors

- [ ] Manual verification:
  - [ ] Enable debug mode in CacheFriendlyMemory settings
  - [ ] Trigger a scenario that calls triggerCompaction() (e.g., receive a message)
  - [ ] Open browser console and verify debug logs appear
  - [ ] Verify logs show all input parameters with correct values
  - [ ] Verify logs show return value (true or false)
  - [ ] Disable debug mode in settings
  - [ ] Trigger triggerCompaction() again
  - [ ] Verify no debug logs appear
  - [ ] Verify normal console.warn/console.log for errors still appears

## Dependencies
None - all tasks are independent and can be completed in sequence

## Parallelizable Work
- Unit tests can be written in parallel with implementation (but implementation must exist first to pass tests)
- Manual verification must come after implementation and automated testing
