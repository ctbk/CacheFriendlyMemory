## Context
The Compression Profile dropdown currently displays "None" for the default option, but the actual behavior is to use the currently active connection profile. This creates user confusion because "None" suggests no profile is being used, which is incorrect.

## Goals / Non-Goals
- **Goals:**
  - Update the default option label from "None" to "Current" for clarity
  - Maintain existing behavior (using current profile when empty string is selected)
  - Keep the dropdown value as empty string (`""`) for this option
- **Non-Goals:**
  - Change any functional behavior
  - Modify profile switching logic
  - Update migration logic

## Decisions

### Decision 1: Use "Current" as Label
Change the option text from "None" to "Current" to accurately describe the behavior.

**Rationale:** "Current" clearly indicates that the currently active connection profile will be used, avoiding confusion about whether compression is disabled or using no profile.

**Alternatives considered:**
- Keep "None": Confusing, suggests no profile is used
- Use "Default": Also ambiguous (default of what?)
- Use "Active": Similar to "Current", but "Current" is more commonly used in SillyTavern UI

### Decision 2: Keep Empty String as Value
Maintain the empty string (`""`) as the dropdown value for the "Current" option.

**Rationale:** The existing logic already correctly handles empty strings by using the current profile. No code changes needed in the compression logic.

**Alternatives considered:**
- Change value to "current": Would require updating all logic that checks for empty string
- Change value to null: Inconsistent with dropdown options (which use strings)
- Keep as is: Minimal code changes, maintains backwards compatibility

## Implementation Notes

### Changes Required
1. **templates/settings.html** (line 58):
   ```html
   <option value="">Current</option>
   ```

2. **ui/settings.js** (line 47):
   ```javascript
   const noneOption = $('<option>', {
       value: '',
       text: 'Current'
   });
   ```

3. **src/constants.js** (optional, line 13):
   ```javascript
   compressionProfileId: '',  // Changed from null to empty string
   ```

### Behavior
The existing behavior remains unchanged:
- When dropdown value is `""`, use current connection profile
- When dropdown value is a profile ID, switch to that profile temporarily
- When switching, restore original profile after compression

## Testing
- Verify dropdown displays "Current" instead of "None"
- Verify selecting "Current" uses the active profile (no profile switching)
- Verify selecting a specific profile still switches correctly
- Verify status display still shows "Current" when no profile is selected
