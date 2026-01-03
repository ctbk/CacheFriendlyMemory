# Design: Restrict compaction triggers to only after character messages

## Overview
This document describes the design for moving compression triggering from `MESSAGE_RECEIVED` (which fires for both user and character messages) to `CHARACTER_MESSAGE_RENDERED` (which only fires after bot responses).

## Current State
In `src/events.js`, compression is currently triggered on `MESSAGE_RECEIVED` (lines 17-33):

```javascript
eventSource.on(event_types.MESSAGE_RECEIVED, async (mesId) => {
    debugLog('[CacheFriendlyMemory] Message received event:', mesId);
    const storage = getChatStorage();
    if (!storage) return;

    const context = getContext();
    const message = context.chat?.[mesId];
    if (message) {
        markMessageActive(message);
    }

    if (await triggerCompaction()) {
        await performCompaction();
        await saveChatStorage();
        await injectSummaries();
    }
});
```

The `MESSAGE_RECEIVED` event fires after ANY message is added to the chat (both user and character).

## Target State
Compression should only trigger in the `CHARACTER_MESSAGE_RENDERED` event handler:

```javascript
eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, async (mesId) => {
    debugLog('[CacheFriendlyMemory] Character message rendered event:', mesId);
    const context = getContext();
    const message = context.chat?.[mesId];
    if (message) {
        markMessageActive(message);
    }

    if (await triggerCompaction()) {
        await performCompaction();
        await saveChatStorage();
        await injectSummaries();
    }
});
```

The `CHARACTER_MESSAGE_RENDERED` event only fires after character/bot messages.

## Design Approach

### Event Flow Changes

**Before:**
1. User submits message → `MESSAGE_RECEIVED` fires → Compression may trigger ❌
2. Bot responds → `MESSAGE_RECEIVED` fires → Compression may trigger ✓
3. Both `USER_MESSAGE_RENDERED` and `CHARACTER_MESSAGE_RENDERED` call `markMessageActive()`

**After:**
1. User submits message → `USER_MESSAGE_RENDERED` fires → Only `markMessageActive()` ✓
2. Bot responds → `CHARACTER_MESSAGE_RENDERED` fires → `markMessageActive()` + Compression may trigger ✓

### Changes to `src/events.js`

#### Remove compression from `MESSAGE_RECEIVED`:
```javascript
eventSource.on(event_types.MESSAGE_RECEIVED, async (mesId) => {
    debugLog('[CacheFriendlyMemory] Message received event:', mesId);
    const storage = getChatStorage();
    if (!storage) return;

    const context = getContext();
    const message = context.chat?.[mesId];
    if (message) {
        markMessageActive(message);
    }

    // REMOVED: Compression triggering logic
});
```

#### Add compression to `CHARACTER_MESSAGE_RENDERED`:
```javascript
eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, async (mesId) => {
    debugLog('[CacheFriendlyMemory] Character message rendered event:', mesId);
    const context = getContext();
    const message = context.chat?.[mesId];
    if (message) {
        markMessageActive(message);
    }

    // ADDED: Compression triggering logic
    if (await triggerCompaction()) {
        await performCompaction();
        await saveChatStorage();
        await injectSummaries();
    }
});
```

#### Keep `USER_MESSAGE_RENDERED` unchanged (marking active only):
```javascript
eventSource.on(event_types.USER_MESSAGE_RENDERED, async (mesId) => {
    debugLog('[CacheFriendlyMemory] User message rendered event:', mesId);
    const context = getContext();
    const message = context.chat?.[mesId];
    if (message) {
        markMessageActive(message);
    }
    // No compression triggering
});
```

### Why `CHARACTER_MESSAGE_RENDERED`?

The `CHARACTER_MESSAGE_RENDERED` event is the right choice because:

1. **Semantic correctness**: The event specifically indicates a character/bot message, not a user message
2. **Timing**: Fires after the character message is complete (after streaming response finishes)
3. **No filtering needed**: No need to check `message.is_user` flag - event type already filters
4. **Existing usage**: Extension already uses this event for `markMessageActive()`
5. **SillyTavern convention**: Similar to how built-in memory extension triggers on character messages

### Message Metadata Behavior

The `markMessageActive()` call should remain in ALL three message events:
- `MESSAGE_RECEIVED` - Mark all messages as active when received
- `USER_MESSAGE_RENDERED` - Ensure user messages are marked active (redundant but safe)
- `CHARACTER_MESSAGE_RENDERED` - Ensure character messages are marked active before compression

This redundancy is acceptable because:
- `markMessageActive()` is idempotent (calling it multiple times has no effect)
- Defensive programming ensures messages are always marked active
- No performance impact (simple property check)

## Testing Strategy

### Unit Tests
No changes to unit tests needed - the compression logic itself doesn't change.

### Integration Tests
Add new test scenarios to verify compression timing:

**Test: Compression does NOT trigger after user message**
- Setup: Enable auto-compaction, set threshold low enough to trigger
- When: User sends a message that exceeds threshold
- Then: Compression does NOT run
- And: Message is marked as active

**Test: Compression DOES trigger after character message**
- Setup: Enable auto-compaction, set threshold low enough to trigger
- When: Character sends a message that exceeds threshold
- Then: Compression runs
- And: Message is marked as active
- And: Summaries are injected

**Test: Multiple user messages, then character response**
- Setup: Enable auto-compaction
- When: User sends 3 messages in a row (each below threshold individually)
- And: Character responds (total now exceeds threshold)
- Then: Compression runs only after character response

### Manual Testing
1. Enable debug mode, set compaction threshold to 10 messages
2. Send 10+ user messages
3. Verify no compaction occurs in console logs
4. Wait for bot response
5. Verify compaction occurs after bot response
6. Check that compression logs appear after `CHARACTER_MESSAGE_RENDERED` event

## Edge Cases

### Streaming Responses
`CHARACTER_MESSAGE_RENDERED` fires after streaming is complete, so this is the correct timing for compression.

### Multiple Character Messages
If the bot sends multiple messages (e.g., split responses), each `CHARACTER_MESSAGE_RENDERED` event will trigger compression checks. The compression threshold logic in `shouldTriggerCompaction()` will prevent excessive compression.

### Manual Compaction
The `/cfm-compact` slash command should continue to work independently of event-based triggers.

### Context Pressure Trigger
The context pressure trigger (when context > 75% full) will now only activate after character messages, not after user messages. This is intentional - user can't cause context pressure without bot responding first.

## Performance Considerations
- No performance impact - same compression logic, just triggered at different time
- Potentially reduces unnecessary compression (fewer triggers since only after character messages)
- No additional overhead in event handlers

## Backward Compatibility
- No breaking changes to storage format or settings
- No breaking changes to compression logic
- Behavior change: Compression timing (user may notice this as an improvement)
- Migration not needed - purely behavioral change

## Security Considerations
- No new security concerns
- Same security model as current implementation

## Future Extensions
This change enables future enhancements:
- Could add different compression strategies for user vs character messages (not planned)
- Could add "pending compression" state that waits for character message (not needed with this design)
- Could add analytics on compression timing (easy to add with this clear trigger point)
