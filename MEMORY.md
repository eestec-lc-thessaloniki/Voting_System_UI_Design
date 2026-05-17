# Frontend Memory

## Changes Log

### 2026-05-17

#### Bug 2 — Fixed import path case mismatches
Renamed 6 service/router files to consistent lowercase camelCase and updated all import sites.

**Files renamed:**
- `services/AxiosClient.js` → `axiosClient.js`
- `services/AuthApi.js` → `authApi.js`
- `services/AuthStore.js` → `authStore.js`
- `services/EventsApi.js` → `eventsApi.js`
- `services/Dashboardapi.js` → `dashboardApi.js`
- `router/Routes.js` → `routes.js`

**Imports fixed:**
- `services/authStore.js` — `./AuthApi` → `./authApi`
- `services/MeetingApi.js` — `./AxiosClient` → `./axiosClient`
- `router/AppRouter.jsx` — `../services/AuthStore.js` → `../services/authStore`
- `features/dashboard/comps/ActiveMeetingTab.jsx` — `../../../services/AuthStore` → `../../../services/authStore`
- `pages/MembersPage.jsx`, `ReportsPage.jsx`, `PollsPage.jsx`, `MeetingsPage.jsx` — `../services/AuthStore` → `../services/authStore`
- `components/layout/SideBarUser.jsx` — `../../services/AuthStore` → `../../services/authStore`

---

#### Bug 3 — Fixed `AttendanceRoundCard` crash for non-privileged users
- `src/features/dashboard/comps/AttendanceRoundCard.jsx`
- Delete button was always rendered even when `onDelete` prop was `null`
- Wrapped button in `{onDelete && (...)}` so it only renders for privileged users

---

#### Bug 4 — Migrated `dashboardApi.js` from raw `fetch()` to axios client
- `src/services/dashboardApi.js`
- Removed `BASE` constant and `authHeaders()` helper
- All 9 exported functions now use `client` from `./axiosClient` — auth is handled by the interceptor
- `searchByDiscordTag` 404 check converted from `res.status === 404` to `err.response?.status === 404` in a `try/catch`
- `changePassword` error message extracted from `err.response?.data`
- `updateUserRole` query params moved to axios `params` option
- Deleted the ~180-line commented-out dead-code block at the bottom

---

#### Bug 6 — Fixed attendance rounds not fetched on page load
- `src/features/dashboard/comps/ActiveMeetingTab.jsx`
- Added `getRoundsByCheckId` import from `AttendanceApi`
- In `fetchData()`, after fetching the active meeting, now loops over all polls with an `attendanceCheckId` and calls `getRoundsByCheckId` to populate `roundsByPoll`
- Individual round fetch failures are caught silently (empty array fallback)

---

#### Bug 7 — Replaced mock user/attendance on Dashboard with real data
- `src/pages/DashBoardPage.jsx` + `src/services/dashboardApi.js`
- `HeroWelcome` was already self-contained — removed dead `user`, `weather`, `date` props and `TODAY` constant
- Removed all `mockUser`, `mockWeather`, `mockAttendance` imports
- Added `fetchAttendanceSessions()` to `dashboardApi.js`: fetches last 5 meetings with attendance data, maps to `{ label, pct, color }` for `AttendanceCard`

---

#### Bug 8 — Fixed non-reactive `useAuth` hook
- `src/hooks/useAuth.js`
- Was calling `authApi.getCurrentUser()` (reads localStorage directly) — not reactive
- Replaced with `useAuthStore()` — same return shape, no call site changes
- Call sites: `Sidebar.jsx` and `SettingsPage.jsx`

---

#### Bug 9 (runtime) — `ClosedPoll` crash: `poll.results.map()` on undefined
- `src/features/dashboard/comps/ClosedPoll.jsx:52`
- `fetchPolls()` in `dashboardApi.js` never maps a `results` field, so `poll.results` was `undefined`
- `.map()` on `undefined` throws a `TypeError` that unmounts the entire React tree → black page
- **Fix:** `(poll.results ?? []).map(...)` — empty array fallback
- Also fixed division by zero in turnout: `poll.voted / (poll.total || 1) * 100`

