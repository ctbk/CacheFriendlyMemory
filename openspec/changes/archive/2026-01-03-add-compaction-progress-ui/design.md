# Design: Compaction Progress UI

## Architecture Overview

The compaction progress system consists of three components:

1. **Progress Manager** (`src/progress.js` - NEW): Handles progress tracking and UI updates
2. **Progress UI** (`ui/progress.js` - NEW): Manages visual progress indicators
3. **Integration Points**: Hook into existing `performCompaction()` function

## Component Design

### 1. Progress Manager

**Location**: `src/progress.js` (new file)

**Responsibilities**:
- Track current batch/counter during compaction
- Calculate progress percentage
- Trigger UI updates at appropriate intervals
- Handle completion and error states

**Key Functions**:
```javascript
export function startCompactionProgress(totalBatches)
export function updateCompactionProgress(currentBatch, totalBatches)
export function completeCompactionProgress(success, message)
export function hideCompactionProgress()
```

**State Management**:
- Track `currentBatch` and `totalBatches` internally
- Provide functions to query current progress (for testing)

### 2. Progress UI

**Location**: `ui/progress.js` (new file)

**Responsibilities**:
- Show progress indicator (toast or inline)
- Update progress text and percentage
- Remove/hide indicator on completion

**UI Patterns**:
- **Toast**: Use `toastr.info()` with no auto-hide during compaction
  - Text: "Compacting: {current}/{total} batches ({percentage}%)"
  - Configuration: `{ timeOut: 0, extendedTimeOut: 0, closeButton: true }`

- **Completion/Error Toast**: Use `toastr.success()` or `toastr.error()` with 2-second TTL
  - Text: "Compacted {N} messages" or error message
  - Configuration: `{ timeOut: 2000, extendedTimeOut: 0, closeButton: false }`

- **Inline**: Optional progress bar in settings panel
  - Only if `showProgressBar` setting is `true`
  - Update `#cfm_stat_compactionProgress` element
  - Hide/replace status text with progress during compaction

**SillyTavern Pattern Alignment**:
- Use existing `toastr` API (accessed via `SillyTavern.getContext()`)
- Use `toastr.success()` for completion, `toastr.error()` for failures
- Update toast DOM directly for progress (no recreation to avoid flickering)

### 3. Integration with performCompaction()

**Location**: `src/compression.js` (modifications to existing file)

**Changes**:
1. Import progress manager functions
2. Calculate total batches before compaction loop
3. Call `startCompactionProgress(totalBatches)` before loop
4. Call `updateCompactionProgress()` after each chunk is compressed
5. Call `completeCompactionProgress()` after loop completes

**Example Integration**:
```javascript
export async function performCompaction() {
    // ... existing setup ...

    // Calculate total batches
    const totalBatches = Math.ceil(targetMessages / level1ChunkSize);
    startCompactionProgress(totalBatches);

    let batchIndex = 0;
    while (/* existing condition */) {
        // ... existing chunk logic ...

        const summary = await compressChunk(chunk);
        if (summary) {
            // ... existing summary logic ...
            batchIndex++;
            updateCompactionProgress(batchIndex, totalBatches);
        }
    }

    // ... existing cleanup ...
    completeCompactionProgress(true, `Compacted ${totalMessagesCompacted} messages`);
}
```

## Data Flow

```
User triggers compaction
       ↓
performCompaction() called
       ↓
Calculate total batches
       ↓
startCompactionProgress(totalBatches)
       ↓
[Compaction Loop]
       ↓
   compressChunk() → summary created
       ↓
updateCompactionProgress(batchIndex, totalBatches)
       ↓
   Progress UI updated (toast/inline)
       ↓
[Loop continues or exits]
       ↓
completeCompactionProgress(success, message)
       ↓
   Progress UI removed
       ↓
User sees completion toast/status
```

## Error Handling

### Progress Manager Errors
- If UI update fails, log to console but don't interrupt compaction
- Use try/catch around all UI calls
- On compaction failure, call `completeCompactionProgress(false, errorMessage)`

### UI Fallbacks
- If `toastr` is unavailable, fall back to console logging
- If settings panel element missing, skip inline updates
- Always attempt to remove/hide progress on completion

## Configuration

### Settings Impact
- **`showProgressBar`**: Controls inline progress visibility in settings panel
  - `true`: Show inline progress bar in settings panel
  - `false`: Only show toast notification (or no progress at all)
- **`debugMode`**: Adds verbose logging to console during progress updates

### New Settings
None - reuses existing `showProgressBar` setting

## Testing Strategy

### Unit Tests
- Test progress manager state tracking
- Test progress percentage calculation
- Test UI function calls with mocks

### Integration Tests
- Test full compaction flow with progress tracking
- Test progress updates at batch boundaries
- Test error handling (compaction failure)
- Test settings integration (showProgressBar)

### Manual Tests
- Test manual compaction via `/cfm-compact`
- Test auto-compaction after character messages
- Test progress visibility with settings panel open/closed
- Test progress with `showProgressBar: true` and `false`

## Implementation Phases

### Phase 1: Core Progress Manager
- Create `src/progress.js`
- Implement basic tracking functions
- Add unit tests

### Phase 2: Progress UI
- Create `ui/progress.js`
- Implement toast-based progress
- Add inline progress (optional based on setting)
- Add unit tests

### Phase 3: Integration
- Modify `performCompaction()` to use progress manager
- Add progress calculation
- Wire up all hooks
- Add integration tests

### Phase 4: Refinement
- Test edge cases
- Fix bugs
- Polish UI

## Performance Considerations

### DOM Updates
- Progress updates occur after each chunk (10+ messages)
- This is infrequent enough to avoid performance issues
- Update toast instead of creating new toasts (avoid DOM churn)

### Async Operations
- Progress updates are non-blocking
- UI updates fire-and-forget (no await)
- Compaction timing is not affected

## Security Considerations
- No new security concerns
- Uses existing SillyTavern APIs
- No user input in progress messages

## Accessibility
- Toast notifications are screen-reader friendly
- Progress text is clear: "Compacting: 3/10 batches (30%)"
- Icons use FontAwesome which has ARIA support

## Future Enhancements (Out of Scope)
- Estimated time remaining calculation
- Cancellation support
- Multi-level progress (for future compression levels)
- Visual progress bar in addition to text
