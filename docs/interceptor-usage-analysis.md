# SillyTavern Extension Interceptors

## Overview

SillyTavern provides a **generation interceptor mechanism** that allows extensions to modify the chat context immediately before generation begins. This enables extensions to dynamically control which messages are included in the generation prompt, inject custom content, or perform other pre-generation operations.

**Note:** Interceptors are different from event listeners. While event listeners respond to SillyTavern events throughout the application lifecycle, interceptors specifically hook into the generation pipeline.

## Interceptor vs. Event-Based Approaches

### Interceptor Pattern (Used by CacheFriendlyMemory, MessageSummarize, Vectors)
- Triggered specifically before each generation starts
- Directly modifies the `chat` array that will be sent to the AI
- Can remove messages from context by setting the `ignore` symbol
- Called synchronously (but may be async) during generation preparation
- Registered via manifest.json `generate_interceptor` field

### Event-Based Pattern (Used by OpenVault)
- Responds to SillyTavern events (e.g., `GENERATION_AFTER_COMMANDS`, `MESSAGE_RECEIVED`)
- Uses SillyTavern's `eventSource.on(event_types.X, handler)` API
- Typically injects content via `setExtensionPrompt()` API
- More flexible for multiple trigger points
- Registered via `eventSource.on()` in code

## How Interceptors Work

### 1. Registration via Manifest

Extensions declare their interceptor in `manifest.json`:

```json
{
    "display_name": "Cache Friendly Memory",
    "generate_interceptor": "cacheFriendlyMemoryInterceptor",
    ...
}
```

### 2. Function Registration

The interceptor function is registered to `globalThis`:

```javascript
// src/interceptor.js:6-51
export async function cacheFriendlyMemoryInterceptor(chat, contextSize, abort, type) {
    console.log('[CacheFriendlyMemory] Interceptor START - type:', type);
    // ... interceptor logic
}

globalThis.cacheFriendlyMemoryInterceptor = cacheFriendlyMemoryInterceptor;
```

### 3. Execution Pipeline

SillyTavern calls `runGenerationInterceptors()` in `script.js` before building the prompt:

```javascript
// From script.js (in the generation flow)
if (!dryRun) {
    console.debug('Running extension interceptors');
    const aborted = await runGenerationInterceptors(coreChat, this_max_context, type);

    if (aborted) {
        console.debug('Generation aborted by extension interceptors');
        unblockGeneration(type);
        return Promise.resolve();
    }
}
```

### 4. Interceptor Invocation

In `extensions.js`, the system iterates through all extensions with interceptors:

```javascript
export async function runGenerationInterceptors(chat, contextSize, type) {
    let aborted = false;
    let exitImmediately = false;

    const abort = (/** @type {boolean} */ immediately) => {
        aborted = true;
        exitImmediately = immediately;
    };

    for (const manifest of Object.values(manifests)
        .filter(x => x.generate_interceptor)
        .sort((a, b) => sortManifestsByOrder(a, b))) {

        const interceptorKey = manifest.generate_interceptor;
        if (typeof globalThis[interceptorKey] === 'function') {
            try {
                await globalThis[interceptorKey](chat, contextSize, abort, type);
            } catch (e) {
                console.error(`Failed running interceptor for ${manifest.display_name}`, e);
            }
        }

        if (exitImmediately) {
            break;
        }
    }

    return aborted;
}
```

## Interceptor Function Signature

