# NoteApp 🌸
**Serverless, minimalist task & calendar management designed for peace of mind.**

NoteApp is an ultra-lightweight, visually serene productivity tool built with React and Tailwind CSS v4. It intentionally avoids the visual clutter and overstimulation of heavy platforms (like Notion) by enforcing a strict white and soft-pink aesthetic. It lives entirely in your browser, keeping your data perfectly private.

## ✨ Features

- **Serverless Architecture**: 100% offline-ready PWA. Your data is saved securely in your browser's `localStorage`. No accounts, no servers, no tracking.
- **Micro-Interactions**: Experience deeply satisfying usage with organic Web Audio 'pop' sounds, haptic feedback on mobile, and buttery smooth CSS transition animations.
- **Focus / Zen Mode**: Press `F` to instantly collapse the calendar sidebar and center your tasks for a completely distraction-free experience.
- **Perfect Days & Streaks**: Complete all your tasks to trigger a soft petal celebration and build up your daily streak counter.
- **Recurring Tasks**: Easily set tasks to repeat Daily, Weekly, or Bi-weekly using a custom, beautifully styled dropdown.
- **Smart Linkification**: URLs typed into tasks are automatically converted into clickable links without breaking the UI.
- **Data Portability**: Export your tasks as cleanly formatted `.txt` files for safekeeping, and import them at any time.

## ⌨️ Global Shortcuts

Maximize your flow with invisible, screen-reader-friendly global hotkeys:
- `N` - Instantly focus the "Add a new task" input.
- `F` - Toggle Focus/Zen mode on and off.
- `T` - Snap the calendar back to "Today".

## 🛠️ Tech Stack

- **Framework**: React 19 + Vite
- **Styling**: Tailwind CSS v4 (Custom `@theme` animations)
- **Icons**: Lucide React
- **Dates**: `date-fns`
- **PWA**: `vite-plugin-pwa`

## 🚀 Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/noteapp.git
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## 🎨 Design Philosophy
*"Take a deep breath and start."*
This app was meticulously crafted to reduce cognitive load. You will find absolutely zero native browser outlines, zero dark-mode jarring contrasts, and zero unnecessary popups. Everything from the breathing empty state to the dynamic time-of-day greetings exists to create a calm, reliable, and premium user experience.
