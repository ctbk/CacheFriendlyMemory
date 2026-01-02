# prompts Specification

## Purpose
TBD - created by archiving change 2026-01-02-make-compression-prompts-configurable. Update Purpose after archive.
## Requirements
### Requirement: Level 1 Prompt in Global Settings
The system SHALL store the Level 1 compression prompt in `extension_settings.cacheFriendlyMemory.level1Prompt`.

#### Scenario: Prompt stored globally
- **GIVEN** the extension is initialized
- **WHEN** user views extension settings
- **THEN** there is a `level1Prompt` string containing the compression prompt
- **AND** prompt applies to all chats

#### Scenario: Default prompt applied
- **GIVEN** extension is newly installed or settings are reset
- **WHEN** settings are initialized
- **THEN** `level1Prompt` contains the default compression prompt
- **AND** default prompt matches the current hardcoded `loadCompressionPrompt()` exactly

### Requirement: Prompt Setting UI
The system SHALL provide UI controls for editing the Level 1 compression prompt.

#### Scenario: Prompt editing controls exist
- **GIVEN** the extension settings panel is open
- **WHEN** user views the Compression Prompt section
- **THEN** there is a textarea for the Level 1 prompt
- **AND** there is a "Restore Default" button

#### Scenario: Edit prompt via UI
- **GIVEN** the extension settings panel is open
- **AND** user has modified the prompt textarea
- **WHEN** user changes focus or saves settings
- **THEN** the modified prompt is saved to `extension_settings.cacheFriendlyMemory.level1Prompt`
- **AND** the change persists across page reloads

#### Scenario: Validation for empty prompt
- **GIVEN** the extension settings panel is open
- **WHEN** user clears the prompt textarea (empty string)
- **THEN** a warning is displayed indicating the prompt is empty
- **AND** the prompt setting is still saved
- **AND** compression uses default prompt when setting is empty

#### Scenario: Restore prompt default
- **GIVEN** the extension settings panel is open
- **AND** user has modified the prompt
- **WHEN** user clicks "Restore Default" button
- **THEN** the prompt is reset to its default value
- **AND** setting is saved to `extension_settings.cacheFriendlyMemory.level1Prompt`
- **AND** UI textarea displays the default prompt

### Requirement: Prompt Loading with Fallback
The system SHALL load the Level 1 prompt from settings with fallback to default value.

#### Scenario: Load prompt from settings
- **GIVEN** user has customized the prompt and saved it
- **WHEN** compression is triggered
- **THEN** the customized prompt from settings is used
- **AND** the prompt is not the default template

#### Scenario: Fallback to default when empty
- **GIVEN** prompt setting exists but is empty string in settings
- **WHEN** compression is triggered
- **THEN** the default prompt template is used
- **AND** compression proceeds normally

#### Scenario: Fallback to default when missing
- **GIVEN** prompt setting does not exist in settings
- **WHEN** compression is triggered
- **THEN** the default prompt template is used
- **AND** compression proceeds normally

### Requirement: Compression Prompt Function
The system SHALL provide a function to load the Level 1 compression prompt.

#### Scenario: Load Level 1 prompt
- **WHEN** code calls `loadCompressionPrompt()`
- **THEN** function returns prompt from `extension_settings.cacheFriendlyMemory.level1Prompt`
- **AND** function returns default prompt if setting is missing or empty

