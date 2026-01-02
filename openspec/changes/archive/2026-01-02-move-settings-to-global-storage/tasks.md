## 1. Storage Layer Updates
- [ ] 1.1 Add injection settings to `defaultSettings` in `src/constants.js`
- [ ] 1.2 Remove `enabled` and `injection` from `initializeStorage()` in `src/storage.js`
- [ ] 1.3 Update `getInjectionSetting()` to read from `extension_settings[METADATA_KEY].injection`
- [ ] 1.4 Update `setInjectionSetting()` to write to `extension_settings[METADATA_KEY].injection`
- [ ] 1.5 Remove `getChatSetting()` function from `src/storage.js`
- [ ] 1.6 Remove `setChatSetting()` function from `src/storage.js`

## 2. Core Logic Updates
- [ ] 2.1 Update `src/injection.js` to read injection settings from `getGlobalSetting()` and `getInjectionSetting()`
- [ ] 2.2 Update `src/interceptor.js` to read injection settings from `getGlobalSetting()` and `getInjectionSetting()`
- [ ] 2.3 Update `src/events.js` to read injection settings from `getGlobalSetting()` and `getInjectionSetting()`

## 3. UI Updates
- [ ] 3.1 Add injection settings UI controls to `templates/settings.html`:
  - [ ] 3.1.1 Add dropdown for injection position (IN_PROMPT, IN_CHAT, BEFORE_PROMPT)
  - [ ] 3.1.2 Add number input for injection depth (0-10)
  - [ ] 3.1.3 Add checkbox for injection scan (enable/disable)
  - [ ] 3.1.4 Add dropdown for injection role (system, user, assistant)
- [ ] 3.2 Add UI handlers in `ui/settings.js` for new injection settings controls
- [ ] 3.3 Update existing injection enabled checkbox handler in `ui/settings.js` to use updated functions
- [ ] 3.4 Update `updateUI()` function in `ui/settings.js` to set values for all injection controls

## 4. Validation
- [ ] 4.1 Write unit tests for updated storage functions
- [ ] 4.2 Test with new chats (no metadata)
- [ ] 4.3 Verify injection settings persist across page reloads
- [ ] 4.4 Verify injection settings apply to all chats
- [ ] 4.5 Run full test suite and ensure all tests pass
- [ ] 4.6 Run `npm run lint` and ensure no errors
