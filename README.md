# CacheFriendlyMemory

A SillyTavern extension that provides automatic, hierarchical context compression for long-running roleplay chats.

## Features

- **Hierarchical Compression**: Progressive compression across 4 levels (raw → short-term → long-term → ultra-compressed)
- **Auto-Compaction**: Automatically compresses when message count or context threshold is reached
- **Compaction Progress UI**: Real-time progress feedback during chat compaction with toast notifications
- **Cache-Friendly**: Maintains prompts stable to optimize caching
- **Non-Destructive**: Original messages preserved, only marked as summarized
- **Configurable**: User-adjustable thresholds, chunk sizes, and compression models
- **Per-Chat Storage**: Data persists with chat file, follows branches

## Installation

1. Download this extension to your SillyTavern extensions folder:
   - For all users: `public/scripts/extensions/third-party/CacheFriendlyMemory`
   - For current user: `data/<user-handle>/extensions/CacheFriendlyMemory`

2. Enable the extension in SillyTavern's Extensions menu

## Usage

### Automatic Compaction

By default, the extension will automatically compress chat history when:
- Unsummarized messages exceed the threshold (default: 120)
- Context usage exceeds the threshold (default: 75%)

### Manual Compaction

Use slash commands to manually control compaction:

```
/cfm-compact    Trigger compaction immediately
/cfm-status     Show compression statistics
/cfm-export     Export compression data to JSON
```

### Configuration

Access settings in the Extensions menu under "CacheFriendlyMemory":

- **Enable Extension**: Turn the extension on/off
- **Auto Compact**: Enable/disable automatic compaction
- **Compact Threshold**: Message count trigger (default: 120)
- **Context Threshold**: Percentage trigger (default: 75%)
- **Level 1 Chunk Size**: Messages per short-term summary (default: 10)
- **Level 2 Chunk Size**: Summaries per long-term summary (default: 5)
- **Target Compression**: Target compression ratio (default: 55%)
- **Connection Profile**: Select a SillyTavern connection profile for summarization (or "None" to use the current profile)
  - Note: Profiles must be configured in SillyTavern's Connection Manager
- **Enable Summary Injection**: Inject summaries into LLM context instead of raw messages
- **Debug Mode**: Enable verbose console logging for troubleshooting
- **Show Progress Bar**: Display inline progress indicator in settings panel during compaction

### Compaction Progress UI

When compaction is triggered (either manually or automatically), the extension provides real-time progress feedback:

- **Toast Notifications**: A toast notification appears showing "Compacting: X/Y batches (Z%)" with a spinning icon
  - The toast updates after each batch is processed
  - Auto-dismisses when compaction completes or fails
- **Inline Progress** (when Show Progress Bar is enabled): Progress displayed in the settings panel
  - Shows current batch count and percentage
  - Visible only when settings panel is open
- **Debug Logging** (when Debug Mode is enabled): Detailed progress messages logged to console
  - Tracks batch start, updates, and completion
  - Helps troubleshoot compaction issues

The progress UI is non-blocking and won't delay compaction. If UI updates fail, compaction continues normally.

## Message-Based Tracking

Extension now uses per-message metadata flags instead of internal counters:
- Each message tracks its compression level (null|1|2|3)
- Stats calculated dynamically from message flags
- Summarized messages hidden from LLM context via generate interceptor
- Summaries injected via extension prompts

### Compression Levels

- **Level 0** (null): Active, uncompressed messages
- **Level 1**: Short-term summaries (10 messages → 1 summary)
- **Level 2**: Long-term summaries (5 L1 summaries → 1 L2 summary)
- **Level 3**: Ultra-compressed story summary

### Message Metadata Structure

```javascript
message.extra = {
    cacheFriendlyMemory: {
        compressionLevel: null | 1 | 2 | 3,
        summaryId: string | null,
        included: boolean,
        timestamp: number | null
    }
}
```

## Compression Strategy

```
Level 0 (Most Recent)    → Raw messages (0-120 messages)
Level 1 (Recent Past)     → Short-term summaries (10 messages → 1 summary)
Level 2 (Medium Past)     → Long-term summaries (5 L1 summaries → 1 L2 summary)
Level 3 (Distant Past)    → Ultra-compressed story summary
```

### Key Principles

1. **Append-Only**: Never modify existing summaries, only append new ones
2. **Message Preservation**: Original messages kept, just marked as summarized
3. **Chunk Merging**: Small remainders merged up for quality
4. **Predictable Format**: `[Chapter N]` headers for caching and model comprehension
5. **Targeted Compression**: Compress only enough to hit target ratio

## Storage

- **Global Settings**: Stored in `settings.json` under `extension_settings.cacheFriendlyMemory`
- **Per-Chat Data**: Stored in chat file under `chat_metadata.cacheFriendlyMemory`

## Requirements

- SillyTavern 1.0.0 or higher
- Connection profile configured in SillyTavern's Connection Manager for summarization
- Select a valid connection profile in the extension settings (or use "None" for the current profile)

## License

This extension is open-source. 

## Contributing

Contributions welcome! Please submit pull requests or issues on GitHub.
