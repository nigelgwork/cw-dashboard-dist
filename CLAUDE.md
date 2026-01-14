# CW Dashboard - Electron Desktop App

A Windows desktop application for viewing ConnectWise projects, opportunities, and service tickets. Syncs data from SSRS ATOM feeds using Windows Integrated Authentication.

## Quick Start

```bash
# Install dependencies
npm install
cd frontend && npm install && cd ..

# Development mode
npm run dev

# Build distributable
npm run dist:win
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Electron Desktop App                             │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐   │
│  │    Frontend     │   │  Electron Main  │   │    SQLite DB    │   │
│  │  React + Vite   │   │   Process       │   │    (Local)      │   │
│  │  TypeScript     │◄──►  IPC Handlers  │◄──►  better-sqlite3 │   │
│  │  Tailwind CSS   │   │  Native Sync    │   │                 │   │
│  └─────────────────┘   └─────────────────┘   └─────────────────┘   │
│                              │                                       │
│                              ▼                                       │
│                    ┌─────────────────┐                              │
│                    │   SSRS Server   │                              │
│                    │  (ATOM Feeds)   │                              │
│                    │  Windows Auth   │                              │
│                    └─────────────────┘                              │
└─────────────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript 5, Vite 5, Tailwind CSS 3 |
| Desktop | Electron 33, electron-builder |
| Database | SQLite (better-sqlite3) |
| Icons | Lucide React |
| Updates | electron-updater (GitHub Releases) |

## Project Structure

```
/
├── package.json          # Electron app config
├── electron/             # Electron main process
│   ├── main.ts          # Entry point
│   ├── preload.ts       # IPC bridge to renderer
│   ├── database/        # SQLite schema & connection
│   ├── ipc/             # IPC handlers
│   └── services/        # Business logic
│       ├── native-sync.ts    # ATOM feed sync
│       ├── projects.ts       # Project CRUD
│       ├── opportunities.ts  # Opportunity CRUD
│       ├── service-tickets.ts # Service ticket CRUD
│       ├── feeds.ts          # Feed management
│       ├── settings.ts       # App settings
│       └── auto-updater.ts   # GitHub updates
├── frontend/            # React frontend
│   ├── src/
│   │   ├── api/         # API clients (Electron IPC)
│   │   ├── components/  # React components
│   │   ├── context/     # React contexts
│   │   └── types/       # TypeScript types
│   └── index.html
└── resources/           # App icons
```

## Key Features

- **Dashboard view** - Pinned projects and opportunities for quick access
- **Full-page views** - Grid layout with filtering and search
- **ATOM Feed Sync** - Import .atomsvc files, sync via Windows Auth
- **Offline-first** - All data stored locally in SQLite
- **Auto-updates** - Check for updates from GitHub Releases
- **Service tickets** - Track support tickets alongside projects

## Data Sync

The app syncs data from SSRS ATOM feeds:

1. **Import Feed** - Settings → Data Feeds → Import .atomsvc file
2. **Test Connection** - Validates feed URL and Windows Auth
3. **Manual Sync** - Click sync button in header
4. **Auto Sync** - Configurable interval (Settings → Sync)

Supports feed types: Projects, Opportunities, Service Tickets

## IPC Channels

| Channel | Description |
|---------|-------------|
| `projects:*` | Project CRUD operations |
| `opportunities:*` | Opportunity CRUD operations |
| `serviceTickets:*` | Service ticket operations |
| `sync:*` | Sync control and status |
| `feeds:*` | ATOM feed management |
| `settings:*` | App settings |
| `updates:*` | Auto-updater control |

## Building

```bash
# Build for Windows
npm run dist:win

# Output in ./release folder
```

## Design Tokens

```css
/* Backgrounds */
--board-bg: #0F172A;
--board-panel: #1E293B;
--board-border: #334155;

/* Status Colors */
--status-active: #22C55E (green)
--status-on-hold: #EAB308 (yellow)
--status-completed: #6B7280 (gray)

/* Accent Colors */
--projects: #8B5CF6 (purple)
--opportunities: #10B981 (emerald)
--service-tickets: #F97316 (orange)
--pinned: #3B82F6 (blue)
```
