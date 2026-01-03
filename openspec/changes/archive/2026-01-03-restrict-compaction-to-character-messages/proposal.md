# Proposal: Restrict compaction triggers to only after character messages

## Summary
Compression should never trigger after a user message. It should only trigger (when appropriate) after the bot/character answer.

## Why
Currently, compression triggers on the `MESSAGE_RECEIVED` event, which fires after ANY message is received (both user and character messages). This means compression can run after a user submits their message, before the bot has responded. This is problematic because:

1. **User message might be incomplete** - The user might be typing multiple messages to set up context, and compressing after each message loses the immediate context the bot needs for its response
2. **Wastes compression resources** - Compressing before the bot responds means the bot won't have the most recent uncompressed messages in its context
3. **Disrupts conversation flow** - Compressing after a user message can remove context that the bot needs to understand and respond appropriately

Compression should only happen after the bot has responded, when the conversation turn is complete and the context is stable.

## What Changes
1. Remove compression triggering from the `MESSAGE_RECEIVED` event handler in `src/events.js`
2. Add compression triggering to the `CHARACTER_MESSAGE_RENDERED` event handler in `src/events.js`
3. Keep `markMessageActive(message)` calls in both `USER_MESSAGE_RENDERED` and `CHARACTER_MESSAGE_RENDERED` (these should not trigger compression)
4. Update integration tests to verify compression only triggers after character messages

## Problem Statement
The current implementation in `src/events.js:17-33` triggers compaction on the `MESSAGE_RECEIVED` event:

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

This event fires after both user and character messages, causing compression to potentially run after user messages.

## Goals
1. Compression should only be triggered after bot/character messages are rendered
2. Compression should never be triggered after user messages
3. Message metadata marking (`markMessageActive`) should continue to work for both user and character messages
4. All existing compression logic remains the same, only the trigger event changes

## Non-Goals
- Changing the compression logic itself (how many messages to compress, thresholds, etc.)
- Changing when `injectSummaries()` is called
- Changing when messages are marked as active
- Modifying the compression triggers (message count, context pressure)

## Scope
This change affects:
- `src/events.js` - Move compression triggering from `MESSAGE_RECEIVED` to `CHARACTER_MESSAGE_RENDERED`
- `tests/integration/injection-flow.test.js` - Add tests to verify compression timing
- `tests/integration/injection-integration.test.js` - Add tests to verify compression timing

## Success Criteria
- Compression never triggers after a user message is submitted
- Compression only triggers after a character/bot message is rendered
- All existing tests continue to pass
- New integration tests verify the correct trigger behavior
- Manual testing confirms compression happens after bot responses only

## Dependencies
- No external dependencies
- Tests may need to mock character message rendering events

## Risks
- If the `CHARACTER_MESSAGE_RENDERED` event doesn't fire in all scenarios (e.g., streaming responses), compression might not trigger when expected
- If there are other code paths that rely on `MESSAGE_RECEIVED` triggering compression, they would need to be updated

## Mitigations
- Verify `CHARACTER_MESSAGE_RENDERED` fires for all character message scenarios including streaming responses
- Search codebase for any other references to `MESSAGE_RECEIVED` triggering compression
- Add comprehensive integration tests covering various message scenarios

## Alternatives Considered
1. **Check message type in MESSAGE_RECEIVED handler**: Could filter by `message.is_user` flag, but this adds complexity and the `CHARACTER_MESSAGE_RENDERED` event already provides the right timing
2. **Add a flag to track if compression can trigger**: Would add state complexity without clear benefit
3. **Create a new custom event**: Over-engineering, SillyTavern's existing events provide the right semantics

## Rationale
Using `CHARACTER_MESSAGE_RENDERED` is the cleanest solution because:
- Event already exists and fires at the right time (after character response is complete)
- Event is specifically for character messages (not user messages)
- No additional state tracking needed
- Simple, clear, and maintainable code
- Aligns with SillyTavern's event system design
