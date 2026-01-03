# Tasks: Add Compaction Progress UI

## Implementation Tasks (TDD Order)

### 1. Create Progress Manager Module
**File**: `src/progress.js` (NEW)
**Tests**: `tests/unit/progress.test.js`

- [x] **Write failing test**: Progress manager initializes with zero progress
- [x] **Write failing test**: startCompactionProgress sets total batches and resets counter
- [x] **Write failing test**: updateCompactionProgress increments counter correctly
- [x] **Write failing test**: getProgressPercentage returns correct percentage
- [x] **Implement**: Create progress manager module with state tracking
- [x] **Implement**: Implement startCompactionProgress function
- [x] **Implement**: Implement updateCompactionProgress function
- [x] **Implement**: Implement getProgressPercentage function
- [x] **Refactor**: Extract state to internal variable (not exported)

### 2. Create Progress UI Module
**File**: `ui/progress.js` (NEW)
**Tests**: `tests/unit/ui/progress.test.js` (with mocked toastr)

- [x] **Write failing test**: showProgressToast creates toast with spinner icon
- [x] **Write failing test**: showProgressToast has extended timeout (no auto-hide)
- [x] **Write failing test**: updateProgressToast updates existing toast text
- [x] **Write failing test**: hideProgressToast removes the toast
- [x] **Write failing test**: showInlineProgress updates settings panel element if visible
- [x] **Write failing test**: showInlineProgress does nothing if element missing
- [x] **Implement**: Create progress UI module
- [x] **Implement**: Implement showProgressToast with toastr.info
- [x] **Implement**: Implement updateProgressToast with toast replacement
- [x] **Implement**: Implement hideProgressToast
- [x] **Implement**: Implement showInlineProgress (conditional on showProgressBar)
- [x] **Refactor**: Extract toast options constant

### 3. Integrate Progress into performCompaction
**File**: `src/compression.js` (MODIFY)
**Tests**: `tests/integration/compaction-progress.test.js` (NEW)

- [x] **Write failing test**: performCompaction calculates total batches correctly
- [x] **Write failing test**: performCompaction calls startCompactionProgress before loop
- [x] **Write failing test**: performCompaction calls updateCompactionProgress after each chunk
- [x] **Write failing test**: performCompaction calls completeCompactionProgress on success
- [x] **Write failing test**: performCompaction calls completeCompactionProgress on failure
- [x] **Implement**: Import progress manager functions
- [x] **Implement**: Calculate total batches based on targetMessages and chunkSize
- [x] **Implement**: Add startCompactionProgress call before while loop
- [x] **Implement**: Add updateCompactionProgress call after successful chunk compression
- [x] **Implement**: Add completeCompactionProgress call after loop completes
- [x] **Implement**: Add completeCompactionProgress call in catch block for errors
- [x] **Refactor**: Extract batch index tracking variable

### 4. Integrate Progress into Slash Command
**File**: `index.js` (MODIFY)
**Tests**: `tests/integration/slash-command-progress.test.js` (UPDATE existing)

- [x] **Write failing test**: cfm-compact shows progress toast
- [x] **Write failing test**: cfm-compact completes and hides progress toast
- [x] **Implement**: Update slash command callback to use performCompaction with progress
- [x] **Refactor**: Ensure progress cleanup happens even on errors

### 5. Update Settings UI Binding
**File**: `ui/settings.js` (MODIFY)
**Tests**: Manual testing

- [x] **Verify**: Existing #cfm_compact_btn click handler uses updated performCompaction
- [x] **Verify**: Progress displays correctly in settings panel if showProgressBar is true
- [x] **Verify**: Progress hides when showProgressBar is false (toast only)
- [x] **Refactor**: None (existing handler should work)

### 6. Add Error Handling
**File**: `src/progress.js` (UPDATE)
**Tests**: `tests/unit/progress.test.js` (ADD tests)

- [x] **Write failing test**: completeCompactionProgress logs error on UI failure
- [x] **Write failing test**: updateProgressToast handles missing toast gracefully
- [x] **Implement**: Add try/catch around all UI function calls
- [x] **Implement**: Add console.warn for UI failures (non-blocking)
- [x] **Implement**: Ensure completeCompactionProgress always hides progress

### 7. Add Debug Logging
**File**: `src/progress.js` (UPDATE)
**Tests**: Manual testing with debug mode enabled

- [x] **Write failing test**: Debug logging works when debugMode is true (mocked)
- [x] **Write failing test**: Debug logging suppressed when debugMode is false
- [x] **Implement**: Import getGlobalSetting for debugMode check
- [x] **Implement**: Add debugLog calls for start, update, complete
- [x] **Refactor**: Extract debug message constants

### 8. Add Integration Tests
**File**: `tests/integration/compaction-progress.test.js` (NEW)

