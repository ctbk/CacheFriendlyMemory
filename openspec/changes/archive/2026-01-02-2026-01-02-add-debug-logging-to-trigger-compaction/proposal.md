# Change: Add Debug Logging to triggerCompaction()

## Why
Debugging compression behavior is currently difficult because calls to `triggerCompaction()` are not logged, even when DEBUG mode is enabled. Developers and users cannot easily see:
- When compaction is being evaluated
- What values are being considered (message counts, context usage, thresholds)
- Why compaction was or wasn't triggered

Adding debug logging when DEBUG mode is enabled will make it much easier to understand the compression system's behavior and troubleshoot issues.

## What Changes
- When `debugMode` is enabled, log every call to `triggerCompaction()`
- Log the input values: unsummarized count, context size, current context usage, compact threshold, context threshold, and auto-compact setting
- Log the return value (true/false) to indicate if compaction will proceed
- Use the existing debug logging pattern: `console.log('[CacheFriendlyMemory] DEBUG - ...')`

## Impact
- Affected specs: `specs/debug-logging` (new capability)
- Affected code:
  - `src/compression.js` - Add debug logging to `triggerCompaction()` function
- No behavioral changes - only adds conditional logging when debug mode is enabled
- Tests: Add unit tests for debug logging behavior in `tests/unit/compression.test.js`
