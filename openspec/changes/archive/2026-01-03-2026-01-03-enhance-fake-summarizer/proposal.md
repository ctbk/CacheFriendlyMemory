# Proposal: Enhance Fake Summarizer Output

## Summary
Modify the fake summarizer to include the first 25 words of each message being compressed, one per line, with a fixed header. The current implementation only shows first 5 words of first message and last 5 words of last message, which doesn't provide meaningful testing feedback.

## Motivation
- **Testing Utility**: The fake summarizer is used for development and testing (`USE_FAKE_SUMMARIZER = false` in production)
- **Limited Visibility**: Current output `[Test] firstWords ... lastWords` provides minimal insight into what's being compressed
- **Better Debugging**: Seeing first 25 words from each message helps verify that the correct message chunks are being processed
- **Structured Output**: Fixed header provides visual separation without requiring changes to calling code

## Goals
1. Include first 25 words of each message in the fake summary output
2. Format output with one line per message
3. Add fixed header "[Test Compressed Chunk]" to provide visual structure
4. Handle messages with fewer than 25 words (show whatever is available)
5. Maintain existing behavior for empty/null inputs

## Non-Goals
- Making fake summarizer configurable (fixed at 25 words as specified)
- Changing the real LLM summarizer (only affects test mode)
- Modifying any other compression logic
- Adding user-facing settings for this feature

## Proposed Solution

### New Output Format
```
[Test Compressed Chunk]
[0] First 25 words from message 0 go here...
[1] First 25 words from message 1 go here...
[2] First 25 words from message 2 go here...
[3] First 25 words from message 3 go here...
[4] First 25 words from message 4 go here...
[5] First 25 words from message 5 go here...
```

### Implementation Approach
1. Change `createFakeSummary(messages)` to return multi-line output
2. Extract first 25 words from each message using `split(/\s+/).slice(0, 25).join(' ')`
3. Prefix each line with `[messageIndex]` (relative to the chunk)
4. Add fixed header "[Test Compressed Chunk]" to provide visual structure

### Edge Cases
- **Empty/Null Input**: Return `[Test Summary] No messages` (existing behavior)
- **Short Messages**: Show whatever words are available (0-25)
- **Missing `mes` Field**: Treat as empty string, show `[X]` (no text after index)
- **Single Message**: Show `[Test Compressed Chunk]` header and one line

## Alternatives Considered

### Alternative 1: Show First and Last 25 Words
**Pros**: More like real summary format
**Cons**: Doesn't show content of middle messages; request specifically asked for first words of each message

### Alternative 2: Configurable Word Count
**Pros**: Flexible for different testing scenarios
**Cons**: Unnecessary complexity; user confirmed fixed count is acceptable

### Alternative 3: Keep Single-Line Format with More Words
**Pros**: Minimal change to existing format
**Cons**: Doesn't match request for "one per line" format; harder to read

## Risks and Mitigations

### Risk 1: Multi-Line Summary Breaks Downstream Parsing
**Mitigation**: Fake summaries are only used in test mode; production uses LLM-generated summaries which may already be multi-line

### Risk 2: Longer Output Increases Token Count in Tests
**Mitigation**: Fake summarizer is only enabled via `USE_FAKE_SUMMARIZER` flag (currently `false`); tests explicitly testing fake summarizer can be updated

## Dependencies
- None (standalone utility function)

## Success Criteria
- Fake summary output shows first 25 words from each message on separate lines
- Header is fixed text "[Test Compressed Chunk]"
- Empty/null inputs return existing placeholder text
- Messages with fewer than 25 words show available words only
- All existing tests pass after implementation
- New tests verify the multi-line format

## Open Questions
None (clarified by user)

## Timeline
- Implementation: 30 minutes
- Test updates: 30 minutes
- Verification: 15 minutes
- Total: ~1 hour
