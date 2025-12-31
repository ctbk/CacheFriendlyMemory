# Project Context

## Purpose

CacheFriendlyMemory is a SillyTavern extension that provides automatic, hierarchical context compression for long-running roleplay chats. It solves the token bloat problem by progressively compressing chat history while maintaining story coherence and queryable context.

**Core concept:** Multi-level cache where recent conversations are stored at high fidelity, and progressively compressed as they age through 4 levels:
- Level 0: Raw messages (most recent 0-120 messages)
- Level 1: Short-term summaries (10 messages → 1 summary)
- Level 2: Long-term summaries (5 L1 summaries → 1 L2 summary)
- Level 3: Ultra-compressed story summary (distant past)

**Key value:** Users can continue months-long roleplays without ever deleting messages or manually summarizing, while the AI always has appropriate context for both recent events and distant history. Unlike memory retrieval systems that extract discrete facts, this extension progressively compresses the narrative itself into increasingly dense summaries.

## Tech Stack

- **Language:** JavaScript (ES6 modules)
- **Testing Framework:** Vitest with @vitest/coverage-v8 for coverage reporting
- **Linting:** ESLint with @eslint/js and eslint-plugin-import
- **Build System:** None (pure JavaScript extension, no bundling)
- **Runtime Environment:** SillyTavern extension API (client-side browser environment)
- **Dependencies:**
  - @mohak34/opencode-notifier (dev notifications)
  - SillyTavern API (extensions.js, script.js, modules/extensions.js)

## Project Conventions

### Code Style

**ES6 Module Syntax:**
- Use named exports: `export function foo() {}`
- Use named imports: `import { foo } from './file.js'`
- All files must end with `.js` extension

**Naming Conventions:**
- Constants: UPPER_SNAKE_CASE (`MODULE_NAME`, `METADATA_KEY`)
- Functions/Variables: camelCase (`getChatStorage`, `storage`)
- CSS classes: kebab-case with prefix (`cfm-settings-form`, `cfm-button`)
- Event handlers: `onEventName`, `handleEventName`

**Logging:**
- Consistent console prefix: `[CacheFriendlyMemory]`
- Use `console.log()` for info, `console.warn()` for warnings, `console.error()` for errors
- Example: `console.log(`[${MODULE_NAME}] Module initialized`)`

**Comments:** No comments unless explicitly requested (minimal, self-documenting code preferred)

### Architecture Patterns

**Separation of Concerns:**
- `index.js` - Main entry point, initialization, event/slash command registration
- `src/` - Core functionality (storage, compression, injection, events, prompts, message-metadata)
- `src/logic/` - Pure business logic functions (budget-calculation, context-building, summary-selection, etc.)
- `ui/` - UI components (settings, status)
- `i18n/` - Translation files
- `presets/` - Configuration presets

**SillyTavern API Access:**
- Always use `SillyTavern.getContext()` to access SillyTavern APIs
- Never import directly from internal SillyTavern modules (unstable API)
- Critical import rules:
  - `getContext`, `extension_settings` → import from `extensions.js`
  - `eventSource`, `event_types`, `saveSettingsDebounced`, `generateQuietPrompt` → import from `script.js`
  - Local modules → use relative paths: `./storage.js`, `'../src/storage.js'`

**Storage Patterns:**
- Global settings: `extensionSettings[MODULE_NAME]` → saved via `saveSettingsDebounced()`
- Per-chat data: `chatMetadata[METADATA_KEY]` → saved via `saveMetadata()`
- Initialize storage lazily (on first access), use `structuredClone` for defaults

**Message Metadata:**
- Uses `message.extra.cacheFriendlyMemory` for per-message tracking
- Structure: `{ compressionLevel: null|1|2|3, summaryId: string|null, included: boolean, timestamp: number|null }`
- Import from `./src/message-metadata.js` for metadata helper functions

**Event Handling:**
- Register events in `index.js` or `src/events.js`
- Use async functions for event handlers
- Don't block the event loop

**Error Handling:**
- Use try/catch for async operations
- Return null/undefined for non-critical failures
- Log errors with context
- Throw only for critical failures

**Async/Await:**
- Always use async/await over Promise chains
- Mark async functions clearly

### Testing Strategy

**Test Structure:**
- `tests/unit/` - Pure function unit tests (fast, no dependencies)
- `tests/integration/` - Workflow integration tests (slower, test complete flows)
- `tests/fixtures/` - Mock objects and test data
- `tests/setup.js` - Global test configuration

**Test Framework:**
- Vitest with describe/it/expect syntax
- Coverage target: 80% for all logic modules in `src/logic/`
- Follow AAA pattern: Arrange, Act, Assert
- Test happy path and edge cases
- Mock external dependencies (SillyTavern APIs)
- Keep tests independent and deterministic

**TDD Workflow:**
1. Write a failing test for new functionality
2. Run the test to verify it fails
3. Write minimal code to make the test pass
4. Run the test to verify it passes
5. Refactor if needed
6. Commit the changes

