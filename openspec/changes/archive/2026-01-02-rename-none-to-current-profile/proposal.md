# Change: Rename "None" to "Current" in Compression Profile Dropdown

## Why
The Compression Profile dropdown currently uses "None" as the option label when no specific profile is selected. This is confusing because:
- "None" suggests no compression profile is used at all
- The actual behavior is to use the current (active) connection profile
- Users may think selecting "None" disables compression

Changing the label to "Current" makes it explicit that the extension will use the currently active connection profile for compression operations, avoiding any profile switching.

## What Changes
- Update the label in the Compression Profile dropdown from "None" to "Current"
- Ensure the behavior (using current profile when no specific profile is selected) remains unchanged
- The dropdown value remains an empty string (`""`) for this option

## Impact
- Affected specs: None (UI label change only, no functional changes)
- Affected code:
  - `templates/settings.html` - Change option text from "None" to "Current"
  - `ui/settings.js` - Change option text from "None" to "Current" in dropdown population
  - `src/constants.js` - Optional: Change default from `null` to `""` for consistency
- No behavioral changes required - logic already supports this case correctly
