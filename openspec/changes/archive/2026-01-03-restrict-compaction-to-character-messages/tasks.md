# Tasks: Restrict compaction triggers to only after character messages

## Implementation Tasks

### Phase 0: Write Failing Tests (TDD - Red)

- [x] Write failing test: Compression does NOT trigger after user message
  - Create test in `tests/integration/injection-flow.test.js`
  - Setup: Enable auto-compaction with low threshold (e.g., 10 messages)
  - Act: Trigger `event_types.MESSAGE_RECEIVED` event with sufficient messages
  - Assert: `triggerCompaction()` is NOT called
  - Assert: `performCompaction()` is NOT called
  - Assert: Test fails initially (expected behavior not yet implemented)

 - [x] Write failing test: Compression DOES trigger after character message
   - Create test in `tests/integration/injection-flow.test.js`
   - Setup: Enable auto-compaction with low threshold (e.g., 10 messages)
   - Act: Trigger `event_types.CHARACTER_MESSAGE_RENDERED` event with sufficient messages
   - Assert: `triggerCompaction()` is called
   - Assert: `performCompaction()` is called when trigger returns true
   - Assert: `injectSummaries()` is called after compression
   - Assert: Test fails initially (compression doesn't trigger on this event yet)

- [x] Write failing test: Multiple user messages, then character response
  - Create test in `tests/integration/injection-integration.test.js`
  - Setup: Enable auto-compaction
  - Act: Simulate 3 user messages in sequence (each below threshold)
  - Act: Simulate character response (total exceeds threshold)
  - Assert: Compression only runs after character response
  - Assert: Compression did NOT run after any user message
  - Assert: Test fails initially

### Phase 1: Make Tests Pass (TDD - Green)

- [x] Remove compression triggering from MESSAGE_RECEIVED event
  - Edit `src/events.js`
  - Remove compaction triggering logic (lines 28-32 in MESSAGE_RECEIVED handler)
  - Keep `markMessageActive(message)` call in MESSAGE_RECEIVED
  - Run tests to verify MESSAGE_RECEIVED no longer triggers compression

 - [x] Add compression triggering to CHARACTER_MESSAGE_RENDERED event
  - Edit `src/events.js`
  - Add compaction triggering logic to CHARACTER_MESSAGE_RENDERED handler
  - Logic should be identical to what was removed from MESSAGE_RECEIVED:
    ```javascript
    if (await triggerCompaction()) {
        await performCompaction();
        await saveChatStorage();
        await injectSummaries();
    }
    ```
  - Ensure this runs AFTER `markMessageActive(message)` call
  - Run tests to verify compression now triggers on CHARACTER_MESSAGE_RENDERED

 - [x] Verify USER_MESSAGE_RENDERED unchanged
   - Confirm USER_MESSAGE_RENDERED handler only marks messages as active
   - Confirm no compression logic present
   - Run tests to verify no compression after user messages

 - [x] Run all failing tests from Phase 0
   - Run `npm test -- --run` to execute tests
   - Verify all Phase 0 tests now pass
   - Fix any remaining issues to make all tests green

### Phase 2: Refactor (TDD - Refactor)

- [x] Code review for consistency
  - Review changes for code style consistency
  - Ensure debug logging is appropriate
  - Verify no duplicate code

 - [x] Remove MESSAGE_RECEIVED event listener if no longer needed
   - Check if MESSAGE_RECEIVED has other purposes (markMessageActive)
   - If markMessageActive also happens in USER/CHARACTER_MESSAGE_RENDERED, consider removing MESSAGE_RECEIVED
   - Keep MESSAGE_RECEIVED if it serves other purposes (defensive redundancy)
   - Update tests if MESSAGE_RECEIVED is removed
   - **Decision: Keep MESSAGE_RECEIVED**
     - Analysis: MESSAGE_RECEIVED only calls markMessageAsActive(), which is also called by USER_MESSAGE_RENDERED and CHARACTER_MESSAGE_RENDERED
     - Design document states the redundancy is acceptable for defensive programming
     - Keeping it provides a safety net in edge cases (e.g., if rendering fails but message was received)
     - markMessageActive() is idempotent, so no harm in calling it multiple times
     - Performance impact is negligible
     - No tests need updating since the behavior remains the same

 - [x] Re-run tests after refactoring
    - Ensure all tests still pass after refactoring
    - Ensure no regressions
    - Verified: All 123 tests pass (2026-01-03 13:08:58)

### Phase 3: Additional Validation Tests

- [x] Add integration test for context pressure trigger timing
  - Create test verifying context pressure trigger only fires after character messages
  - Setup: Context at 70%, threshold 75%
  - Act: User message pushes context to 80%
  - Assert: No compression triggered
  - Act: Character message renders
  - Assert: Compression triggered (if context >= 75%)
  - **Completed 2026-01-03**: Added two tests to `tests/integration/injection-flow.test.js`:
    - `should NOT trigger compression after user message even when context exceeds threshold`
    - `should trigger compression after character message when context exceeds threshold`
  - Tests verify that context pressure triggers respect the new timing (only after character messages)

   - [x] Add integration test for manual compaction independence
    - Create test verifying `/cfm-compact` works regardless of message type
    - Setup: Disable auto-compaction
    - Act: Execute slash command
    - Assert: Compression runs immediately
    - Verify timing is independent of message events
    - **Completed 2026-01-03**: Added two tests to `tests/integration/injection-integration.test.js`:
      - `should work regardless of auto-compaction setting and message type`
      - `should work immediately after user message without waiting for character response`
    - Tests verify that manual compaction via `/cfm-compact`:
      - Works regardless of whether auto-compaction is enabled or disabled
      - Runs independently of message events (no need to trigger any message events)
      - Executes immediately when called
      - Bypasses trigger checking (triggerCompaction is not called)

  - [x] Add test for streaming response behavior
    - Create test verifying compression only triggers after streaming completes
    - Verify CHARACTER_MESSAGE_RENDERED fires after streaming
    - Assert compression runs after complete character response
    - **Completed 2026-01-03**: Added test to `tests/integration/injection-flow.test.js`:
      - `should only trigger compression after CHARACTER_MESSAGE_RENDERED (streaming response behavior)`
    - Test documents and verifies:
      - CHARACTER_MESSAGE_RENDERED event fires AFTER streaming completes
      - Compression correctly waits for this event before triggering
      - This ensures compression doesn't run during streaming (wasteful)
      - User sees the complete response before compression affects context
      - Important for user experience - full response visible before background operations

### Phase 4: Documentation and Cleanup

- [x] Update inline documentation in events.js
  - Add comments explaining why compression triggers on CHARACTER_MESSAGE_RENDERED
  - Document the event flow (user → character → compression check)
  - **Completed 2026-01-03**: Added comprehensive inline documentation to src/events.js:
    - Module-level comment block explaining compression trigger strategy
    - CHARACTER_MESSAGE_RENDERED handler documentation with event sequence
    - USER_MESSAGE_RENDERED handler documentation explaining why compression is NOT triggered
    - MESSAGE_RECEIVED handler documentation explaining defensive redundancy

- [x] Verify no outdated comments
  - Check for comments mentioning MESSAGE_RECEIVED triggering compression
  - Update or remove outdated comments
  - **Completed 2026-01-03**: Updated outdated comments in test files:
    - `tests/integration/injection-flow.test.js` (2 comments updated)
    - `tests/integration/injection-integration.test.js` (1 comment updated)
  - Removed references to "FAILS initially" and "current implementation triggers compression"
  - Updated comments to reflect the current state: tests verify correct behavior after Phase 1 fix
  - All 128 tests pass, linter shows no new issues

- [x] Run linter
  - Execute `npm run lint`
  - Verify no import errors
  - Verify no code style violations
  - **Completed 2026-01-03**: Linter passed with 0 errors, 3 pre-existing warnings (unused variables in index.js, ui/status.js, tests/unit/injection.test.js - all unrelated to Phase 4 changes)

### Phase 5: Manual Testing

- [x] Manual test: User messages do not trigger compression
  - Enable debug mode in settings
  - Set compaction threshold to 10 messages
  - Send 10+ user messages
  - Observe console logs: No compaction should occur
  - Verify message count increases without compression
  - **Completed 2026-01-03**: Manual testing passed ✅

- [x] Manual test: Character message triggers compression
  - Continue from previous test
  - Wait for bot response (or manually trigger character message)
  - Observe console logs: Compaction should occur after CHARACTER_MESSAGE_RENDERED
  - Verify compression logs appear at correct time
  - **Completed 2026-01-03**: Manual testing passed ✅

- [x] Manual test: Auto-compact toggle still works
  - Disable auto-compaction in settings
  - Send messages, trigger character responses
  - Verify no automatic compression occurs
  - Use `/cfm-compact` to manually trigger
  - Verify manual compaction still works
  - **Completed 2026-01-03**: Manual testing passed ✅

- [x] Manual test: Context pressure timing
  - Enable debug mode
  - Set context threshold to 75%
  - Send user messages until context approaches 80%
  - Verify no compression after user message
  - Wait for character response
  - Verify compression triggers after character message if context >= 75%
  - **Completed 2026-01-03**: Manual testing passed ✅

- [x] Manual test: Multiple messages in quick succession
  - Send 5+ user messages quickly
  - Wait for character response
  - Verify compression only triggers once after character response
  - Verify all messages are marked as active
  - **Completed 2026-01-03**: Manual testing passed ✅

- [x] Manual test with existing chat
  - Open an existing chat with many messages
  - Send a user message
  - Verify no compression
  - Wait for bot response
  - Verify compression triggers if thresholds met
  - Verify existing functionality preserved
  - **Completed 2026-01-03**: Manual testing passed ✅

## Dependencies
- Phase 0 (write failing tests) must be completed first (TDD approach)
- Phase 1 (make tests pass) depends on Phase 0
- Phase 2 (refactor) depends on Phase 1 being complete
- Phase 3 (additional tests) depends on Phase 2 being complete
- Phase 4 (documentation) can happen in parallel with Phase 3
- Phase 5 (manual testing) depends on all code changes being complete

## Parallelizable Work
- Tests in Phase 0 can be written in parallel (different test files)
- Phase 4 (documentation) can happen in parallel with Phase 3 (additional tests)
- Manual tests in Phase 5 can be done independently

## Rollback Plan
If issues are found after implementation:
- Revert changes to `src/events.js` (restore MESSAGE_RECEIVED compaction trigger, remove from CHARACTER_MESSAGE_RENDERED)
- Remove or disable new integration tests
- Git revert individual commits
- Changes are simple and isolated, making rollback straightforward

## Success Criteria
- All new tests pass
- All existing tests pass
- Linter passes with no errors
- Manual testing confirms correct timing
- Compression never triggers after user messages
- Compression only triggers after character messages when conditions are met
