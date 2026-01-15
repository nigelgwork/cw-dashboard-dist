/**
 * Formatting utility functions for CW Dashboard
 */

/**
 * Format a number as Australian currency
 */
export function formatCurrency(value: number | undefined | null): string {
  if (value === undefined || value === null) return '-';
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format hours with 'h' suffix
 */
export function formatHours(hours: number | undefined | null): string {
  if (hours === undefined || hours === null) return '-';
  return `${Math.round(hours)}h`;
}

/**
 * Format a percentage with max 1 decimal place
 */
export function formatPercent(value: number | undefined | null): string {
  if (value === undefined || value === null) return '-';
  // Show integer if whole number, otherwise max 1 decimal place
  const formatted = Number.isInteger(value) ? value.toString() : value.toFixed(1);
  return `${formatted}%`;
}

/**
 * Format a date in Australian format
 */
export function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Format notes field - specifically handles WIP values
 */
export function formatNotes(notes: string | undefined | null): string {
  if (!notes) return '';
  // Format WIP values to max 1 decimal place
  return notes.replace(/WIP:\s*([\d.]+)/g, (match, value) => {
    const num = parseFloat(value);
    if (isNaN(num)) return match;
    // Format with max 1 decimal, remove trailing .0
    const formatted = num.toFixed(1).replace(/\.0$/, '');
    return `WIP: ${formatted}`;
  });
}

/**
 * Get project status styles (border and background) based on status string
 * Supports dynamic SSRS status values like "1. New", "2. In Progress", "6. Completed", etc.
 */
export function getProjectStatusStyle(status: string | undefined | null): string {
  if (!status) return 'border-l-gray-500 bg-gray-500/5';
  const s = status.toLowerCase();

  // Completed states - gray
  if (s.includes('completed') || s.includes('closed') || s.includes('cancelled') || s.includes('canceled')) {
    return 'border-l-gray-500 bg-gray-500/5';
  }

  // On hold / waiting states - yellow
  if (s.includes('hold') || s.includes('waiting') || s.includes('pending')) {
    return 'border-l-yellow-500 bg-yellow-500/5';
  }

  // In progress / active states - green
  if (s.includes('progress') || s.includes('active') || s.includes('working') || s.includes('assigned')) {
    return 'border-l-green-500 bg-green-500/5';
  }

  // New / open states - blue
  if (s.includes('new') || s.includes('open') || s.includes('re-opened') || s.includes('reopened')) {
    return 'border-l-blue-500 bg-blue-500/5';
  }

  // Default - green (assume active)
  return 'border-l-green-500 bg-green-500/5';
}

/**
 * Get project status text color based on status string
 */
export function getProjectStatusColor(status: string | undefined | null): string {
  if (!status) return 'text-gray-400';
  const s = status.toLowerCase();

  // Completed states - gray
  if (s.includes('completed') || s.includes('closed') || s.includes('cancelled') || s.includes('canceled')) {
    return 'text-gray-400';
  }

  // On hold / waiting states - yellow
  if (s.includes('hold') || s.includes('waiting') || s.includes('pending')) {
    return 'text-yellow-400';
  }

  // In progress / active states - green
  if (s.includes('progress') || s.includes('active') || s.includes('working') || s.includes('assigned')) {
    return 'text-green-400';
  }

  // New / open states - blue
  if (s.includes('new') || s.includes('open') || s.includes('re-opened') || s.includes('reopened')) {
    return 'text-blue-400';
  }

  // Default - green (assume active)
  return 'text-green-400';
}

/**
 * Legacy compatibility - static maps for backward compatibility
 * @deprecated Use getProjectStatusStyle() and getProjectStatusColor() instead
 */
export const PROJECT_STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'border-l-green-500 bg-green-500/5',
  ON_HOLD: 'border-l-yellow-500 bg-yellow-500/5',
  COMPLETED: 'border-l-gray-500 bg-gray-500/5',
};

export const PROJECT_STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'text-green-400',
  ON_HOLD: 'text-yellow-400',
  COMPLETED: 'text-gray-400',
};

/**
 * Get opportunity stage color
 */
export function getStageColor(stage: string | undefined | null): string {
  if (!stage) return 'bg-gray-500';
  const stageLower = stage.toLowerCase();
  if (stageLower.includes('lead')) return 'bg-blue-500';
  if (stageLower.includes('quot')) return 'bg-purple-500';
  if (stageLower.includes('won')) return 'bg-green-500';
  if (stageLower.includes('lost')) return 'bg-red-500';
  return 'bg-gray-500';
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Get service ticket priority color
 */
export function getPriorityColor(priority: string | undefined | null): string {
  if (!priority) return 'bg-gray-500';
  const p = priority.toLowerCase();
  if (p.includes('critical') || p.includes('emergency') || p === '1') return 'bg-red-500';
  if (p.includes('high') || p === '2') return 'bg-orange-500';
  if (p.includes('medium') || p.includes('normal') || p === '3') return 'bg-yellow-500';
  if (p.includes('low') || p === '4' || p === '5') return 'bg-blue-500';
  return 'bg-gray-500';
}

/**
 * Get service ticket status color
 */
export function getTicketStatusColor(status: string | undefined | null): { border: string; bg: string; text: string } {
  if (!status) return { border: 'border-l-gray-500', bg: 'bg-gray-500/5', text: 'text-gray-400' };
  const s = status.toLowerCase();
  if (s.includes('new') || s.includes('open')) {
    return { border: 'border-l-blue-500', bg: 'bg-blue-500/5', text: 'text-blue-400' };
  }
  if (s.includes('in progress') || s.includes('assigned') || s.includes('working')) {
    return { border: 'border-l-yellow-500', bg: 'bg-yellow-500/5', text: 'text-yellow-400' };
  }
  if (s.includes('waiting') || s.includes('hold') || s.includes('pending')) {
    return { border: 'border-l-purple-500', bg: 'bg-purple-500/5', text: 'text-purple-400' };
  }
  if (s.includes('resolved') || s.includes('completed') || s.includes('closed')) {
    return { border: 'border-l-green-500', bg: 'bg-green-500/5', text: 'text-green-400' };
  }
  return { border: 'border-l-gray-500', bg: 'bg-gray-500/5', text: 'text-gray-400' };
}
