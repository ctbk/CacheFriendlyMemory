# Injection Mechanism Analysis

## Overview

Analysis of how different SillyTavern extensions inject summarized content into message history and comparison with CacheFriendlyMemory implementation.

**Analysis Date:** 2025-12-30
**Analyzed Extensions:**
- MessageSummarize (qvink_memory)
- OpenVault
- CacheFriendlyMemory (current implementation)

---

## MessageSummarize (qvink_memory) Injection Mechanism

### Entry Points
- `index.js:3721` - `refresh_memory()` function
- `index.js:3494` - `memory_intercept_messages()` function (interceptor)

### Core Implementation

#### 1. Refresh Memory Function (`index.js:3721-3752`)

```javascript
function refresh_memory() {
    let ctx = getContext();
    if (!chat_enabled()) {
        ctx.setExtensionPrompt(`${MODULE_NAME}_long`, "");
        ctx.setExtensionPrompt(`${MODULE_NAME}_short`, "");
        return;
    }

    let long_injection = get_long_memory();
    let short_injection = get_short_memory();

    let long_term_position = get_settings('long_term_position')
    let short_term_position = get_settings('short_term_position')

    // Text completion wrapping
    if (main_api !== 'openai') {
        if (long_term_position !== extension_prompt_types.IN_CHAT && long_injection.length) long_injection = formatInstructModeChat("", long_injection, false, true)
        if (short_term_position !== extension_prompt_types.IN_CHAT && short_injection.length) short_injection = formatInstructModeChat("", short_injection, false, true)
    }

    // Main injection calls
    ctx.setExtensionPrompt(`${MODULE_NAME}_long`,  long_injection,  long_term_position, get_settings('long_term_depth'), get_settings('long_term_scan'), get_settings('long_term_role'));
    ctx.setExtensionPrompt(`${MODULE_NAME}_short`, short_injection, short_term_position, get_settings('short_term_depth'), get_settings('short_term_scan'), get_settings('short_term_role'));
}
```

**Function signature:** `setExtensionPrompt(name, value, position, depth, scan, role)`
- **name:** Uses `${MODULE_NAME}_long` and `${MODULE_NAME}_short` where `MODULE_NAME = 'qvink_memory'` (line 45)
- **position:** User-configurable via settings
- **depth:** User-configurable via settings
- **scan:** User-configurable via settings
- **role:** User-configurable via settings (numeric)

#### 2. Data Collection Functions

**get_long_memory()** (`index.js:3467-3478`)
- Collects long-term memories using `collect_chat_messages('long')`
- Formats with user-defined template using `ctx.substituteParamsExtended()`

**get_short_memory()** (`index.js:3479-3490`)
- Collects short-term memories using `collect_chat_messages('short')`
- Formats with user-defined template using `ctx.substituteParamsExtended()`

#### 3. Interceptor Function (`index.js:3494-3513`)

```javascript
globalThis.memory_intercept_messages = function (chat, _contextSize, _abort, type) {
    if (!chat_enabled()) return;
    if (!get_settings('exclude_messages_after_threshold')) return
    refresh_memory() // CRITICAL: Refreshes injection before generation

    let start = chat.length-1
    if (type === 'continue') start--;

    const IGNORE_SYMBOL = getContext().symbols.ignore

    // Remove any messages that have summaries injected
    for (let i=start; i >= 0; i--) {
        delete chat[i].extra.ignore_formatting
        let message = chat[i]
        let lagging = get_data(message, 'lagging')
        chat[i] = structuredClone(chat[i])
        chat[i].extra[IGNORE_SYMBOL] = !lagging
    }
};
```

**CRITICAL:** The interceptor calls `refresh_memory()` at line 3497 **before** filtering messages. This ensures summaries are injected before each generation.

#### 4. Event Triggers

`refresh_memory()` is called on these events (from `index.js:4571-4582` and `on_chat_event()`):

- `CHARACTER_MESSAGE_RENDERED` (via `on_chat_event('char_message')`)
- `USER_MESSAGE_RENDERED` (via `on_chat_event('user_message')`)
- `MESSAGE_DELETED` (via `on_chat_event('message_deleted')`) - line 3853
- `MESSAGE_EDITED` (via `on_chat_event('message_edited')`)
- `MESSAGE_SWIPED` (via `on_chat_event('message_swiped')`) - line 3947
- `CHAT_CHANGED` (via `on_chat_event('chat_changed')`) - line 3842
- `MORE_MESSAGES_LOADED` (registered directly at line 4577)
- `GENERATION_STARTED` (via `on_chat_event('before_message')`)

