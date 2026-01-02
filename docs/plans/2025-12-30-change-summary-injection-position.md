# Change Summary Injection Position Implementation Plan

## Overview

Change the default position where compressed conversation history summaries are injected into the LLM context from `IN_CHAT` (immediately before the newest message) to `IN_PROMPT` (after character info/scenario but before the entire chat history). This provides better context organization by placing historical summaries before the conversation flow begins.

## Current State Analysis

### Summary Injection Mechanism

The CacheFriendlyMemory extension uses SillyTavern's Extension Prompt API to inject summaries via `setExtensionPrompt()`:

**Current default configuration** (src/storage.js:66-72):
```javascript
injection: {
    enabled: true,
    position: undefined,  // Falls back to IN_CHAT (1)
    depth: 0,
    scan: true,
    role: 'system'
}
```

**Injection logic** (src/injection.js:134-138):
```javascript
const position = storage.injection.position ?? extension_prompt_types.IN_CHAT;
const depth = storage.injection.depth ?? 0;
const scan = storage.injection.scan !== false;
const roleString = storage.injection.role ?? 'system';
const role = getRoleValue(roleString);
```

When `position` is `undefined`, the code falls back to `extension_prompt_types.IN_CHAT` (value 1), which injects summaries at depth 0 - immediately before the newest message in the chat array.

### Position Options

SillyTavern's `extension_prompt_types` defines three positions:
- `IN_PROMPT` (0) - After character info/scenario but before all chat messages
- `IN_CHAT` (1) - Within chat messages at specified depth (current default)
- `BEFORE_PROMPT` (2) - Before all character info, system prompts, world info

### Current Problem

With `IN_CHAT` at depth 0, summaries appear as:
```
[earlier messages...]
[Compressed Conversation History]
[Long-term Summary] ...
[Recent Summaries] ...
[End Compressed History]
[newest message from user]
```

This interrupts the conversation flow and may confuse the LLM about when the summaries were created.

### Key Constraints

- Position configuration is stored per-chat in `chatMetadata[METADATA_KEY].injection.position`
- Default is `undefined` in storage initialization, which triggers the fallback to `IN_CHAT`
- Changing the default affects new chats and chats that haven't explicitly set the position
- Existing chats that have explicitly set a position will NOT be affected

## Desired End State

Summaries should be injected at `IN_PROMPT` position, placing them in this context structure:

```
[System messages array]
  [character info]
  [scenario]
  [personality]
  [world info]
  [IN_PROMPT extension prompts ← SUMMARIES GO HERE]

[Chat messages array]
  [earliest messages...]
  [middle messages...]
  [most recent messages...]
```

This provides historical context before the conversation begins, improving LLM comprehension without interrupting the message flow.

### Verification

To verify the change is successful:
1. Check console logs for injection with position=0 (IN_PROMPT)
2. Inspect the actual context sent to the LLM to confirm summaries appear before chat messages
3. Verify LLM responses show improved context awareness

## What We're NOT Doing

- Changing the summary text format or content
- Modifying the `depth`, `scan`, or `role` parameters
- Adding UI controls for position selection (future enhancement)
- Migrating existing chats that have explicitly set positions
- Changing the interceptor logic (message filtering remains unchanged)
- Modifying the compression or summary generation logic

## Implementation Approach

The implementation is straightforward: change the default `position` value in storage initialization from `undefined` to `extension_prompt_types.IN_PROMPT`. This is a single-line change that affects:
1. New chats created after the change
2. Existing chats that haven't explicitly set `injection.position`

The `injectSummaries()` function already handles the fallback logic, so no changes are needed there. However, test files must be updated to reflect the new expected position value.

## Phase 1: Update Default Injection Position

### Overview

Change the default injection position from `IN_CHAT` to `IN_PROMPT` in storage initialization.

### Changes Required:

#### 1. Storage Default Position
**File**: `src/storage.js`
**Changes**: Modify the `injection` object in `initializeStorage()` function (line 66-72)

```javascript
injection: {
    enabled: true,
    position: extension_prompt_types.IN_PROMPT,  // Changed from undefined
    depth: 0,
    scan: true,
    role: 'system'
}
```

**Import requirement**: Add `extension_prompt_types` to the imports at the top of the file:

```javascript
import { extension_prompt_types } from '../../../../../script.js';
```

### Success Criteria:

#### Automated Verification:
- [x] All unit tests pass: `npm test -- --run`
- [x] All integration tests pass: `npm test -- --run`
- [x] Linting passes: `npm run lint`

#### Manual Verification:
- [ ] Extension loads without errors in browser console
- [ ] New chats initialize with `position: 0` (IN_PROMPT)
- [ ] Existing chats without explicit position show new behavior
- [ ] No errors when accessing injection settings

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Update Test Files

### Overview

Update test expectations to reflect the new default position value of `IN_PROMPT` (0) instead of `IN_CHAT` (1).

### Changes Required:

#### 1. Unit Tests - Injection Module
**File**: `tests/unit/injection.test.js`
**Changes**: Update expected position values in all test cases

Update lines 31, 32, 60, 87, 106, 115:
```javascript
// Changed from 1 to 0
expect(mockSetExtensionPrompt).toHaveBeenCalledWith(
    'cacheFriendlyMemory',
    expect.stringContaining('[Chapter 1]'),
    0,  // IN_PROMPT position (was 1)
    0,
    true,
    0   // SYSTEM role (numeric)
);
```

