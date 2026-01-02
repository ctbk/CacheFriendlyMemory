## ADDED Requirements

### Requirement: Injection Settings UI Controls
The system SHALL provide UI controls in the extension settings panel for all injection settings.

#### Scenario: All injection settings have UI controls
- **GIVEN** the extension settings panel is open
- **WHEN** user views the Summary Injection section
- **THEN** there is a checkbox for injection enabled
- **AND** there is a dropdown for injection position (IN_PROMPT, IN_CHAT, BEFORE_PROMPT)
- **AND** there is a number input for injection depth (0-10)
- **AND** there is a checkbox for injection scan
- **AND** there is a dropdown for injection role (system, user, assistant)

#### Scenario: UI controls save to global settings
- **GIVEN** the extension settings panel is open
- **WHEN** user modifies any injection setting control
- **THEN** the value is saved to `extension_settings.cacheFriendlyMemory.injection`
- **AND** the change persists across page reloads

### Requirement: Injection Settings in Global Storage
The system SHALL store injection configuration settings in `extension_settings.cacheFriendlyMemory.injection` instead of per-chat metadata.

#### Scenario: Injection settings stored globally
- **GIVEN** the extension is initialized
- **WHEN** user configures injection settings (enabled, position, depth, scan, role)
- **THEN** settings are stored in `extension_settings.cacheFriendlyMemory.injection`
- **AND** settings apply to all chats

#### Scenario: Default injection settings applied
- **GIVEN** extension is newly installed
- **WHEN** user loads any chat
- **THEN** default injection settings are: `enabled: true`, `position: 0 (IN_PROMPT)`, `depth: 0`, `scan: true`, `role: 'system'`

### Requirement: No Settings Duplication
The system SHALL not store user-configurable settings in per-chat metadata.

#### Scenario: Enabled flag not duplicated
- **GIVEN** the extension is initialized
- **WHEN** new chat storage is created
- **THEN** `enabled` field is not in chat metadata
- **AND** `enabled` is only in `extension_settings.cacheFriendlyMemory`

#### Scenario: Injection object not in chat metadata
- **GIVEN** the extension is initialized
- **WHEN** new chat storage is created
- **THEN** `injection` object is not in chat metadata
- **AND** `injection` is only in `extension_settings.cacheFriendlyMemory`

## MODIFIED Requirements

### Requirement: Injection Setting Access
The system SHALL provide functions to read and write injection settings from global storage.

#### Scenario: Read injection setting
- **WHEN** code calls `getInjectionSetting('enabled')`
- **THEN** function returns `extension_settings.cacheFriendlyMemory.injection.enabled`
- **AND** function does not check chat metadata

#### Scenario: Write injection setting
- **WHEN** code calls `setInjectionSetting('enabled', false)`
- **THEN** function sets `extension_settings.cacheFriendlyMemory.injection.enabled = false`
- **AND** function calls `saveSettingsDebounced()`
- **AND** function does not modify chat metadata

## REMOVED Requirements

### Requirement: Chat Setting Fallback
**Reason:** Causing data duplication and confusion about where settings are stored. All settings should be explicitly global or per-chat, not both.

**Migration:** Code using `getChatSetting()` should use `getGlobalSetting()` for global settings or read directly from `chat_metadata[METADATA_KEY]` for per-chat data.

#### Scenario: Chat setting fallback behavior
- **REMOVED** Behavior where `getChatSetting(key)` checked chat metadata first, then fell back to global settings

### Requirement: Enabled in Chat Metadata
**Reason:** `enabled` is a global user preference and should not be duplicated in per-chat metadata.

#### Scenario: Enabled flag in chat storage
- **REMOVED** Behavior where `enabled` was stored in `chat_metadata.cacheFriendlyMemory.enabled`

### Requirement: Injection in Chat Metadata
**Reason:** Injection settings are global user preferences and should not be stored per-chat.

#### Scenario: Injection object in chat storage
- **REMOVED** Behavior where `injection` object was stored in `chat_metadata.cacheFriendlyMemory.injection`