```javascript
async function interceptorName(chat, contextSize, abort, type)
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `chat` | `any[]` | The chat array containing all messages. **Modifying this array directly affects the prompt.** |
| `contextSize` | `number` | Maximum context size (in tokens) for this generation |
| `abort` | `function(boolean)` | Function to abort generation. Call `abort(true)` to abort immediately, `abort(false)` to abort after other interceptors run |
| `type` | `string` | Generation type (e.g., `'generate'`, `'continue'`, `'impersonate'`, `'quiet'`) |

### Return Value

The interceptor function is `async` but its return value is ignored. To abort generation, call the `abort` function.

## Interceptor Use Cases

### 1. Removing Messages from Context

**Pattern:** Clone messages and set the ignore symbol to exclude them from the prompt.

**Example - MessageSummarize** (`index.js:3494-3513`):

```javascript
globalThis.memory_intercept_messages = function (chat, _contextSize, _abort, type) {
    if (!chat_enabled()) return;
    if (!get_settings('exclude_messages_after_threshold')) return;
    refresh_memory();

    let start = chat.length-1;
    if (type === 'continue') start--;

    // Symbol used to prevent accidentally leaking modifications to permanent chat
    let IGNORE_SYMBOL = getContext().symbols.ignore;

    // Remove any messages that have summaries injected
    for (let i = start; i >= 0; i--) {
        delete chat[i].extra.ignore_formatting;
        let message = chat[i];
        let lagging = get_data(message, 'lagging');  // The message should be kept
        chat[i] = structuredClone(chat[i]);  // Keep changes temporary for this generation
        chat[i].extra[IGNORE_SYMBOL] = !lagging;  // Mark as ignored (or kept)
    }
};
```

**Example - CacheFriendlyMemory** (`src/interceptor.js:6-51`):

```javascript
export async function cacheFriendlyMemoryInterceptor(chat, contextSize, abort, type) {
    console.log('[CacheFriendlyMemory] Interceptor START - type:', type);
    const storage = getChatStorage();
    if (!storage || !storage.injection?.enabled) {
        return;
    }

    await injectSummaries();

    const context = getContext();
    const IGNORE_SYMBOL = context.symbols.ignore;

    let start = chat.length - 1;
    if (type === 'continue') {
        start--;
    }

    for (let i = start; i >= 0; i--) {
        const message = chat[i];
        const compressionLevel = getCompressionLevel(message);

        if (compressionLevel === null) {
            continue;  // Keep uncompressed messages
        }

        // Clone and mark as ignored
        chat[i] = structuredClone(chat[i]);
        chat[i].extra[IGNORE_SYMBOL] = true;
    }
}
```

**Key Pattern Notes:**
- Use `structuredClone()` to create temporary copies that won't affect the stored chat
- Use `getContext().symbols.ignore` (or `IGNORE_SYMBOL` from constants) to mark messages
- Iterate backwards from `chat.length-1` to 0
- Adjust start position for `'continue'` type to keep the last message

### 2. Reordering and Injecting Relevant Content

**Example - Vectors** (`index.js:608-716`):

```javascript
function rearrangeChat(chat, contextSize, abort, type) {
    // ... early checks and setup ...

    const chatId = getCurrentChatId();
    if (!chatId || !Array.isArray(chat)) {
        return;
    }

    // Query for relevant messages
    const queryText = await getQueryText(chat, 'chat');
    const queryResults = await queryCollection(chatId, queryText, settings.insert);
    const queryHashes = queryResults.hashes.filter(onlyUnique);
    const queriedMessages = [];

    // Collect relevant messages (excluding protected recent messages)
    const retainMessages = chat.slice(-settings.protect);
    for (const message of chat) {
        if (retainMessages.includes(message) || !message.mes) {
            continue;
        }
        const hash = getStringHash(substituteParams(message.mes));
        if (queryHashes.includes(hash) && !insertedHashes.has(hash)) {
            queriedMessages.push(message);
            insertedHashes.add(hash);
        }
    }

    // Rearrange to match query order (most relevant first)
    queriedMessages.sort((a, b) =>
        queryHashes.indexOf(getStringHash(substituteParams(b.mes))) -
        queryHashes.indexOf(getStringHash(substituteParams(a.mes)))
    );

    // Remove queried messages from original position
    for (const message of chat) {
        if (queriedMessages.includes(message)) {
            chat.splice(chat.indexOf(message), 1);
        }
    }

    if (queriedMessages.length === 0) {
        return;
    }

    // Format into a single string and inject via extension prompt
    const insertedText = getPromptText(queriedMessages);
    setExtensionPrompt(EXTENSION_PROMPT_TAG, insertedText, settings.position, settings.depth, settings.include_wi);
}
```

**Key Pattern Notes:**
- Uses vector embeddings to find semantically relevant messages
- Protects recent messages with `settings.protect` threshold
- Removes messages from original chat position
- Re-injects them as formatted text via `setExtensionPrompt()`

### 3. Conditional Triggering

**Example - Stable Diffusion** (`index.js:354-430`):

```javascript
function processTriggers(chat, _, abort, type) {
    // Skip quiet generation and tool calling mode
    if (type === 'quiet') {
        return;
    }
    if (extension_settings.sd.function_tool && ToolManager.isToolCallingSupported()) {
        return;
    }

    // Only process in interactive mode
    if (!extension_settings.sd.interactive_mode) {
        return;
    }

    const lastMessage = chat[chat.length - 1];
    if (!lastMessage || !lastMessage.is_user) {
        return;
    }

    const message = lastMessage.mes;
    const messageLower = message.toLowerCase();

    // Check for trigger pattern
    const activationRegex = new RegExp(messageTrigger.activationRegex, 'i');
    const activationMatch = messageLower.match(activationRegex);

    if (!activationMatch) {
        return;
    }

    let subject = activationMatch[3].trim();
    if (!subject) {
        return;
    }

    console.log(`SD: Triggered by "${message}", detected subject: "${subject}"`);

    // Process special cases and generate image
    for (const [specialMode, triggers] of Object.entries(messageTrigger.specialCases)) {
        for (const trigger of triggers) {
            if (subject === trigger) {
                // Generate image for special mode
                generateImageInternal({ subject, specialMode });
                // Abort generation to replace with image
                abort(true);
                return;
            }
        }
    }

    // Normal image generation
    generateImageInternal({ subject });
    abort(true);  // Abort text generation
}
```

**Key Pattern Notes:**
- Checks generation type (`type` parameter)
- Inspects the last message for trigger patterns
- Calls `abort(true)` to stop text generation and replace with image
- Uses regex matching to detect trigger keywords

## Event-Based Alternative (OpenVault Approach)

OpenVault uses event listeners instead of interceptors:

### Registration (`src/events.js:327-359`)

```javascript
export function updateEventListeners(skipInitialization = false) {
    const settings = extension_settings[extensionName];

    // Remove old event listeners first to prevent duplicates
    eventSource.removeListener(event_types.GENERATION_AFTER_COMMANDS, onBeforeGeneration);
    eventSource.removeListener(event_types.GENERATION_ENDED, onGenerationEnded);
    eventSource.removeListener(event_types.MESSAGE_RECEIVED, onMessageReceived);
    eventSource.removeListener(event_types.CHAT_CHANGED, onChatChanged);

    if (settings.enabled && settings.automaticMode) {
        // Register event listeners for automatic mode
        eventSource.on(event_types.GENERATION_AFTER_COMMANDS, onBeforeGeneration);
        eventSource.on(event_types.GENERATION_ENDED, onGenerationEnded);
        eventSource.on(event_types.MESSAGE_RECEIVED, onMessageReceived);
        eventSource.on(event_types.CHAT_CHANGED, onChatChanged);
    }
}
```

### Pre-Generation Handler (`src/events.js:68-137`)

```javascript
export async function onBeforeGeneration(type, options, dryRun = false) {
    const settings = extension_settings[extensionName];

    // Skip if disabled, manual mode, or dry run
    if (!settings.enabled || !settings.automaticMode || dryRun) {
        return;
    }

    // Skip if already generating (prevent re-entry)
    if (operationState.generationInProgress) {
        log('Skipping retrieval - generation already in progress');
        return;
    }

    operationState.retrievalInProgress = true;

    try {
        // Auto-hide old messages before building context
        await autoHideOldMessages();

        const data = getOpenVaultData();
        if (!data || data[MEMORIES_KEY]?.length === 0) {
            return;
        }

        setStatus('retrieving');
        setGenerationLock();

        // Get last user message for retrieval context
        const context = getContext();
        const chat = context.chat || [];
        const lastUserMessage = [...chat].reverse().find(m => m.is_user && !m.is_system);

        showToast('info', 'Retrieving memories...', 'OpenVault', { timeOut: 2000 });

        // Do memory retrieval before generation
        await withTimeout(
            updateInjection(lastUserMessage?.mes || ''),
            RETRIEVAL_TIMEOUT_MS,
            'Memory retrieval'
        );
    } finally {
        operationState.retrievalInProgress = false;
    }
}
```

### Injection (`src/retrieval/retrieve.js:177-323`)

```javascript
export async function updateInjection(pendingUserMessage = '') {
    const settings = extension_settings[extensionName];

    if (!settings.enabled || !settings.automaticMode) {
        safeSetExtensionPrompt('');  // Clear injection if disabled
        return;
    }

    // ... retrieval logic ...

    // Format and inject
    const formattedContext = formatContextForInjection(
        relevantMemories,
        relationshipContext,
        emotionalInfo,
        headerName,
        settings.tokenBudget
    );

    if (formattedContext) {
        injectContext(formattedContext);  // Uses safeSetExtensionPrompt()
    }
}
```

### Why OpenVault Uses Events Instead of Interceptors

1. **Async Operations**: Retrieval from external sources might require longer async operations
2. **Multiple Trigger Points**: Needs to respond to various events beyond just generation
3. **Non-Invasive**: Doesn't need to modify the chat array directly
4. **Separation of Concerns**: Memory extraction happens after `MESSAGE_RECEIVED`, retrieval before generation
5. **No Message Exclusion**: OpenVault doesn't exclude messages from context, it adds context

## Comparison Summary

| Aspect | Interceptor Pattern | Event-Based Pattern (OpenVault) |
|--------|--------------------|---------------------------------|
| **Registration** | `manifest.json` field | `eventSource.on()` in code |
| **Trigger Point** | Before prompt building | Multiple points (generation, messages, chat changes) |
| **Chat Array Access** | Direct read/write | Read-only via `getContext()` |
| **Primary Use Case** | Removing/reordering messages | Adding context via extension prompts |
| **Message Exclusion** | Via `IGNORE_SYMBOL` | Via `setExtensionPrompt()` injection |
| **Abort Generation** | Yes, via `abort()` callback | No (doesn't intercept) |
| **Execution Order** | By `loading_order` in manifest | Event subscription order |
| **Async Operations** | Supported (async function) | Fully supported (event handlers are async) |
| **Multiple Extensions** | Run sequentially with abort option | All listeners run independently |

## Implementation Best Practices

### 1. Always Check Settings Early

```javascript
export async function myInterceptor(chat, contextSize, abort, type) {
    const storage = getChatStorage();
    if (!storage || !storage.enabled) {
        return;  // Exit early if disabled
    }

    // ... rest of logic
}
```

### 2. Clone Messages Before Modifying

```javascript
// WRONG: Modifies stored chat
chat[i].extra[IGNORE_SYMBOL] = true;

