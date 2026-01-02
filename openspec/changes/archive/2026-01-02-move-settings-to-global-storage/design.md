## Context
Extension settings are currently duplicated between global storage (`extension_settings.cacheFriendlyMemory`) and per-chat metadata (`chat_metadata.cacheFriendlyMemory`). This causes:
- Increased chat file size
- Data duplication
- Confusion about where settings are stored
- Inconsistent behavior across chats

The `injection` settings (`enabled`, `position`, `depth`, `scan`, `role`) are user preferences that should apply globally, not per-chat. Similarly, `enabled` is already in global settings but also redundantly in chat metadata.

## Goals / Non-Goals
**Goals:**
- Move all user-configurable settings to global storage
- Reduce chat file size by removing redundant settings
- Simplify code by removing fallback behavior

**Non-Goals:**
- Moving per-chat data (summaries, stats, indices) - these must stay in chat metadata
- Changing injection behavior or functionality
- Changing UI appearance

## Decisions

### Decision 1: Storage Location
Store all injection settings in `extension_settings.cacheFriendlyMemory.injection` object:
```javascript
extension_settings.cacheFriendlyMemory = {
    enabled: true,
    autoCompact: true,
    // ... other global settings
    injection: {
        enabled: true,
        position: 0,  // IN_PROMPT
        depth: 0,
        scan: true,
        role: 'system'
    }
}
```

**Rationale:**
- Consistent with SillyTavern's extension settings pattern
- Settings apply globally to all chats
- Users don't need to configure injection separately per-chat

**Alternatives considered:**
- Flatten injection settings into top-level global object
  - Rejected: Keeps related settings grouped, clearer organization

### Decision 2: Remove Fallback Functions
Remove `getChatSetting()` and `setChatSetting()` functions that check chat metadata first, then fall back to global.

**Rationale:**
- Confusing behavior - developers don't know where data is stored
- Eliminates data duplication at source
- Clearer separation: global vs per-chat

**Alternatives considered:**
- Keep functions but make them only read global
  - Rejected: Misleading function name, better to use explicit `getGlobalSetting()`

### Decision 4: Update Existing Functions
Rename `getInjectionSetting()` and `setInjectionSetting()` but keep them as they provide a clean API for accessing nested injection object.

**Rationale:**
- Maintain backward compatibility for code using these functions
- Clean API for accessing nested object
- No breaking changes for code using these specific functions

**Alternatives considered:**
- Inline injection setting access everywhere
  - Rejected: Less maintainable, more code duplication
- Require all callers to use `getGlobalSetting('injection.position')`
  - Rejected: Verbose, existing code already uses these functions

## Risks / Trade-offs

### Risk: Breaking changes for extensions
Other code might import and use `getChatSetting()`/`setChatSetting()`.

**Mitigation:**
- No other known extensions import this code
- Document removal in CHANGELOG
- Search codebase for usages before removal (none found)

## Implementation Plan

### Implementation Steps
1. Add injection settings to `defaultSettings`
2. Remove `enabled` and `injection` from `initializeStorage()`
3. Update `getInjectionSetting()`/`setInjectionSetting()` to use global
4. Update all code reading injection settings
5. Update UI handlers
6. Remove `getChatSetting()`/`setChatSetting()`
7. Test and validate

### Testing Strategy
- Unit tests for updated storage functions
- Test with new chats (no metadata)
- Manual testing with real SillyTavern instance
- Verify settings persist across reloads
- Verify settings apply to all chats

## Open Questions
None identified. Requirements are clear.
