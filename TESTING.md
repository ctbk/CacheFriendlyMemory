# Testing Guide

This guide covers testing procedures for CacheFriendlyMemory, including automated tests and manual testing checklists.

## Automated Tests

### Running Tests

```bash
# Install dependencies (first time only)
npm install

# Run all tests (watch mode)
npm test

# Run all tests once (recommended for CI)
npm test -- --run

# Run tests with UI
npm run test:ui

# Run tests with coverage report
npm run test:coverage -- --run

# Run linter to check for import errors
npm run lint
```

### Test Structure

- `tests/unit/` - Pure function unit tests (fast, no dependencies)
- `tests/integration/` - Workflow integration tests (slower, test complete flows)
- `tests/fixtures/` - Mock objects and test data
- `tests/setup.js` - Global test configuration

### Coverage Target: 80% for all logic modules in `src/logic/`

## Manual Testing Checklist

### Compaction Progress UI (Added v0.4.0)

#### Manual Compaction via Settings UI

- [ ] Open SillyTavern and navigate to Extensions → CacheFriendlyMemory
- [ ] Ensure "Show Progress Bar" is enabled in settings
- [ ] Click the "Compact Now" button
- [ ] **Verify**: Toast notification appears with spinner icon and "Compacting: 0/X batches (0%)" text
- [ ] **Verify**: Toast updates after each batch is processed (e.g., "Compacting: 1/3 batches (33%)")
- [ ] **Verify**: Settings panel shows inline progress if the panel is open
- [ ] **Verify**: Progress disappears when compaction completes
- [ ] **Verify**: Success message appears (if configured)

#### Manual Compaction via Slash Command

- [ ] Open a chat with enough messages for compaction (120+ recommended)
- [ ] Type `/cfm-compact` in the chat input
- [ ] **Verify**: Toast notification appears immediately
- [ ] **Verify**: Progress updates as batches are compressed
- [ ] **Verify**: Progress disappears when compaction completes
- [ ] **Verify**: Response message appears in chat with compaction results

#### Auto-Compaction After Character Message

- [ ] Ensure "Auto Compact" is enabled
- [ ] Set "Compact Threshold" to a low value (e.g., 5) to trigger easily
- [ ] Send a character message to push message count over threshold
- [ ] **Verify**: Toast notification appears automatically
- [ ] **Verify**: Progress updates during auto-compaction
- [ ] **Verify**: Progress disappears when complete
- [ ] **Verify**: Chat continues normally after compaction

#### Progress Visibility Tests

- [ ] **With Show Progress Bar = true**:
  - [ ] Open settings panel before triggering compaction
  - [ ] Trigger compaction
  - [ ] **Verify**: Inline progress shows in settings panel (current/total batches, percentage)
  - [ ] **Verify**: Toast notification also appears

- [ ] **With Show Progress Bar = false**:
  - [ ] Set "Show Progress Bar" to false in settings
  - [ ] Trigger compaction
  - [ ] **Verify**: Toast notification appears
  - [ ] **Verify**: No inline progress in settings panel
  - [ ] **Verify**: Settings panel status text is not affected

- [ ] **With Settings Panel Closed**:
  - [ ] Close the CacheFriendlyMemory settings panel
  - [ ] Trigger compaction
  - [ ] **Verify**: Toast notification appears
  - [ ] **Verify**: Compaction completes successfully
  - [ ] **Verify**: No errors occur from missing DOM elements

#### Error Handling Tests

- [ ] **API Error During Compaction**:
  - [ ] Configure a connection profile with invalid credentials or unreachable API
  - [ ] Trigger compaction
  - [ ] **Verify**: Toast notification appears at start
  - [ ] **Verify**: Progress indicator disappears when error occurs
  - [ ] **Verify**: Error message is displayed to user
  - [ ] **Verify**: Console shows error with context (in debug mode)
  - [ ] **Verify**: Extension continues to function after error

- [ ] **Network Timeout**:
  - [ ] Configure very short timeout in API settings (if available)
  - [ ] Trigger compaction on a large chat
  - [ ] **Verify**: Progress indicator is cleaned up on timeout
  - [ ] **Verify**: User receives timeout notification

#### Debug Mode Tests