Additional calls:
- Line 3901: After summarizing on character message
- Line 3909: After re-summarizing on swipe
- Line 3988: Manual refresh button

---

## OpenVault Injection Mechanism

### Entry Points
- `src/retrieval/retrieve.js:19` - `injectContext()` function
- `src/retrieval/retrieve.js:37` - `retrieveAndInjectContext()` function
- `src/utils.js:97` - `safeSetExtensionPrompt()` wrapper

### Core Implementation

#### 1. Safe Set Extension Prompt (`utils.js:97-110`)

```javascript
export function safeSetExtensionPrompt(content) {
    try {
        setExtensionPrompt(
            extensionName,  // 'openvault'
            content,
            extension_prompt_types.IN_CHAT,  // Always position 1
            0
        );
        return true;
    } catch (error) {
        console.error('[OpenVault] Failed to set extension prompt:', error);
        return false;
    }
}
```

**Function signature:** `setExtensionPrompt(name, value, position, depth)`
- **name:** Uses `extensionName` (which is `'openvault'`)
- **position:** Always `extension_prompt_types.IN_CHAT` (value 1)
- **depth:** Always `0`
- **scan:** Not specified (defaults to `false` from `setExtensionPrompt` signature)
- **role:** Not specified (defaults to `extension_prompt_roles.SYSTEM`)

#### 2. Inject Context Function (`retrieve.js:19-31`)

```javascript
export function injectContext(contextText) {
    if (!contextText) {
        safeSetExtensionPrompt('');
        return;
    }

    if (safeSetExtensionPrompt(contextText)) {
        log('Context injected into prompt');
    } else {
        log('Failed to inject context');
    }
}
```

#### 3. Retrieve and Inject Context (`retrieve.js:37-170`)

Main retrieval logic that:
1. Retrieves memories from storage
2. Filters by POV (Point of View) characters
3. Selects relevant memories using AI scoring
4. Formats context for injection
5. Calls `injectContext()` at line 158

#### 4. Update Injection Function (`retrieve.js:177-323`)

Called in automatic mode to rebuild and re-inject context based on current state.

#### 5. Event Triggers (`events.js:327-359`)

Events registered in `updateEventListeners()`:

- `GENERATION_AFTER_COMMANDS`: Triggers `onBeforeGeneration()` which calls `updateInjection()` at line 122
- `GENERATION_ENDED`: Clears generation lock
- `MESSAGE_RECEIVED`: Triggers memory extraction (after AI response)
- `CHAT_CHANGED`: Clears injection at line 166

**CRITICAL:** The `onBeforeGeneration()` function (`events.js:68-137`) is registered on `GENERATION_AFTER_COMMANDS` and calls `updateInjection(pendingUserMessage)` at line 122, ensuring memories are injected before each generation.

---

## CacheFriendlyMemory Injection Mechanism

### Entry Points
- `src/injection.js:43` - `injectSummaries()` function
- `src/events.js:8` - `registerExtensionEvents()` function (**NEVER CALLED**)
- `index.js:37` - `registerEvents()` function (called at line 30)

### Core Implementation

#### 1. Inject Summaries Function (`injection.js:43-78`)

```javascript
export async function injectSummaries() {
    const storage = getChatStorage();
    if (!storage || !storage.injection?.enabled) {
        try {
            setExtensionPrompt(EXTENSION_NAME, '', extension_prompt_types.IN_CHAT, 0);
        } catch (error) {
            console.warn('[CacheFriendlyMemory] Failed to clear injection:', error);
        }
        return;
    }

    const summaryText = collectSummaries();

    if (!summaryText) {
        try {
            setExtensionPrompt(EXTENSION_NAME, '', extension_prompt_types.IN_CHAT, 0);
        } catch (error) {
            console.warn('[CacheFriendlyMemory] Failed to clear injection:', error);
        }
        return;
    }

    try {
        setExtensionPrompt(
            EXTENSION_NAME,  // 'cacheFriendlyMemory'
            summaryText,
            storage.injection.position || extension_prompt_types.IN_CHAT,
            storage.injection.depth || 0,
            storage.injection.scan !== false,
            storage.injection.role || 'system'
        );
        console.log('[CacheFriendlyMemory] Summaries injected into context');
    } catch (error) {
        console.error('[CacheFriendlyMemory] Failed to inject summaries:', error);
    }
}
```

