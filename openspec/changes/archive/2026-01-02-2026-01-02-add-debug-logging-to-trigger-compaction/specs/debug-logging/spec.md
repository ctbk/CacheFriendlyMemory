## ADDED Requirements

### Requirement: Debug Logging for triggerCompaction Calls
The system SHALL log debug information when `triggerCompaction()` is called, but only when debug mode is enabled in the settings.

#### Scenario: Logs appear when debug mode is enabled
- **GIVEN** CacheFriendlyMemory is initialized
- **AND** debug mode is enabled in settings (debugMode = true)
- **WHEN** `triggerCompaction()` is called
- **THEN** console.log is called with debug information
- **AND** the log message is prefixed with '[CacheFriendlyMemory] DEBUG -'
- **AND** the log shows function entry with input parameters
- **AND** the log shows function exit with return value

#### Scenario: Logs do not appear when debug mode is disabled
- **GIVEN** CacheFriendlyMemory is initialized
- **AND** debug mode is disabled in settings (debugMode = false)
- **WHEN** `triggerCompaction()` is called
- **THEN** no debug console.log is called
- **AND** normal console.warn/console.log for errors/warnings still appears

#### Scenario: Log shows input parameters
- **GIVEN** debug mode is enabled
- **WHEN** `triggerCompaction()` is called
- **THEN** the debug log includes an object with all input parameters
- **AND** the object contains:
  - `unsummarizedCount`: number of unsummarized messages
  - `contextSize`: maximum context token limit
  - `currentContext`: current context usage
  - `compactThreshold`: message count threshold
  - `contextThreshold`: context percentage threshold
  - `autoCompact`: whether auto-compaction is enabled

#### Scenario: Log shows return value
- **GIVEN** debug mode is enabled
- **WHEN** `triggerCompaction()` returns true
- **THEN** the debug log shows "triggerCompaction() returning: true"
- **WHEN** `triggerCompaction()` returns false
- **THEN** the debug log shows "triggerCompaction() returning: false"

#### Scenario: Function behavior unchanged
- **GIVEN** CacheFriendlyMemory is initialized
- **WHEN** `triggerCompaction()` is called with specific inputs
- **THEN** the function returns the same value regardless of debug mode setting
- **AND** the function does not modify any input parameters
- **AND** the function does not change storage or settings
