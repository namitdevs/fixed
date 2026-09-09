# Fixes applied to the current proto project

1. **Temporal Event Chronology blank**
   - Frontend was reading `data.events`, while backend returns `data.timeline`.
   - Updated `TemporalTimeline.tsx` to consume the actual API contract.

2. **Master Dossier PDF/JSON/CSV AUTH_REQUIRED**
   - `window.open()` could not attach the JWT Authorization header.
   - Added authenticated Axios `downloadReport()` and changed dossier downloads to fetch the protected export as a Blob, then trigger a local download.
   - Backend authentication remains enabled.

3. **Master Dossier field mismatches**
   - Frontend expected fields such as `canonicalValue`, `role`, `memberCount`, and `topMembers`, while the backend report payload uses `entityName`, `entityType`, `size`, and `leadEntity`.
   - Updated the dossier UI to use the actual backend payload.

4. **Copilot robustness**
   - Normalized assistant response fields (`method` / `sourceMethod`, cited entity arrays) and added a safe empty-response message instead of allowing undefined data to render.

5. **Blank-screen protection**
   - Added a top-level React error boundary so an unexpected render exception shows a recoverable error screen instead of a completely blank application.

6. **Evidence drawer robustness**
   - Added safe JSON parsing for metadata/relevance fields so malformed stored JSON does not crash the UI.

## Verification
- Frontend TypeScript check: **PASS** (`tsc --noEmit`)
- The Vite bundle step could not be completed in this Linux container because the uploaded Windows `node_modules` is missing Rollup's Linux optional native package. This is an environment/dependency packaging issue, not a TypeScript error. On the Windows project, run `npm install` in `frontend` and then `npm run build`.

## Important
This archive intentionally excludes `node_modules` and generated `dist` folders. Run `npm install` in both `backend` and `frontend` after extracting.
