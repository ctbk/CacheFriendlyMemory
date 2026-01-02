## 1. Remove Deprecated Settings

- [ ] 1.1 Remove `compressionModel` and `compressionPreset` from `defaultSettings` in `src/constants.js`
- [ ] 1.2 Remove migration logic to clear old settings from `extension_settings` on extension load
- [ ] 1.3 Add console log when old settings are detected and removed

## 2. Update Settings UI

- [ ] 2.1 Remove "Compression Model" text input from `templates/settings.html` (lines 56-58)
- [ ] 2.2 Remove "Compression Preset" text input from `templates/settings.html` (lines 59-62)
- [ ] 2.3 Add dropdown `<select id="cfm_compressionProfile">` to settings template
- [ ] 2.4 Add `<None>` option as default value
- [ ] 2.5 Label dropdown as "Compression Profile"

## 3. Implement Profile Selection Logic

- [ ] 3.1 Create helper function to load connection profiles from `extension_settings.connectionManager.profiles`
- [ ] 3.2 Implement `bindCompressionProfileDropdown()` in `ui/settings.js`
- [ ] 3.3 Populate dropdown options from available profiles (use profile `id` as value, `name` as text)
- [ ] 3.4 Handle dropdown change events: save profile ID to settings via `setGlobalSetting()`
- [ ] 3.5 Implement `updateCompressionProfileUI()` to restore saved selection
- [ ] 3.6 Add connection profile ID to default settings (default: `null` or empty string)
- [ ] 3.7 Test dropdown displays profiles correctly
- [ ] 3.8 Test selection persists across page reload

## 4. Add Event Listeners for Profile Changes

- [ ] 4.1 Register listener for `CONNECTION_PROFILE_DELETED` event
- [ ] 4.2 On profile deletion, clear deleted profile from compression profile setting
- [ ] 4.3 Register listener for `CONNECTION_PROFILE_CREATED` event
- [ ] 4.4 On profile creation, refresh dropdown options
- [ ] 4.5 Register listener for `CONNECTION_PROFILE_UPDATED` event
- [ ] 4.6 On profile update, refresh dropdown options if selected profile changed
- [ ] 4.7 Test dropdown updates when profiles are added/removed in Connection Manager

## 5. Modify Compression Logic

- [ ] 5.1 Create helper `applyProfileSwitch(profileId)` in `src/compression.js`
- [ ] 5.2 Implement profile switching using SlashCommandParser's `/profile` command or direct API call
- [ ] 5.3 Store current profile ID before switching
- [ ] 5.4 Modify `compressChunk()` to call profile switch before `generateQuietPrompt()`
- [ ] 5.5 Add try/finally block to ensure profile restoration
- [ ] 5.6 Handle case where compression profile ID is `null` (skip switching)
- [ ] 5.7 Handle case where compression profile equals current profile (skip switching)
- [ ] 5.8 Handle missing/deleted profile (log warning, use current profile)
- [ ] 5.9 Test compression uses correct model when profile differs
- [ ] 5.10 Test original profile is restored after compression
- [ ] 5.11 Test profile restoration on compression failure

## 6. Update Status Display (if applicable)

- [ ] 6.1 Add compression profile display to status section in `templates/settings.html`
- [ ] 6.2 Implement `refreshCompressionProfileStatus()` in `ui/settings.js`
- [ ] 6.3 Display selected profile name (or "Current" if `<None>` selected)
- [ ] 6.4 Test status updates when profile selection changes

## 7. Add Migration and Cleanup

- [ ] 7.1 Add migration function `migrateDeprecatedSettings()` called on extension load
- [ ] 7.2 Check for existence of `compressionModel` or `compressionPreset` in settings
- [ ] 7.3 Remove old settings if found and log migration message
- [ ] 7.4 Test migration clears old settings correctly
- [ ] 7.5 Test fresh install (no old settings) works correctly

## 8. Write Tests

- [ ] 8.1 Write unit test for profile dropdown population
- [ ] 8.2 Write unit test for profile selection saving
- [ ] 8.3 Write unit test for profile switching logic (mock Connection Manager)
- [ ] 8.4 Write unit test for profile restoration on failure
- [ ] 8.5 Write unit test for migration logic
- [ ] 8.6 Run `npm run lint` and fix any issues
- [ ] 8.7 Run `npm test -- --run` and verify all tests pass

## 9. Documentation

- [ ] 9.1 Add entry to CHANGELOG.md describing breaking change
- [ ] 9.2 Update README.md with connection profile configuration instructions
- [ ] 9.3 Add migration note for users with existing settings
- [ ] 9.4 Update AGENTS.md if any code conventions changed

## 10. Validation

- [ ] 10.1 Test in fresh SillyTavern installation
- [ ] 10.2 Test with existing CacheFriendlyMemory settings (migration path)
- [ ] 10.3 Test compression with different profile selected
- [ ] 10.4 Test compression with `<None>` selected
- [ ] 10.5 Test compression failure and profile restoration
- [ ] 10.6 Test Connection Manager profile changes reflect in dropdown
- [ ] 10.7 Verify no console errors during normal operation
- [ ] 10.8 Verify settings persist across page reloads
- [ ] 10.9 Verify debug mode logs profile switching actions
