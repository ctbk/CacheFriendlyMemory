# Proposal: Add Compaction Progress UI

## Summary
Add real-time visual progress feedback during chat compaction to improve user experience. Currently, users see progress indicators only after compaction completes (showing "instant green"), which provides no feedback during the potentially long-running compression process.

## Motivation
- **User Experience**: Users need feedback during long-running operations to know the system is working
- **Current Problem**: The "Show Progress Bar" setting exists but only shows post-compaction statistics, not real-time progress
- **Expected Behavior**: Users should see progress updating as message batches are compressed, similar to other SillyTavern extensions that use loading spinners and progress indicators

## Goals
1. Show visual progress indicator while compaction is running
2. Display message batches processed vs. total batches
3. Use SillyTavern's existing UI patterns (FontAwesome spinners, toastr notifications)
4. Respect the existing `showProgressBar` setting
5. Support both manual compaction (/cfm-compact) and auto-compaction triggers

## Non-Goals
- Adding progress to other long-running operations (e.g., injection, profile switching)
- Changing the compaction algorithm itself
- Modifying the existing status bar logic
- Implementing a complex multi-level progress UI (keep it simple: X/Y batches processed)

## Proposed Solution
1. **Progress Indicator**: Use a toast notification with spinner that updates during compaction
   - Show "Compacting: X/Y batches processed" (or "X/Y messages" if simpler)
   - Update after each chunk is compressed in the `performCompaction()` while loop
   - Use `fa-circle-notch fa-spin` icon for visual loading state
   - Remove/hide when compaction completes or fails

2. **Progress Calculation**: Track batches in the existing compaction loop
   - Calculate total batches needed to reach `targetMessages`
   - Increment counter after each `compressChunk()` call
   - Display percentage or count

3. **UI Pattern**: Follow SillyTavern conventions
   - Use `toastr.info()` for progress updates (replaces previous toast)
   - Or use the settings panel status area to show progress inline
   - Respect `showProgressBar` setting to show/hide

## Alternatives Considered

### Alternative 1: Inline Progress in Settings Panel
**Pros**: More integrated with existing UI
**Cons**: Not visible if settings panel is closed; more DOM manipulation required

### Alternative 2: Full-Screen Progress Modal
**Pros**: Very visible, blocks interaction
**Cons**: Overkill for this operation; disrupts user workflow; SillyTavern doesn't use this pattern for similar operations

### Alternative 3: Browser Progress Bar
**Pros**: Native browser API
**Cons**: Limited browser support; doesn't provide meaningful context; different from SillyTavern patterns

## Risks and Mitigations

### Risk 1: Performance Impact from Frequent DOM Updates
**Mitigation**: Update progress only after each chunk completes (not during generation), which happens at natural intervals (10+ messages per chunk)

### Risk 2: Toast Flicker or Spam
**Mitigation**: Update existing toast instead of creating new ones; use timeout configuration to prevent disappearing

### Risk 3: Settings Panel Hidden
**Mitigation**: Use toast notification which is always visible regardless of panel state

## Dependencies
- None (uses existing SillyTavern APIs and FontAwesome)

## Success Criteria
- Progress indicator appears when compaction starts
- Progress updates as each batch is compressed
- Progress indicator disappears when compaction completes
- User can see meaningful progress (X/Y batches or messages)
- Setting `showProgressBar: false` disables the progress UI
- Works for both manual and auto-compaction

## Open Questions
1. **Progress Metric**: Should we show "X/Y batches processed" or "X/Y messages processed"?
   - Batches is more accurate to the algorithm but less intuitive
   - Messages is more intuitive but requires pre-calculating total messages to compress
   - **Recommendation**: Start with batches for simplicity, can iterate later

2. **Toast vs. Inline Progress**:
   - Toast: Always visible, follows SillyTavern patterns
   - Inline in settings: More integrated, but hidden if panel closed
   - **Recommendation**: Use toast with option to show inline if `showProgressBar` setting is enabled

## Timeline
- Implementation: 1-2 hours
- Testing: 30 minutes
- Total: ~2-3 hours
