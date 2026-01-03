# Changelog

All notable changes to CacheFriendlyMemory will be documented in this file.

## [0.4.0] - 2026-01-03

### Added
- **Compaction Progress UI**: Real-time progress feedback during chat compaction
  - Toast notifications showing progress (X/Y batches processed)
  - Inline progress in settings panel (when Show Progress Bar is enabled)
  - Debug logging for troubleshooting (when Debug Mode is enabled)
  - Non-blocking UI updates that don't delay compaction
  - Progress automatically hidden on completion or error

### Changed
- performCompaction now integrates with progress tracking system
- Progress calculated based on batches (target messages / chunk size)
- Toast notifications use SillyTavern's toastr API

## [0.3.0] - 2025-01-02

### Breaking Changes
- **Replaced text-based compression model configuration with connection profile dropdown**
  - Removed "Compression Model" and "Compression Preset" text input fields
  - Added "Connection Profile" dropdown to select SillyTavern connection profiles
  - Migration: Users with existing compressionModel/compressionPreset settings will be automatically migrated. The extension will use the current SillyTavern profile if no valid profile is found.
  - Connection profiles must be configured in SillyTavern's Connection Manager before use

### Changed
- Compression configuration now uses SillyTavern connection profile system
- Simplified UI with dropdown selection instead of manual text input

## [Unreleased]

### Added
- TDD infrastructure with Vitest testing framework
- Unit tests for all logic modules (100% coverage)
- Integration tests for compaction and injection workflows
- Test fixtures for SillyTavern API mocks
- Comprehensive testing documentation
- Coverage reporting with 80% target

### Changed
- Extracted pure functions from compression.js and injection.js
- Refactored token estimation, summary selection, budget calculation
- Refactored context building and compaction triggers
- Improved testability through dependency injection

### Technical Debt
- Remaining code in storage.js, events.js, and index.js still coupled to SillyTavern APIs
- Future: Extract service layer for full test coverage

## [0.1.0] - 2025-12-27

### Added
- Initial release of CacheFriendlyMemory extension
- Hierarchical compression system (Level 0, 1, 2, 3)
- Auto-compaction based on message count or context pressure
- Manual compaction via slash commands
- Per-chat and global settings storage
- Settings UI panel
- Export/import functionality
 - Status display
 - Slash commands: `/cfm-compact`, `/cfm-status`, `/cfm-export`

## [0.2.0] - 2025-12-29

### Added
- Message-based tracking system using per-message metadata flags
- Extension prompt injection for summaries
- Generate interceptor to filter summarized messages from LLM context
- Injection toggle in settings
- Comprehensive unit and integration tests
- Dynamic stats calculation from message flags

### Changed
- Removed internal message counters
- Rewrote events module to use message flags
- Updated compaction to mark messages instead of tracking counters
- Status display now uses dynamic counting

### Technical
- Storage structure updated to include injection config
- Stats calculated dynamically from message metadata
- No migration needed - fresh start for new chats
- Coverage target: 80% for all new modules