**Function signature:** `setExtensionPrompt(name, value, position, depth, scan, role)`
- **name:** Uses `EXTENSION_NAME = 'cacheFriendlyMemory'` (line 4)
- **position:** Uses `storage.injection.position || extension_prompt_types.IN_CHAT`
- **depth:** Uses `storage.injection.depth || 0`
- **scan:** Uses `storage.injection.scan !== false`
- **role:** Uses `storage.injection.role || 'system'` (string 'system' instead of numeric `extension_prompt_roles.SYSTEM`)

**Note:** The `role` parameter is passed as a string `'system'` rather than the numeric `extension_prompt_roles.SYSTEM` (value 0). SillyTavern's `getExtensionPromptRoleByName()` function (`script.js:8394-8411`) can convert string to number, so this should work.

#### 2. Collect Summaries Function (`injection.js:6-41`)

Collects and formats summaries from storage:
- Level 3 summary (long-term)
- Level 2 summaries (medium-term)
- Level 1 summaries (recent)

Returns formatted text with section headers like `[Long-term Summary]`, `[Medium-term Summaries]`, etc.

#### 3. Interceptor Function (`interceptor.js:5-39`)

```javascript
export function cacheFriendlyMemoryInterceptor(chat, contextSize, abort, type) {
    const storage = getChatStorage();
    if (!storage) return;

    if (!storage.injection?.enabled) {
        return;
    }

    const context = getContext();
    const IGNORE_SYMBOL = context.symbols.ignore;

    console.log('[CacheFriendlyMemory] Interceptor called - type:', type);

    let start = chat.length - 1;
    if (type === 'continue') {
        start--;
    }

    for (let i = start; i >= 0; i--) {
        const message = chat[i];
        const compressionLevel = getCompressionLevel(message);

        if (compressionLevel === null) {
            continue;
        }

        chat[i] = structuredClone(chat[i]);
        chat[i].extra[IGNORE_SYMBOL] = true;

        console.log(`[CacheFriendlyMemory] Ignoring message ${i} (level ${compressionLevel})`);
    }

    console.log(`[CacheFriendlyMemory] Interceptor complete - messages filtered`);
}

globalThis.cacheFriendlyMemoryInterceptor = cacheFriendlyMemoryInterceptor;
```

**CRITICAL DIFFERENCE:** Unlike MessageSummarize's interceptor (which calls `refresh_memory()` at line 3497), CacheFriendlyMemory's interceptor does **NOT** call `injectSummaries()` to refresh the injection before generation. It only filters out compressed messages.

#### 4. Register Extension Events Function (`events.js:8-59`)

```javascript
export function registerExtensionEvents() {

    eventSource.on(event_types.CHAT_CHANGED, async () => {
        console.log('[CacheFriendlyMemory] Chat changed event');
        getChatStorage();
        await injectSummaries();  // Injects on chat change
    });

    eventSource.on(event_types.MESSAGE_RECEIVED, async (mesId) => {
        console.log('[CacheFriendlyMemory] Message received event:', mesId);
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
            await injectSummaries();  // Injects after compaction
        }
    });

    eventSource.on(event_types.USER_MESSAGE_RENDERED, async (mesId) => {
        console.log('[CacheFriendlyMemory] User message rendered event:', mesId);
        const context = getContext();
        const message = context.chat?.[mesId];
        if (message) {
            markMessageActive(message);
        }
    });

    eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, async (mesId) => {
        console.log('[CacheFriendlyMemory] Character message rendered event:', mesId);
        const context = getContext();
        const message = context.chat?.[mesId];
        if (message) {
            markMessageActive(message);
        }
    });

    eventSource.on(event_types.GENERATION_AFTER_COMMANDS, async () => {
        console.log('[CacheFriendlyMemory] Generation after commands event');
        const storage = getChatStorage();
        if (storage?.injection?.enabled) {
            await injectSummaries();  // Injects before generation
        }
    });
}
```

