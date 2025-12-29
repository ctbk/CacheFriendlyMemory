Hierarchical Compression
Level 0: Raw messages (the more recent, uncompressed ones)
Level 1: Short-term summaries (groups of ~10 messages) 
Level 2: Long-term summaries (groups of ~5 Level 1 summaries)
Level 3: Ultra-compressed "story so far" (optional, for very long chats)

When a level gets too large, compress it into the next level. This preserves recent detail while progressively compressing older content.

Key Design Decisions
1. Summaries are append-only
We never modify existing summaries. New summaries are appended. This keeps the frozen zone stable.
2. Messages are never deleted, just marked
last_summarized_index tracks what's been summarized. Original messages stay in storage for potential manual review.
3. Chunk merging for small remainders
If we have 45 messages to summarize with chunk_size=40, we get one chunk of 45, not [40, 5]. Small chunks produce poor summaries.
4. Fixed format for summaries
[Chapter N] headers make the structure predictable. This aids both caching and model comprehension.
5. Aggressive but not greedy compaction
We only summarize enough to hit target (55%), not everything available. This preserves more raw messages for quality.


TRIGGERS (in priority order):
1. MESSAGE COUNT    → Compact when unsummarized messages > 120-150
2. CONTEXT PRESSURE → Compact when context > 75% (safety net)
3. MANUAL          → User forces compaction

All the thresholds will  be configurable.

COMPACT STRATEGY:
1. Compress messages in chunks. (for example 10 messages -> 1 summary)
2. Include both user's and agent's messages.
3. Use a specialized prompt to create summaries that will be good for role playing

