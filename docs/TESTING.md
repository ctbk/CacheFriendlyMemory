# Testing Guide for CacheFriendlyMemory

## Overview

This extension uses Vitest for test-driven development (TDD) of internal logic. All pure functions are tested with unit tests, and complete workflows are tested with integration tests.

## Running Tests

### Basic Test Run

```bash
npm test
```

### Interactive Test UI

```bash
npm run test:ui
```

Opens a browser interface at http://localhost:51204/__vitest__/ for interactive test exploration.

### Coverage Report

```bash
npm run test:coverage
```

Generates coverage report in `coverage/` directory. Open `coverage/index.html` in browser to view.

## Test Structure

```
tests/
├── fixtures/              # Mock objects and test data
│   ├── mock-context.js    # SillyTavern API mocks
│   ├── test-storage.js    # Storage object factories
│   └── test-messages.js   # Message object factories
├── unit/                  # Pure function unit tests
│   ├── logic/             # Logic module tests
│   │   ├── token-estimation.test.js
│   │   ├── summary-selection.test.js
│   │   ├── budget-calculation.test.js
│   │   ├── context-building.test.js
│   │   └── compaction-triggers.test.js
│   ├── constants.test.js  # Constants tests
│   └── prompts.test.js    # Prompt tests
├── integration/           # Workflow integration tests
│   ├── compaction-flow.test.js
│   └── injection-flow.test.js
└── setup.js               # Global test configuration
```

## Writing Tests

### Unit Test Template

```javascript
import { describe, it, expect } from 'vitest';
import { functionToTest } from '../../src/module.js';

describe('functionToTest', () => {
    it('should do X when Y', () => {
        // Arrange
        const input = 'test input';
        const expected = 'expected output';

        // Act
        const result = functionToTest(input);

        // Assert
        expect(result).toBe(expected);
    });

    it('should handle edge case Z', () => {
        // Edge case test
    });
});
```

### Integration Test Template

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { createMockContext, createTestStorage } from '../fixtures/mock-context.js';

describe('Workflow Name', () => {
    let mockContext;
    let storage;

    beforeEach(() => {
        mockContext = createMockContext();
        storage = createTestStorage();
    });

    it('should perform complete workflow', async () => {
        // Test complete workflow
    });
});
```

## Using Fixtures

### Mock Context

```javascript
import { createMockContext, createMockSillyTavernAPI } from '../fixtures/mock-context.js';

const context = createMockContext({
    chatId: 'test-chat',
    maxContextTokens: 2048,
    chat: [...messages]
});

const api = createMockSillyTavernAPI(context);
```

### Test Storage

```javascript
import { createTestStorage } from '../fixtures/test-storage.js';

const storage = createTestStorage({
    stats: {
        totalMessages: 100,
        summarizedMessages: 0
    },
    level1: {
        summaries: [...]
    }
});
```

### Test Messages

```javascript
import { createTestMessages, createLongTestMessages } from '../fixtures/test-messages.js';