Update lines 47, 55, 124:
```javascript
// clearInjection uses IN_PROMPT (0) and depth 0
expect(mockSetExtensionPrompt).toHaveBeenCalledWith('cacheFriendlyMemory', '', 0, 0);
```

#### 2. Integration Tests - Injection Integration
**File**: `tests/integration/injection-integration.test.js`
**Changes**: Update expected position values

Update lines 28-35, 48, 55, 60-67:
```javascript
expect(mockSetExtensionPrompt).toHaveBeenCalledWith(
    'cacheFriendlyMemory',
    expect.stringContaining('[Chapter 1] Chapter 1 summary'),
    0,  // IN_PROMPT position (was 1)
    0,
    true,
    0   // SYSTEM role (numeric)
);
```

### Success Criteria:

#### Automated Verification:
- [x] All unit tests pass: `npm test tests/unit/injection.test.js -- --run`
- [x] All integration tests pass: `npm test tests/integration/injection-integration.test.js -- --run`
- [x] No test failures or warnings

#### Manual Verification:
- [ ] All tests show green pass status
- [ ] Test coverage remains above 80% for logic modules

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Integration Testing

### Overview

Verify the end-to-end behavior of summary injection with the new position setting.

### Changes Required:

No code changes. This phase involves manual testing and verification.

### Success Criteria:

#### Automated Verification:
- [x] All tests pass: `npm test -- --run`
- [x] Linting passes: `npm run lint`
- [x] Type checking passes (if applicable)

#### Manual Verification:

1. **New Chat Test:**
   - [ ] Create a new chat
   - [ ] Send enough messages to trigger compaction (default: 120)
   - [ ] Trigger manual compaction via "Compact Now" button
   - [ ] Check console for injection log showing position=0
   - [ ] Send a message and check console for injection before generation
   - [ ] Verify LLM response shows context from summaries

2. **Existing Chat Test (no explicit position):**
   - [ ] Open an existing chat created before this change
   - [ ] Check browser console for initialization logs
   - [ ] Verify position is now 0 (IN_PROMPT)
   - [ ] Trigger generation and verify injection at new position

3. **Existing Chat Test (with explicit position):**
   - [ ] If any chats have explicitly set `injection.position`, verify they retain their setting
   - [ ] Confirm existing configurations are not overridden

4. **Context Structure Verification:**
   - [ ] Enable SillyTavern's context viewer (if available)
   - [ ] Inspect the full context sent to LLM
   - [ ] Confirm summaries appear in system messages area, before chat messages
   - [ ] Verify summarized messages are still filtered (not duplicated)

5. **LLM Response Quality:**
   - [ ] Compare LLM responses before and after change
   - [ ] Verify LLM shows better context awareness
   - [ ] Confirm no degradation in response quality

**Implementation Note**: This phase requires comprehensive manual testing in the SillyTavern UI. Complete all manual verification steps before marking this phase complete.

---

## Testing Strategy

### Unit Tests:
- Test that storage initializes with correct default position
- Test that `injectSummaries()` uses the position from storage
- Test that fallback behavior still works for undefined values
- Test that `clearInjection()` uses the same position

### Integration Tests:
- Test full injection flow with new default position
- Test interaction with interceptor (message filtering unchanged)
- Test storage persistence across page reloads
- Test behavior with multiple summary levels

### Manual Testing Steps:
1. **Fresh Chat Scenario:**
   - Create new chat
   - Send ~15 messages
   - Trigger compaction
   - Verify console shows position=0
   - Send another message
   - Check context viewer for summary placement

2. **Page Reload Scenario:**
   - After compaction, refresh page
   - Open same chat
   - Verify position persists as 0
   - Trigger generation
   - Confirm summaries still injected correctly

3. **Chat Switching Scenario:**
   - Create and compact chat A
   - Switch to chat B (no summaries)
   - Switch back to chat A
   - Verify position and injection work correctly

4. **Edge Cases:**
   - Chat with no summaries (should clear injection)
   - Chat with empty level summaries
   - Chat with only level 3 summary
   - Chat with all three levels populated

## Performance Considerations

No performance impact expected:
- Change is a configuration default, not logic change
- `setExtensionPrompt()` call remains identical
- No additional computation or API calls
- Message filtering via interceptor unchanged

The only difference is where SillyTavern places the extension prompt in the final context array, which is a simple array insertion operation.

## Migration Notes

### New Chats
- Will automatically use `IN_PROMPT` (0) as default position
- No manual configuration needed

### Existing Chats
- Chats that have never set `injection.position` (undefined) will now use `IN_PROMPT`
- Chats with explicitly set positions (IN_CHAT, BEFORE_PROMPT, etc.) are **NOT** affected
- No data migration needed

### Rollback
If issues occur, revert the single line in `src/storage.js:68` to restore `undefined` default.

## References

- Original ticket: None (direct user request)
- Related research:
  - `docs/injection-mechanism-analysis.md` - Full injection mechanism documentation
  - `docs/plans/2025-12-30-summaries-not-included.md` - Previous injection fixes
- SillyTavern API:
  - `extension_prompt_types` in `/Users/stefano/src/SillyTavern-Launcher/SillyTavern/public/script.js:444-449`
  - `setExtensionPrompt()` function in `/Users/stefano/src/SillyTavern-Launcher/SillyTavern/public/script.js`
- Implementation files:
  - `src/injection.js:134-138` - Position fallback logic
  - `src/storage.js:66-72` - Storage initialization
  - `src/interceptor.js:6-65` - Message filtering (unchanged)