// RIGHT: Creates temporary copy
chat[i] = structuredClone(chat[i]);
chat[i].extra[IGNORE_SYMBOL] = true;
```

### 3. Handle Generation Types Appropriately

```javascript
let start = chat.length - 1;
if (type === 'continue') {
    start--;  // Keep the last message for continues
}
```

### 4. Log Debug Information

```javascript
console.log('[ExtensionName] Interceptor START - type:', type);
console.log(`[ExtensionName] Ignoring ${ignoredCount} messages`);
```

### 5. Clean Up Symbols

```javascript
delete chat[i].extra.ignore_formatting;  // Remove temporary symbols
```

### 6. Use Context Symbols from SillyTavern

```javascript
const context = getContext();
const IGNORE_SYMBOL = context.symbols.ignore;
// OR
import { IGNORE_SYMBOL } from '../../../../../script.js';
```

### 7. Handle Edge Cases

```javascript
if (!chat || chat.length === 0) {
    return;
}

if (type === 'quiet' || type === 'dryRun') {
    return;  // Skip background generations
}
```

### 8. For Event-Based Approach: Manage Listeners

```javascript
// Always remove old listeners before adding new ones to prevent duplicates
eventSource.removeListener(event_types.GENERATION_AFTER_COMMANDS, onBeforeGeneration);
eventSource.on(event_types.GENERATION_AFTER_COMMANDS, onBeforeGeneration);
```

## When to Use Interceptors vs. Events

### Use Interceptors When:
- You need to **remove** messages from the generation prompt
- You need to **reorder** messages in the context
- You want to **abort** generation before it starts
- Your operation is tightly coupled to the generation pipeline

### Use Events When:
- You need to **add** context without removing messages
- You need to respond to multiple trigger points (message received, chat changed, etc.)
- Your operation is independent of message ordering
- You want to perform long-running async operations that might timeout in the interceptor window
- You want a separation between extraction and retrieval phases

## SillyTavern Event Types Relevant for Memory/Context Extensions

| Event | Description | Typical Usage |
|-------|-------------|---------------|
| `GENERATION_AFTER_COMMANDS` | Fired after slash commands but before prompt building | Pre-generation context injection |
| `GENERATION_STARTED` | Fired when generation begins | State tracking |
| `GENERATION_ENDED` | Fired when generation completes | Cleanup, lock release |
| `MESSAGE_RECEIVED` | Fired when a new message is added to chat | Extraction, summarization |
| `CHAT_CHANGED` | Fired when switching chats | Reset state, clear injections |
| `MORE_MESSAGES_LOADED` | Fired when loading history | Update state for new messages |

## File Locations Reference

| Component | File | Lines |
|-----------|------|-------|
| Interceptor Runner | `scripts/extensions.js` | `runGenerationInterceptors()` |
| Interceptor Invocation | `script.js` | Generation flow (search for "Running extension interceptors") |
| MessageSummarize Interceptor | `extensions/third-party/SillyTavern-MessageSummarize/index.js` | 3494-3513 |
| CacheFriendlyMemory Interceptor | `extensions/third-party/CacheFriendlyMemory/src/interceptor.js` | 6-51 |
| Vectors Interceptor | `extensions/vectors/index.js` | 608-716 |
| Stable Diffusion Interceptor | `extensions/stable-diffusion/index.js` | 354-430 |
| OpenVault Event Handlers | `extensions/third-party/openvault/src/events.js` | 327-359 |
| OpenVault Retrieval | `extensions/third-party/openvault/src/retrieval/retrieve.js` | 177-323 |

## Conclusion

Interceptors provide a powerful mechanism for extensions to dynamically control generation context by directly modifying the chat array. They are ideal for memory compression, context optimization, and message reordering scenarios. Event-based approaches like OpenVault's offer more flexibility for multi-stage operations and are better suited when adding context without message exclusion.

Both patterns are valid and serve different use cases. The choice depends on whether you need to modify the existing message flow (interceptors) or enhance it with additional information (events).
