# source-priority-ux branch analysis

124 files, +20,200/−1,309 lines vs master.

## 1. New `@signalk/path-metadata` package
Pure-TypeScript metadata registry replacing JSON-schema-based metadata from `@signalk/signalk-schema`. Regex-based path matching, domain-specific metadata files (navigation, electrical, tanks, etc.), `MetadataRegistry` singleton. Used by FullSignalK, REST `/paths`, and admin UI.

Files: entire `packages/path-metadata/` (22 files, +3,327 lines)

## 2. FullSignalK + getSourceId moved to server-api
Data model class and source utilities rewritten in TypeScript, moved from `@signalk/signalk-schema` to `@signalk/server-api`. New `sourceMeta` tracking (per-source `lastSeen` + `pgnInstances`). Lodash replaced with native helpers. `getSourceId()` normalises source objects to canonical SourceRef. `fillIdentity()` for vessel identity.

Files: `packages/server-api/src/fullsignalk.ts` (+523), `sourceutil.ts` (+60), `index.ts` (+2 re-exports), `fullsignalk.test.ts` (+558), `tsconfig.json`

## 3. CAN Name source identification
N2K sources identified by 16-char hex CAN Name not numeric address. `sourceRefIdentity()` extracts CAN Name suffix for transport-agnostic matching. Address 254 (null/pre-claim) dropped. `sourceRefChanged` events trigger migration.

Files: `src/deltaPriority.ts` (identity functions + precedence map key change), `packages/streams/src/n2k-signalk.ts` (254 drop, sourceRefChanged emission, typo fix), `packages/streams/src/canboatjs.ts` (useCamelCompat default)

## 4. Unfiltered delta bus + sourcePolicy
All source data preserved in cache/model. Parallel `unfilteredBuses` in streambundle carries pre-priority deltas. `subscriptionmanager` and `ws.ts` accept `sourcePolicy: 'preferred' | 'all'`. `deltacache` gains `ingestDelta()` (pre-priority), `filterDeltasToPreferred()`, `preferredSources` tracking.

Files: `src/streambundle.ts` (+61), `src/subscriptionmanager.ts` (+47), `src/interfaces/ws.ts` (+35), `packages/server-api/src/subscriptionmanager.ts` (+7)

## 5. Priority engine enhancements
`isPreferredValue()` rewrite: disabled sources (timeout=-1), configured-vs-unconfigured displacement, notifications bypass, self-renewal guards. `deltacache`: multi-source path tracking, live preferred source events, source removal/replacement, source cache persistence.

Files: `src/deltaPriority.ts` (behavioral changes), `src/deltacache.ts` (+552)

## 6. Priority persistence split
New `priorities.json` separate from `settings.json`. One-shot migration. New settings keys: `priorityGroups`, `priorityDefaults`, `sourcePriorityOverrides`, `sourceAliases`, `ignoredInstanceConflicts`.

Files: `src/config/priorities-file.ts` (+171), `src/config/config.ts` (+71)

## 7. Source ref migration
Rewrites all persisted references when source's canonical ref changes. Migrates: sourcePriorities, sourceAliases, ignoredInstanceConflicts, priorityGroups, channel labels. Cleans deltaCache, recompiles priority engine, emits events.

Files: `src/sourceref-migration.ts` (+217), `test/sourceref-migration.ts` (+203)

## 8. N2K discovery interface
ISO Request discovery sweeps, source online/offline tracking, channel labels, REST endpoints for device management, PGN 126208 instance configuration commands.

Files: `src/interfaces/n2k-discovery.ts` (+1,420), `src/n2k-discovery-instances.ts` (+237), `test/n2k-discovery-instances.ts` (+170)

## 9. NMEA 0183 talker groups
Talker group rewriting in `handleMessage`. Maps talker IDs to group names per-provider.

Files: `src/nmea0183TalkerGroups.ts` (+56), `test/nmea0183TalkerGroups.ts` (+153)

## 10. Remote delta identity preservation
Transport-agnostic device identity. Remote deltas preserve original `$source` when schema-conformant instead of overwriting.

