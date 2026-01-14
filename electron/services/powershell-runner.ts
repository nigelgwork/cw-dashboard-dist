import { spawn } from 'child_process';
import path from 'path';
import { app } from 'electron';
import { getDatabasePath } from '../database/connection';

export interface SyncResult {
  success: boolean;
  exitCode: number;
  output: string;
  error?: string;
}

/**
 * Get the path to the PowerShell scripts directory
 */
function getScriptsPath(): string {
  if (app.isPackaged) {
    // Production: scripts are in resources folder
    return path.join(process.resourcesPath, 'scripts');
  } else {
    // Development: scripts are in project root
    return path.join(__dirname, '..', '..', 'scripts');
  }
}

/**
 * Run a PowerShell sync script
 */
export async function runPowerShellSync(
  syncType: 'PROJECTS' | 'OPPORTUNITIES',
  syncHistoryId: number,
  feedUrl: string
): Promise<SyncResult> {
  const scriptsPath = getScriptsPath();
  const scriptName = syncType === 'PROJECTS' ? 'sync-projects-sqlite.ps1' : 'sync-opportunities-sqlite.ps1';
  const scriptPath = path.join(scriptsPath, scriptName);
  const dbPath = getDatabasePath();

  return new Promise((resolve) => {
    const args = [
      '-ExecutionPolicy',
      'Bypass',
      '-NoProfile',
      '-NonInteractive',
      '-File',
      scriptPath,
      '-SyncHistoryId',
      syncHistoryId.toString(),
      '-FeedUrl',
      feedUrl,
      '-DatabasePath',
      dbPath,
    ];

    console.log(`Running PowerShell: ${scriptPath}`);
    console.log(`Args: ${args.join(' ')}`);

    const ps = spawn('powershell.exe', args, {
      windowsHide: true,
      env: {
        ...process.env,
        // Pass database path as environment variable as well
        CW_DASHBOARD_DB_PATH: dbPath,
      },
    });

    let stdout = '';
    let stderr = '';

    ps.stdout.on('data', (data) => {
      const text = data.toString();
      stdout += text;
      console.log(`[PS stdout] ${text.trim()}`);
    });

    ps.stderr.on('data', (data) => {
      const text = data.toString();
      stderr += text;
      console.error(`[PS stderr] ${text.trim()}`);
    });

    ps.on('error', (error) => {
      console.error('PowerShell spawn error:', error);
      resolve({
        success: false,
        exitCode: -1,
        output: stdout,
        error: `Failed to start PowerShell: ${error.message}`,
      });
    });

    ps.on('close', (code) => {
      console.log(`PowerShell exited with code ${code}`);
      resolve({
        success: code === 0,
        exitCode: code ?? -1,
        output: stdout,
        error: code !== 0 ? stderr || 'Sync failed with no error message' : undefined,
      });
    });
  });
}

/**
 * Test if PowerShell is available
 */
export async function testPowerShellAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const ps = spawn('powershell.exe', ['-Command', 'echo "OK"'], {
      windowsHide: true,
    });

    ps.on('error', () => resolve(false));
    ps.on('close', (code) => resolve(code === 0));
  });
}

/**
 * Get PowerShell version
 */
export async function getPowerShellVersion(): Promise<string> {
  return new Promise((resolve) => {
    const ps = spawn('powershell.exe', ['-Command', '$PSVersionTable.PSVersion.ToString()'], {
      windowsHide: true,
    });

    let output = '';
    ps.stdout.on('data', (data) => {
      output += data.toString();
    });

    ps.on('error', () => resolve('Unknown'));
    ps.on('close', () => resolve(output.trim() || 'Unknown'));
  });
}
