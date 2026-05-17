# EESTEC Voting UI — Frontend Developer Guide

## Tech Stack

| Layer | Library | Version |
|---|---|---|
| Build | Vite | 7 |
| UI | React | 19 |
| Routing | React Router | 7 |
| Server state | TanStack Query | 5 |
| Client state | Zustand | 5 |
| HTTP client | Axios | 1.x |

Backend: Spring Boot at `http://localhost:8080/api`

---

## Project Structure

```
src/
  assets/               Static files (logo, SVGs)
  components/
    layout/             Shell: Layout, Sidebar, TopBar, MainPanel, NavItem, Navgroup
    ui/                 Reusable atoms: Card, Icon, SearchBar, BreadCrumb, RoleTag, IconButton
  features/
    dashboard/
      comps/            Dashboard-specific components (also reused by AttendancePage)
      data/             Mock data (Mockdashboard.js) — partially still in use
  hooks/                Custom hooks (mostly TanStack Query wrappers)
  pages/                One file per route
  router/               AppRouter, ProtectedRoute, Routes.js
  services/             All API calls + AuthStore (Zustand)
  styles/               Global CSS, variables, utils
  App.jsx               Root — renders <AppRouter />
```

---

## Architecture

### Data Flow

```
Page / Component
    └── hook (e.g. usePolls)          ← TanStack Query
            └── service (PollsApi.js) ← Axios client
                    └── AxiosClient.js (base URL + auth interceptor)
                            └── Spring Boot API
```

Auth state is managed separately via Zustand (`AuthStore.js`).
The axios client reads the JWT from localStorage on every request via a request interceptor.

### Auth Flow

1. User submits credentials → `LoginPage` calls `useAuthStore().login()`
2. `AuthStore` calls `authApi.login()` → stores JWT + user object in `localStorage`
3. Zustand state is updated: `{ user, isAuthenticated: true }`
4. `ProtectedRoute` reads `isAuthenticated` from the store — redirects to `/login` if false
5. On 401 response, the axios response interceptor clears localStorage and redirects to `/login`

User object shape stored in localStorage:
```js
{ username, role, userId, loginProperty }
// role values: 'USER' | 'MODERATOR' | 'ADMIN'
```

Role checks pattern (used in every privileged page):
```js
const { user } = useAuthStore()
const isPrivileged = ['MODERATOR', 'ADMIN'].includes(user?.role)
const isAdmin = user?.role === 'ADMIN'
```

---

## Service Layer

Each file in `src/services/` maps to one backend resource.

