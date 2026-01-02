## Context
The Level 1 compression prompt controls how the LLM summarizes chat history (10 messages → 1 short-term summary). Currently this prompt is hardcoded in `src/prompts.js` in the `loadCompressionPrompt()` function.

Users cannot customize the prompt without editing source code, which is:
- Inaccessible for non-technical users
- Reset when extension is updated
- Requires page reload to take effect
- No validation or safeguards against broken prompts

Level 2 and Level 3 prompts are also defined in `src/prompts.js` but are not used in the current implementation. This change only addresses Level 1 prompts for now.

## Goals / Non-Goals
**Goals:**
- Allow users to customize compression prompts through the UI
- Provide sensible defaults that match current hardcoded prompts
- Add validation to prevent empty prompts
- Allow easy restoration of default prompt values

**Non-Goals:**
- Making Level 2 or Level 3 prompts configurable (not currently used in compression)
- Adding prompt templates/variables beyond what currently exists (no new interpolation)
- Changing how prompts are used or the compression logic itself
- Adding A/B testing or prompt evaluation features

## Decisions

### Decision 1: Storage Location
Store Level 1 prompt in `extension_settings.cacheFriendlyMemory.level1Prompt`:
```javascript
extension_settings.cacheFriendlyMemory = {
    // ... other settings
    level1Prompt: 'You are a story summarizer...'  // Current default
}
```

**Rationale:**
- Prompt is a user preference that applies globally to all chats
- Consistent with existing settings pattern
- Flat structure is simpler than nested object for single prompt
- Allows prompt to be tested across different chats without re-entering

**Alternatives considered:**
- Store prompt in per-chat metadata
  - Rejected: Prompt is a global preference; storing per-chat increases file size unnecessarily
- Use nested object `prompts: { level1: '...' }` for future extensibility
  - Rejected: Over-engineering for single prompt; add nesting when multiple prompts are implemented

### Decision 2: UI Control Type
Use single `<textarea>` element for the Level 1 prompt.

**Rationale:**
- Prompt is multi-line text
- Textarea allows full visibility and easy editing
- Users can copy-paste prompts easily
- Familiar UI pattern for editing templates
- Single control reduces UI clutter

**Alternatives considered:**
- Code editor with syntax highlighting
  - Rejected: Overkill for plain text prompt; adds complexity
- Modal for editing prompt
  - Rejected: Textarea in settings panel is simpler and more accessible

### Decision 3: Validation Strategy
Validate prompt is non-empty when saved via UI, but allow empty prompt to load from storage (fallback to default).

**Rationale:**
- Prevents user from accidentally clearing the prompt and breaking compression
- Graceful fallback ensures system always works even if storage is corrupted
- Non-blocking validation: don't prevent save, show warning instead

**Alternatives considered:**
- Block save if prompt is empty
  - Rejected: Too restrictive; user might be in middle of editing
- No validation at all
  - Rejected: Too easy to break compression by accident

### Decision 4: Default Prompt Management
Add "Restore Default" button specifically for the Level 1 prompt.

**Rationale:**
- Users often experiment with prompts and want to return to known-good default
- Separate from global "Restore Defaults" to avoid resetting other settings
- Clears the way for future prompt features (presets, sharing, etc.)
- Level 2 and Level 3 prompts can be added to this section when those levels are implemented

**Alternatives considered:**
- No restore button (user would need to delete setting)
  - Rejected: Poor UX; user needs easy way to recover from broken prompts
- Integrate with global "Restore Defaults" button
  - Rejected: Would reset all settings, not just the prompt; user might only want to reset the prompt

## Risks / Trade-offs

### Risk: Malformed Prompts Breaking Compression
Users could create prompts that produce invalid summaries or fail completely.

**Mitigation:**
- Document prompt requirements in UI (what format to use)
- Provide working defaults that can be restored
- Log warnings when summaries are shorter than expected
- Consider adding prompt testing button in future (out of scope)

### Risk: UI Clutter
Adding a large textarea makes the settings panel longer.

**Mitigation:**
- Collapsible section for the prompt
- Use reasonable default height (e.g., 8-10 lines)
- Consider tabs for multiple prompts in future (when Level 2/3 are implemented)

### Risk: Localization
Default prompt is in English; non-English users might want to translate it.

**Mitigation:**
- Allow full editing, so users can provide their own translation
- Consider adding locale-specific defaults in future (out of scope)
- Document that prompts can be freely translated

## Implementation Plan

### Implementation Steps
1. Add `level1Prompt` default to `defaultSettings` in `constants.js`
2. Extract default prompt string from `prompts.js` to constants file (for re-use)
3. Update `loadCompressionPrompt()` to read from settings with fallback to default
4. Add prompt settings section to `settings.html` with collapsible container
5. Add UI handler in `settings.js` for prompt textarea
6. Add "Restore Default" button handler for the prompt
7. Add validation to warn about empty prompt
8. Test with empty, malformed, and custom prompts

### Testing Strategy
- Unit tests for `loadCompressionPrompt()` with empty settings
- Unit tests for `loadCompressionPrompt()` with custom settings
- Test UI with empty prompt (should show warning)
- Test UI with custom prompt (should save and persist)
- Test restore default (should reset to original)
- Test compression with custom prompt
- Verify default matches current hardcoded prompt exactly
- Run full test suite and ensure all tests pass

## Open Questions
None identified. Requirements are clear.
