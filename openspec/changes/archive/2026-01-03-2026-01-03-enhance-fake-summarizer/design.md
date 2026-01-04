# Design: Enhance Fake Summarizer Output

## Overview
This document describes the technical design for modifying the `createFakeSummary` function to output the first 25 words of each message in a multi-line format with message range indicators.

## Algorithm

### Input
```javascript
messages: Array<{mes?: string}>  // Array of message objects
```

### Output
```javascript
string  // Multi-line summary with fixed header
```

### Processing Steps

1. **Validate Input**
   - If `messages` is `null`, `undefined`, or empty array → return `[Test Summary] No messages`

2. **Extract Message Content**
   - For each message, get `message.mes` or treat as empty string
   - Split by whitespace: `text.split(/\s+/)`
   - Filter out empty strings (handles multiple spaces)
   - Take first 25 words: `.slice(0, 25)`
   - Join back to string: `.join(' ')`

3. **Build Fixed Header**
   - Format: `[Test Compressed Chunk]` (always the same, no calculations needed)

4. **Build Body Lines**
   - For each message at index `i`:
     - Format: `[${i}] ${first25words}`
     - If no words available: `[${i}]` (index only)

5. **Combine Output**
   - Header + `\n` + body lines joined by `\n`

### Pseudocode
```javascript
function createFakeSummary(messages) {
    if (!messages || messages.length === 0) {
        return '[Test Summary] No messages';
    }

    const lines = [];
    lines.push('[Test Compressed Chunk]');

    for (let i = 0; i < messages.length; i++) {
        const message = messages[i];
        const text = message.mes || '';
        const words = text.split(/\s+/).filter(w => w);
        const first25words = words.slice(0, 25).join(' ');

        if (first25words) {
            lines.push(`[${i}] ${first25words}`);
        } else {
            lines.push(`[${i}]`);
        }
    }

    return lines.join('\n');
}
```

## Implementation Notes

### Word Count
- Fixed at 25 words per user specification
- Easy to change later if needed (single variable)

### Message Indices
- Relative to chunk (0, 1, 2, ...) not absolute chat indices
- No changes needed to calling code (`compressChunk` function)

### Edge Case Handling

| Input | Output |
|-------|--------|
| `null` | `[Test Summary] No messages` |
| `undefined` | `[Test Summary] No messages` |
| `[]` | `[Test Summary] No messages` |
| `[{mes: 'Hi'}]` | `[Test Compressed Chunk]\n[0] Hi` |
| `[{mes: ''}]` | `[Test Compressed Chunk]\n[0]` |
| `[{mes: '   '}]` | `[Test Compressed Chunk]\n[0]` |
| `[{mes: 'Word1 Word2 Word3'}]` | `[Test Compressed Chunk]\n[0] Word1 Word2 Word3` |
| `[{mes: 'Very long message with more than 25 words...'}]` | `[Test Compressed Chunk]\n[0] Very long message with more than 25...` |

## Testing Strategy

### Unit Tests (New)
1. **Happy Path**: Multiple messages with varying lengths
2. **Edge Cases**: Empty, null, short, long messages
3. **Header Format**: Verify fixed header "[Test Compressed Chunk]"
4. **Word Count**: Verify exactly 25 words extracted from long messages
5. **Missing Fields**: Handle missing `mes` field

### Integration Tests (Existing, Need Update)
1. Update `tests/integration/fake-summarizer.test.js` to expect new format
2. Update any tests in `tests/unit/compression.test.js` that use `createFakeSummary`

## Backward Compatibility

### Breaking Changes
- **Test Format**: All tests expecting single-line format will need updating
- **No Production Impact**: Fake summarizer is disabled by default (`USE_FAKE_SUMMARIZER = false`)

### Migration Path
- Update test expectations to match new multi-line format
- No data migration needed (fake summaries are ephemeral)

## Performance

### Complexity
- Time: O(n) where n = total words in all messages
- Space: O(n) for output string

### Considerations
- Fake summarizer is only used in development/testing
- Performance impact is negligible
- Word extraction is simple string operations

## Security

### Considerations
- No user input (fake summarizer is internal utility)
- Output never displayed to end users (test-only)
- No injection risks (output format is controlled)

## Future Enhancements (Out of Scope)
- Configurable word count
- Show absolute message indices from chat
- Include message metadata (name, timestamp)
- Option to show last N words instead of first N words