**Test Commands:**
- `npm test -- --run` - Run tests (use `-- --run` for single run, not watch mode)
- `npm run test:ui` - Run tests with UI
- `npm run test:coverage -- --run` - Run tests with coverage
- `npm run lint` - Run linter (always run after changes)

### Git Workflow

**Version Management:**
- Update `manifest.json` version for releases
- Follow semantic versioning (MAJOR.MINOR.PATCH)
- Update `CHANGELOG.md` with meaningful entries

**Commit Message Style:**
- Conventional commits preferred (feature:, fix:, refactor:, etc.)
- Focus on "why" rather than "what"
- Concise, 1-2 sentences

**Branching Strategy:**
- Main branch for releases
- Feature branches for new functionality
- No force push to main/master

## Domain Context

**Compression Hierarchy:**
The system implements a 4-level compression pyramid:
- Level 0 (null): Active, uncompressed messages (most recent)
- Level 1: Short-term summaries (10 messages → 1 summary)
- Level 2: Long-term summaries (5 L1 summaries → 1 L2 summary)
- Level 3: Ultra-compressed story summary (distant past)

**Key Design Principles:**
1. **Append-Only** - Never modify existing summaries, only append new ones (keeps "frozen zone" stable)
2. **Message Preservation** - Original messages aren't deleted, just marked as summarized
3. **Chunk Merging** - Small remainders merged up (e.g., 45 messages → 1 chunk, not 40+5) to ensure quality
4. **Predictable Format** - `[Chapter N]` headers for caching and model comprehension
5. **Targeted Compression** - Compress only enough to hit target ratio (e.g., 55%), not everything available

**Compression Triggers (Priority Order):**
1. Message Count - Auto-compact when unsummarized messages exceed threshold (default: 120)
2. Context Pressure - Safety net: compact when context > 75% full
3. Manual - User forces compaction on demand via `/cfm-compact`

**Context Reconstruction:**
When generating a response, the extension:
1. Receives current context percentage from SillyTavern
2. Calculates available budget for history
3. Selects appropriate compression level based on budget and recency
4. Injects summaries into prompt in structured format
5. Preserves most recent messages at full fidelity (Level 0)

**Message-Based Tracking:**
Extension uses per-message metadata flags instead of internal counters:
- Each message tracks its compression level (null|1|2|3)
- Stats calculated dynamically from message flags
- Summarized messages hidden from LLM context via generate interceptor
- Summaries injected via extension prompts

**Storage:**
- Global Settings: Stored in `settings.json` under `extension_settings.cacheFriendlyMemory`
- Per-Chat Data: Stored in chat file under `chat_metadata.cacheFriendlyMemory`
- No external database, uses SillyTavern's existing storage system

## Important Constraints

**SillyTavern API Constraints:**
- Must use `SillyTavern.getContext()` to access APIs
- Cannot import from internal SillyTavern modules (unstable API)
- Must respect SillyTavern's event system and context building
- Extension runs in browser environment, no Node.js APIs

**Data Constraints:**
- Per-chat data must persist with chat file (follows branches/backups)
- Global settings must persist in `settings.json`
- Original messages must never be deleted (non-destructive)
- Summaries must be append-only (never modify existing summaries)

**Performance Constraints:**
- Must not block the event loop (use async/await)
- Must use debounced saves to prevent write conflicts
- Must implement lazy initialization for storage
- Minimal overhead during normal operation

**Model Constraints:**
- Requires user-configurable connection profile or preset for summarization
- Must handle model failures gracefully
- Must work with various model capabilities and context limits

**User Experience Constraints:**
- Must be non-destructive (users can always review original messages)
- Must be configurable (thresholds, chunk sizes, models user-adjustable)
- Must support manual override (slash commands)
- Must provide debug mode with verbose logging

## External Dependencies

**SillyTavern APIs (via SillyTavern.getContext()):**
- `getContext` - Get chat context
- `extensionSettings` - Access extension settings
- `chatMetadata` - Access per-chat metadata
- `eventSource` - Register event handlers
- `event_types` - Event type constants
- `SlashCommandParser` - Register slash commands
- `registerExtensionSettings` - Register settings UI
- `saveSettingsDebounced` - Save global settings
- `saveMetadata` - Save chat metadata
- `generateQuietPrompt` - Generate LLM prompts
- `toastr` - Display notifications

**SillyTavern Events:**
- `USER_MESSAGE_RENDERED` - When user message is rendered
- `CHARACTER_MESSAGE_RENDERED` - When character message is rendered
- `CHAT_CHANGED` - When chat is changed
- `GENERATE_STARTED` - When generation starts (for context calculation)
- Context system events for token counting and budget calculation

**Developer Tools:**
- Vitest (@vitest/coverage-v8, @vitest/ui) - Testing framework
- ESLint (@eslint/js, eslint-plugin-import) - Code linting
- @mohak34/opencode-notifier - Dev notifications

**Minimum Requirements:**
- SillyTavern 1.0.0 or higher
- Connection profile or preset for summarization model
- Browser environment with ES6 module support
