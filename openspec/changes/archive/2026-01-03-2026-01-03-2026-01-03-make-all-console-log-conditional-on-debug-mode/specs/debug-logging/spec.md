# debug-logging Specification Delta

## MODIFIED Requirements

### Requirement: Console Logging Controlled by Debug Mode
The system SHALL control all informational console logging based on the `debugMode` setting, while always logging errors and warnings.

#### Scenario: All console.log suppressed when debug mode disabled
- **GIVEN** CacheFriendlyMemory is initialized
- **AND** debug mode is disabled in settings (debugMode = false)
- **WHEN** any operation occurs that generates console.log statements
  - Including: initialization, compaction, injection, interception, storage operations, metadata operations, events
- **THEN** no console.log statements are called
- **AND** console.error statements are still called for errors
- **AND** console.warn statements are still called for warnings

#### Scenario: All console.log visible when debug mode enabled
- **GIVEN** CacheFriendlyMemory is initialized
- **AND** debug mode is enabled in settings (debugMode = true)
- **WHEN** any operation occurs that generates console.log statements
- **THEN** all console.log statements are called with appropriate information
- **AND** console.error statements are still called for errors
- **AND** console.warn statements are still called for warnings

## ADDED Requirements

### Requirement: Initialization Logging
The system SHALL log initialization messages only when debug mode is enabled.

#### Scenario: Initialization logging when debug enabled
- **GIVEN** debug mode is enabled
- **WHEN** CacheFriendlyMemory initializes
- **THEN** console.log is called with "Removed deprecated settings: [keys]" if deprecated settings exist
- **AND** console.log is called with "Already initialized" if already initialized
- **AND** console.log is called with "Module initialized" on successful initialization

#### Scenario: Initialization logging when debug disabled
- **GIVEN** debug mode is disabled
- **WHEN** CacheFriendlyMemory initializes
- **THEN** no console.log statements are called
- **AND** initialization completes successfully

### Requirement: Compaction Logging
The system SHALL log compaction progress information only when debug mode is enabled.

#### Scenario: Compaction logging when debug enabled
- **GIVEN** debug mode is enabled
- **AND** there are messages to compact
- **WHEN** performCompaction() executes
- **THEN** console.log is called with "Starting compaction"
- **AND** console.log is called with total message count
- **AND** console.log is called with unsummarized message count
- **AND** console.log is called with storage statistics
- **AND** console.log is called with target messages to compact
- **AND** console.log is called for each chunk being compressed
- **AND** console.log is called when marking messages as summarized
- **AND** console.log is called when summary is created
- **AND** console.log is called with final statistics
- **AND** console.log is called when compaction completes

#### Scenario: Compaction logging when debug disabled
- **GIVEN** debug mode is disabled
- **AND** there are messages to compact
- **WHEN** performCompaction() executes
- **THEN** no console.log statements are called
- **AND** compaction completes successfully

### Requirement: Injection Logging
The system SHALL log injection process information only when debug mode is enabled, except for manually-invoked debug functions.

#### Scenario: Injection logging when debug enabled
- **GIVEN** debug mode is enabled
- **WHEN** injectSummaries() executes
- **THEN** console.log is called with "injectSummaries() - START"
- **AND** console.log is called with storage and injection enabled status
- **AND** console.log is called when injection is disabled or no storage
- **AND** console.log is called when no summaries exist
- **AND** console.log is called with storage state information
- **AND** console.log is called with level 3 summary status
- **AND** console.log is called with level 2 summaries count
- **AND** console.log is called with level 1 summaries count
- **AND** console.log is called with summary text length
- **AND** console.log is called with injection parameters
- **AND** console.log is called when summaries are injected
- **AND** console.log is called with verification information

#### Scenario: Injection logging when debug disabled
- **GIVEN** debug mode is disabled
- **WHEN** injectSummaries() executes
- **THEN** no console.log statements are called
- **AND** injection completes successfully

#### Scenario: Manual debug function always works
- **GIVEN** debug mode is disabled
- **WHEN** window.cfmDebugInjection() is called from browser console
- **THEN** console.log statements in debugInjection() are always called
- **AND** extension_prompts information is displayed

### Requirement: Interceptor Logging
The system SHALL log context interceptor information only when debug mode is enabled.

