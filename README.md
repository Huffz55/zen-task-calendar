<div align="center">

# Zen Task Calendar 🌸

**Serverless, local-first task & calendar management engineered for mindful productivity.**

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-zen--task--calendar.vercel.app-f472b6?style=for-the-badge&logo=vercel&logoColor=white)](https://zen-task-calendar.vercel.app/)

<p align="center">
  <img src="https://img.shields.io/badge/React_19-20232A?style=flat-square&logo=react&logoColor=61DAFB" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS_v4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white" alt="Vercel" />
  <img src="https://img.shields.io/badge/PWA-Ready-f472b6?style=flat-square&logo=pwa&logoColor=white" alt="PWA Ready" />
</p>

</div>

---

## 📖 Project Overview

**Zen Task Calendar** is an offline-ready, mobile-first Progressive Web App (PWA) designed to eliminate cognitive overload. Built with a pure local-first philosophy, it merges a fluid calendar, recurring task management, and a dedicated Pomodoro-style "Zen Mode" timer into a warm, pastel-tinted interface. 

With zero backend dependencies, zero telemetry, and zero mandatory accounts, your daily schedule remains 100% private, snappy, and reliable—even without an internet connection.

---

## ✨ Killer Features

- 📱 **Mobile-First & PWA:** Installable directly to Android (via WebAPK/TWA) and iOS home screens. Powered by Workbox service workers for instantaneous loading and 100% offline autonomy.
- 🔄 **Cross-Tab Synchronization:** Seamless real-time state synchronization across concurrent browser tabs using active `window.storage` event propagation.
- 🧘 **Zen Mode:** A dedicated focus timer powered by the **Screen Wake Lock API** (preventing mobile devices from sleeping mid-session), absolute timestamp drift compensation (`Date.now()`), and custom **Web Audio API** synthesized chimes.
- 💾 **Local-First & Backup:** Zero-latency persistence with `localStorage`, single-click two-way JSON backup (`zen-tasks-backup.json`) bundling tasks and checklists, plus automated 30-day garbage collection for completed tasks.
- 🔁 **Flexible Recurring Tasks:** Native support for Daily, Weekly, and Bi-weekly recurrence schedules, with granular single-day exclusions (`excludedDates`) and future truncations (`endDate`).
- 🎨 **Mindful Micro-Interactions:** Synthesized pop sounds, celebratory confetti for completed days, dynamic ambient theme tints adjusting to the hour of the day, and smooth spring animations.

---

## 🏗️ Technical Architecture (For Recruiters & Engineers)

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Layer (React 19)                │
│   ┌───────────────┐   ┌─────────────────┐   ┌───────────┐   │
│   │   Calendar    │   │  DailyTaskList  │   │CustomLists│   │
│   └───────┬───────┘   └────────┬────────┘   └─────┬─────┘   │
└───────────┼────────────────────┼──────────────────┼─────────┘
            ▼                    ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                 State & Business Logic Layer                │
│    useTasks (Recurrence Engine, GC) │ useLists (Checklists) │
│    Absolute Timestamp Timer Engine  │ Screen Wake Lock API  │
└──────────────────────────────┬──────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Storage & Sync Architecture                 │
│      LocalStorage (v1 Keys) ◄──► window.storage Listener    │
│      Workbox Service Worker Precache (vite-plugin-pwa)      │
└─────────────────────────────────────────────────────────────┘
```

### Architectural Decisions

1. **Why Local-First & LocalStorage?**
   - By eliminating external database round-trips, UI interactions execute at 0ms latency.
   - User privacy is mathematically absolute: personal schedules and thoughts never leave the client device.
   - Storage quotas are actively protected by an automated garbage collection engine that cleans up completed non-recurring records older than 30 days during hook initialization.

2. **Custom Recurrence Engine (`useTasks`):**
   - Tasks are stored as normalized parent definitions with frequency algorithms rather than bloated infinite database rows.
   - Single-instance skipping (`deleteTaskInstance`) records ISO dates in an `excludedDates` array, while ending a recurring series (`deleteTaskFuture`) computes and stamps an `endDate`, preserving historical accomplishment logs intact.

3. **Background Tab Drift-Free Timer:**
   - Instead of naive `setInterval` countdown decrements (which modern mobile browsers aggressively throttle down to 1 tick per minute), the timer stores an absolute target timestamp (`endTime = Date.now() + remainingMs`).
   - Every interval tick and `visibilitychange` event calculates exact remaining time relative to the hardware system clock, providing millisecond-perfect accuracy upon returning to the tab.

4. **Service Worker & Production PWA:**
   - Configured through `vite-plugin-pwa` with `generateSW` and `autoUpdate` registration.
   - Manifest includes high-resolution maskable PNG icon definitions, standalone portrait display properties, and productivity category flags to achieve top PWABuilder evaluation scores.

---

## ⌨️ Global Shortcuts

Boost your daily flow with frictionless keyboard triggers:
- `N` — Instantly focus the "Add a new task" input
- `F` — Toggle Zen / Pomodoro Focus Mode
- `T` — Jump calendar selection immediately back to Today

---

## 🚀 Installation & Setup

Ensure you have **Node.js 18+** installed on your system.

```bash
# 1. Clone repository
git clone https://github.com/yourusername/zen-task-calendar.git

# 2. Navigate to project root
cd zen-task-calendar

# 3. Install dependencies
npm install

# 4. Start local development server
npm run dev
```

Build for production:
```bash
npm run build
```

Preview production build:
```bash
npm run preview
```

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
