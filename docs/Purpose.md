# CacheFriendlyMemory SillyTavern Extension - Purpose and Overview

## Problem Statement

Long roleplay chats in SillyTavern face a critical challenge: **token bloat**. As conversations grow, keeping all historical messages in context becomes impossible due to context window limits. Also, when the context grows too big, models loose details, especially if something is located in the middle of a big context. This forces users to either:

1. **Delete old messages** - Losing valuable context and story continuity
2. **Accept limited memory** - The AI forgets important past events
3. **Manual summarization** - Time-consuming, error-prone, and inconsistent

Existing solutions like Qvink Memory or OpenVault help, but they're designed for **preserving prompt caching**, on the contrary, using those extension the prompt cache (as provided by DeepSeek) is costantly invalidated.

---

## Solution: Hierarchical Cache-Friendly Compression

CacheFriendlyMemory implements a **hierarchical, cache-friendly memory system** that progressively compresses chat history while maintaining story coherence and queryable context.

### Core Concept

Think of it as a **multi-level cache** where recent conversations are stored at high fidelity, and progressively compressed as they age:

```
Level 0 (Most Recent)    → Raw messages (0-120 messages)
Level 1 (Recent Past)     → Short-term summaries (10 messages → 1 summary)
Level 2 (Medium Past)     → Long-term summaries (5 L1 summaries → 1 L2 summary)
Level 3 (Distant Past)     → Ultra-compressed story summary
```

### Key Design Principles

1. **Append-Only Compression** - Never modify existing summaries, only append new ones. This keeps the "frozen zone" stable.
2. **Message Preservation** - Original messages aren't deleted, just marked as summarized. Available for manual review.
3. **Chunk Merging** - Small remainder chunks are merged up (e.g., 45 messages → 1 chunk, not 40+5) to ensure quality.
4. **Predictable Format** - Fixed format with `[Chapter N]` headers aids both caching and model comprehension.
5. **Targeted Compression** - Compress only enough to hit target ratio (e.g., 55%), not everything available. Preserves more detail.

---

## How It Works

### Compression Triggers (Priority Order)

1. **Message Count** - Auto-compact when unsummarized messages exceed threshold (default: 120-150)
2. **Context Pressure** - Safety net: compact when context > 75% full
3. **Manual** - User forces compaction on demand

### Compression Process

When triggered, the system:

1. **Identifies uncompacted messages** (from `last_summarized_index` to current)
2. **Groups messages into chunks** (default: 10 messages per summary)
3. **Sends to compression model** (user-configurable connection profile or preset)
4. **Stores summary in next level** of hierarchy
5. **Updates tracking metadata** (last summarized index, stats, timestamps)
6. **Optional: Merges small remainders into next level** to ensure quality

### Context Reconstruction

When generating a response, the extension:

1. **Receives current context percentage** from SillyTavern
2. **Calculates available budget** for history
3. **Selects appropriate compression level** based on budget and recency
4. **Injects summaries into prompt** in structured format
5. **Preserves most recent messages** at full fidelity (Level 0)

---

## Key Benefits

### For Users

- **Automatic Memory Management** - No manual summarization required
- **Progressive Compression** - More detail for recent events, less for distant past
- **Chat Preservation** - All original messages kept, never lost
- **Configurable** - Thresholds, chunk sizes, models all user-adjustable
- **Non-Destructive** - Summaries are append-only; can't break existing data
- **Context-Aware** - Automatic compression when approaching context limit

### For AI Quality

- **Structured Prompts** - `[Chapter N]` format makes history predictable and parseable
- **Balanced Detail** - Recent events at full fidelity, older events at appropriate compression
- **Consistent Formatting** - Same format across all summaries aids model understanding
- **Cache-Friendly** - Predictable structure enables efficient context reconstruction

### For Performance