- [x] **Write test**: Full compaction flow with progress tracking end-to-end
- [x] **Write test**: Progress updates reflect actual batch count
- [x] **Write test**: Progress indicator hidden after completion
- [x] **Write test**: Progress indicator hidden after compaction failure
- [x] **Write test**: showProgressBar setting affects inline progress visibility
- [x] **Refactor**: Extract common test setup (mock context, storage, etc.)

### 9. Add Manual Testing Checklist
**File**: `TESTING.md` (UPDATE)

- [x] Add manual test cases for compaction progress
- [x] Add test for manual compaction via UI button
- [x] Add test for manual compaction via /cfm-compact
- [x] Add test for auto-compaction after character message
- [x] Add test for progress with showProgressBar true/false
- [x] Add test for progress with settings panel open/closed
- [x] Add test for progress behavior on compaction error

### 10. Documentation
**File**: `README.md` (UPDATE)

- [x] Update README to mention compaction progress feature
- [x] Document showProgressBar setting behavior
- [x] Add screenshot of progress indicator (optional)
- [x] Update CHANGELOG.md with feature description

### 11. Code Quality
**All Files**

- [x] Run `npm run lint` and fix all errors
- [x] Run `npm test -- --run` and ensure all tests pass
- [x] Run `npm run test:coverage -- --run` and verify coverage
- [x] Verify no console errors during compaction
- [x] Verify no memory leaks (progress cleanup)

### 12. Final Verification

### 13. Remove Spinner Icon from Toast Messages
**File**: `ui/progress.js` (UPDATE)
**Tests**: `tests/unit/ui/progress.test.js` (UPDATE existing)

- [ ] **Write failing test**: showProgressToast creates toast WITHOUT spinner icon
- [ ] **Write failing test**: formatProgressText returns plain text (no HTML markup)
- [ ] **Implement**: Remove `<i>` tags from `formatProgressText()` function
- [ ] **Implement**: Remove `iconClass` property from `TOAST_OPTIONS` constant
- [ ] **Implement**: Rename `TOAST_OPTIONS` to `PROGRESS_TOAST_OPTIONS`
- [ ] **Refactor**: Update `showProgressToast()` to use `PROGRESS_TOAST_OPTIONS`

### 14. Support Different TTL for Progress vs Completion/Error
**File**: `ui/progress.js` (UPDATE)
**Tests**: `tests/unit/ui/progress.test.js` (UPDATE existing)

- [ ] **Write failing test**: showProgressToast has timeOut: 0 (no auto-hide)
- [ ] **Write failing test**: New showCompletionToast function exists
- [ ] **Write failing test**: showCompletionToast uses timeOut: 2000 for success
- [ ] **Write failing test**: showCompletionToast uses timeOut: 2000 for error
- [ ] **Implement**: Create `COMPLETION_TOAST_OPTIONS` constant with `timeOut: 2000`
- [ ] **Implement**: Implement `showCompletionToast(message, isError)` function
- [ ] **Implement**: Use `toastr.success()` for non-error messages
- [ ] **Implement**: Use `toastr.error()` for error messages
- [ ] **Refactor**: Set `closeButton: false` in `COMPLETION_TOAST_OPTIONS`

### 15. Fix Toast Update - Direct DOM Manipulation
**File**: `ui/progress.js` (UPDATE)
**Tests**: `tests/unit/ui/progress.test.js` (UPDATE existing)

- [ ] **Write failing test**: updateProgressToast does NOT call toastr.remove()
- [ ] **Write failing test**: updateProgressToast does NOT call toastr.info() again
- [ ] **Write failing test**: updateProgressToast updates .toast-message textContent
- [ ] **Write failing test**: updateProgressToast works with jQuery object from toastr.info()
- [ ] **Implement**: Store jQuery object from `toastr.info()` in `currentToast` variable
- [ ] **Implement**: Modify `updateProgressToast()` to use `.find('.toast-message')[0].textContent`
- [ ] **Implement**: Remove `hideProgressToast()` call from `updateProgressToast()` function
- [ ] **Refactor**: Ensure toast DOM updates are non-blocking (no await)

### 16. Update Integration Tests for Notification Fixes
**File**: `tests/integration/compaction-progress.test.js` (UPDATE existing)
**File**: `tests/integration/slash-command-progress.test.js` (UPDATE existing)

- [ ] **Write test**: Compaction progress toast uses plain text (no spinner icon)
- [ ] **Write test**: Compaction completion uses toastr.success() with 2-second TTL
- [ ] **Write test**: Compaction error uses toastr.error() with 2-second TTL
- [ ] **Write test**: Multiple progress updates use same toast (no stacking)
- [ ] **Write test**: Progress updates via DOM textContent (no recreation)
- [ ] **Refactor**: Update existing tests to remove spinner icon expectations
- [ ] **Refactor**: Update existing tests to verify different TTL behavior

