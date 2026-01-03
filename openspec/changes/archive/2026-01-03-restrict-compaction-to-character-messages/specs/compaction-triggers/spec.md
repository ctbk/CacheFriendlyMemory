# compaction-triggers Specification

## Purpose
This specification defines when compression should be triggered in the CacheFriendlyMemory extension.

## ADDED Requirements

### Requirement: Compaction triggers only after character messages
The system SHALL only trigger automatic compaction after character/bot messages are rendered, never after user messages.

#### Scenario: User message does not trigger compaction
- **GIVEN** auto-compaction is enabled
- **AND** the compactThreshold is set to a value (e.g., 120)
- **AND** the unsummarized message count is below the threshold (e.g., 119)
- **WHEN** a user message is submitted and rendered
- **THEN** compaction is NOT triggered
- **AND** the message is marked as active (compression level = null)

#### Scenario: Character message triggers compaction when threshold exceeded
- **GIVEN** auto-compaction is enabled
- **AND** the compactThreshold is set to 120
- **AND** the unsummarized message count is 119
- **WHEN** a character message is rendered (making total = 120)
- **THEN** compaction IS triggered
- **AND** the message is marked as active before compression check
- **AND** compression runs if thresholds are met

#### Scenario: Multiple user messages do not trigger compaction
- **GIVEN** auto-compaction is enabled
- **AND** the compactThreshold is set to 10
- **AND** the unsummarized message count is 5
- **WHEN** a user submits 6 messages in quick succession (total = 11)
- **THEN** compaction is NOT triggered after any of the user messages
- **AND** all messages are marked as active
- **AND** compression runs only after the next character message

#### Scenario: Context pressure trigger respects character-only timing
- **GIVEN** auto-compaction is enabled
- **AND** the contextThreshold is set to 75%
- **AND** the current context usage is 70%
- **WHEN** a user message is submitted that would push context to 80%
- **THEN** compaction is NOT triggered
- **AND** compression remains idle
- **WHEN** a character message is rendered (or the next character message)
- **THEN** compaction IS triggered if context usage >= 75%

#### Scenario: Manual compaction works independently of events
- **GIVEN** auto-compaction is enabled or disabled
- **WHEN** user executes `/cfm-compact` slash command
- **THEN** compaction runs immediately regardless of message type
- **AND** compaction does not wait for a character message
- **AND** message event timing does not affect manual compaction

### MODIFIED Requirement: MESSAGE_RECEIVED event marks messages active
The system SHALL mark messages as active when received, but shall not trigger compaction on MESSAGE_RECEIVED.

#### Scenario: MESSAGE_RECEIVED marks user message active
- **GIVEN** a user message is submitted
- **WHEN** the MESSAGE_RECEIVED event fires
- **THEN** the message is marked as active (compression level = null)
- **AND** compaction is NOT triggered

#### Scenario: MESSAGE_RECEIVED marks character message active
- **GIVEN** a character message is generated
- **WHEN** the MESSAGE_RECEIVED event fires
- **THEN** the message is marked as active (compression level = null)
- **AND** compaction is NOT triggered (wait for CHARACTER_MESSAGE_RENDERED)

### ADDED Requirement: CHARACTER_MESSAGE_RENDERED event triggers compaction
The system SHALL check for and trigger compaction in the CHARACTER_MESSAGE_RENDERED event handler after marking the message as active.

#### Scenario: Character message triggers compaction when conditions met
- **GIVEN** auto-compaction is enabled
- **AND** compaction conditions are met (thresholds exceeded)
- **WHEN** CHARACTER_MESSAGE_RENDERED event fires for a character message
- **THEN** the message is marked as active
- **AND** compaction is triggered
- **AND** compression performs normally
- **AND** summaries are injected after compression

#### Scenario: Character message does not trigger compaction when conditions not met
- **GIVEN** auto-compaction is enabled
- **AND** compaction conditions are NOT met (thresholds not exceeded)
- **WHEN** CHARACTER_MESSAGE_RENDERED event fires for a character message
- **THEN** the message is marked as active
- **AND** compaction is NOT triggered
- **AND** no compression occurs

#### Scenario: CHARACTER_MESSAGE_RENDERED with auto-compact disabled
- **GIVEN** auto-compaction is disabled (autoCompact = false)
- **WHEN** CHARACTER_MESSAGE_RENDERED event fires for a character message
- **THEN** the message is marked as active
- **AND** compaction is NOT triggered
- **AND** compression logic is skipped entirely

### ADDED Requirement: USER_MESSAGE_RENDERED event does not trigger compaction
The system SHALL mark user messages as active in USER_MESSAGE_RENDERED but shall not trigger compaction.

#### Scenario: USER_MESSAGE_RENDERED marks message active without compaction
- **GIVEN** a user message is submitted
- **WHEN** USER_MESSAGE_RENDERED event fires
- **THEN** the message is marked as active (compression level = null)
- **AND** compaction is NOT checked
- **AND** compaction does NOT run

### ADDED Requirement: Compaction preserves existing logic
The compaction triggering logic itself (thresholds, context pressure) SHALL remain unchanged except for the event timing.

#### Scenario: Message count threshold works correctly
- **GIVEN** auto-compaction is enabled
- **AND** compactThreshold is 120
- **WHEN** unsummarizedCount >= 120 after a character message
- **THEN** compaction is triggered
- **AND** compression logic operates as before

#### Scenario: Context threshold works correctly
- **GIVEN** auto-compaction is enabled
- **AND** contextThreshold is 75%
- **WHEN** context percentage >= 75% after a character message
- **THEN** compaction is triggered
- **AND** compression logic operates as before
