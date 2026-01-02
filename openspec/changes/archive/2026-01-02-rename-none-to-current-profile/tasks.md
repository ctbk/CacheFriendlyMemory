# Tasks: Rename "None" to "Current" in Compression Profile Dropdown

## Implementation Tasks

- [x] Update `templates/settings.html` line 58: Change `<option value="">None</option>` to `<option value="">Current</option>`
- [x] Update `ui/settings.js` line 47: Change `text: 'None'` to `text: 'Current'` in the `noneOption` creation
- [x] (Optional) Update `src/constants.js` line 13: Change `compressionProfileId: null` to `compressionProfileId: ''` for consistency
- [x] Run tests: `npm test -- --run` to ensure no regressions
- [x] Run linter: `npm run lint` to verify no import errors
- [ ] Manual verification:
   - [ ] Open SillyTavern and load the extension
   - [ ] Navigate to extension settings
   - [ ] Verify dropdown shows "Current" instead of "None"
   - [ ] Select "Current" option and verify compression uses current profile
   - [ ] Verify status display shows "Current" when no profile is selected
   - [ ] Select a specific profile and verify profile switching still works
   - [ ] Check browser console for any errors

## Dependencies
None - all tasks are independent

## Parallelizable Work
All implementation tasks can be done in parallel, but should be tested together to verify consistency.