- **Debounced Saves** - Prevents write conflicts and reduces I/O
- **Lazy Initialization** - Storage structure created only when needed
- **Minimal Overhead** - No heavy background processing or indexing
- **Per-Chat Storage** - Data follows chat file through branches/backups


---

## Use Cases

### Ideal For

- **Long-running roleplays** - Weeks/months of continuous story
- **Complex narratives** - Multiple characters, subplots, world-building
- **Context-limited models** - Models with 4k-8k context windows
- **Detail preservation** - Want recent history at full fidelity
- **Hands-off operation** - Prefer automatic over manual management

### Less Suitable For

- **Short conversations** - Won't benefit from compression
- **Fact-heavy** vs narrative-heavy (use world info instead)
- **Requires precise message recall** (use vectors/retrieval instead)
- **Non-linear storytelling** (if past events frequently referenced, may need more detail)

---

## Technical Approach

### Storage Strategy

- **Per-Chat Data**: Stored in `chat_metadata.cacheFriendlyMemory` (persists with chat file)
- **Global Settings**: Stored in `extension_settings.cacheFriendlyMemory` (user preferences)
- **No External Dependencies**: Uses SillyTavern's existing API and context system
- **No Server-Side Code**: Pure client-side JavaScript extension

### Architecture

```
Extension Entry (index.js)
├── Storage Layer (src/storage.js)
│   ├── getChatStorage()          - Access per-chat data
│   ├── saveChatStorage()         - Persist changes
│   └── Initialization helpers
├── Compression Engine (src/compression.js)
│   ├── triggerCompaction()       - Check thresholds
│   ├── performCompaction()       - Execute compression
│   └── compressChunk()          - Summarize message groups
├── Context Injection (src/injection.js)
│   ├── calculateBudget()          - Determine available tokens
│   ├── selectSummaries()         - Pick appropriate level
│   └── injectIntoPrompt()        - Add to context
└── Event Handlers (src/events.js)
    ├── On message received        - Track and trigger
    ├── On chat changed          - Initialize storage
    └── On context pressure     - Safety net compaction
```

### Integration Points

- **SillyTavern Events**: `USER_MESSAGE_RENDERED`, `CHARACTER_MESSAGE_RENDERED`, `CHAT_CHANGED`
- **Context System**: Uses `getContext()`, `chat_metadata`, `saveChatConditional()`
- **Prompt Building**: Uses `setExtensionPrompt()` to inject compressed context
- **Slash Commands**: `/cfm-compact`, `/cfm-status`, `/cfm-export`
- **Settings UI**: Extension menu panel with threshold sliders, model selection, debug options

---

## Success Metrics

The extension succeeds if:

1. **Context stays within limits** - Auto-compacts before hitting 100%
2. **Story coherence maintained** - Summaries preserve key plot points, relationships, world state
3. **User can navigate history** - Can review original messages when needed
4. **Configuration is intuitive** - Users can adjust without reading documentation
5. **Performance is minimal** - No lag or excessive I/O during normal operation

---

## Future Enhancements (Out of Scope)

Potential future features not in initial implementation:

- **Intelligent summarization** - Detect story beats, character arcs for better summaries
- **Adaptive thresholds** - Learn optimal compression ratios per chat style
- **Summary editing** - Allow manual correction of automated summaries
- **Cross-chat memory** - Remember facts across different character chats
- **Visual timeline** - UI showing compression hierarchy and navigation
- **Export/import** - Share compression profiles or summary datasets
- **Compression profiles** - Different strategies for different story types

---

## Summary

**CacheFriendlyMemory provides automatic, hierarchical context compression that keeps long-running roleplays viable within token limits while preserving story coherence and queryable history.**

Unlike memory retrieval systems that extract discrete facts, this extension progressively compresses the narrative itself into increasingly dense summaries, maintaining the flow and structure of the story while keeping recent conversations at full fidelity.

**Key value**: Users can continue months-long roleplays without ever deleting messages or manually summarizing, while the AI always has appropriate context for both recent events and distant history.
