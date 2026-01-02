## Context
The `triggerCompaction()` function evaluates whether compression should be triggered based on message counts, context usage, and user-configured thresholds. However, there's no visibility into this decision-making process, even when debug mode is enabled. This makes troubleshooting difficult for both developers and users.

## Goals / Non-Goals
- **Goals:**
  - Log every call to `triggerCompaction()` when debug mode is enabled
  - Log input parameters used for the decision (message counts, thresholds, context)
  - Log the return value to show whether compaction will proceed
  - Use existing debug logging patterns for consistency
- **Non-Goals:**
  - Change any functional behavior of `triggerCompaction()`
  - Add debug logging to other functions (can be done in future changes)
  - Modify the decision-making logic

## Decisions

### Decision 1: Log at Function Entry and Exit
Log debug information at both the beginning and end of `triggerCompaction()`.

**Rationale:** Logging at entry shows the inputs being considered, and logging at exit shows the result. This provides a complete picture of the function's behavior.

**Alternatives considered:**
- Log only at entry: Would not show the result, less useful
- Log only at exit: Would not show inputs, harder to understand why result was returned
- Log inside `shouldTriggerCompaction()`: Would require changes to a separate function, more invasive

### Decision 2: Log All Decision Parameters
Log all the parameters that influence the compaction decision: unsummarized count, context size, current context, thresholds, and auto-compact flag.

**Rationale:** This gives users and developers complete visibility into why the decision was made, making troubleshooting much easier.

**Alternatives considered:**
- Log only some parameters: Incomplete information, harder to debug
- Log only the result: Would show "what" but not "why"
- Keep as is: No visibility at all

### Decision 3: Use Existing Debug Logging Pattern
Use `console.log('[CacheFriendlyMemory] DEBUG - ...')` format consistent with existing debug logging in `injection.js`.

**Rationale:** Maintains consistency with the existing codebase and makes logs easy to filter/search.

**Alternatives considered:**
- Use `console.debug()`: Less visible, requires specific browser settings
- Use a separate debug logger: Adds unnecessary complexity
- Keep current pattern: Simple, works everywhere, consistent with existing code

## Implementation Notes

### Changes Required
**src/compression.js** (triggerCompaction function, around line 13):

```javascript
export async function triggerCompaction() {
    const storage = getChatStorage();
    if (!storage) {
        console.warn(`[${MODULE_NAME}] No storage available for compaction`);
        return false;
    }

    const context = getContext();
    const chat = context.chat || [];

    const unsummarizedCount = getUnsummarizedCount(chat);

    const compactThreshold = getGlobalSetting('compactThreshold');
    const contextThreshold = getGlobalSetting('contextThreshold');
    const autoCompact = getGlobalSetting('autoCompact');

    const contextSize = context.maxContextTokens || 0;
    const currentContext = context.contextTokens || 0;

    const debugMode = getGlobalSetting('debugMode');

    if (debugMode) {
        console.log(`[${MODULE_NAME}] DEBUG - triggerCompaction() called with:`, {
            unsummarizedCount,
            contextSize,
            currentContext,
            compactThreshold,
            contextThreshold,
            autoCompact
        });
    }

    const result = shouldTriggerCompaction(
        unsummarizedCount,
        contextSize,
        currentContext,
        compactThreshold,
        contextThreshold,
        autoCompact
    );

    if (debugMode) {
        console.log(`[${MODULE_NAME}] DEBUG - triggerCompaction() returning:`, result);
    }

    return result;
}
```

### Behavior
- When `debugMode` is `true`, logs will appear in the browser console for every call to `triggerCompaction()`
- Logs will show both the inputs and the result, making it clear why compaction was or wasn't triggered
- When `debugMode` is `false`, no additional logging occurs (normal behavior)
- No functional behavior changes - only conditional logging is added

## Testing
- Verify debug logs appear when debug mode is enabled
- Verify no debug logs appear when debug mode is disabled
- Verify logs show correct parameter values
- Verify logs show correct return value (true/false)
- Verify function behavior is unchanged (same return values)
