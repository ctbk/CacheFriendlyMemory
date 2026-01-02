## ADDED Requirements

### Requirement: Connection Profile Selection
The system SHALL provide a dropdown menu in the extension settings to select a SillyTavern connection profile for use during chat history compression.

#### Scenario: Dropdown displays available profiles
- **GIVEN** SillyTavern Connection Manager has configured profiles
- **WHEN** user opens CacheFriendlyMemory settings
- **THEN** a dropdown menu displays all available connection profiles
- **AND** dropdown includes a `<None>` option to use current profile

#### Scenario: User selects compression profile
- **GIVEN** user is in CacheFriendlyMemory settings
- **WHEN** user selects a connection profile from the dropdown
- **THEN** the profile ID is saved to extension settings
- **AND** the setting persists across page reloads

#### Scenario: Handle missing connection profiles
- **GIVEN** a connection profile is selected for compression
- **WHEN** the profile is deleted from Connection Manager
- **THEN** the dropdown displays a warning or defaults to `<None>`
- **AND** compression uses the current profile instead

#### Scenario: Dropdown updates when profiles change
- **GIVEN** CacheFriendlyMemory settings are open
- **WHEN** a new connection profile is created or deleted in Connection Manager
- **THEN** the dropdown list updates to reflect current profiles
- **AND** if the selected profile was deleted, selection resets to `<None>`

### Requirement: Profile Switching During Compression
The system SHALL temporarily switch to the selected compression profile when generating summaries, then restore the original profile.

#### Scenario: Compression uses selected profile
- **GIVEN** user has selected a compression profile different from current
- **WHEN** compression is triggered (auto or manual)
- **THEN** system switches to the compression profile
- **AND** summary generation uses the compression profile's model and settings
- **AND** after compression completes, system restores the original profile

#### Scenario: No profile selected uses current
- **GIVEN** user has `<None>` selected for compression profile
- **WHEN** compression is triggered
- **THEN** system uses the currently active connection profile
- **AND** no profile switching occurs

#### Scenario: Original profile restored on failure
- **GIVEN** compression profile switching is in progress
- **WHEN** an error occurs during summary generation
- **THEN** system restores the original profile in finally block
- **AND** error is logged to console
- **AND** compression process continues gracefully

#### Scenario: Profile ID persists across sessions
- **GIVEN** user has selected a compression profile
- **WHEN** user reloads the page or restarts SillyTavern
- **THEN** the previously selected profile ID is loaded from settings
- **AND** if the profile still exists, it is pre-selected in the dropdown
- **AND** if the profile no longer exists, selection defaults to `<None>`

### Requirement: Legacy Settings Migration
The system SHALL handle migration from deprecated `compressionModel` and `compressionPreset` settings.

#### Scenario: Migrate existing settings on load
- **GIVEN** user has `compressionModel` or `compressionPreset` values in settings
- **WHEN** extension loads with new version
- **THEN** old settings are removed from configuration
- **AND** compression profile defaults to `<None>`
- **AND** user is informed via console log that settings were migrated

#### Scenario: No existing settings defaults to None
- **GIVEN** user is installing or upgrading without previous version settings
- **WHEN** extension loads
- **THEN** compression profile defaults to `<None>`
- **AND** no migration logic runs

## REMOVED Requirements

### Requirement: Manual Compression Model Configuration
**Reason:** Replaced by connection profile selection for better integration with SillyTavern.

**Migration:** Existing `compressionModel` settings are removed. Users must select a connection profile for compression configuration.

### Requirement: Manual Compression Preset Configuration
**Reason:** Replaced by connection profile selection for better integration with SillyTavern.

**Migration:** Existing `compressionPreset` settings are removed. Users must select a connection profile for compression configuration.
