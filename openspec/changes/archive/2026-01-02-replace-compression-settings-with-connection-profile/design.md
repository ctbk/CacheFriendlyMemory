## Context
CacheFriendlyMemory currently uses two text input fields (`compressionModel` and `compressionPreset`) that are intended to specify which model and preset should be used for compression. However, SillyTavern already has a robust Connection Manager extension that:
- Stores connection profiles with API, model, preset, server URL, and other settings
- Provides slash commands (`/profile`) to switch profiles
- Emits events when profiles change (`CONNECTION_PROFILE_LOADED`)
- Integrates with `generateQuietPrompt()` which uses the current connection settings

The current text inputs are disconnected from SillyTavern's profile system, requiring users to manually maintain duplicate configuration.

## Goals / Non-Goals
- Goals:
  - Use SillyTavern's connection profiles for compression configuration
  - Remove redundant text input fields
  - Maintain user ability to use a different profile for compression than for chat generation
  - Ensure original profile is restored after compression
- Non-Goals:
  - Change how Connection Manager works (use existing API)
  - Create new profile management UI (reuse existing Connection Manager)
  - Support legacy text input format (breaking change is acceptable in alpha)

## Decisions

### Decision 1: Profile Selection Dropdown
Use a dropdown populated from `extension_settings.connectionManager.profiles` rather than text inputs.

**Rationale:** Dropdown ensures valid profile selection, integrates with existing profiles, prevents typos, and provides better UX than free-form text.

**Alternatives considered:**
- Keep text inputs but validate against connection profiles: More complex, doesn't solve duplication issue
- Add profile name text field: Still error-prone, requires manual entry

### Decision 2: Temporary Profile Switching
When compression runs, temporarily switch to the selected profile (if different from current), call `generateQuietPrompt()`, then restore the original profile.

**Rationale:** `generateQuietPrompt()` uses the currently active connection settings. Switching profiles temporarily allows using a different model for compression without permanently changing user's chat settings. This follows the pattern used by other extensions (e.g., memory extension).

**Alternatives considered:**
- Pass model/preset to `generateQuietPrompt()`: Not supported by API
- Clone connection settings into temporary state: Risky, may break state management
- Always use current profile: Loses ability to use specialized compression model

### Decision 3: Store Profile ID, Not Name
Save the profile's unique `id` field to settings, not the human-readable `name`.

**Rationale:** Profile names can change, but IDs are stable UUIDs. Storing ID prevents breaking settings if users rename profiles.

**Alternatives considered:**
- Store profile name: Breaks if user renames profile
- Store profile object: Bloated settings, doesn't sync with Connection Manager changes

### Decision 4: Handle Missing/Deleted Profiles
If a selected profile is deleted or not found, default to using the current profile and log a warning.

**Rationale:** Graceful degradation prevents compaction failures. Users can reselect a valid profile in settings.

**Alternatives considered:**
- Block compaction with error: Too disruptive
- Auto-delete from settings: Confusing if profiles are temporarily unavailable

## Risks / Trade-offs

### Risk 1: Profile Switching Race Condition
If multiple compressions run concurrently, profile switching could interfere.

**Mitigation:** Compaction is already serial (triggered by message count, context threshold, or manual trigger). No concurrent execution expected.

### Risk 2: Profile Switch Fails
If profile switch fails mid-compaction, original profile may not be restored.

**Mitigation:** Use try/finally block to ensure restoration always happens, even on failure. Log errors for debugging.

### Trade-off 1: Breaking Change
Users with existing `compressionModel` and `compressionPreset` settings will lose them.

**Mitigation:** Project is in alpha stage; breaking changes acceptable. Add changelog entry and upgrade note.

### Trade-off 2: Requires Connection Manager
Feature only works if Connection Manager extension is enabled.

**Mitigation:** Connection Manager is core SillyTavern extension, always available. Graceful fallback to current profile if disabled.

## Migration Plan

### Steps
1. Remove `compressionModel` and `compressionPreset` from `defaultSettings` in `src/constants.js`
2. Remove corresponding UI elements from `templates/settings.html`
3. Add dropdown `<select id="cfm_compressionProfile">` to settings template
4. Implement profile loading logic in `ui/settings.js`:
   - Populate dropdown from `extension_settings.connectionManager.profiles`
   - Save selected profile ID to settings
   - Handle profile changes
5. Modify `src/compression.js`:
   - Read selected profile ID before compression
   - Switch to compression profile (if different from current)
   - Call `generateQuietPrompt()`
   - Restore original profile in finally block
6. Add tests for profile switching logic
7. Update CHANGELOG.md with breaking change notice

### Rollback
If issues arise, revert to previous code and restore text inputs. Settings can be manually recreated from backup or defaults.

## Implementation Notes

### Profile Switching Pseudocode
```javascript
async function compressChunk(messages) {
    const compressionProfileId = getGlobalSetting('compressionProfileId');
    const currentProfileId = extension_settings.connectionManager.selectedProfile;

    if (compressionProfileId && compressionProfileId !== currentProfileId) {
        const profile = extension_settings.connectionManager.profiles.find(p => p.id === compressionProfileId);
        if (profile) {
            await applyConnectionProfile(profile);
        }
    }

    try {
        return await generateQuietPrompt({ quietPrompt: prompt });
    } finally {
        if (compressionProfileId && compressionProfileId !== currentProfileId) {
            const originalProfile = extension_settings.connectionManager.profiles.find(p => p.id === currentProfileId);
            if (originalProfile) {
                await applyConnectionProfile(originalProfile);
            }
        }
    }
}
```

### Event Handling
- Listen for `CONNECTION_PROFILE_DELETED` event to clear deleted profile from settings
- Listen for `CONNECTION_PROFILE_UPDATED` event to refresh dropdown if selected profile changes
- Listen for `CONNECTION_PROFILE_CREATED` event to refresh dropdown

## Open Questions
None identified. The design leverages existing SillyTavern APIs and follows established patterns from other extensions.