**CRITICAL:** This function exists but is **never imported or called** anywhere in the codebase. It contains all the correct logic for proper injection.

#### 5. Index.js Register Events Function (`index.js:37-103`)

```javascript
async function registerEvents() {
    eventSource.on(event_types.APP_READY, () => {
        console.log(`[${extensionName}] App ready`);
    });

    eventSource.on(event_types.CHAT_CHANGED, async () => {
        console.log(`[${extensionName}] Chat changed`);
        const { getChatStorage } = await import('./src/storage.js');
        getChatStorage();
        // NO INJECTION HERE
    });

    eventSource.on(event_types.USER_MESSAGE_RENDERED, async (mesId) => {
        const { getChatStorage, saveChatStorage } = await import('./src/storage.js');
        const storage = getChatStorage();
        if (!storage) return;

        storage.stats.totalMessages++;
        await saveChatStorage();
        console.log(`[${extensionName}] User message rendered - totalMessages: ${storage.stats.totalMessages}, summarizedMessages: ${storage.stats.summarizedMessages}`);

        const { getGlobalSetting } = await import('./src/storage.js');
        const autoCompact = getGlobalSetting('autoCompact');
        const compactThreshold = getGlobalSetting('compactThreshold');

        if (!autoCompact) {
            console.log(`[${extensionName}] Auto-compact disabled`);
            return;
        }

        const unsummarizedCount = storage.stats.totalMessages - storage.stats.summarizedMessages;
        console.log(`[${extensionName}] Checking compaction: unsummarized=${unsummarizedCount}, threshold=${compactThreshold}`);

        if (unsummarizedCount >= compactThreshold) {
            console.log(`[${extensionName}] Triggering auto-compaction (${unsummarizedCount} messages)`);
            const { performCompaction } = await import('./src/compression.js');
            await performCompaction();
            // NO INJECTION AFTER COMPACTION
        }
    });

    eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, async (mesId) => {
        // Similar logic to USER_MESSAGE_RENDERED
        // NO INJECTION AFTER COMPACTION
    });
}
```

**CRITICAL:** This function is called at line 30 in `index.js`, but it never calls `injectSummaries()` anywhere. It:
1. Registers `CHAT_CHANGED` event but only calls `getChatStorage()` - **no injection**
2. Registers `USER_MESSAGE_RENDERED` and triggers compaction - **no injection after compaction**
3. Registers `CHARACTER_MESSAGE_RENDERED` and triggers compaction - **no injection after compaction**
4. Does **NOT** register `GENERATION_AFTER_COMMANDS` event

#### 6. Perform Compaction Function (`compression.js:40-124`)

```javascript
export async function performCompaction() {
    const storage = getChatStorage();
    if (!storage) {
        console.warn('[CacheFriendlyMemory] No storage available for compaction');
        return;
    }

    console.log('[CacheFriendlyMemory] Starting compaction');

    const context = getContext();
    const chat = context.chat;

    // ... compaction logic ...

    storage.stats.lastCompactTime = Date.now();

    const totalSummaryTokens = storage.level1.summaries.reduce((sum, s) => sum + s.tokenCount, 0);
    const rawMessagesTokens = totalMessagesCompacted * 100;
    storage.stats.currentCompressionRatio = totalSummaryTokens / rawMessagesTokens;

    console.log('[CacheFriendlyMemory] Final stats - summarizedMessages:', storage.stats.summarizedMessages);
    console.log('[CacheFriendlyMemory] Total summaries:', storage.level1.summaries.length);
    console.log('[CacheFriendlyMemory] Compression ratio:', storage.stats.currentCompressionRatio.toFixed(2));

    await saveChatStorage();
    console.log(`[CacheFriendlyMemory] Compacted ${totalMessagesCompacted} messages - Storage saved`);
    // NO INJECTION AFTER SAVING
}
```

**CRITICAL:** The `performCompaction()` function saves the storage but never calls `injectSummaries()` to update the injection with new summaries.

---

## Comparison Table

