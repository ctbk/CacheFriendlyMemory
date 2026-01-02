# Extension Prompt Injection Analysis

**Date:** 2025-12-30  
**Purpose:** Analyze how SillyTavern extensions inject content into the LLM context using `setExtensionPrompt`

## Summary

The CacheFriendlyMemory extension's current injection mechanism using `setExtensionPrompt` is **correct and complete**. No additional registration or "prompt slot" creation is required. The `setExtensionPrompt` function directly updates a global `extension_prompts` object, and SillyTavern automatically includes these prompts during context generation.

## How `setExtensionPrompt` Works

### The Core Mechanism

Located in `script.js` (line ~8378):

```javascript
export function setExtensionPrompt(key, value, position, depth, scan = false, role = extension_prompt_roles.SYSTEM, filter = null) {
    extension_prompts[key] = {
        value: String(value),
        position: Number(position),
        depth: Number(depth),
        scan: !!scan,
        role: Number(role ?? extension_prompt_roles.SYSTEM),
        filter: filter,
    };
}
```

### Key Points

1. **No Pre-registration Required**: The function simply stores the prompt data in a global object (`extension_prompts`). There's no need to "create" a prompt slot beforehand.

2. **Dynamic Updates**: Each call to `setExtensionPrompt` immediately updates the `extension_prompts` object. The next context generation will include the updated prompt.

3. **Automatic Inclusion**: During context assembly, SillyTavern reads from `extension_prompts` and includes prompts based on their `position` and `depth` settings.

4. **Clearing Prompts**: To remove an injection, call `setExtensionPrompt(key, '', ...)` with an empty string value.

### Available Position Types

From `script.js`:

```javascript
export const extension_prompt_types = {
    NONE: -1,       // Not injected (but still accessible via macros)
    IN_PROMPT: 0,   // After Main Prompt / Story String
    IN_CHAT: 1,     // In-chat @ specified depth
    BEFORE_PROMPT: 2, // Before Main Prompt / Story String
};
```

### Available Role Types

```javascript
export const extension_prompt_roles = {
    SYSTEM: 0,
    USER: 1,
    ASSISTANT: 2,
};
```

## How Other Extensions Handle Injection

### Built-in Memory Extension (`extensions/memory/index.js`)

The built-in Summarize extension uses a simple approach:

```javascript
function setMemoryContext(value, saveToMessage, index = null) {
    setExtensionPrompt(
        MODULE_NAME,  // '1_memory'
        formatMemoryValue(value),
        extension_settings.memory.position,
        extension_settings.memory.depth,
        extension_settings.memory.scan,
        extension_settings.memory.role
    );
    // ... save to message and UI update
}
```

**Key Events:**
- `CHAT_CHANGED`: Loads the latest summary and calls `setMemoryContext`
- `CHARACTER_MESSAGE_RENDERED`: Triggers summarization logic if conditions are met

The extension does NOT require any special setup or registration - it just calls `setExtensionPrompt` when needed.

### MessageSummarize (Third-party: Qvink Memory)

Uses TWO separate injection keys for long-term and short-term memories:

```javascript
function refresh_memory() {
    let ctx = getContext();
    if (!chat_enabled()) {
        ctx.setExtensionPrompt(`${MODULE_NAME}_long`, "");
        ctx.setExtensionPrompt(`${MODULE_NAME}_short`, "");
        return;
    }
    
    // Get formatted memories
    let long_injection = get_long_memory();
    let short_injection = get_short_memory();
    
    // Inject with configurable positions
    ctx.setExtensionPrompt(`${MODULE_NAME}_long`,  long_injection,  long_term_position, ...);
    ctx.setExtensionPrompt(`${MODULE_NAME}_short`, short_injection, short_term_position, ...);
}
```

**Notable:** Uses `getContext().setExtensionPrompt()` instead of importing directly, which is also valid.

### OpenVault (Third-party)

