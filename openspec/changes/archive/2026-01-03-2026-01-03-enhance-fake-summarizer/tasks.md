# Tasks: Enhance Fake Summarizer Output

## Task 1: Write Failing Unit Tests for New Format
**Priority**: High
**Status**: Completed
**Dependencies**: None
**Estimated Time**: 20 minutes

### Description
Write unit tests that verify the new multi-line output format with first 25 words from each message. These tests will initially fail (red state) before implementation.

### Subtasks
1. Test single message with less than 25 words
2. Test single message with exactly 25 words
3. Test single message with more than 25 words (truncation)
4. Test multiple messages (3-5 messages)
5. Test empty message content
6. Test missing `mes` field
7. Test whitespace-only message
8. Test fixed header format
9. Test null/undefined input (existing behavior)
10. Test empty array input (existing behavior)

### Acceptance Criteria
- All tests written in `tests/unit/logic/fake-summarizer.test.js` (create new file)
- Tests verify header format `[Test Compressed Chunk]`
- Tests verify exactly 25 words extracted from long messages
- Tests verify one line per message with `[index]` prefix
- Tests pass against current implementation with `.only` (to verify they fail)
- Tests use AAA pattern (Arrange, Act, Assert)

### Validation
```bash
npm test -- tests/unit/logic/fake-summarizer.test.js --run
```

---

## Task 2: Update Existing Integration Tests (RED Phase)
**Priority**: High
**Status**: Completed
**Dependencies**: Task 1
**Estimated Time**: 15 minutes

### Description
Update integration tests in `tests/integration/fake-summarizer.test.js` and `tests/unit/compression.test.js` to expect the new multi-line format instead of the old single-line format. These tests must fail (red state) before implementation.

### Subtasks
1. Update test assertions in `tests/integration/fake-summarizer.test.js`
2. Update test assertions in `tests/unit/compression.test.js` for `createFakeSummary` tests
3. Update any other tests that depend on fake summary format
4. Verify tests fail with expected messages (new format not implemented)

### Acceptance Criteria
- All integration tests expect new format
- Tests fail because implementation returns old format
- Test failures have clear, expected messages

### Validation
```bash
npm test -- tests/integration/fake-summarizer.test.js tests/unit/compression.test.js --run
```

---

## Task 3: Implement New Fake Summarizer Logic (GREEN Phase)
**Priority**: High
**Status**: Completed
**Dependencies**: Task 2
**Estimated Time**: 15 minutes

### Description
Modify `src/logic/fake-summarizer.js` to implement the new multi-line output format with first 25 words from each message.

### Subtasks
1. Update `createFakeSummary` function to build multi-line output
2. Extract first 25 words from each message using `split(/\s+/).slice(0, 25).join(' ')`
3. Add fixed header "[Test Compressed Chunk]"
4. Build body lines with `[index]` prefix
5. Handle missing/empty message content
6. Keep existing behavior for null/undefined/empty inputs

### Acceptance Criteria
- Function returns multi-line string
- Header format is `[Test Compressed Chunk]`
- Each line starts with `[index]`
- Long messages show exactly 25 words
- Short messages show available words
- Empty/missing content shows `[index]` only
- Existing behavior for null/undefined/empty array unchanged
- All previously failing tests now pass

### Validation
```bash
npm test -- tests/unit/logic/fake-summarizer.test.js tests/integration/fake-summarizer.test.js tests/unit/compression.test.js --run
```

---

## Task 4: Run Full Test Suite and Linting
**Priority**: High
**Status**: Completed
**Dependencies**: Task 3
**Estimated Time**: 10 minutes

### Description
Run the complete test suite and linting to ensure no regressions were introduced.

### Subtasks
1. Run all tests with coverage
2. Run linter
3. Verify coverage target (80% for logic modules)
4. Fix any linting issues or test failures

### Acceptance Criteria
- All tests pass
- Linting passes with no errors
- Coverage target met for `src/logic/fake-summarizer.js`

### Validation
```bash
npm test -- --run
npm run test:coverage -- --run
npm run lint
```

---

## Task 5: Manual Verification (Optional)
**Priority**: Low
**Status**: Completed
**Dependencies**: Task 3
**Estimated Time**: 15 minutes

### Description
Manually test the fake summarizer by temporarily enabling it and triggering compaction to see the new format in action.

### Subtasks
1. Set `USE_FAKE_SUMMARIZER = true` in `src/compression.js`
2. Load extension in SillyTavern
3. Trigger manual compaction via `/cfm-compact`
4. Verify new format appears in console/log
5. Revert `USE_FAKE_SUMMARIZER = false`

### Acceptance Criteria
- Multi-line output visible during manual testing
- Fixed header "[Test Compressed Chunk]" displayed
- Each message line shows first 25 words

### Notes
- This is optional since fake summarizer is test-only
- Can be skipped if confident from automated tests

---

## Parallel Work Opportunities

### Can Run in Parallel
- None (tasks are sequential following TDD)

### Dependencies Summary
```
Task 1 (Write New Tests) → Task 2 (Update Existing Tests) → Task 3 (Implement) → Task 4 (Full Validation)
                                                         ↓
                                                   Task 5 (Manual - Optional)
```

## Total Estimated Time
1.5 hours (1 hour excluding optional manual verification)
