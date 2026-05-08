# TodoList Pro - Specification Document

## 1. Project Overview

- **Project Name**: TodoList Pro
- **Project Type**: Single Page Web Application (ReactJS + Tailwind CSS + Firebase)
- **Core Functionality**: Feature-rich todo list with cloud sync, analytics charts, and plan mode for goal tracking
- **Target Users**: Productivity-focused individuals who want to track tasks, goals, and visualize their progress

---

## 2. Features Implemented

### Task Management
- Create/Edit/Delete tasks with title, description, priority, due date/time
- 6 Categories: Work, Personal, Health, Shopping, Studying, Planning
- Recurring tasks: None/Daily/Weekly/Monthly/Yearly
- Filter by status, priority, category
- Sort by due date, priority, created date
- Search tasks

### Date & Time
- Date picker with calendar view
- Time picker
- Overdue highlighting
- Browser push notifications for reminders
- Grouped views: Overdue, Today, Tomorrow, This Week, Later

### Analytics Charts (Stacked on mobile)
- Monthly: Bar chart (tasks completed per day)
- Weekly: Line chart (7-day trend)
- Yearly: Bar chart (monthly aggregations)
- Pie chart for category distribution
- Stats: Total, Completed, Completion Rate %

### Plan Mode
- Create plans with deadline and target count
- Progress bar auto-tracking
- Status indicators: On Track (green), At Risk (yellow), Completed (green checkmark), Overdue/Failed (red)
- Quick templates: Weekly Goal, Monthly Goal, 30-Day Challenge
- Link tasks to plans

### Data & Cloud
- Firebase Firestore for cloud storage
- Google authentication
- Real-time sync across devices
- JSON export/import
- Clear all data option

### UI/UX
- Dark theme with Indigo/Emerald palette
- Responsive mobile layout
- Smooth animations
- Sidebar navigation

---

## 3. How to Set Up Firebase

1. Go to https://console.firebase.google.com
2. Create a new Firebase project
3. Enable Authentication: Google sign-in
4. Enable Cloud Firestore
5. Copy your config to .env file

---

## 4. Tech Stack

- React 18 + Vite
- Tailwind CSS 4
- Firebase (Auth + Firestore)
- Recharts for charts
- date-fns for dates
- Lucide React for icons
- React Router for navigation

---

## 5. Running the App

```bash
npm install
npm run dev
```

---

## 6. Available Pages

- **Dashboard**: Overview stats + quick actions
- **Tasks**: Full task management
- **Analytics**: Charts and statistics
- **Plan Mode**: Goal tracking