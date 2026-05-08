# TodoList Pro UI Documentation

## Overview

TodoList Pro uses a dark, glassmorphism-inspired interface built with React, Tailwind CSS, Lucide icons, and Recharts. The UI is centered on four authenticated application areas:

- Dashboard
- Tasks
- Analytics
- Plans

Before authentication, users land on a branded login screen with animated background glows and a Google sign-in call to action.

The visual style emphasizes:

- Dark backgrounds with layered gradients and blur
- Bright accent colors for status and navigation
- Rounded cards and panels
- Dense but readable dashboard-style layouts
- Mobile-responsive stacking for cards, charts, and controls

---

## UI Structure

### Public UI

#### Login Screen

The login screen is the public entry point of the app.

Primary elements:

- App logo with gradient icon block
- Product name: `TodoList Pro`
- Subtitle: `Your productivity companion`
- Four feature highlight cards
- Google sign-in button
- Error message area for failed sign-in attempts
- Footer legal text

Visual behavior:

- Full-screen dark background
- Animated blurred gradient orbs in the background
- Glassmorphism login card with rounded corners and shadow
- Gradient headline styling via `gradient-text`
- Subtle entrance animations such as fade and scale

---

### Authenticated App Shell

After authentication, the app uses a sidebar-plus-content layout.

Shell regions:

- Fixed left sidebar on desktop
- Slide-in drawer behavior on mobile
- Main content area that switches by route
- Floating mobile menu button when sidebar is closed

---

## Shared Visual Language

### Color Palette

The UI is primarily driven by CSS variables and repeated Tailwind utility usage.

Core colors:

- Primary: indigo / violet
- Secondary: emerald
- Accent: amber
- Danger: rose / red
- Background: deep navy `#0a0f1a`
- Surface: slate-based dark panels
- Text: white and slate variants

Common status mapping:

- High priority / overdue: red or rose
- Medium priority / warning: amber
- Low priority / positive: emerald
- Primary actions / brand: indigo-violet gradient

### Typography

- Font family: `Inter`, with system fallbacks
- Large bold headings on primary screens
- Secondary text uses slate tones for contrast hierarchy
- Small labels and badges are used heavily inside cards and filters

### Shapes and Surfaces

- Large radius cards: `rounded-2xl` and `rounded-3xl`
- Transparent layered panels using blur and low-opacity borders
- Repeated use of shadows for focus and depth
- Gradient-backed icon containers for emphasis

### Motion

Defined animation utilities include:

- `animate-fade-in`
- `animate-scale-in`
- `animate-slide-in`
- `animate-glow`
- `animate-float`
- `animate-pulse`

These are used for login presentation, highlight cards, and dashboard accents.

---

## Sidebar UI

The sidebar is the primary navigation component for authenticated users.

### Content

- Brand header with sparkles icon and `TodoList Pro`
- User avatar, display name, and email
- Navigation links:
  - Dashboard
  - Tasks
  - Analytics
  - Plans
- Expandable Settings section
- Sign out action

### Settings Actions

- Export data
- Import data
- Clear all data

### Interaction Notes

- The current route is highlighted using a side indicator bar and brighter text
- On mobile, the sidebar can be dismissed by:
  - tapping the overlay
  - pressing `Escape`
  - selecting a navigation item

---

## Page-by-Page UI

### 1. Dashboard

The Dashboard is the high-level overview screen.

#### Main sections

- Greeting header with time-based message
- Four summary stat cards:
  - Total Tasks
  - Completed
  - Pending
  - Overdue
- Today’s Tasks panel
- Recent Activity panel
- Active Plans panel
- Floating action button for creating a task

#### Dashboard patterns

- Responsive stat grid: `2 columns on smaller screens`, `4 columns on large screens`
- Icon-led summary cards with gradients and subtle decorative glows
- Empty states with centered icons and supportive copy
- Quick action links to Tasks and Plans pages

#### Purpose

This screen is designed to answer three questions quickly:

- What needs attention now?
- What was recently completed?
- Which plans are currently active?

---

### 2. Tasks

The Tasks page is the most interaction-heavy part of the UI.

#### Main sections

- Page header with `Add Task` button
- Search input
- Filter controls:
  - status
  - priority
  - category
- Sort toggle
- Modal form for creating or editing tasks
- Grouped task list

#### Task groups

Tasks are grouped into date-based buckets:

- Overdue
- Today
- Tomorrow
- This Week
- Later
- No Due Date
- Completed

#### Task modal fields

