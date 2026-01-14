# CW Dashboard

A Windows desktop application for tracking ConnectWise projects, opportunities, and service tickets. Syncs data from SSRS ATOM feeds using Windows Integrated Authentication.

## Features

- **Project Tracking** - Monitor budgets, hours, and WIP status
- **Opportunity Pipeline** - Track sales opportunities by stage and rep
- **Service Tickets** - View and filter support tickets
- **Dashboard Pins** - Pin important items for quick access
- **ATOM Feed Sync** - Direct sync from SSRS reports
- **Offline-First** - All data stored locally
- **Auto-Updates** - Automatic updates from GitHub Releases

## Download

Get the latest release from the [Releases](https://github.com/nigelgwork/cw-dashboard-dist/releases) page.

## Setup

1. Download and install the latest `.exe` from Releases
2. Launch the application
3. Go to **Settings → Data Feeds**
4. Import your `.atomsvc` files from SSRS
5. Click **Sync** in the header

## Requirements

- Windows 10/11
- Access to SSRS server with Windows Authentication
- ATOM feed URLs for Projects, Opportunities, and/or Service Tickets

## Development

```bash
# Clone the repository
git clone https://github.com/nigelgwork/cw-dashboard-dist.git
cd cw-dashboard-dist

# Install dependencies
npm install
cd frontend && npm install && cd ..

# Run in development mode
npm run dev

# Build Windows installer
npm run dist:win
```

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Desktop**: Electron
- **Database**: SQLite (better-sqlite3)
- **Updates**: electron-updater

## License

MIT