---

#### Bug 10 (runtime) — `JwtAuthFilter` propagated unhandled exceptions as 500
- `src` (backend): `security/JwtAuthFilter.java`
- `loadUserByUsername()` was called without a try/catch — any `UsernameNotFoundException` or DB error propagated through the filter chain as an unhandled exception, causing every authenticated request to return 500
- **Fix:** wrapped `loadUserByUsername` in try/catch; on failure, filter continues without setting auth → Spring Security returns 401

---

#### Bug 11 (runtime) — `GET /api/general_meetings` returned 500 due to wrong OneToOne mapping
- Backend: `entity/GeneralMeetings.java` + `entity/AttendanceCheck.java`
- A previous session changed `AttendanceCheck.meeting` from `@ManyToOne` to `@OneToOne` (unique). The database already had multiple `attendance_check` rows per meeting, so Hibernate threw `More than one row with the given identifier found` on every meeting load.
- **Fix:** reverted `AttendanceCheck.meeting` back to `@ManyToOne`, removed `unique = true`. Removed the `attendanceCheck` back-reference from `GeneralMeetings` entirely (it was `@JsonIgnore` and triggered the failing query). Added Liquibase migration 008 to drop the bad unique index.

---

#### Bug 12 — `checkIn`/`checkOut` API calls were malformed
- `src/services/AttendanceApi.js`
- `checkOut` sent `{ roundId, userId }` as a **request body** but the backend expects them as **query params**
- `checkIn` never sent `moderatorId` as a required query param
- **Fix:** `checkOut` now sends `null` body + `{ params: { roundId, userId, moderatorId? } }`. `checkIn` now passes `moderatorId` as optional query param.

---

### New features added 2026-05-17

#### Attendance — `ManageRoundsTab`
- `src/features/dashboard/comps/ManageRoundsTab.jsx` + `.module.css`
- New tab in `AttendancePage` visible to MODERATOR/ADMIN only
- Meeting dropdown (sorted newest first) → loads attendance check + rounds for the selected meeting
- "Start Attendance" button → `POST /attendance_check/meeting/:id`
- "＋ Open Round" button → `POST /attendance_rounds/check/:checkId`
- Shows full `AttendanceRoundCard` for each round (includes check-in/out table)
- New API functions: `getChecksByMeeting`, `createAttendanceCheckForMeeting` in `AttendanceApi.js`

#### Attendance — `MemberCheckInCard`
- `src/features/dashboard/comps/MemberCheckInCard.jsx` + `.module.css`
- Shown to regular members (non-privileged) in `ActiveMeetingTab` for the active round only
- Displays the member's own status (Not checked in / ✓ Present / Checked out)
- Single "Check In" or "Check Out" button — calls backend self-service path (no `moderatorId`)
- Privileged users still see the full `AttendanceRoundCard` admin table

#### `AttendancePage` — tab system updated
- Added "Manage Rounds" tab (privileged only) rendering `ManageRoundsTab`
- Tabs are built dynamically based on `user.role`

#### `AttendanceRoundCard` — passes `moderatorId` for admin actions
- Now imports `useAuthStore` and passes `user.userId` as `moderatorId` when calling `checkIn`/`checkOut`

---

---

### Fixes — 2026-05-17 (session 2)

#### Backend — Voting gate fixed
- `UserAttendanceRecordRepository.isUserActivelyCheckedInForMeeting` now uses `MAX(ar.id)` subquery to target only the latest `AttendanceRound` for the meeting. Previously checked any round → member absent from round 2 could still vote.

