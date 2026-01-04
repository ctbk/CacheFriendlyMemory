# fake-summarizer Specification

## Purpose
TBD - created by archiving change 2026-01-03-enhance-fake-summarizer. Update Purpose after archive.
## Requirements
### Requirement: Multi-Line Output Format
The fake summarizer SHALL generate summaries with each message's content on a separate line.

#### Scenario: Generate multi-line summary
- **GIVEN** an array of message objects with `mes` fields
- **WHEN** `createFakeSummary(messages)` is called
- **THEN** the output contains one line per message
- **AND** each line is prefixed with `[messageIndex]`
- **AND** each line contains the first 25 words of that message

#### Scenario: Multi-line summary example
- **GIVEN** messages array with 3 messages
- **WHEN** `createFakeSummary(messages)` is called
- **THEN** output format is:
  ```
  [Test Compressed Chunk]
  [0] First 25 words from message 0...
  [1] First 25 words from message 1...
  [2] First 25 words from message 2...
  ```

### Requirement: First 25 Words Extraction
The fake summarizer SHALL extract exactly the first 25 words from each message.

#### Scenario: Extract first 25 words from long message
- **GIVEN** a message with more than 25 words
- **WHEN** `createFakeSummary(messages)` is called
- **THEN** only the first 25 words are included
- **AND** the 25 words are separated by single spaces

#### Scenario: Extract all words from short message
- **GIVEN** a message with 10 words
- **WHEN** `createFakeSummary(messages)` is called
- **THEN** all 10 words are included
- **AND** no truncation occurs

#### Scenario: Extract all words from single word message
- **GIVEN** a message with 1 word
- **WHEN** `createFakeSummary(messages)` is called
- **THEN** the single word is included
- **AND** the output line is `[X] word` (where X is index)

### Requirement: Fixed Header
The fake summarizer SHALL include a fixed header line "[Test Compressed Chunk]" to provide visual structure.

#### Scenario: Header format
- **GIVEN** any valid message array
- **WHEN** `createFakeSummary(messages)` is called
- **THEN** the first line is `[Test Compressed Chunk]`
- **AND** the header is always the same regardless of message count

### Requirement: Handle Empty and Missing Content
The fake summarizer SHALL handle messages with empty or missing `mes` fields gracefully.

#### Scenario: Empty message string
- **GIVEN** a message with `mes: ''` (empty string)
- **WHEN** `createFakeSummary(messages)` is called
- **THEN** the output line for that message is `[X]` (index only, no text)

#### Scenario: Whitespace-only message
- **GIVEN** a message with `mes: '   '` (spaces only)
- **WHEN** `createFakeSummary(messages)` is called
- **THEN** the output line for that message is `[X]` (index only, no text)

#### Scenario: Missing mes field
- **GIVEN** a message object without a `mes` field
- **WHEN** `createFakeSummary(messages)` is called
- **THEN** the output line for that message is `[X]` (index only, no text)

### Requirement: Handle Invalid Input
The fake summarizer SHALL return a placeholder for invalid input.

#### Scenario: Null input
- **GIVEN** `createFakeSummary(null)` is called
- **THEN** return `[Test Summary] No messages`

#### Scenario: Undefined input
- **GIVEN** `createFakeSummary(undefined)` is called
- **THEN** return `[Test Summary] No messages`

#### Scenario: Empty array input
- **GIVEN** `createFakeSummary([])` is called
- **THEN** return `[Test Summary] No messages`

### Requirement: Word Extraction Logic
The fake summarizer SHALL split messages by whitespace to extract words.

#### Scenario: Split on any whitespace
- **GIVEN** a message with multiple spaces, tabs, or newlines
- **WHEN** `createFakeSummary(messages)` is called
- **THEN** words are split on any whitespace character
- **AND** multiple consecutive spaces are treated as single delimiter

#### Scenario: Preserve word order
- **GIVEN** a message with words in order A, B, C, D, E
- **WHEN** `createFakeSummary(messages)` is called
- **THEN** the extracted words appear in the same order A, B, C, D, E

