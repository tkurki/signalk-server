# source-priority-ux commit restructuring plan

Principle: foundations first (types, packages, infrastructure), then engine changes, then API surface, then UI. Each commit should compile and pass tests.

## Phase 1 — Foundation packages (no behavioral changes)

### Commit 1: `feat(path-metadata): add @signalk/path-metadata package`
- Entire `packages/path-metadata/` directory
- Pure data + registry, no consumers yet

### Commit 2: `refactor(server-api): move FullSignalK and source utilities to server-api`
- `packages/server-api/src/fullsignalk.ts`, `sourceutil.ts`
- `packages/server-api/src/index.ts` re-exports
- `packages/server-api/tsconfig.json` changes
- `packages/server-api/src/fullsignalk.test.ts`
- Update imports in `src/types.ts`, `src/deltacache.ts`, `src/interfaces/rest.js`, `src/interfaces/ws.ts` (import-only, not behavioral)
- Remove `src/@types/signalk_signalk-schema.d.ts`

### Commit 3: `feat(server-api): add sourcePolicy to SubscribeMessage`
- `packages/server-api/src/subscriptionmanager.ts` — add `sourcePolicy` field

## Phase 2 — Core server infrastructure (plumbing, no behavioral change yet)

### Commit 4: `feat: add unfiltered delta bus to streambundle`
- `src/streambundle.ts` — `unfilteredBuses`, `pushUnfilteredDelta()`, `getUnfilteredBus()`
- The bus exists but nothing pushes to it yet

### Commit 5: `feat: add sourcePolicy support to subscriptionmanager and WebSocket`
- `src/subscriptionmanager.ts` — `sourcePolicy` parameter plumbing
- `src/interfaces/ws.ts` — `SourcePolicy` type, spark query parsing, subscribe/unsubscribe routing
- `test/sourcePolicy.ts`

### Commit 6: `feat: add events infrastructure for priority state`
- `src/events.ts` — new server events (SOURCEALIASES, PRIORITYGROUPS, PRIORITYDEFAULTS, SOURCEPRIORITYOVERRIDES, MULTISOURCEPATHS)

### Commit 7: `feat: add priority persistence in separate priorities.json`
- `src/config/priorities-file.ts` (entire file)
- `src/config/config.ts` changes (new settings keys, read/write split)

## Phase 3 — Source identification & migration

### Commit 8: `feat: identify N2K sources by CAN Name`
- `src/deltaPriority.ts` — `sourceRefIdentity()`, `CAN_NAME_SUFFIX`, `PathPrecedences` key change
- `packages/streams/src/n2k-signalk.ts` — address 254 drop, `sourceRefChanged` emission, typo fix
- `packages/streams/src/canboatjs.ts` — `useCamelCompat` default change
- `test/deltaPriority.ts` — CAN Name matching tests

### Commit 9: `feat: add source ref migration`
- `src/sourceref-migration.ts` (entire file)
- `test/sourceref-migration.ts`

### Commit 10: `feat: add device identity index`
- `src/deviceIdentities.ts` (entire file)
- `test/deviceIdentities.ts`

### Commit 11: `feat: add NMEA 0183 talker group rewriting`
- `src/nmea0183TalkerGroups.ts` (entire file)
- `test/nmea0183TalkerGroups.ts`

### Commit 12: `feat(streams): preserve remote delta source identity`
- `packages/streams/src/remote-deltas.ts` (entire file)
- `packages/streams/src/remote-deltas.test.ts`
- `packages/streams/src/mdns-ws.ts` — use `stampRemoteUpdates`
- `packages/streams/src/mdns-ws.test.ts` changes

## Phase 4 — Engine behavioral changes

### Commit 13: `feat: enhance priority engine with disable, notifications bypass, displacement`
- `src/deltaPriority.ts` — `isPreferredValue()` rewrite (disabled sources, configured-vs-unconfigured, notifications bypass, self-renewal guard)
- `test/deltaPriority.ts` — disabled, displacement, notifications, non-self context tests

### Commit 14: `feat: preserve all sources in delta cache with preferred filtering`
- `src/deltacache.ts` — `ingestDelta()`, `filterDeltasToPreferred()`, `preferredSources`, `getMultiSourcePaths()`, `removeSource()`, `resetPreferredSourcesNotIn()`, `getLivePreferredSources()`, `buildSrcToCanonicalMap()`, source cache persistence, multi-source events, live preferred events
- `test/deltacache.js` — new cache tests
- `test/canonical-source-ref.ts`

### Commit 15: `feat: wire unfiltered delta bus and pre-priority ingestion into handleMessage`
- `src/index.ts` — `cloneDelta()`, `handleMessage()` changes (source label preservation, talker group rewriting, `ingestDelta()` call, `unfilteredDelta` emission, `sourceRefChanged` listener, `pipedProvidersStarted` listener, `activateSourcePriorities()` changes)
- `test/multiple-values.js` — label preservation test

## Phase 5 — N2K discovery & REST API

### Commit 16: `feat: add N2K device discovery interface`
- `src/interfaces/n2k-discovery.ts` (entire file)
- `src/n2k-discovery-instances.ts` (entire file)
- `test/n2k-discovery-instances.ts`