- Title
- Description
- Priority
- Category
- Due date
- Due time
- Recurring setting

#### Interaction patterns

- Toggle complete / incomplete
- Edit a task in the same modal used for creation
- Delete with confirmation
- Open new-task state from route query param `?new=true`

#### UI style

- Dark control bar for search and filters
- Rounded list cards with hover emphasis
- Status and metadata are shown inline with icons and small labels

---

### 3. Analytics

The Analytics page visualizes task completion and category distribution.

#### Main sections

- Page header with icon
- View toggle:
  - month
  - week
  - year
- Date navigator with previous / next controls
- Three summary metric cards:
  - Total Tasks
  - Completed
  - Completion Rate
- Main chart panel
- Category distribution pie chart panel

#### Chart types

- Monthly view: bar chart
- Weekly view: line chart
- Yearly view: bar chart
- Category breakdown: pie chart

#### UI style

- Analytics panels use the same dark card treatment as the rest of the app
- Recharts tooltips are styled to match the app theme
- The charts are responsive and meant to stack vertically on smaller screens

---

### 4. Plans

The Plans page is focused on long-term tracking and target-based progress.

#### Main sections

- Page header with `New Plan` button
- Four overview cards:
  - On Track
  - At Risk
  - Completed
  - Overdue
- Plan creation / edit modal
- Plan card list grid

#### Plan modal fields

- Title
- Description
- Target date
- Target count
- Quick templates:
  - Weekly Goal
  - Monthly Goal
  - 30-Day Challenge

#### Plan card content

- Plan title and description
- Status badge
- Progress bar
- Progress count
- Target date
- Actions for editing and deleting
- Linked task visibility

#### Status model in UI

Plan states are color-coded:

- On Track: green
- At Risk: amber
- Completed: green
- Overdue / Failed: red

---

## Reusable UI Patterns

### Cards

Used throughout Dashboard, Analytics, Tasks, and Plans.

Shared traits:

- rounded corners
- dark translucent backgrounds
- soft borders
- shadow and blur
- icon + label + value composition

### Buttons

Types used in the UI:

- Gradient primary buttons for major actions
- Neutral dark buttons for secondary actions
- Icon buttons for inline actions and dismissals
- Floating action button on Dashboard

### Empty States

The project consistently includes empty states with:

- large centered icon
- short title
- explanatory supporting text
- action button when useful

### Status Indicators

Status is communicated using:

- badge pills
- colored dots
- progress bars
- icon color mapping

---

## Responsive Behavior

The UI is designed to adapt across desktop and mobile.

### Mobile patterns

- Sidebar collapses into an off-canvas drawer
- Mobile overlay darkens the app while the drawer is open
- Some button labels hide on small screens to save width
- Dashboard cards collapse into smaller grids
- Analytics content stacks vertically
- Tasks controls wrap into multiple rows

### Desktop patterns

- Persistent sidebar on the left
- Larger multi-column dashboard cards
- Wider modal forms
- Side-by-side content blocks for overview screens

---

## Current UI Entry Flow

1. User opens the app
2. If not authenticated, the login screen is shown
3. After login, the sidebar shell is mounted
4. Route content renders in the main area:
   - `/` Dashboard
   - `/tasks` Tasks
   - `/analytics` Analytics
   - `/plans` Plans

---

## UI Strengths

- Strong visual identity for a productivity app
- Consistent dark theme and accent palette
- Clear separation between operational screens
- Good use of icons and status colors
- Empty states and progress UI help usability
- Responsive layout patterns are already built into the page structure

---

## UI Improvement Opportunities

These are not blockers, but they are the main areas to improve next.

- Create a dedicated design token layer for repeated colors and radii instead of hardcoding many hex values
- Extract repeated card and panel styles into reusable UI primitives
- Improve authenticated page spacing consistency across all routes
- Add stronger mobile hierarchy on the login screen and analytics cards
- Improve form validation messages and disabled states for async actions
- Replace fragile dynamic Tailwind class generation with static class mapping where needed

---

## Suggested Future UI Files

If you want the UI documentation to grow into a full design reference, add these later:

- `UI-WIREFRAMES.md`
- `DESIGN-TOKENS.md`
- `COMPONENTS.md`
- `USER-FLOWS.md`

---

## Related Project Files

- `src/pages/Login.tsx`
- `src/components/Sidebar.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/Tasks.tsx`
- `src/pages/Analytics.tsx`
- `src/pages/Plans.tsx`
- `src/index.css`
- `SPEC.md`