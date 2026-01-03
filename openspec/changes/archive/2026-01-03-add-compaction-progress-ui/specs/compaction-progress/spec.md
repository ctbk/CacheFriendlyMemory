# Spec: Compaction Progress

## ADDED Requirements

### Requirement: Real-time progress during compaction
The system SHALL display real-time progress feedback while chat compaction is in progress.

#### Scenario: Show progress indicator when compaction starts
- **GIVEN** a chat with messages ready for compaction
- **AND** showProgressBar setting is enabled
- **WHEN** compaction is triggered (manual or auto)
- **THEN** a progress indicator is displayed immediately
- **AND** indicator shows 0/total batches (or messages) processed

#### Scenario: Update progress as batches are compressed
- **GIVEN** compaction is in progress
- **AND** a batch of messages has been compressed
- **WHEN** batch compression completes
- **THEN** progress indicator updates to reflect new count
- **AND** indicator shows "X/Y batches processed" (or messages)
- **AND** percentage is calculated and displayed

#### Scenario: Hide progress indicator when compaction completes
- **GIVEN** compaction is in progress
- **AND** a progress indicator is displayed
- **WHEN** all target batches have been compressed successfully
- **THEN** progress indicator is removed or hidden
- **AND** a completion message is shown (if applicable)

#### Scenario: Hide progress indicator on compaction failure
- **GIVEN** compaction is in progress
- **AND** a progress indicator is displayed
- **WHEN** compaction fails (e.g., API error)
- **THEN** progress indicator is removed or hidden
- **AND** an error message is displayed to the user

#### Scenario: Respect showProgressBar setting
- **GIVEN** showProgressBar setting is disabled (false)
- **WHEN** compaction is triggered
- **THEN** progress is displayed via toast notification only
- **OR** progress is not displayed at all (based on implementation decision)

### Requirement: Progress calculation accuracy
The system SHALL accurately calculate and display progress based on the number of batches or messages processed.

#### Scenario: Calculate total batches before compaction
- **GIVEN** compaction is about to start
- **AND** targetMessages is calculated
- **AND** chunkSize is configured
- **WHEN** progress tracking initializes
- **THEN** totalBatches is calculated as `Math.ceil(targetMessages / chunkSize)`
- **AND** totalBatches is used for progress tracking

#### Scenario: Progress percentage is accurate
- **GIVEN** totalBatches is 10
- **AND** currentBatch is 3
- **WHEN** progress percentage is calculated
- **THEN** percentage is `Math.floor((currentBatch / totalBatches) * 100)`
- **AND** displayed percentage is "30%"

#### Scenario: Progress updates after each chunk
- **GIVEN** compaction is processing chunks
- **WHEN** a chunk of messages is successfully compressed
- **THEN** current batch counter increments
- **AND** progress is updated with new counter value
- **AND** user sees updated progress

### Requirement: performCompaction function behavior
The performCompaction function SHALL integrate with the progress tracking system to provide real-time feedback.

#### Scenario: Initialize progress before compression loop
- **GIVEN** performCompaction is called
- **AND** there are messages to compact
- **WHEN** compression loop is about to start
- **THEN** startCompactionProgress is called with totalBatches
- **AND** progress indicator is displayed to user

#### Scenario: Update progress during compression loop
- **GIVEN** compression loop is running
- **AND** a batch of messages has been compressed
- **WHEN** compressChunk completes successfully
- **THEN** updateCompactionProgress is called with the current batch number
- **AND** progress indicator is updated

#### Scenario: Complete progress after compression loop
- **GIVEN** compression loop has finished
- **AND** all target messages have been compressed
- **WHEN** post-compaction operations are about to run (save, inject, etc.)
- **THEN** completeCompactionProgress is called with success=true
- **AND** progress indicator is removed

#### Scenario: Complete progress on error
- **GIVEN** compression loop encounters an error
- **WHEN** error is caught
- **THEN** completeCompactionProgress is called with success=false
- **AND** error message is provided
- **AND** progress indicator is removed

### Requirement: Progress UI uses SillyTavern patterns
The progress indicator SHALL follow SillyTavern's existing UI patterns and conventions.

#### Scenario: Use toastr for progress notifications
- **GIVEN** a progress indicator is displayed via toast
- **WHEN** toast is created
- **THEN** it uses the `toastr.info()` API
- **AND** toast has no auto-hide during compaction with `timeOut: 0`
- **AND** toast includes a close button
- **AND** toast uses plain text (no HTML markup)

#### Scenario: Show completion toast with auto-dismiss
- **GIVEN** compaction completes successfully
- **WHEN** `completeCompactionProgress()` is called
- **THEN** a `toastr.success()` toast is displayed
- **AND** toast has 2-second auto-hide with `timeOut: 2000`
- **AND** toast shows the number of messages compacted
- **AND** toast has no close button (auto-dismisses)

#### Scenario: Show error toast with auto-dismiss
- **GIVEN** compaction fails with an error
- **WHEN** `completeCompactionProgress(false, errorMessage)` is called
- **THEN** a `toastr.error()` toast is displayed
- **AND** toast has 2-second auto-hide with `timeOut: 2000`
- **AND** toast shows the error message
- **AND** toast has no close button (auto-dismisses)

#### Scenario: Update existing toast instead of creating new ones
- **GIVEN** a progress toast is already displayed
- **AND** progress updates (e.g., from "1/10" to "2/10")
- **WHEN** update occurs
- **THEN** existing toast is updated with new text via DOM manipulation
- **AND** no new toasts are created
- **AND** there is no flicker in the UI
- **AND** toast DOM element's `.toast-message` textContent is updated directly

### Requirement: Progress is non-blocking
Progress updates SHALL not delay or block the compaction process.

#### Scenario: UI updates are fire-and-forget
- **GIVEN** compaction is running
- **WHEN** progress is updated
- **THEN** UI update is executed immediately without await
- **AND** compaction continues without waiting for UI to finish

#### Scenario: UI failures don't interrupt compaction
- **GIVEN** compaction is running
- **WHEN** a progress UI update fails (e.g., DOM error, toastr unavailable)
- **THEN** error is caught and logged to console
- **AND** compaction continues normally
- **AND** user is still notified of completion

### Requirement: Debug logging for progress
When debug mode is enabled, the system SHALL log progress updates to the console.

#### Scenario: Log progress start when debug mode is enabled
- **GIVEN** debug mode is enabled (debugMode = true)
- **WHEN** compaction starts
- **THEN** `[CacheFriendlyMemory] DEBUG - Starting compaction progress: totalBatches=N` is logged
- **AND** log shows the total number of batches

#### Scenario: Log progress updates when debug mode is enabled
- **GIVEN** debug mode is enabled
- **AND** compaction is in progress
- **WHEN** a batch completes
- **THEN** `[CacheFriendlyMemory] DEBUG - Compaction progress: X/Y batches (Z%)` is logged
- **AND** log shows current batch, total batches, and percentage

#### Scenario: Log progress completion when debug mode is enabled
- **GIVEN** debug mode is enabled
- **WHEN** compaction completes
- **THEN** `[CacheFriendlyMemory] DEBUG - Compaction progress completed: compacted N messages` is logged
- **AND** log shows the number of messages compressed

#### Scenario: Suppress debug logging when debug mode is disabled
- **GIVEN** debug mode is disabled (debugMode = false)
- **WHEN** compaction runs
- **THEN** no debug log messages are written to console
- **AND** only regular log messages (if any) are shown
