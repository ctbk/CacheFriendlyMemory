# Change: Replace Compression Settings with Connection Profile Dropdown

## Why
The current "Compression Model" and "Compression Preset" text fields are redundant with SillyTavern's built-in connection profile system. Users already configure models and presets in the Connection Manager extension, and these settings are automatically used by `generateQuietPrompt()`. The manual entry fields are error-prone and don't integrate with SillyTavern's profile management.

## What Changes
- **BREAKING**: Remove "Compression Model" and "Compression Preset" text inputs from settings
- Add dropdown to select from SillyTavern connection profiles
- When compression runs, temporarily switch to selected profile (if different from current), then restore original profile
- Save selected profile ID to global settings
- Update compaction logic to use connection profiles instead of manual model/preset settings

## Impact
- Affected specs: `settings/spec.md` (new spec for connection profile configuration)
- Affected code:
  - `src/constants.js` - Remove `compressionModel` and `compressionPreset` from defaults
  - `ui/settings.js` - Replace text input bindings with dropdown logic
  - `templates/settings.html` - Update UI to use dropdown
  - `src/compression.js` - Modify `compressChunk()` to use connection profile switching
  - `src/storage.js` - Update storage helper for profile ID
