# Frontend Memory

## Changes Log

### 2026-05-17

#### Bug 3 — Fixed `AttendanceRoundCard` crash for non-privileged users
- `src/features/dashboard/comps/AttendanceRoundCard.jsx`
- Delete button was always rendered even when `onDelete` prop was `null`
- Wrapped button in `{onDelete && (...)}` so it only renders for privileged users

#### Bug 2 — Fixed import path case mismatches
Renamed 6 service/router files to consistent lowercase camelCase and updated all import sites.

**Files renamed:**
- `services/AxiosClient.js` → `axiosClient.js`
- `services/AuthApi.js` → `authApi.js`
- `services/AuthStore.js` → `authStore.js`
- `services/EventsApi.js` → `eventsApi.js`
- `services/Dashboardapi.js` → `dashboardApi.js`
- `router/Routes.js` → `routes.js`

#### Bug 6 — Fixed attendance rounds not fetched on page load
- `src/features/dashboard/comps/ActiveMeetingTab.jsx`
- Added `getRoundsByCheckId` import from `AttendanceApi`
- In `fetchData()`, after fetching the active meeting, now loops over all polls with an `attendanceCheckId` and calls `getRoundsByCheckId` to populate `roundsByPoll`
- Individual round fetch failures are caught silently (empty array fallback) so one bad round doesn't break the whole load
- Applies on initial mount and every subsequent `fetchData()` call (after poll creation, after closing a round)

#### Bug 4 — Migrated `dashboardApi.js` from raw `fetch()` to axios client
- `src/services/dashboardApi.js`
- Removed `BASE` constant and `authHeaders()` helper
- All 9 exported functions now use `client` from `./axiosClient` — auth is handled by the interceptor
- `searchByDiscordTag` 404 check converted from `res.status === 404` to `err.response?.status === 404` in a `try/catch`
- `changePassword` error message extracted from `err.response?.data` instead of `res.text()`
- `updateUserRole` query params (`adminId`) moved to axios `params` option instead of being interpolated into the URL string
- Deleted the ~180-line commented-out dead-code block at the bottom of the file

---

**Imports fixed:**
- `services/authStore.js` — `./AuthApi` → `./authApi`
- `services/MeetingApi.js` — `./AxiosClient` → `./axiosClient`
- `router/AppRouter.jsx` — `../services/AuthStore.js` → `../services/authStore`
- `features/dashboard/comps/ActiveMeetingTab.jsx` — `../../../services/AuthStore` → `../../../services/authStore`
- `pages/MembersPage.jsx`, `ReportsPage.jsx`, `PollsPage.jsx`, `MeetingsPage.jsx` — `../services/AuthStore` → `../services/authStore`
- `components/layout/SideBarUser.jsx` — `../../services/AuthStore` → `../../services/authStore`