#### Backend — `UserDetails.getName()` → `getUsername()`
- `controller/UserAttendanceRecordController.java` — both check-in and check-out endpoints called `principal.getName()` which doesn't exist on `UserDetails`. Fixed to `principal.getUsername()`.

#### Backend — `AttendanceCheckController` missing `IllegalStateException` catch
- `POST /attendance_check/meeting/{meetingId}` didn't catch `IllegalStateException` (thrown when a check already exists), causing 500. Added `catch (IllegalStateException e) → 409`, matching the existing `/poll/{pollId}` handler.

#### Backend — `buildSummary` NPE on null `member_status`
- `UserAttendanceRecordService.buildSummary` called `.toUpperCase()` directly on `getMember_status()` with no null guard → NPE → 500 on all `/summary/poll/{id}` calls. Fixed with null-safe local variable.

#### Backend — DB schema misalignment (attendance tables)
- `attendance_check` still had old schema from migration 001 (`user_id NOT NULL`, `check_in_time NOT NULL`, `attendance_method NOT NULL`) — the `006-add-attendance-model-rewrite.sql` file was never registered in `db.changelog-master.xml`.
- Added migration `009-attendance-schema-align.sql`: drops and recreates `attendance_check`, `attendance_round`, and `user_attendance_record` with the schema the entities expect. Applied manually via direct SQL + `DELETE FROM DATABASECHANGELOG`.

#### Frontend — `openRound` / `closeRoundAndOpenVoting` missing `moderatorId`
- `AttendanceApi.js`: both functions now accept and forward `moderatorId` as a query param.
- `ManageRoundsTab.jsx`: `openRound(check.id, user.userId)`
- `ActiveMeetingTab.jsx`: `openRound(poll.attendanceCheckId, user.userId)` and `closeRoundAndOpenVoting(roundId, user.userId)`
- `useAttendance.js`: `useOpenRound` and `useCloseRoundAndOpenVoting` hooks now take `{ checkId/roundId, moderatorId }` objects.
- `PollsPage.jsx` `AdminControlsPanel`: added `useAuthStore()` to get `user.userId`; updated both mutation call sites.

---

---

### Fixes — 2026-05-17 (session 3)

#### Backend — `AttendanceMethod` default mismatch → 400 on check-in
- `UserAttendanceRecordController` defaulted `method` to `"IN_PERSON"` but the enum only has `REMOTE`, `MANUAL`, `PHYSICAL`. `valueOf("IN_PERSON")` threw `IllegalArgumentException` → 400.
- Fixed default to `"PHYSICAL"`.

#### Frontend — `AttendanceRoundCard` redesign
- `AttendanceRoundCard.jsx` + `.module.css`
- Added scrollable `.tableWrapper` with `max-height: 480px; overflow-y: auto` — previously the table grew unbounded with 30–60 members
- Table `<thead>` is now `position: sticky; top: 0` so column headers stay visible while scrolling
- Search bar added — filters members by name or username in real time
- Button padding increased, `:active` scale transform added, `min-width: 90px` prevents width shift during loading
- Loading labels changed from `...` to `"Checking in…"` / `"Checking out…"` for clarity
- Fixed variable shadowing: `users.map(user =>` was shadowing `user` from `useAuthStore()` — renamed loop variable to `member`

#### Frontend — `openRound` / `closeRoundAndOpenVoting` missing `moderatorId` (all call sites)
- `ManageRoundsTab.jsx`, `ActiveMeetingTab.jsx`: direct calls now pass `user.userId`
- `useAttendance.js`: `useOpenRound` and `useCloseRoundAndOpenVoting` hooks take `{ checkId/roundId, moderatorId }` objects
- `PollsPage.jsx` `AdminControlsPanel`: added `useAuthStore()` + updated both mutation call sites

---

## Known Constraints

- **Voting gate:** Fixed 2026-05-17 — see above.
- **`PATCH` missing from CORS allowed methods** in `SecurityConfig` — may affect settings/profile update calls.
