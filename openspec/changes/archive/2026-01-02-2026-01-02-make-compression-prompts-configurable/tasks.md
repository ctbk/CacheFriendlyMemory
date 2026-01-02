## 1. Core Settings Updates
- [x] 1.1 Add `level1Prompt` default to `defaultSettings` in `src/constants.js`
- [x] 1.2 Extract default Level 1 prompt string to constants file for re-use

## 2. Prompt Loading Updates
- [x] 2.1 Update `loadCompressionPrompt()` in `src/prompts.js` to read from settings with fallback to default

## 3. UI Template Updates
- [x] 3.1 Add collapsible "Compression Prompt" section to `templates/settings.html`
- [x] 3.2 Add textarea for Level 1 prompt with label and description
- [x] 3.3 Add "Restore Default" button for the prompt
- [x] 3.4 Style textarea with appropriate height (8-10 lines) and monospace font

## 4. Settings Handler Updates
- [x] 4.1 Add prompt textarea change handler in `ui/settings.js`
- [x] 4.2 Implement validation to warn when prompt is empty after change
- [x] 4.3 Add "Restore Prompt Default" button handler
- [x] 4.4 Update `updateUI()` function to populate prompt textarea from settings
- [x] 4.5 Add prompt value to debug mode logging (if debug enabled)

## 5. Validation
- [x] 5.1 Write unit tests for `loadCompressionPrompt()` with empty settings
- [x] 5.2 Write unit tests for `loadCompressionPrompt()` with custom settings
- [x] 5.3 Test UI with empty prompt (should show warning)
- [x] 5.4 Test UI with custom prompt (should save and persist)
- [x] 5.5 Test restore default functionality
- [x] 5.6 Verify compression works with custom prompt
- [x] 5.7 Verify compression works with empty setting (falls back to default)
- [x] 5.8 Run full test suite and ensure all tests pass
- [x] 5.9 Run `npm run lint` and ensure no errors