- [ ] **With Debug Mode = true**:
  - [ ] Enable "Debug Mode" in settings
  - [ ] Open browser console (F12)
  - [ ] Trigger compaction
  - [ ] **Verify**: Console shows `[CacheFriendlyMemory] DEBUG - Starting compaction progress: totalBatches=N`
  - [ ] **Verify**: Console shows `[CacheFriendlyMemory] DEBUG - Compaction progress: X/Y batches (Z%)` for each update
  - [ ] **Verify**: Console shows `[CacheFriendlyMemory] DEBUG - Compaction progress completed: compacted N messages`

- [ ] **With Debug Mode = false**:
  - [ ] Disable "Debug Mode" in settings
  - [ ] Open browser console
  - [ ] Trigger compaction
  - [ ] **Verify**: No DEBUG messages appear in console
  - [ ] **Verify**: Regular log messages (if any) appear

#### Performance Tests

- [ ] **Compaction Speed**:
  - [ ] Time compaction with progress UI enabled
  - [ ] Time compaction with progress UI disabled (if possible)
  - [ ] **Verify**: No significant performance impact from progress updates

- [ ] **Large Chat Compaction**:
  - [ ] Test with a chat with 500+ messages
  - [ ] Trigger compaction
  - [ ] **Verify**: Progress updates smoothly
  - [ ] **Verify**: No UI lag or freezing
  - [ ] **Verify**: Browser remains responsive

#### Edge Cases

- [ ] **Empty Chat**:
  - [ ] Trigger compaction on new chat with few messages
  - [ ] **Verify**: No progress indicator appears
  - [ ] **Verify**: "Nothing to compact" message appears (if configured)

- [ ] **Already Compacted**:
  - [ ] Trigger compaction on a chat that was just compacted
  - [ ] **Verify**: No progress indicator appears
  - [ ] **Verify**: "Already compacted" or similar message appears

- [ ] **Rapid Compaction Triggers**:
  - [ ] Click "Compact Now" button multiple times rapidly
  - [ ] **Verify**: Only one compaction runs at a time
  - [ ] **Verify**: Progress indicators don't overlap or duplicate

### General Extension Tests

#### Initial Setup

- [ ] Install extension in `public/scripts/extensions/third-party/CacheFriendlyMemory/`
- [ ] Reload SillyTavern
- [ ] **Verify**: Extension appears in Extensions menu
- [ ] **Verify**: Extension is enabled by default (or can be enabled)
- [ ] **Verify**: Settings panel opens correctly
- [ ] **Verify**: No console errors on load

#### Settings Persistence

- [ ] Change various settings (thresholds, chunk sizes, etc.)
- [ ] Reload SillyTavern
- [ ] **Verify**: Settings are preserved
- [ ] **Verify**: Settings display correctly in UI

#### Chat Metadata

- [ ] Compact a chat
- [ ] Save the chat
- [ ] Load the chat in a new session
- [ ] **Verify**: Compaction metadata is preserved
- [ ] **Verify**: Stats show correct values
- [ ] **Verify**: Messages have correct compression level flags

#### Slash Commands

- [ ] `/cfm-compact`:
  - [ ] **Verify**: Compacts chat
  - [ ] **Verify**: Shows progress (v0.4.0+)
  - [ ] **Verify**: Returns summary of compaction

- [ ] `/cfm-status`:
  - [ ] **Verify**: Shows current stats
  - [ ] **Verify**: Displays message counts by level

- [ ] `/cfm-export`:
  - [ ] **Verify**: Exports data to JSON
  - [ ] **Verify**: JSON is valid and complete

## Debugging Tips

### Enable Debug Mode
1. Open CacheFriendlyMemory settings
2. Enable "Debug Mode" checkbox
3. Open browser console (F12)
4. All operations will log verbose messages prefixed with `[CacheFriendlyMemory]`

### Common Issues

1. **No progress indicator appears**:
   - Check if compaction is actually running (check debug logs)
   - Verify "Show Progress Bar" setting if expecting inline progress
   - Check console for JavaScript errors

2. **Progress indicator doesn't disappear**:
   - Check if compaction completed successfully (check debug logs)
   - Reload page if UI stuck
   - Check console for errors in progress.js

3. **Compaction is slow**:
   - Verify connection profile is correctly configured
   - Check API response times in debug logs
   - Reduce chunk sizes if needed

## Reporting Bugs

When reporting bugs, include:

1. SillyTavern version
2. CacheFriendlyMemory version (check CHANGELOG.md or manifest.json)
3. Browser and version
4. Steps to reproduce
5. Expected behavior
6. Actual behavior
7. Console output (with debug mode enabled)
8. Settings configuration (export from extension settings)
