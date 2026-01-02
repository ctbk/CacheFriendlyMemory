# Change: Make Compression Prompts Configurable

## Why
Compression prompts are currently hardcoded in `src/prompts.js`, making it impossible for users to customize the summarization behavior without modifying source code. Users may want to:
- Adjust summarization style (e.g., more detailed vs. more concise)
- Add domain-specific guidelines for their roleplay genre
- Experiment with different prompt engineering approaches
- Translate prompts to other languages

## What Changes
- Add `level1Prompt` to global settings for user-customizable compression prompt
- Move default Level 1 prompt value from `src/prompts.js` to `src/constants.js` as default
- Update `loadCompressionPrompt()` in `src/prompts.js` to read from global settings with fallback to default
- Add UI control (textarea) in settings panel for editing the Level 1 prompt
- Add "Restore Defaults" button for the prompt to reset to original template
- Add validation to warn when prompt is empty

## Impact
- **Affected specs:** prompts, settings-ui
- **Affected code:**
  - `src/constants.js` - add prompt defaults
  - `src/prompts.js` - update to read from settings, add default prompt exports
  - `ui/settings.js` - add prompt setting handlers and restore defaults
  - `templates/settings.html` - add prompt editing UI section
- **Breaking changes:** None; prompt defaults to current hardcoded value
- **Note:** Level 2 and Level 3 prompts remain hardcoded in `src/prompts.js` for future implementation
