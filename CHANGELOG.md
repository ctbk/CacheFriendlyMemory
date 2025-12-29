# Changelog

All notable changes to CacheFriendlyMemory will be documented in this file.

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