const shortMessages = createTestMessages(10);
const longMessages = createLongTestMessages(120);
```

## Coverage Targets

- **Logic modules (`src/logic/`)**: 100% coverage
- **Source modules (`src/*.js`)**: 80% coverage
- **Overall**: 80% coverage

## TDD Workflow

1. **Red**: Write failing test
2. **Green**: Write minimal code to pass test
3. **Refactor**: Improve code while keeping tests green
4. **Commit**: Save working state

## Continuous Integration

Tests run automatically on GitHub Actions for every push and pull request. Coverage report is generated and checked against the 80% threshold.

## Debugging Failed Tests

1. Run test in verbose mode: `npm test -- --reporter=verbose`
2. Use test UI for interactive debugging: `npm run test:ui`
3. Add `console.log` statements (captured by Vitest)
4. Use `.only` to run single test:
   ```javascript
   it.only('should do X', () => { /* test */ });
   ```

## Manual Testing Checklist

### Compaction Progress UI

#### Test Case: Manual Compaction via UI Button
- **Prerequisites**:
  - Extension loaded in SillyTavern
  - Active chat with 50+ user and character messages (enough to trigger compaction)
  - Debug mode disabled (default)
  - Settings panel closed
- **Steps**:
  1. Open extension settings panel
  2. Click "Compact Chat" button
  3. Observe progress indicators during compaction
  4. Wait for compaction to complete
- **Expected Result**:
  - Progress toast appears immediately with spinner icon
  - Toast shows "Compacting: X/Y batches (Z%)" format
  - Toast updates as batches are processed
  - Progress percentage increases from 0% to 100%
  - Progress toast disappears after completion
  - Settings panel shows updated message count

#### Test Case: Manual Compaction via /cfm-compact Slash Command
- **Prerequisites**:
  - Extension loaded in SillyTavern
  - Active chat with 50+ user and character messages
  - Debug mode disabled
  - Settings panel closed
- **Steps**:
  1. Type `/cfm-compact` in chat input
  2. Press Enter to execute command
  3. Observe console for command execution
  4. Observe progress indicators
  5. Wait for compaction to complete
- **Expected Result**:
  - Command executes successfully
  - Progress toast appears immediately with spinner icon
  - Toast shows "Compacting: X/Y batches (Z%)" format
  - Toast updates as batches are processed
  - Progress toast disappears after completion
  - Chat message shows compaction result (e.g., "Compacted 30 messages")

#### Test Case: Auto-Compaction After Character Message
- **Prerequisites**:
  - Extension loaded in SillyTavern
  - Active chat near compaction threshold (check current message count vs target)
  - Debug mode disabled
  - Auto-compaction enabled in settings
  - Settings panel closed
- **Steps**:
  1. Generate a character message (send user message, get AI response)
  2. Watch for auto-compaction trigger after character message
  3. Observe progress indicators if compaction triggers
  4. Wait for compaction to complete
- **Expected Result**:
  - If compaction threshold is reached:
    - Progress toast appears after character message renders
    - Toast shows compaction progress
    - Progress toast disappears after completion
    - Message count decreases after compaction
  - If compaction threshold not reached:
    - No progress indicators appear
    - Message count remains unchanged

#### Test Case: Progress with showProgressBar = true
- **Prerequisites**:
  - Extension loaded in SillyTavern
  - Active chat with 50+ messages
  - Debug mode disabled
  - showProgressBar setting set to `true`
- **Steps**:
  1. Open extension settings panel (keep it open)
  2. Trigger compaction (via button or slash command)
  3. Observe both toast and settings panel
  4. Monitor progress updates in both locations
- **Expected Result**:
  - Progress toast appears and updates normally
  - Settings panel shows inline progress (replacing status text or showing in dedicated element)
  - Inline progress shows batch count and percentage
  - Both indicators remain synchronized
  - Both indicators disappear after completion

#### Test Case: Progress with showProgressBar = false
- **Prerequisites**:
  - Extension loaded in SillyTavern
  - Active chat with 50+ messages
  - Debug mode disabled
  - showProgressBar setting set to `false`
- **Steps**:
  1. Open extension settings panel (keep it open)
  2. Trigger compaction (via button or slash command)
  3. Observe both toast and settings panel
  4. Monitor for inline progress indicators
- **Expected Result**:
  - Progress toast appears and updates normally
  - Settings panel does NOT show inline progress
  - Status text remains unchanged during compaction
  - Only toast is visible for progress feedback

#### Test Case: Progress with Settings Panel Open
- **Prerequisites**:
  - Extension loaded in SillyTavern
  - Active chat with 50+ messages
  - Debug mode disabled
  - showProgressBar setting set to `true`
- **Steps**:
  1. Open extension settings panel
  2. Trigger compaction
  3. Keep settings panel open throughout compaction
  4. Observe inline progress in settings panel
- **Expected Result**:
  - Toast appears and updates
  - Inline progress in settings panel appears and updates
  - Progress text is readable and visible in panel
  - No UI glitches or layout issues
  - Progress indicators stay synchronized

#### Test Case: Progress with Settings Panel Closed
- **Prerequisites**:
  - Extension loaded in SillyTavern
  - Active chat with 50+ messages
  - Debug mode disabled
  - showProgressBar setting set to `true`
- **Steps**:
  1. Ensure extension settings panel is closed
  2. Trigger compaction
  3. Keep settings panel closed throughout compaction
  4. Observe toast notifications only
- **Expected Result**:
  - Toast appears and updates normally
  - No errors in console about missing inline progress element
  - No UI issues when settings panel is opened after compaction starts
  - Compaction completes successfully despite missing inline progress

#### Test Case: Progress Behavior on Compaction Error
- **Prerequisites**:
  - Extension loaded in SillyTavern
  - Active chat with 50+ messages
  - Debug mode disabled
  - Optional: Simulate error condition (e.g., by disconnecting API or using invalid settings)
- **Steps**:
  1. Trigger compaction
  2. Simulate error condition during compaction (if possible)
  3. Observe progress indicators when error occurs
  4. Check console for error messages
- **Expected Result**:
  - Progress indicator appears initially
  - If error occurs:
    - Progress indicator is removed or hidden
    - Error message is displayed (toast or notification)
    - Console shows error details
    - No stuck progress indicators
  - If error occurs early (before first batch):
    - Progress indicator disappears immediately
    - Error message is clear and informative
  - If error occurs mid-compaction:
    - Progress indicator disappears immediately
    - Partially compressed state is preserved or cleanly rolled back

#### Test Case: Progress with Debug Mode Enabled
- **Prerequisites**:
  - Extension loaded in SillyTavern
  - Active chat with 50+ messages
  - Debug mode enabled (checked in settings)
- **Steps**:
  1. Open browser console (F12)
  2. Trigger compaction
  3. Observe console for debug log messages
  4. Verify log messages include progress details
- **Expected Result**:
  - Console shows `[CacheFriendlyMemory] DEBUG` messages
  - Log includes: "Starting compaction progress: totalBatches=N"
  - Log includes: "Compaction progress: X/Y batches (Z%)" for each update
  - Log includes: "Compaction progress completed: compacted N messages"
  - Log messages are prefixed with `[CacheFriendlyMemory] DEBUG`
  - Progress UI still displays normally alongside debug logs

#### Test Case: Progress Indicator Text Formatting
- **Prerequisites**:
  - Extension loaded in SillyTavern
  - Active chat with 50+ messages
  - Debug mode disabled
- **Steps**:
  1. Trigger compaction
  2. Observe text format in progress toast
  3. Verify percentage calculation at different stages
- **Expected Result**:
  - Progress text format: "Compacting: X/Y batches (Z%)"
  - X and Y are integers (current batch, total batches)
  - Z is integer percentage (0-100)
  - Percentage calculation: `Math.floor((X / Y) * 100)`
  - Final percentage is 100% (not truncated to 99%)
  - Spinner icon is visible and animating

## Best Practices

- Test behavior, not implementation
- One assertion per test (when possible)
- Use descriptive test names
- Keep tests independent (no shared state)
- Test happy path and edge cases
- Mock external dependencies
- Use fixtures for common test data
- Run tests frequently during development
- Maintain high coverage without testing trivial code
