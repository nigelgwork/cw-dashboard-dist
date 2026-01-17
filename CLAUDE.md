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
| Frontend | React 19, TypeScript 5, Vite 7, Tailwind CSS 4 |
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
│       ├── native-sync.ts    # ATOM feed fetching & parsing
│       ├── sync.ts           # Sync orchestration
│       ├── projects.ts       # Project CRUD
│       ├── opportunities.ts  # Opportunity CRUD
│       ├── service-tickets.ts # Service ticket CRUD
│       ├── feeds.ts          # Feed management & templates
│       ├── settings.ts       # App settings
│       ├── auto-updater.ts   # GitHub updates
│       └── atomsvc-parser.ts # .atomsvc file parser
├── frontend/            # React frontend
│   ├── src/
│   │   ├── api/         # API clients (Electron IPC)
│   │   ├── components/  # React components
│   │   ├── context/     # React contexts
│   │   └── types/       # TypeScript types
│   └── index.html
├── templates/           # Bundled ATOMSVC templates
│   ├── Project-Summary.atomsvc
│   ├── Project-Detail.atomsvc
│   ├── Opportunities.atomsvc
│   └── Service-Tickets.atomsvc
└── resources/           # App icons
```

## Key Features

- **Dashboard view** - Pinned projects and opportunities for quick access
- **Full-page views** - Grid layout with filtering and search
- **ATOM Feed Sync** - Import .atomsvc files, sync via Windows Auth
- **Adaptive Sync** - PROJECT_DETAIL feeds for granular project data
- **Templates** - Bundled .atomsvc templates for quick setup
- **Offline-first** - All data stored locally in SQLite
- **Auto-updates** - Check for updates from GitHub Releases
- **Service tickets** - Track support tickets alongside projects

## Data Sync

The app syncs data from SSRS ATOM feeds:

1. **Import Feed** - Settings → Data Feeds → Import .atomsvc file
2. **Use Templates** - Settings → Data Feeds → Import from bundled templates
3. **Test Connection** - Validates feed URL and Windows Auth
4. **Manual Sync** - Click sync button in header
5. **Auto Sync** - Configurable interval (Settings → Sync)

### Feed Types

| Type | Description |
|------|-------------|
| PROJECTS | Project summary data (name, status, dates, etc.) |
| PROJECT_DETAIL | Detailed project data (linked to project feed for adaptive sync) |
| OPPORTUNITIES | Sales opportunities |
| SERVICE_TICKETS | Support tickets |

## Default Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `sync_interval_minutes` | 60 | Auto-sync interval |
| `auto_sync_enabled` | true | Enable automatic sync |
| `date_lookback_days` | 730 | Days of data to sync (2 years) |
| `adaptive_sync_enabled` | true | Enable PROJECT_DETAIL adaptive sync |
| `sync_locations` | (empty) | Location filter (empty = all locations) |

## IPC Channels

IPC handlers are defined in `/electron/ipc/handlers.ts`. Key namespaces:

| Namespace | Description |
|-----------|-------------|
| `projects:*` | Project CRUD, statuses, detail fields |
| `opportunities:*` | Opportunity CRUD operations |
| `serviceTickets:*` | Service ticket operations |
| `sync:*` | Sync control, status, and progress events |
| `feeds:*` | Feed management, templates, detail linking |
| `settings:*` | App settings get/set |
| `updates:*` | Auto-updater control, version info, GitHub token |

## Building

```bash
# Build for Windows
npm run dist:win

# Output in ./release folder
```

## Releasing a New Version

**IMPORTANT**: Do NOT build locally on Linux/WSL2. Native modules (better-sqlite3) must be compiled on Windows. Use GitHub Actions.

### Release Workflow

1. **Update version** in both `package.json` files (root and frontend)
2. **Commit and push** with version in commit message:
   ```bash
   git add -A && git commit -m "Description of changes (v2.0.0)"
   git push
   ```
3. **Create and push a git tag**:
   ```bash
   git tag v2.0.0
   git push origin v2.0.0
   ```
4. **GitHub Actions automatically**:
   - Builds on `windows-latest` runner
   - Compiles native modules for Windows
   - Creates/updates the GitHub Release
   - Uploads all required assets

### Manual Workflow Trigger

If you need to re-run the build without creating a new tag:
```bash
gh workflow run build-windows.yml --ref v2.0.0
```

### Checking Build Status

```bash
gh run list --workflow=build-windows.yml --limit 5
gh run watch  # Watch the latest run
```

### Required Release Assets (auto-uploaded by workflow)

- `CW-Dashboard-Setup-X.X.X.exe` - The installer
- `CW-Dashboard-Setup-X.X.X.exe.blockmap` - Delta update support
- `latest.yml` - Version metadata for electron-updater

## Design Tokens

```css
/* Backgrounds */
--board-bg: #0F172A;
--board-panel: #1E293B;
--board-border: #334155;

/* Status Colors */
--status-active: #22C55E;    /* green */
--status-on-hold: #EAB308;   /* yellow */
--status-completed: #6B7280; /* gray */

/* Accent Colors */
--projects: #8B5CF6;         /* purple */
--opportunities: #10B981;    /* emerald */
--service-tickets: #F97316;  /* orange */
--pinned: #3B82F6;           /* blue */
```
