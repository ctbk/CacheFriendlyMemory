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
