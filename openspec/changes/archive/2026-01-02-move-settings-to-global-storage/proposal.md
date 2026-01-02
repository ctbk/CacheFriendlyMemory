# Change: Move Settings to Global Storage

## Why
Extension settings are currently stored in per-chat metadata, causing data duplication and increased chat file size. Settings like `enabled` and `injection` configuration (`position`, `depth`, `scan`, `role`) are user preferences that should apply globally across all chats, not stored per-chat.

## What Changes
- Move injection settings (`enabled`, `position`, `depth`, `scan`, `role`) from `chat_metadata.cacheFriendlyMemory.injection` to `extension_settings.cacheFriendlyMemory.injection`
- Remove duplicate `enabled` field from chat metadata (already exists in global settings)
- Remove `getChatSetting()` and `setChatSetting()` functions that create confusing fallback behavior
- Update all code reading injection settings to use `getGlobalSetting()` instead of `storage.injection`
- Add injection settings to `defaultSettings` in `constants.js`
- Add UI controls for all injection settings in settings panel (position, depth, scan, role)

## Impact
- **Affected specs:** storage, settings-ui, injection
- **Affected code:**
  - `src/constants.js` - add injection defaults
  - `src/storage.js` - remove from chat initialization, update `getInjectionSetting()`/`setInjectionSetting()`, remove `getChatSetting()`/`setChatSetting()`
  - `src/injection.js` - read from global settings
  - `src/interceptor.js` - read from global settings
  - `src/events.js` - read from global settings
  - `ui/settings.js` - add handlers for all injection settings controls
  - `templates/settings.html` - add UI controls for position, depth, scan, role
- **Breaking changes:** `getChatSetting()` and `setChatSetting()` functions removed; no backward compatibility for existing chats