| Aspect                      | MessageSummarize                                                           | OpenVault                                                                   | CacheFriendlyMemory                                     |
| --------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------- |
| **Injection Function**          | `refresh_memory()`                                                           | `injectContext()` via `safeSetExtensionPrompt()`                                | `injectSummaries()`                                       |
| **Extension Name**              | `qvink_memory` (with `_long` and `_short` suffixes)                              | `openvault`                                                                   | `cacheFriendlyMemory`                                     |
| **Position Parameter**          | User-configurable via settings                                             | Always `extension_prompt_types.IN_CHAT`                                       | From `storage.injection.position`                         |
| **Depth Parameter**             | User-configurable via settings                                             | Always `0`                                                                    | From `storage.injection.depth`                            |
| **Scan Parameter**              | User-configurable via settings                                             | Not specified (defaults to `false`)                                           | From `storage.injection.scan`                             |
| **Role Parameter**              | User-configurable via settings (numeric)                                   | Not specified (defaults to `SYSTEM`)                                          | String `'system'`                                         |
| **Interceptor Calls Injection** | **YES** (line 3497)                                                            | **N/A** (no message filtering)                                                  | **NO**                                                      |
| **Events Registered**           | 8+ events including `GENERATION_STARTED`, `CHAT_CHANGED`, `MORE_MESSAGES_LOADED` | `GENERATION_AFTER_COMMANDS`, `GENERATION_ENDED`, `MESSAGE_RECEIVED`, `CHAT_CHANGED` | None (events defined but function never called)         |
| **Injection on Chat Change**    | **YES** (line 3842)                                                            | **YES** (clears at line 166)                                                    | **NO** (in `events.js` but not called)                        |
| **Injection Before Generation** | **YES** (via interceptor)                                                      | **YES** (via `GENERATION_AFTER_COMMANDS`)                                        | **NO** (no event registered)                                  |
| **Injection After Compaction**  | **N/A** (compaction triggers `refresh_memory`)                                   | **N/A**                                                                         | **NO** (`performCompaction()` doesn't call `injectSummaries()`) |

---

## Event Flow Comparison

### MessageSummarize Event Flow (Working)

```
1. GENERATION_STARTED event
   ↓
2. on_chat_event('before_message')
   ↓
3. Auto-summarize if needed
   ↓
4. User sends message or generation starts
   ↓
5. Interceptor called (memory_intercept_messages)
   ↓
6. refresh_memory() called at line 3497 ← CRITICAL
   ↓
7. setExtensionPrompt() called for _long and _short memories
   ↓
8. Messages filtered (compressed messages hidden)
   ↓
9. Generation proceeds with memories injected
```

### OpenVault Event Flow (Working)

```
1. GENERATION_AFTER_COMMANDS event
   ↓
2. onBeforeGeneration() called
   ↓
3. autoHideOldMessages()
   ↓
4. updateInjection(pendingUserMessage) called at line 122
   ↓
5. retrieveAndInjectContext()
   ↓
6. selectRelevantMemories()
   ↓
7. formatContextForInjection()
   ↓
8. injectContext() → safeSetExtensionPrompt()
   ↓
9. Generation proceeds with memories injected
```

### CacheFriendlyMemory Event Flow (Current - Broken)

```
1. User sends message
   ↓
2. USER_MESSAGE_RENDERED event
   ↓
3. registerEvents() handler (in index.js)
   ↓
4. Check compaction threshold
   ↓
5. performCompaction() if threshold met
   ↓
6. saveChatStorage() ← NO INJECTION AFTER
   ↓
7. GENERATION_AFTER_COMMANDS event
   ↓
8. [NO HANDLER REGISTERED]
   ↓
9. Interceptor called
   ↓
10. Filters compressed messages ← NO INJECTION BEFORE
   ↓
11. Generation proceeds with NO SUMMARIES INJECTED
```

### CacheFriendlyMemory Event Flow (Expected - If events.js was used)

```
1. GENERATION_AFTER_COMMANDS event
   ↓
2. registerExtensionEvents() handler (in events.js) ← NOT CALLED
   ↓
3. injectSummaries() at line 56
   ↓
4. setExtensionPrompt()
   ↓
5. Interceptor called
   ↓
6. Filters compressed messages
   ↓
7. Generation proceeds with summaries injected
```

---

## Root Cause Analysis

### Primary Issue: `registerExtensionEvents()` is Never Called

The `src/events.js` file defines a `registerExtensionEvents()` function that properly:
1. Registers event listeners
2. Calls `injectSummaries()` on `CHAT_CHANGED` (line 13)
3. Calls `injectSummaries()` on `GENERATION_AFTER_COMMANDS` (line 56)
4. Calls `injectSummaries()` after compaction completes (line 30)

**However, this function is never imported or called from `index.js`.**

### Secondary Issue: `index.js` Register Events Function Doesn't Inject

The `registerEvents()` function in `index.js` (line 37) is called at line 30, but it:
1. Registers `CHAT_CHANGED` event but only calls `getChatStorage()` - **no injection**
2. Registers `USER_MESSAGE_RENDERED` and triggers compaction - **no injection after compaction**
3. Registers `CHARACTER_MESSAGE_RENDERED` and triggers compaction - **no injection after compaction**
4. Does **NOT** register `GENERATION_AFTER_COMMANDS` event

### Tertiary Issue: Interceptor Doesn't Call `injectSummaries()`

The `cacheFriendlyMemoryInterceptor()` function in `src/interceptor.js` (line 5):
- Is registered in `manifest.json` at line 13: `"generate_interceptor": "cacheFriendlyMemoryInterceptor"`
- Is called before each generation
- Filters out compressed messages
- **Does NOT call `injectSummaries()`** to refresh the injection before generation (MessageSummarize does this at line 3497)

### Quaternary Issue: Compaction Doesn't Trigger Injection

The `performCompaction()` function in `src/compression.js` (line 40):
- Creates summaries
- Saves to storage via `saveChatStorage()` at line 122
- **Does NOT call `injectSummaries()`** to update the injection with new summaries

---

## Specific Differences in `setExtensionPrompt()` Calls

### MessageSummarize

**Location:** `index.js:3748-3749`

```javascript
ctx.setExtensionPrompt(
    `${MODULE_NAME}_long`,
    long_injection,
    long_term_position,
    get_settings('long_term_depth'),
    get_settings('long_term_scan'),
    get_settings('long_term_role')
);
```

**Characteristics:**
- Extension name: `qvink_memory_long` and `qvink_memory_short`
- Two separate prompts
- All parameters from user settings
- Role is numeric (from settings)

### OpenVault

**Location:** `utils.js:99-104`

```javascript
setExtensionPrompt(
    extensionName,  // 'openvault'
    content,
    extension_prompt_types.IN_CHAT,  // Always 1
    0
);
```

**Characteristics:**
- Extension name: `openvault`
- Single prompt
- Fixed position (IN_CHAT), fixed depth (0)
- Minimal parameters, defaults used for scan/role

### CacheFriendlyMemory

**Location:** `injection.js:66-73`

```javascript
setExtensionPrompt(
    EXTENSION_NAME,  // 'cacheFriendlyMemory'
    summaryText,
    storage.injection.position || extension_prompt_types.IN_CHAT,
    storage.injection.depth || 0,
    storage.injection.scan !== false,
    storage.injection.role || 'system'
);
```

**Characteristics:**
- Extension name: `cacheFriendlyMemory`
- Single prompt
- Parameters from storage configuration
- Role as string `'system'` (gets converted by `getExtensionPromptRoleByName()`)

**The `setExtensionPrompt()` call itself is correct** - the issue is that `injectSummaries()` is never called at the right time.

---

## Concrete Recommendations for Fixing the Injection Mechanism

### Fix 1: Call `registerExtensionEvents()` from `index.js`

**File:** `index.js`

**Change at line 5-6:**
```javascript
// Current
import { injectSummaries, clearInjection } from './src/injection.js';
import { cacheFriendlyMemoryInterceptor } from './src/interceptor.js';

// Change to
import { injectSummaries, clearInjection } from './src/injection.js';
import { cacheFriendlyMemoryInterceptor } from './src/interceptor.js';
import { registerExtensionEvents } from './src/events.js';
```

**Change at line 30:**
```javascript
// Current
await registerEvents();
await registerSlashCommands();

// Change to
await registerExtensionEvents();  // Use the proper event registration
await registerSlashCommands();
```

### Fix 2: Remove the Redundant `registerEvents()` Function

**File:** `index.js`

Either delete the `registerEvents()` function (lines 37-103) or rename it to avoid confusion with `registerExtensionEvents()`.

### Fix 3: Ensure Injection Happens in Interceptor

**File:** `src/interceptor.js`

**Add import:**
```javascript
import { injectSummaries } from './injection.js';
```

**Add at line 10 (after checking if enabled):**
```javascript
if (!storage.injection?.enabled) {
    return;
}

// Add this line:
injectSummaries();  // Refresh injection before generation
```

**Rationale:** Following MessageSummarize's pattern, the interceptor should refresh injection before each generation.

### Fix 4: Ensure Injection Happens After Compaction

**File:** `src/compression.js`

**Add import:**
```javascript
import { injectSummaries } from './injection.js';
```

**Add after line 122 (after `await saveChatStorage();`):**
```javascript
await saveChatStorage();
console.log(`[CacheFriendlyMemory] Compacted ${totalMessagesCompacted} messages - Storage saved`);

// Add this line:
await injectSummaries();  // Update injection with new summaries
```

**Rationale:** After creating new summaries via compaction, they must be injected so they're available for the next generation.

### Fix 5: Update Slash Commands to Inject After Compaction

**File:** `index.js`

**Change at line 110-119:**
```javascript
// Current
parser.addCommandObject(command.fromProps({
    name: 'cfm-compact',
    callback: async () => {
        const { performCompaction } = await import('./src/compression.js');
        await performCompaction();
        return 'Compaction completed';
    },
    helpString: 'Manually trigger compaction of chat history',
}));

// Change to
parser.addCommandObject(command.fromProps({
    name: 'cfm-compact',
    callback: async () => {
        const { performCompaction } = await import('./src/compression.js');
        await performCompaction();
        await injectSummaries();  // Update injection after manual compaction
        return 'Compaction completed';
    },
    helpString: 'Manually trigger compaction of chat history',
}));
```

---

## Verification Steps

After implementing the fixes, verify:

1. **Console Logs:** Check browser console for `[CacheFriendlyMemory] Summaries injected into context` message
2. **Generated Responses:** Check that compressed messages are filtered and summaries are present in the generated response
3. **Event Triggers:** Verify injection happens on:
   - Chat change
   - Before generation (via `GENERATION_AFTER_COMMANDS`)
   - After compaction (auto and manual)
4. **Interceptor Behavior:** Verify interceptor is called and injection is refreshed before each generation
5. **Context Viewer:** Check that the extension prompt contains the summary text by examining the context in SillyTavern's context viewer
6. **Role Conversion:** Verify the string `'system'` role is properly converted to numeric by SillyTavern

---

## Key Takeaways

1. **The injection function itself is correct** - `injectSummaries()` properly calls `setExtensionPrompt()` with correct parameters.

2. **The problem is timing** - `injectSummaries()` is never called at the right time because:
   - The function that calls it (`registerExtensionEvents()`) is never invoked
   - The interceptor doesn't call it before generation
   - Compaction doesn't call it after creating new summaries

3. **MessageSummarize's pattern is most relevant** - it calls `refresh_memory()` in the interceptor before each generation, ensuring summaries are always up-to-date.

4. **OpenVault's pattern is also valid** - it calls `updateInjection()` on `GENERATION_AFTER_COMMANDS`, which is called before generation starts.

5. **CacheFriendlyMemory should combine both approaches**:
   - Call `injectSummaries()` in `GENERATION_AFTER_COMMANDS` handler (like OpenVault)
   - Call `injectSummaries()` in interceptor (like MessageSummarize)
   - Call `injectSummaries()` after compaction
   - Call `injectSummaries()` on chat change

---

## Conclusion

CacheFriendlyMemory summaries are not being sent to the LLM because the injection function `injectSummaries()` is never called at the appropriate times. The extension has all the correct code defined in `src/events.js`, but this file's `registerExtensionEvents()` function is never imported or called from the main entry point `index.js`.

Instead, a different `registerEvents()` function in `index.js` is called, but it doesn't call `injectSummaries()` at all. Additionally, the interceptor and compaction functions don't call `injectSummaries()` either.

The fix is straightforward:
1. Import and call `registerExtensionEvents()` from `index.js`
2. Optionally add `injectSummaries()` calls to the interceptor and compaction function for redundancy

These changes will align CacheFriendlyMemory's injection mechanism with the proven patterns used by MessageSummarize and OpenVault, ensuring summaries are properly injected and sent to the LLM.