#### Scenario: Interceptor logging when debug enabled
- **GIVEN** debug mode is enabled
- **WHEN** cacheFriendlyMemoryInterceptor() executes
- **THEN** console.log is called with "Interceptor START" and type
- **AND** console.log is called when no storage available
- **AND** console.log is called when injection disabled
- **AND** console.log is called when no summaries exist
- **AND** console.log is called before and after injectSummaries()
- **AND** console.log is called with IGNORE_SYMBOL
- **AND** console.log is called with message scanning range
- **AND** console.log is called for each ignored message
- **AND** console.log is called with completion summary

#### Scenario: Interceptor logging when debug disabled
- **GIVEN** debug mode is disabled
- **WHEN** cacheFriendlyMemoryInterceptor() executes
- **THEN** no console.log statements are called
- **AND** interceptor completes successfully

### Requirement: Storage Logging
The system SHALL log storage operation information only when debug mode is enabled.

#### Scenario: Storage logging when debug enabled
- **GIVEN** debug mode is enabled
- **WHEN** getChatStorage() executes
- **THEN** console.log is called with totalMessages count
- **AND** console.log is called with summarizedMessages count
- **AND** console.log is called with "Toast message type: message" when toast is unavailable

#### Scenario: Storage logging when debug disabled
- **GIVEN** debug mode is disabled
- **WHEN** getChatStorage() executes
- **THEN** no console.log statements are called
- **AND** storage operations complete successfully

### Requirement: Message Metadata Logging
The system SHALL log message metadata operations only when debug mode is enabled.

#### Scenario: Metadata logging when debug enabled
- **GIVEN** debug mode is enabled
- **WHEN** markMessageSummarized() executes
- **THEN** console.log is called with message.mes_id, level, and summaryId
- **AND** console.log is called with message.extra structure

#### Scenario: Metadata logging when debug disabled
- **GIVEN** debug mode is disabled
- **WHEN** markMessageSummarized() executes
- **THEN** no console.log statements are called
- **AND** metadata operations complete successfully

### Requirement: Event Logging
The system SHALL log event handler information only when debug mode is enabled.

#### Scenario: Event logging when debug enabled
- **GIVEN** debug mode is enabled
- **WHEN** any event handler executes (CHAT_CHANGED, MESSAGE_RECEIVED, USER_MESSAGE_RENDERED, CHARACTER_MESSAGE_RENDERED, GENERATION_AFTER_COMMANDS, GENERATE_BEFORE_COMBINE_PROMPTS)
- **THEN** console.log is called with event name and relevant information
- **AND** for GENERATE_BEFORE_COMBINE_PROMPTS: console.log is called with extension_prompts keys and verification information

#### Scenario: Event logging when debug disabled
- **GIVEN** debug mode is disabled
- **WHEN** any event handler executes
- **THEN** no console.log statements are called
- **AND** event handlers complete successfully

### Requirement: Settings UI Logging
The system SHALL log settings UI operations only when debug mode is enabled.

#### Scenario: Settings logging when debug enabled
- **GIVEN** debug mode is enabled
- **WHEN** settings UI operations occur (load, profile events, etc.)
- **THEN** console.log is called with "Settings loaded"
- **AND** console.log is called when profile operations occur (deletion, creation, update)
- **AND** console.log is called with UI state information in updateUI()
- **AND** console.log is called when prompt settings change

#### Scenario: Settings logging when debug disabled
- **GIVEN** debug mode is disabled
- **WHEN** settings UI operations occur
- **THEN** no console.log statements are called
- **AND** UI operations complete successfully

### Requirement: Error and Warning Logging Always Visible
The system SHALL always log errors and warnings regardless of debug mode setting.

#### Scenario: Errors always visible
- **GIVEN** debug mode is disabled
- **WHEN** an error occurs (e.g., save failure, missing storage, profile switch failure)
- **THEN** console.error is called with error information
- **AND** error is visible in browser console

#### Scenario: Warnings always visible
- **GIVEN** debug mode is disabled
- **WHEN** a warning condition occurs (e.g., no storage available, no summaries, failed to get settings)
- **THEN** console.warn is called with warning information
- **AND** warning is visible in browser console