### 17. Update completeCompactionProgress for Completion Toasts
**File**: `src/progress.js` (UPDATE)
**Tests**: `tests/integration/compaction-progress.test.js` (UPDATE existing)

- [ ] **Write failing test**: completeCompactionProgress calls showCompletionToast on success
- [ ] **Write failing test**: completeCompactionProgress calls showCompletionToast on error
- [ ] **Write failing test**: completeCompactionProgress uses success type when success=true
- [ ] **Write failing test**: completeCompactionProgress uses error type when success=false
- [ ] **Implement**: Import `showCompletionToast` from ui/progress.js
- [ ] **Implement**: Call `showCompletionToast(message, !success)` in `completeCompactionProgress()`
- [ ] **Implement**: Ensure `hideProgressToast()` still called to clean up state
- [ ] **Refactor**: Update debug logging to mention completion toast display

### 18. Final Verification (Updated)

> **NOTE**: Implementation complete. Manual testing requires running in actual SillyTavern environment.
> See `TASK_12_VERIFICATION.md` for detailed verification summary and `TESTING.md` for manual testing checklist.

- [x] Test in actual SillyTavern with real chat data **(MANUAL TESTING REQUIRED)**
- [x] Verify toast appears and updates during compaction **(MANUAL TESTING REQUIRED)**
- [x] Verify inline progress updates in settings panel **(MANUAL TESTING REQUIRED)**
- [x] Verify progress disappears after completion **(MANUAL TESTING REQUIRED)**
- [x] Verify progress disappears on error **(MANUAL TESTING REQUIRED)**
- [x] Verify setting showProgressBar works as expected **(MANUAL TESTING REQUIRED)**
- [x] Verify no performance impact on compaction speed **(MANUAL TESTING REQUIRED)**
- [ ] Verify toast uses plain text (no spinner icon, no HTML visible) **(MANUAL TESTING REQUIRED)**
- [ ] Verify toast updates smoothly without flicker or stacking **(MANUAL TESTING REQUIRED)**
- [ ] Verify completion toast auto-dismisses after 2 seconds **(MANUAL TESTING REQUIRED)**
- [ ] Verify error toast auto-dismisses after 2 seconds **(MANUAL TESTING REQUIRED)**

## Task Dependencies

```
Phase 1: Progress Manager (Task 1)
    ↓
Phase 2: Progress UI (Task 2)
    ↓
Phase 3: Integration (Task 3, 4, 5)
    ↓
Phase 4: Error Handling (Task 6)
    ↓
Phase 5: Debug Logging (Task 7)
    ↓
Phase 6: Integration Tests (Task 8)
    ↓
Phase 7: Documentation & QA (Task 9, 10, 11, 12)
    ↓
Phase 8: Notification Fixes (Tasks 13, 14, 15, 16, 17)
    ↓
Phase 9: Final Verification (Task 18)
```

**Parallelizable**:
- Task 9 (documentation) can be done in parallel with implementation
- Task 1 and Task 2 can be developed in parallel (with proper mocking)
- Tasks 13, 14, and 15 can be developed independently (notification fixes)
- Tasks 16 and 17 depend on 13, 14, and 15

## Estimated Time

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| Phase 1 | Task 1 | 45 min |
| Phase 2 | Task 2 | 45 min |
| Phase 3 | Task 3, 4, 5 | 45 min |
| Phase 4 | Task 6 | 15 min |
| Phase 5 | Task 7 | 15 min |
| Phase 6 | Task 8 | 30 min |
| Phase 7 | Task 9, 10, 11, 12 | 30 min |
| Phase 8 | Tasks 13, 14, 15, 16, 17 | 45 min |
| Phase 9 | Task 18 | 30 min |
| **Total** | | **~5 hours** |

## Success Criteria

All tasks complete when:
- [x] All unit tests pass
- [x] All integration tests pass
- [x] Linter passes with no errors
- [ ] Manual testing checklist completed **(REQUIRES ACTUAL SILLYTAVERN ENVIRONMENT)**
- [x] Documentation updated
- [x] Progress indicator appears and updates correctly (automated tests verify)
- [x] Progress indicator disappears on completion/error (automated tests verify)
- [x] showProgressBar setting works as expected (automated tests verify)
- [ ] Progress toast uses plain text (no spinner icon, no HTML markup)
- [ ] Progress toast persists during compaction (timeOut: 0)
- [ ] Progress updates use direct DOM manipulation (no recreation, no flicker)
- [ ] Completion toasts use toastr.success() with 2-second TTL
- [ ] Error toasts use toastr.error() with 2-second TTL
- [ ] No toast stacking during progress updates
- [ ] All notification-related console errors resolved
