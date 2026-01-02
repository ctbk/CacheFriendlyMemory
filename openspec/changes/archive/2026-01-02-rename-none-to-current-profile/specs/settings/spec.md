## MODIFIED Requirements

### Requirement: Connection Profile Selection Label
The system SHALL display "Current" instead of "None" in the Compression Profile dropdown when the option to use the currently active connection profile is selected.

#### Scenario: Dropdown displays "Current" option
- **GIVEN** SillyTavern Connection Manager has configured profiles
- **WHEN** user opens CacheFriendlyMemory settings
- **THEN** the dropdown menu displays all available connection profiles
- **AND** dropdown includes a `<Current>` option at the top of the list
- **AND** the `<Current>` option has an empty string value

#### Scenario: Status display shows "Current"
- **GIVEN** user has the "Current" option selected for compression profile
- **WHEN** user views the status section in CacheFriendlyMemory settings
- **THEN** the Compression Profile status displays "Current"

#### Scenario: Selecting "Current" uses active profile
- **GIVEN** user has a connection profile active for chat generation
- **WHEN** user selects the "Current" option in the dropdown
- **THEN** the setting value is set to empty string
- **AND** compression uses the currently active connection profile
- **AND** no profile switching occurs during compression