Uses a wrapper function for safety:

```javascript
export function safeSetExtensionPrompt(content) {
    try {
        setExtensionPrompt(
            extensionName,      // 'openvault'
            content,
            extension_prompt_types.IN_CHAT,
            0
        );
        return true;
    } catch (error) {
        console.error('[OpenVault] Failed to set extension prompt:', error);
        return false;
    }
}
```

Called during retrieval operations to inject formatted context.

## CacheFriendlyMemory Current Implementation

Our `src/injection.js` implementation:

```javascript
export async function injectSummaries() {
    const storage = getChatStorage();
    if (!storage || !storage.injection?.enabled) {
        clearInjection();
        return;
    }

    if (!hasSummaries(storage)) {
        clearInjection();
        return;
    }

    const summaryText = collectSummaries();
    const position = storage.injection.position ?? extension_prompt_types.IN_CHAT;
    const depth = storage.injection.depth ?? 0;
    const scan = storage.injection.scan !== false;
    const role = getRoleValue(storage.injection.role ?? 'system');

    setExtensionPrompt(EXTENSION_NAME, summaryText, position, depth, scan, role);
}
```

### Current Event Registration (`src/events.js`)

```javascript
eventSource.on(event_types.CHAT_CHANGED, async () => {
    getChatStorage();
    await injectSummaries();
});

eventSource.on(event_types.GENERATION_AFTER_COMMANDS, async () => {
    if (storage?.injection?.enabled) {
        await injectSummaries();
    }
});
```

## Analysis: Is Our Approach Correct?

**YES** - Our implementation follows the same pattern as both the built-in memory extension and other third-party extensions. We:

1. ✅ Call `setExtensionPrompt` with our unique key (`cacheFriendlyMemory`)
2. ✅ Provide position, depth, scan, and role parameters
3. ✅ Clear the injection when disabled (by setting empty string)
4. ✅ Update the injection on relevant events

## The "Prompts Panel" Question

The user mentioned seeing a "dedicated prompt" in the Prompts panel for some extensions. This refers to SillyTavern's **Author's Note / Extensions** panel in the UI, which shows:
- The built-in Summarize extension's textarea
- The Author's Note feature

This is a **UI feature** of those specific extensions, not a requirement for injection to work. The built-in memory extension has its own settings panel (`settings.html`) that displays the current summary and allows manual editing.

CacheFriendlyMemory could optionally add a similar UI element to display current injected content, but this is purely for user visibility - it has no effect on whether the injection works.

## Recommendations

1. **No changes needed** to the core injection mechanism - it's working correctly.

2. **Consider adding UI visibility**: A "Current Injection Preview" section in settings could help users understand what's being injected.

3. **Timing consideration**: If injection isn't working, check:
   - Is `storage.injection.enabled` set to `true`?
   - Are there actual summaries in storage?
   - Is `injectSummaries()` being called before context generation?

4. **Event timing**: The `GENERATION_AFTER_COMMANDS` event fires after slash commands but before the actual generation. This is the right time to ensure injection is up-to-date. The built-in memory extension also listens to `CHARACTER_MESSAGE_RENDERED` with `makeLast` to ensure it runs after other handlers.

## Debugging Tips

Add these debug calls to verify injection is working:

```javascript
// After calling setExtensionPrompt
const context = getContext();
console.log('[CFM] Extension prompts:', context.extensionPrompts);
console.log('[CFM] Our prompt:', context.extensionPrompts['cacheFriendlyMemory']);
```

## Conclusion

The `setExtensionPrompt` mechanism is simple and direct:
- No registration or "slot creation" required
- Just call the function with your unique key and prompt content
- SillyTavern automatically includes it in context generation
- Clear by setting empty string

Our implementation is correct. If injection isn't working, the issue is likely in:
- The `injection.enabled` setting
- The presence of actual summary content
- The timing of when `injectSummaries()` is called
