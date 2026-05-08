# TodoList Pro — Project Documentation

> **Stack:** React 19 · TypeScript · Vite · Tailwind CSS v4 · Firebase (Auth + Firestore) · Recharts · React Router v7 · Lucide Icons · date-fns

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Application Flow](#4-application-flow)
5. [Authentication](#5-authentication)
6. [Data Models](#6-data-models)
7. [Firestore Context & CRUD Operations](#7-firestore-context--crud-operations)
8. [Pages & Features](#8-pages--features)
   - [Login](#81-login)
   - [Dashboard](#82-dashboard)
   - [Tasks](#83-tasks)
   - [Plans](#84-plans)
   - [Analytics](#85-analytics)
9. [Components](#9-components)
10. [Hooks](#10-hooks)
11. [Routing](#11-routing)
12. [Navigation Layout](#12-navigation-layout)
13. [Notifications System](#13-notifications-system)
14. [Data Import / Export](#14-data-import--export)
15. [Firebase Configuration](#15-firebase-configuration)
16. [Deployment](#16-deployment)
17. [Environment Variables](#17-environment-variables)

---

## 1. Project Overview

**TodoList Pro** is a cloud-synced productivity web app that lets users create tasks, track recurring schedules, organise goals into Plans, and visualise progress with charts. All data is stored per-user in Firebase Firestore and syncs in real-time across devices.

**Key goals:**
- Full CRUD task management with priority, category, due date/time, and recurrence
- Goal tracking via "Plans" with auto-calculated completion status
- Visual analytics with daily, weekly, and yearly chart breakdowns
- Zero-friction onboarding via Google Sign-In
- Progressive Web App-ready (push notifications, Firebase Hosting SPA rewrite)

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite 8 |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) + CSS custom properties |
| Backend | Firebase Firestore (NoSQL, real-time) |
| Auth | Firebase Auth — Google OAuth popup |
| Routing | React Router DOM v7 |
| Charts | Recharts |
| Icons | Lucide React |
| Date handling | date-fns |
| Hosting | Firebase Hosting (SPA mode) |

---

## 3. Project Structure

```
src/
├── main.tsx                  # React root mount
├── App.tsx                   # Router definition
├── AppProvider.tsx           # Auth gate + layout shell (sidebar, mobile nav)
├── index.css                 # Global CSS variables, glass utilities, animations
├── App.css                   # (legacy, unused)
│
├── assets/                   # Static images/icons
│
├── contexts/
│   ├── AuthContext.tsx        # Firebase Auth state, signIn(), signOut()
│   └── FirestoreContext.tsx   # All Firestore CRUD, real-time listeners, export/import
│
├── hooks/
│   └── useNotifications.ts    # Browser Notification API integration
│
├── types/
│   └── index.ts              # All shared TypeScript types
│
├── utils/
│   └── firebase.ts           # Firebase app init, auth, db, googleProvider
│
├── components/
│   ├── Sidebar.tsx            # Desktop/mobile sidebar navigation
│   ├── Card.tsx               # Card / CardHeader / CardBody / CardFooter
│   ├── EmptyState.tsx         # Reusable empty-state illustration block
│   └── Loading.tsx            # Full-screen loading spinner
│
└── pages/
    ├── Login.tsx              # Public login page
    ├── Dashboard.tsx          # Overview: stats, today's tasks, activity, plans
    ├── Tasks.tsx              # Task list with filters, form modal, grouped view
    ├── Plans.tsx              # Goal plans with circular progress, linked tasks
    └── Analytics.tsx          # Recharts: bar, line, pie charts by date range
```

---

## 4. Application Flow

```
Browser opens
     │
     ▼
 main.tsx → App.tsx (BrowserRouter)
     │
     ▼
 AppProvider.tsx
     │
     ├─ AuthProvider (Firebase onAuthStateChanged)
     │        │
     │        ├─ loading=true  →  <Loading />
     │        │
     │        ├─ user=null     →  <Login />
     │        │                    └─ signIn() → Google popup → onAuthStateChanged fires
     │        │
     │        └─ user=User     →  FirestoreProvider
     │                                │
     │                     real-time listeners start
     │                     (tasks, plans via onSnapshot)
     │                                │
     │                         Layout Shell renders:
     │                           <Sidebar />          (desktop left, mobile drawer)
     │                           <main> {children} </main>
     │                           <MobileBottomNav />   (mobile only, z-40)
     │
     └─ Routes (React Router)
          /               →  Dashboard
          /tasks          →  Tasks
          /analytics      →  Analytics
          /plans          →  Plans
```

---

## 5. Authentication

**File:** `src/contexts/AuthContext.tsx`  
**Firebase module:** `firebase/auth` — `onAuthStateChanged`, `signInWithPopup`, `signOut`

### Functions

| Function | Description |
|---|---|
| `signIn()` | Opens Google OAuth popup via `signInWithPopup(auth, googleProvider)`. Throws on failure. |
| `signOut()` | Calls `firebaseSignOut(auth)`, clears user session. |

### Context value

```ts
{
  user: User | null;   // Firebase User object (null = not logged in)
  loading: boolean;    // true while onAuthStateChanged resolves on page load
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}
```

### Gate logic (AppProvider)

- `loading === true` → renders `<Loading />`
- `user === null` → renders `<Login />`
- `user !== null` → wraps children in `<FirestoreProvider>` and layout

---

## 6. Data Models

**File:** `src/types/index.ts`

### Task

```ts
interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: 'work' | 'personal' | 'health' | 'shopping' | 'studying' | 'planning';
  status: 'pending' | 'completed';
  dueDate: string;          // ISO date string "YYYY-MM-DD"
  dueTime: string;          // "HH:MM" (24h)
  startDate: string | null;
  recurring: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  createdAt: string;        // Firestore serverTimestamp → ISO string
  completedAt: string | null;
  userId: string;           // Firebase Auth UID
  planId: string | null;    // linked Plan id
}
```

### Plan

```ts
interface Plan {
  id: string;
  title: string;
  description: string;
  targetDate: string;       // ISO date string
  targetCount: number;      // goal: how many tasks to complete
  completedCount: number;   // auto-synced from linked completed tasks
  linkedTaskIds: string[];  // task IDs linked to this plan
  status: 'on_track' | 'at_risk' | 'completed' | 'overdue' | 'failed';
  createdAt: string;
  userId: string;
}
```

### Plan Status Logic (`Plans.tsx` — `calculatePlanStatus`)

```
if completedCount >= targetCount          → "completed"
if targetDate is past (and not done)      → "failed"
expected = (daysPassed / totalDays) × targetCount
if completedCount >= expected             → "on_track"
if completedCount >= expected × 0.7      → "at_risk"
else                                      → "overdue"
```

### CategoryData (static, not stored in Firestore)

```ts
interface CategoryData {
  id: string;
  name: string;
  color: string;  // hex
  icon: string;   // Lucide icon name
}
```

Default categories: Work · Personal · Health · Shopping · Studying · Planning

---

## 7. Firestore Context & CRUD Operations

**File:** `src/contexts/FirestoreContext.tsx`  
**Firestore collections:** `tasks`, `plans` — each filtered by `userId`

### Real-time Listeners (useEffect on user change)

```
onSnapshot(query(collection(db,'tasks'), where('userId','==',uid)))
  → setTasks([...])

onSnapshot(query(collection(db,'plans'), where('userId','==',uid)))
  → setPlans([...])
```

Both listeners unsubscribe automatically on user change or unmount.

### Context API

| Function | Signature | Description |
|---|---|---|
| `addTask` | `(task: Omit<Task,'id'\|'createdAt'\|'completedAt'>) → Promise<string>` | Adds doc to `tasks` collection with `serverTimestamp`. Returns new doc ID. |
| `updateTask` | `(id, Partial<Task>) → Promise<void>` | Updates specific fields on a task document. |
| `deleteTask` | `(id) → Promise<void>` | Deletes task document from Firestore. |
| `addPlan` | `(plan: Omit<Plan,'id'\|'createdAt'\|'completedCount'>) → Promise<string>` | Adds plan with `completedCount: 0` and `serverTimestamp`. |
| `updatePlan` | `(id, Partial<Plan>) → Promise<void>` | Updates plan fields. |
| `deletePlan` | `(id) → Promise<void>` | Deletes plan document. |
| `exportData` | `() → string` | Serialises `{tasks, plans, categories, exportedAt}` to JSON string. |
| `importData` | `(jsonString) → Promise<void>` | Parses JSON and batch-inserts tasks and plans with current `userId`. |
| `clearAllData` | `() → Promise<void>` | Deletes every task and plan doc sequentially. |

---

## 8. Pages & Features

### 8.1 Login

**File:** `src/pages/Login.tsx`

**Visible to:** unauthenticated users only (gate in AppProvider)

**UI elements:**
- App logo icon + product name + tagline
- 4 feature-highlight cards (Smart priorities, Goal tracking, Analytics, Cloud sync)
- Google Sign-In button with SVG Google logo
- Error message display on sign-in failure
- Animated background gradient orbs
- Legal footer text

**Functions:**
```ts
handleSignIn()
  → setLoading(true)
  → await signIn()          // Google popup
  → on success: AppProvider re-renders with user session
  → on failure: setError('Failed to sign in. Please try again.')
  → setLoading(false)
```

---

### 8.2 Dashboard

**File:** `src/pages/Dashboard.tsx`

**Purpose:** High-level snapshot of the user's current status.

#### Computed Data (via `useMemo`)

| Variable | Source | Description |
|---|---|---|
| `stats` | All tasks | `total`, `completed`, `pending`, `overdue`, `completionRate` |
| `todayTasks` | Tasks where `isToday(dueDate)` + `status='pending'` | Up to 4, for the "Today" panel |
| `recentActivity` | Tasks where `status='completed'`, sorted by `completedAt` desc | Up to 5, for the activity feed |
| `activePlans` | Plans where `status !== 'completed'` | Up to 2, for the plans preview |

#### UI Sections

1. **Greeting header** — time-aware ("Good Morning/Afternoon/Evening, [FirstName]")
2. **Stats row** — 4 tiles: Total Tasks, Completed (with % badge), Pending, Overdue
3. **Today's Tasks panel** — list of today's pending tasks with priority dot + due time badge; empty state if clear
4. **Recent Activity panel** — chronological feed of recently completed tasks
5. **Active Plans panel** — horizontal progress bar per plan; "Create Plan" CTA if none
6. **Floating Action Button** — navigates to `/tasks?new=true`

---

### 8.3 Tasks

**File:** `src/pages/Tasks.tsx`

**Purpose:** Full task management with creation, editing, filtering, sorting, and grouped display.

#### State

| State | Type | Default | Description |
|---|---|---|---|
| `showForm` | boolean | from URL `?new=true` | Show/hide add-edit modal |
| `search` | string | `''` | Full-text search filter |
| `filterStatus` | `'all'\|'pending'\|'completed'` | `'all'` | Status filter |
| `filterPriority` | Priority \| `'all'` | `'all'` | Priority filter |
| `filterCategory` | Category \| `'all'` | `'all'` | Category filter |
| `sortBy` | `'dueDate'\|'priority'\|'createdAt'` | `'dueDate'` | Sort key |
| `sortOrder` | `'asc'\|'desc'` | `'asc'` | Sort direction |
| `editingTask` | `Task\|null` | `null` | Task being edited (null = create mode) |
| `formData` | object | empty strings | Controlled form fields |

#### Computed Data (`useMemo`)

**`filteredTasks`** — pipeline:
1. Apply `search` (matches `title` or `description`)
2. Apply `filterStatus`, `filterPriority`, `filterCategory`
3. Sort by `sortBy` + `sortOrder`

**`groupedTasks`** — buckets tasks into:

| Group | Condition |
|---|---|
| Overdue | `status='pending'` + `dueDate` is past (not today) |
| Today | `isToday(dueDate)` |
| Tomorrow | `isTomorrow(dueDate)` |
| This Week | within 7 days from now |
| Later | further than 7 days |
| No Due Date | `dueDate` is empty |
| Completed | `status='completed'` |

#### Handler Functions

| Function | Description |
|---|---|
| `handleSubmit(e)` | Create or update task via `addTask` / `updateTask`. Closes modal. |
| `handleEdit(task)` | Populates form with existing task data, opens modal in edit mode. |
| `handleToggleComplete(task)` | Flips status between `'pending'` / `'completed'`. Sets `completedAt` timestamp. |
| `handleDelete(id)` | Confirms, then calls `deleteTask(id)`. |
| `resetForm()` | Resets all `formData` fields to defaults. |

#### Task Card UI

Each task row shows:
- Priority-coloured left border (3px: red / amber / green)
- Checkbox toggle (Circle → CheckCircle2 with animation)
- Title + description (line-through when completed)
- Badge chips: Priority · Category · Due Date · Due Time · Recurring
- Edit + Delete action buttons

#### Form Modal Fields

Title · Description · Priority (select) · Category (select) · Due Date · Due Time · Recurring (select)

---

### 8.4 Plans

**File:** `src/pages/Plans.tsx`

**Purpose:** Goal tracking — create deadline-bound plans, link tasks, monitor progress.

#### Key Logic

**`calculatePlanStatus(plan)`** — pure function that returns a `PlanStatus` string based on:
- Completion ratio vs time elapsed ratio
- Whether the target date has passed

**`CircularProgress`** — SVG-based circular progress ring component:
- Props: `percentage`, `color`, `size` (default 60px)
- Animated stroke via `strokeDashoffset` CSS transition
- Shows percentage text in centre

#### State

| State | Description |
|---|---|
| `showForm` | Modal visibility |
| `editingPlan` | Plan being edited (null = create) |
| `selectedPlan` | ID of plan whose linked tasks are expanded |
| `formData` | `{title, description, targetDate, targetCount}` |

#### Computed Data

**`plansWithStatus`** — each plan annotated with `calculatedStatus` (re-computed on every render via `useMemo`).

**`linkedTasks`** — tasks filtered by `task.planId === selectedPlan`.

**`overallStats`** — counts of plans in each status bucket (On Track / At Risk / Completed / Overdue).

#### Auto-sync Effect

```ts
useEffect(() => {
  plans.forEach(plan => {
    const linked = tasks.filter(t => t.planId === plan.id && t.status === 'completed').length;
    if (linked !== plan.completedCount) updatePlan(plan.id, { completedCount: linked });
  });
}, [tasks, plans]);
```
Keeps `completedCount` accurate whenever tasks change.

#### Quick Templates

| Template | Days ahead | Target count |
|---|---|---|
| Weekly Goal | 7 | 7 |
| Monthly Goal | 30 | 20 |
| 30-Day Challenge | 30 | 30 |

#### Plan Card UI

- Coloured top bar (status colour)
- Circular progress ring + percentage
- Status badge chip
- Target date + days remaining
- Expandable linked tasks section (CSS max-height transition)
- Edit / Delete buttons

---

### 8.5 Analytics

**File:** `src/pages/Analytics.tsx`

**Purpose:** Visualise task completion over time by day, week, or year.

#### View Types

| View | X-axis | Chart | Source data |
|---|---|---|---|
| `month` | Each day of current month | Bar chart (completed vs total per day) | `eachDayOfInterval` |
| `week` | Each week-start in current month | Line chart (completed per week) | `eachWeekOfInterval` |
| `year` | Each month of current year | Bar chart (completed vs total per month) | `eachMonthOfInterval` |

#### Navigation

`handlePrev()` / `handleNext()` shift `currentDate` by ±1 month, ±1 week, or ±1 year depending on `viewType`.

#### Computed Data (`useMemo`)

| Variable | Description |
|---|---|
| `dateRange` | `{start, end, label}` for the current view window |
| `stats` | `{total, completed, rate}` — tasks within the current range |
| `monthlyData` | Array of `{date, completed, total}` per day |
| `weeklyData` | Array of `{week, completed}` per week-start |
| `yearlyData` | Array of `{month, completed, total}` per month |
| `categoryData` | `{name, value, color}[]` — completed tasks grouped by category |

#### Charts (Recharts)

| Chart | Component | Data key |
|---|---|---|
| Daily bar | `<BarChart>` + `<Bar>` × 2 | `completed`, `total` |
| Weekly line | `<LineChart>` + `<Line>` | `completed` |
| Yearly bar | `<BarChart>` + `<Bar>` × 2 | `completed`, `total` |
| Category pie | `<PieChart>` + `<Pie>` + `<Cell>` | `value` |

All charts use `<ResponsiveContainer width="100%" height="100%">` for fluid sizing.

---

## 9. Components

### `Sidebar.tsx`

**Props:** `isOpen: boolean`, `setIsOpen: (open: boolean) => void`

| Feature | Detail |
|---|---|
| Navigation items | Dashboard · Tasks · Analytics · Plans (using `<NavLink>`) |
| Active state | Active indicator bar on left edge, icon highlighted |
| User card | Avatar, display name, email from Firebase `user` object |
| Settings panel | Collapsible (chevron toggle): Export · Import · Clear All |
| Sign Out | Calls `signOut()` from AuthContext |
| Mobile | Hidden off-screen (`-translate-x-full`); opened by `isOpen` prop |
| Desktop | Always visible (`lg:translate-x-0`) |
| Keyboard | `Escape` key closes mobile sidebar |

### `Card.tsx`

Sub-components exported:

- `<Card>` — outer wrapper with glass background, rounded-2xl
- `<CardHeader>` — top section with bottom border
- `<CardBody>` — padded content area
- `<CardFooter>` — bottom section with top border

### `EmptyState.tsx`

**Props:** `title`, `description?`, `action?` (ReactNode), `icon?` (ReactNode)

Renders a centred illustration block with floating animation.

### `Loading.tsx`

Full-screen loading splash shown while Firebase resolves auth state:
- App icon with glow animation
- Three pulsing dots
- "Loading your tasks…" label

---

## 10. Hooks

### `useNotifications` (`src/hooks/useNotifications.ts`)

Integrates the browser **Notification API** with Firestore task data.

#### Functions

| Function | Description |
|---|---|
| `requestPermission()` | Requests browser notification permission. Returns `true` if granted. |
| `sendNotification(title, body, icon?)` | Fires a `new Notification(...)` if permission granted. Uses tag `'todolist-reminder'`. |

#### Effects

**Due-soon checker** (runs every 60 seconds via `setInterval`):
- Finds today's pending tasks that have `dueTime` set
- If `differenceInMinutes(dueTime, now) <= 15 && >= 0` → fires notification
- De-duplicates via `sessionStorage` key `notified-{taskId}-{date}`

**Overdue checker** (runs on task change):
- Finds tasks past their due date
- Fires one overdue summary notification per day (de-duplicated via sessionStorage)

---

## 11. Routing

**File:** `src/App.tsx`

```tsx
<BrowserRouter>
  <AppProvider>      {/* auth gate + layout */}
    <Routes>
      <Route path="/"          element={<Dashboard />} />
      <Route path="/tasks"     element={<Tasks />} />
      <Route path="/analytics" element={<Analytics />} />
      <Route path="/plans"     element={<Plans />} />
    </Routes>
  </AppProvider>
</BrowserRouter>
```

**URL params:**
- `/tasks?new=true` — auto-opens the task creation modal on page load

---

## 12. Navigation Layout

**File:** `src/AppProvider.tsx`

The layout shell wraps all authenticated pages.

```
┌──────────────────────────────────────────────┐
│  Sidebar (w-72, fixed, desktop only visible) │
├──────────────────────────────────────────────┤
│                                              │
│  <main>                                      │
│    max-w-6xl, px-6..px-12, py-10..py-12      │
│    {children}   ← page content               │
│                                              │
├──────────────────────────────────────────────┤
│  Mobile Bottom Nav (lg:hidden, fixed bottom) │
│  [ Home ] [ Tasks ] [ Stats ] [ Plans ]      │
└──────────────────────────────────────────────┘
```

**Mobile bottom nav** — 4 `<NavLink>` items with active gradient pill background. Uses `env(safe-area-inset-bottom)` for device notch support.

**Mobile sidebar trigger** — hamburger `<Menu>` button fixed at `top-3 left-3` (z-30), hidden on `lg:`.

---

## 13. Notifications System

```
Page load
  └─ useNotifications() called in a page component
       │
       ├─ requestPermission() → browser asks user
       │
       └─ setInterval(checkNotifications, 60000)
              │
              └─ for each task with dueTime set and isToday:
                   compute diff = dueTime - now (minutes)
                   if diff ≤ 15 and ≥ 0:
                     check sessionStorage → if not notified:
                       sendNotification("Task Due Soon: ...")
                       mark sessionStorage
```

**Note:** The hook must be called inside a component inside `FirestoreProvider` to access `tasks`.

---

## 14. Data Import / Export

### Export

`exportData()` returns a JSON string:
```json
{
  "tasks": [...],
  "plans": [...],
  "categories": [...],
  "exportedAt": "2026-05-08T..."
}
```
Triggered by Sidebar Settings → Export → downloads as `todolist-export-YYYY-MM-DD.json`.

### Import

`importData(jsonString)`:
1. Parses JSON
2. Strips existing `id` from each item
3. Re-inserts with the current user's `uid` and fresh `serverTimestamp`
4. Triggered by Sidebar Settings → Import → file picker (`.json` only)

### Clear All

`clearAllData()`:
- Iterates current `tasks` and `plans` arrays
- Deletes each document from Firestore sequentially
- Protected by `window.confirm()` prompt

---

## 15. Firebase Configuration

**File:** `src/utils/firebase.ts`

```ts
initializeApp(firebaseConfig)
getAuth(app)          → auth
getFirestore(app)     → db
new GoogleAuthProvider() → googleProvider
```

Config values read from `import.meta.env.VITE_FIREBASE_*` variables (with hardcoded fallback strings for development). See [Environment Variables](#17-environment-variables).

**Firestore Security Rules** (to configure in Firebase Console):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /tasks/{taskId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null;
    }
    match /plans/{planId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null;
    }
  }
}
```

---

## 16. Deployment

**Firebase Hosting** (`firebase.json`):
- Build output: `dist/`
- SPA rewrite: all routes → `index.html`

```bash
# Build
npm run build

# Deploy to Firebase Hosting
npx firebase deploy --only hosting
```

---

## 17. Environment Variables

Create a `.env` file at the project root:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

> All keys are prefixed `VITE_` so Vite exposes them to the browser bundle via `import.meta.env`.

---

## Feature Matrix

| Feature | Status | Notes |
|---|---|---|
| Google Sign-In | ✅ | Firebase Auth popup |
| Task CRUD | ✅ | Firestore, real-time sync |
| Task priorities | ✅ | High / Medium / Low |
| Task categories | ✅ | 6 categories |
| Due date + time | ✅ | date-fns parsing |
| Recurring tasks | ✅ | none/daily/weekly/monthly/yearly |
| Search + filters | ✅ | Inline, client-side |
| Grouped task view | ✅ | 7 automatic date groups |
| Plan creation | ✅ | Deadline + target count |
| Plan status calc | ✅ | on_track/at_risk/overdue/failed/completed |
| Plan ↔ Task link | ✅ | via `task.planId` |
| Circular progress | ✅ | SVG, animated stroke |
| Dashboard stats | ✅ | 4 KPI tiles + activity feed |
| Analytics charts | ✅ | Recharts (bar, line, pie) |
| Push notifications | ✅ | Browser Notification API |
| JSON export | ✅ | Full tasks + plans |
| JSON import | ✅ | Re-inserts with current user |
| Clear all data | ✅ | Batch Firestore delete |
| Mobile responsive | ✅ | Bottom nav + drawer sidebar |
| Real-time sync | ✅ | Firestore onSnapshot |
| Firebase Hosting | ✅ | SPA mode with rewrite |
| Share / collaboration | ❌ | Type defined (ShareInvitation) but not implemented |