### Commit 17: `feat: add REST API endpoints for priorities, aliases, and device data`
- `src/serverroutes.ts` — all new endpoints + TypeBox schemas
- `src/interfaces/providers.ts` — `REPLACE_KEYS` for talkerGroups
- `test/available-paths.ts`
- `test/plugin-meta.ts`
- `test/providers.js` — talkerGroups tests

## Phase 6 — Admin UI

### Commit 18: `feat(admin-ui): add source label and group utilities`
- `packages/server-admin-ui/src/utils/sourceLabels.ts` + test
- `packages/server-admin-ui/src/utils/sourceGroups.ts` + test
- `packages/server-admin-ui/src/hooks/useSourceAliases.ts`

### Commit 19: `feat(admin-ui): add store slices for priority groups, aliases, and source status`
- `packages/server-admin-ui/src/store/types.ts`
- `packages/server-admin-ui/src/store/slices/prioritiesSlice.ts` + test
- `packages/server-admin-ui/src/store/slices/appSlice.ts`
- `packages/server-admin-ui/src/store/slices/dataSlice.ts`
- `packages/server-admin-ui/src/store/index.ts`
- `packages/server-admin-ui/src/services/WebSocketService.ts`
- `packages/server-admin-ui/src/dataFetching.ts`

### Commit 20: `feat(admin-ui): add source discovery page`
- `packages/server-admin-ui/src/views/DataBrowser/SourceDiscovery.tsx`
- `packages/server-admin-ui/src/views/DataBrowser/SourceLabel.tsx`
- `packages/server-admin-ui/src/views/DataBrowser/SourceGroupHeader.tsx`
- Navigation/routing changes in `Sidebar.tsx`, `Full.tsx`

### Commit 21: `feat(admin-ui): rewrite source priority management with group-based UX`
- `packages/server-admin-ui/src/views/ServerConfig/SourcePriorities.tsx`
- `packages/server-admin-ui/src/views/ServerConfig/PriorityGroupCard.tsx`
- `packages/server-admin-ui/src/views/ServerConfig/PrefsEditor.tsx`
- `packages/server-admin-ui/src/views/ServerConfig/SourcePriorityPage.tsx`
- `packages/server-admin-ui/scss/_custom.scss`

### Commit 22: `feat(admin-ui): enhance data browser with sourcePolicy and view-by-source`
- `packages/server-admin-ui/src/views/DataBrowser/DataBrowser.tsx`
- `packages/server-admin-ui/src/views/DataBrowser/DataRow.tsx`
- `packages/server-admin-ui/src/views/DataBrowser/GranularSubscriptionManager.ts`
- `packages/server-admin-ui/src/views/DataBrowser/VirtualizedDataTable.tsx`
- `packages/server-admin-ui/src/views/DataBrowser/VirtualTable.css`
- `packages/server-admin-ui/src/views/DataBrowser/TimestampCell.tsx`
- `packages/server-admin-ui/src/views/DataBrowser/useSignalKData.ts`

### Commit 23: `feat(admin-ui): add path reference and metadata pages`
- `packages/server-admin-ui/src/views/PathReference/PathReference.tsx`
- `packages/server-admin-ui/src/views/DataBrowser/MetaDataPage.tsx`
- Remaining `Sidebar.tsx`/`Full.tsx` route additions
- `packages/server-admin-ui/src/views/ServerConfig/BasicProvider.tsx`
- `packages/server-admin-ui/src/views/ServerConfig/N2KFilters.tsx`
- `packages/server-admin-ui/src/views/ServerConfig/ProvidersConfiguration.tsx`
- `packages/server-admin-ui/src/views/ServerConfig/Settings.tsx`
- `packages/server-admin-ui/src/views/ServerConfig/UnitPreferencesSettings.tsx`

## Phase 7 — Package config, docs, CI

### Commit 24: `docs: add source priority guide, breaking changes, and plugin docs`
- `docs/breaking_changes.md`
- `docs/setup/source-priority.md`
- `docs/setup/configuration.md`
- `docs/setup/n2k-device-management.md`
- `docs/setup/nmea.md`
- `docs/develop/plugins/deltas.md`
- `docs/img/source-priority-timeline.svg`

### Commit 25: `chore: update package.json dependencies and CI workflow`
- `package.json`, `package-lock.json`
- `packages/server-admin-ui/package.json`
- `packages/streams/package.json`
- `packages/server-api/package.json`
- `.github/workflows/build-docker.yml`
- `typedoc.json`
- `sources-cache.json`

## Notes

- Commits 1–7: all foundational infrastructure, no runtime behavior change
- Commits 8–12: new identification model (CAN Name prerequisite for everything else)
- Commits 13–15: core behavioral change (all sources preserved, priority at subscription)
- Commits 16–17: expose capabilities via REST/discovery
- Commits 18–23: UI layered as utilities → store → pages
- Commit 25 (deps) could be split across earlier commits where each package first needs new deps, but a single trailing commit avoids noise in functional commits
- Per AGENTS.md: this is multiple logical changes → should be split into separate PRs. The commit plan here maps to potential PR boundaries at each phase.