| File | Base endpoint | Notes |
|---|---|---|
| `AxiosClient.js` | — | Shared axios instance. Import this, not raw axios. |
| `AuthApi.js` | `/auth` | login, logout, register, getCurrentUser |
| `AuthStore.js` | — | Zustand store wrapping AuthApi. Use this in components. |
| `AnnouncementsApi.js` | `/announcements` | CRUD |
| `AttendanceApi.js` | `/attendance_check`, `/attendance_rounds`, `/attendance_records` | See below |
| `EventsApi.js` | `/events` | Full CRUD + filter by type and date range |
| `MeetingApi.js` | `/general_meetings` | get, create, patch, delete |
| `MembersApi.js` | `/memberships`, `/committees`, `/users` | Summary endpoints |
| `PollsApi.js` | `/polls` | create, getAll, getByMeeting |
| `ReportsApi.js` | `/reports` | create, inbox, sent |
| `UsersApi.js` | `/users` | getAll, getByUsername, getCurrentProfile |
| `VotingApi.js` | `/voting`, `/elections`, `/poll-options` | cast, hasVoted, count, results |
| `Dashboardapi.js` | multiple | Dashboard aggregation — uses raw `fetch()` (see Bug #4) |
| `weatherService.js` | external | OpenWeatherMap |

### AttendanceApi structure

```
AttendanceCheck (one per poll, created at poll creation)
  POST /attendance_check/poll/:pollId        → createAttendanceCheck
  POST /attendance_check/:checkId/close      → closeAttendanceCheck

AttendanceRound (multiple per check)
  POST /attendance_rounds/check/:checkId     → openRound
  POST /attendance_rounds/:roundId/close-and-open-voting
  DELETE /attendance_rounds/:roundId?adminId → deleteRound
  GET  /attendance_rounds/check/:checkId     → getRoundsByCheckId

AttendanceRecord (one per user per round)
  POST /attendance_records/check-in          → checkIn({ roundId, userId })
  POST /attendance_records/check-out         → checkOut({ roundId, userId })
  GET  /attendance_records/round/:roundId    → getRecordsByRound
  GET  /attendance_records/summary/poll/:pollId → getAttendanceSummary
```

---

## Hooks

All hooks under `src/hooks/` wrap TanStack Query. Pattern:

```js
// Read
export function usePolls() {
    return useQuery({ queryKey: ['polls'], queryFn: getAllPolls })
}

// Write — always invalidates the relevant queryKey on success
export function useCreatePoll() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: createPoll,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['polls'] })
    })
}
```

| Hook file | Exports |
|---|---|
| `useAnnouncements.js` | `useAnnouncements`, `useCreateAnnouncement` |
| `useAuth.js` | `useAuth` — reads role from localStorage (see Bug #8) |
| `useEvents.js` | `useEvents`, `useEventById`, `useEventsByType`, `useEventsByDateRange`, `useCreateEvent`, `useUpdateEvent`, `useDeleteEvent` |
| `usePolls.js` | `usePolls`, `useCreatePoll` |
| `useReports.js` | `useInbox`, `useSent`, `useCreateReport` |
| `useUsers.js` | `useUsers`, `useUser(username)`, `useCurrentUserProfile` |
| `useVoting.js` | `usePollOptions`, `useHasVoted`, `useVoteCount`, `useElectionResults`, `useCastVote` |
| `useDismissed.js` | `useDismissed` — local dismiss state for notice cards |

---

## Pages & Routes

Defined in `src/router/Routes.js`:

| Route constant | Path | Page |
|---|---|---|
| `DASHBOARD` | `/` | `DashBoardPage.jsx` |
| `EVENTS` | `/events` | `EventPage.jsx` |
| `POLLS` | `/polls` | `PollsPage.jsx` |
| `MEMBERS` | `/members` | `MembersPage.jsx` |
| `ANNOUNCEMENTS` | `/announcements` | `AnnouncementsPage.jsx` |
| `REPORTS` | `/reports` | `ReportsPage.jsx` |
| `ATTENDANCE` | `/attendance` | `AttendancePage.jsx` |
| `SETTINGS` | `/settings` | `SettingsPage.jsx` |
| `LOGIN` | `/login` | `LoginPage.jsx` (public) |
| — | `/meetings` | `MeetingsPage.jsx` (hardcoded, not in ROUTES) |

All routes except `/login` are wrapped in `ProtectedRoute`.

---

## Known Bugs

### Bug 1 — Broken login logo

**File:** `src/pages/LoginPage.jsx:40`

The EESTEC logo is imported but never used. The `<img />` tag has no `src`.

```jsx
// Current (broken)
<img />

// Fix
<img src={eesteclogo} alt="EESTEC" className={styles.logo} />
```

---

### ~~Bug 2 — Import path case mismatches~~ ✓ Fixed 2026-05-17

On Windows the filesystem is case-insensitive so these work, but they will break on Linux/Mac (e.g., CI, Docker, deployment).

| File | Import written as | Actual filename |
|---|---|---|
| `src/hooks/useAuth.js:1` | `'../services/authApi'` | `AuthApi.js` |
| `src/router/ProtectedRoute.jsx:2` | `'../services/authStore'` | `AuthStore.js` |
| `src/hooks/useEvents.js:10` | `'../services/eventsApi'` | `EventsApi.js` |
| `src/pages/DashBoardPage.jsx:12` | `'../services/dashboardApi'` | `Dashboardapi.js` |
| `src/router/AppRouter.jsx:9` | `'./routes'` | `Routes.js` |

**Fix:** Rename files to all-lowercase camelCase so the import matches the filename:
- `AuthApi.js` → `authApi.js`
- `AuthStore.js` → `authStore.js`
- `EventsApi.js` → `eventsApi.js`
- `Dashboardapi.js` → `dashboardApi.js`
- `Routes.js` → `routes.js`

Then update all import sites to match. Also normalize `AxiosClient.js` → `axiosClient.js` (some files use `'./axiosClient'`, `MeetingApi.js` uses `'./AxiosClient'`).

---

### ~~Bug 3 — Delete button always rendered in `AttendanceRoundCard`~~ ✓ Fixed 2026-05-17

**File:** `src/features/dashboard/comps/AttendanceRoundCard.jsx:79`

The `✕` delete button renders regardless of whether `onDelete` is null. Non-privileged users see the button and clicking it throws `TypeError: onDelete is not a function`.

```jsx
// Current (broken for non-privileged users)
<button className={styles.btnDelete} onClick={onDelete}>✕</button>

// Fix
{onDelete && (
    <button className={styles.btnDelete} onClick={onDelete}>✕</button>
)}
```

---

### ~~Bug 4 — `Dashboardapi.js` bypasses the axios client~~ ✓ Fixed 2026-05-17

**File:** `src/services/dashboardApi.js`

All functions use raw `fetch()` and manually build `Authorization` headers. The axios client already handles this via interceptor. This creates two sources of truth for auth — if the token key in localStorage ever changes, `Dashboardapi.js` silently stops sending auth.

**Fix:** Rewrite each function to use `client` from `AxiosClient.js`:

```js
// Before
export async function fetchEvents() {
    const res = await fetch(`${BASE}/events`, { headers: authHeaders() })
    // ...
}

// After
export async function fetchEvents() {
    const res = await client.get('/events')
    const data = res.data
    // ...
}
```

Remove the `BASE` constant and `authHeaders()` helper once all functions are migrated.

---

### Bug 5 — Hardcoded stale date on Dashboard

**File:** `src/pages/DashBoardPage.jsx:13`

```js
// Current (wrong every day except Feb 17 2026)
const TODAY = 'Tuesday, February 17 · 2026'

// Fix
const TODAY = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
})
```

---

### ~~Bug 6 — Active meeting rounds not fetched on load~~ ✓ Fixed 2026-05-17

**File:** `src/features/dashboard/comps/ActiveMeetingTab.jsx`

`roundsByPoll` starts as `{}`. When the page loads, existing rounds from the backend are never fetched — they only appear in state after `handleOpenRound` is called (which creates a new round). After a page refresh, previously opened rounds disappear from the UI.

**Fix:** After `fetchData()` resolves and `meeting` is set, loop over each poll's `attendanceCheckId` and call `getRoundsByCheckId` to populate `roundsByPoll`.

```js
// Add import
import { getRoundsByCheckId } from '../../../services/AttendanceApi'

// In fetchData(), after setting meeting:
const polls = activeMeeting.polls ?? []
const roundsMap = {}
await Promise.all(
    polls
        .filter(p => p.attendanceCheckId)
        .map(async p => {
            const rounds = await getRoundsByCheckId(p.attendanceCheckId)
            roundsMap[p.id] = rounds
        })
)
setRoundsByPoll(roundsMap)
```

---

### Bug 7 — Dashboard still uses mock user and mock weather

**File:** `src/pages/DashBoardPage.jsx:10,48`

```jsx
import { mockUser, mockWeather, mockAttendance } from '../features/dashboard/data/mockDashboard'
// ...
<HeroWelcome, user={mockUser}, weather={mockWeather}, date={TODAY}; />
<AttendanceCard sessions={mockAttendance} />
```

`HeroWelcome` and `AttendanceCard` receive hardcoded mock data instead of the real logged-in user and live attendance. The real user is available from `useAuthStore()`.

**Fix (user):** Replace `mockUser` with the Zustand store:
```js
const { user } = useAuthStore()
// pass user directly or map the fields HeroWelcome expects
```

**Fix (attendance):** Wire `AttendanceCard` to a real API call (e.g., the active meeting's attendance summary).

---

### Bug 8 — `useAuth` hook creates a second, non-reactive auth state

**File:** `src/hooks/useAuth.js`

This hook reads from `authApi.getCurrentUser()` (localStorage directly) instead of the Zustand store. Components using this hook will not re-render when the user logs in or out, because localStorage reads are not reactive.

The hook is only used in a few places (e.g., some older page versions). The canonical pattern everywhere else is:

```js
const { user } = useAuthStore()
```

**Fix:** Either delete `useAuth.js` and replace its usages with `useAuthStore()`, or rewrite the hook to read from the store:

```js
import useAuthStore from '../services/AuthStore'

export function useAuth() {
    const { user } = useAuthStore()
    const isPrivileged = ['MODERATOR', 'ADMIN'].includes(user?.role)
    const isAdmin = user?.role === 'ADMIN'
    return { user, isPrivileged, isAdmin }
}
```

---

### Bug 9 — `/meetings` route not in `ROUTES` constant

**File:** `src/router/AppRouter.jsx:55`

```jsx
<Route path="/meetings" element={<MeetingsPage />} />
```

This route is hardcoded as a string instead of using `ROUTES.MEETINGS` (which is defined in `Routes.js`). Any link to `/meetings` that uses `ROUTES.MEETINGS` will work, but if someone refactors the path in `Routes.js`, this route won't update.

**Fix:**
```jsx
<Route path={ROUTES.MEETINGS} element={<MeetingsPage />} />
```

---

## Conventions to Follow When Adding Features

### Adding a new API service

1. Create `src/services/myFeatureApi.js`
2. Import and use `client` from `'./axiosClient'` (lowercase)
3. Export named async functions — one per operation

```js
import client from './axiosClient'

export const getAll = async () => {
    const response = await client.get('/my-resource')
    return response.data
}
```

### Adding a new hook

```js
// src/hooks/useMyFeature.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAll, create } from '../services/myFeatureApi'

export function useMyFeature() {
    return useQuery({ queryKey: ['myFeature'], queryFn: getAll })
}

export function useCreateMyFeature() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: create,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['myFeature'] })
    })
}
```

### Adding a new page

1. Create `src/pages/MyPage.jsx` and `MyPage.module.css`
2. Add the route constant to `src/router/routes.js`
3. Import the page and add a `<Route>` in `AppRouter.jsx` using the constant
4. Add a `NavItem` in the sidebar

### Role-gating UI

```jsx
const { user } = useAuthStore()
const isPrivileged = ['MODERATOR', 'ADMIN'].includes(user?.role)

{isPrivileged && <button>Admin-only action</button>}
```

---

## Priority Fix Order

### Fix now — runtime, functionality, API

1. ~~**Bug 3** — Crash for non-privileged users on attendance page~~ ✓ Fixed
2. ~~**Bug 2** — Import case mismatches~~ ✓ Fixed
3. ~~**Bug 6** — Rounds not fetched on page load~~ ✓ Fixed
4. ~~**Bug 4** — `Dashboardapi.js` bypasses axios client (silent auth failure risk)~~ ✓ Fixed
5. **Bug 8** — Non-reactive `useAuth` hook (stale state after login/logout)
6. **Bug 7** — Dashboard shows mock user and mock attendance instead of real data

### Low priority — layout and cosmetic

7. **Bug 1** — Login page logo has no `src` (broken image)
8. **Bug 5** — Hardcoded stale date on dashboard
9. **Bug 9** — `/meetings` route uses a hardcoded string instead of `ROUTES.MEETINGS`