Files: `packages/streams/src/remote-deltas.ts` (+59), `remote-deltas.test.ts` (+101), `mdns-ws.ts` changes, `mdns-ws.test.ts` changes

## 11. Server core wiring (index.ts handleMessage)
`cloneDelta()` for mutation safety. Source label preservation. Talker group rewriting. Pre-priority `ingestDelta()`. `unfilteredDelta` emission. `sourceRefChanged` / `pipedProvidersStarted` listeners. `activateSourcePriorities()` calls `resetPreferredSourcesNotIn()`.

Files: `src/index.ts` (+91)

## 12. REST API expansion
~15 new endpoints: priorities, groups, defaults, overrides, aliases, instance conflicts, device identities, paths, live preferred sources, multi-source paths. TypeBox validation. Provider `REPLACE_KEYS` for talkerGroups.

Files: `src/serverroutes.ts` (+439), `src/interfaces/providers.ts` (+16)

## 13. Server events
New events sent on WS connect: SOURCEALIASES, PRIORITYGROUPS, PRIORITYDEFAULTS, SOURCEPRIORITYOVERRIDES, MULTISOURCEPATHS, LIVEPREFERREDSOURCES, SOURCESTATUS.

Files: `src/events.ts` (+20)

## 14. Admin UI: utilities and store
- `sourceLabels.ts` (401) — human-readable N2K labels, instance conflict detection
- `sourceGroups.ts` (207) — union-find connected components, group reconciliation
- `useSourceAliases.ts` (156) — alias hook with server persistence
- `prioritiesSlice.ts` (+332) — group/defaults/overrides state, 15 new actions
- `appSlice.ts` (+127) — 14 new state fields for sources/status/conflicts
- `store/index.ts` (+130) — derived hooks with memoization
- `store/types.ts` (+29) — PriorityGroup types
- `WebSocketService.ts` (+66) — 7 new server event handlers
- Tests: prioritiesSlice.test.ts, sourceGroups.test.ts, sourceLabels.test.ts

## 15. Admin UI: Source Discovery page
Full N2K device discovery: sortable device table, instance conflicts, discovery trigger, reset/remove devices, NMEA 0183 connections, online/offline badges.

Files: `SourceDiscovery.tsx` (+2,435), `SourceLabel.tsx` (+119), `SourceGroupHeader.tsx` (+74)

## 16. Admin UI: Priority management rewrite
Group-based priority with drag-and-drop ranking, path overrides, timeline diagram, device identity, save lifecycle.

Files: `SourcePriorities.tsx` (+963/−305), `PriorityGroupCard.tsx` (+932), `PrefsEditor.tsx` (+243), `SourcePriorityPage.tsx` (+12), `_custom.scss` (+500)

## 17. Admin UI: Data browser enhancements
sourcePolicy support, view-by-source mode, live preferred tracking, cache invalidation on priority changes, reconnect logic.

Files: `DataBrowser.tsx` (669 changed), `useSignalKData.ts` (+356), `GranularSubscriptionManager.ts` (311 changed), `VirtualizedDataTable.tsx` (282 changed), `DataRow.tsx`, `TimestampCell.tsx`, `VirtualTable.css`

## 18. Admin UI: Additional pages and changes
PathReference (+289), MetaDataPage (+151), BasicProvider (+232), navigation/routing in Sidebar/Full, N2KFilters, ProvidersConfiguration, UnitPreferencesSettings, Settings changes.

## 19. Documentation
Breaking changes (CAN Name, all-sources-preserved), source priority guide, plugin sourcePolicy docs, N2K device management guide, SVG timeline diagram.

## 20. Tests (new)
deltaPriority.ts (+320), deltacache.js (+145), sourceref-migration.ts (+203), canonical-source-ref.ts (+68), deviceIdentities.ts (+120), sourcePolicy.ts (+115), available-paths.ts (+112), plugin-meta.ts (+120), n2k-discovery-instances.ts (+170), nmea0183TalkerGroups.ts (+153), providers.js (+90), multiple-values.js (+31)

## 21. Package/CI
package.json deps, package-lock.json, admin-ui/streams/server-api package.json, docker build workflow, typedoc.json, sources-cache.json
