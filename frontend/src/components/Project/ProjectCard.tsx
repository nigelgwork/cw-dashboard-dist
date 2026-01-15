import { useState } from 'react';
import { Clock, DollarSign, Pin, ChevronDown, ChevronUp, Calendar, Hash } from 'lucide-react';
import { Project } from '../../types';
import {
  formatCurrency,
  formatHours,
  formatPercent,
  formatDate,
  formatNotes,
  getProjectStatusStyle,
  getProjectStatusColor,
} from '../../utils/formatting';

interface ProjectCardProps {
  project: Project;
  isPinned?: boolean;
  onTogglePin?: () => void;
  alwaysExpanded?: boolean;
}

export default function ProjectCard({ project, isPinned, onTogglePin, alwaysExpanded = false }: ProjectCardProps) {
  const [expanded, setExpanded] = useState(false);
  const budgetPercentUsed = project.budgetPercentUsed ?? 0;
  const isExpanded = alwaysExpanded || expanded;

  const handlePinClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onTogglePin?.();
  };

  const handleClick = () => {
    if (!alwaysExpanded) {
      setExpanded(!expanded);
    }
  };

  const budgetBarColor =
    budgetPercentUsed >= 100 ? 'bg-red-500' :
    budgetPercentUsed >= 80 ? 'bg-yellow-500' :
    'bg-green-500';

  return (
    <div
      onClick={handleClick}
      className={`bg-board-bg border border-board-border border-l-2 ${getProjectStatusStyle(project.status)} rounded px-2 py-1.5 ${!alwaysExpanded ? 'cursor-pointer hover:bg-board-border/30' : ''} transition-all`}
    >
      {/* First row: Client name, Pin, and Status */}
      <div className="flex items-center gap-2">
        <span className="text-[13px] font-semibold text-white truncate flex-1">
          {project.clientName}
        </span>
        {onTogglePin && (
          <button
            onClick={handlePinClick}
            className={`p-0.5 rounded transition-colors ${
              isPinned ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'
            }`}
            title={isPinned ? 'Unpin' : 'Pin'}
          >
            <Pin size={12} fill={isPinned ? 'currentColor' : 'none'} />
          </button>
        )}
        <span className={`text-[11px] flex-shrink-0 ${getProjectStatusColor(project.status)}`}>
          {project.status}
        </span>
        {!alwaysExpanded && (
          <button className="text-gray-500 p-0.5">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        )}
      </div>

      {/* Second row: Project name */}
      <div className="mt-0.5">
        <span className="text-xs text-gray-400 truncate block">{project.projectName}</span>
      </div>

      {/* Budget progress bar */}
      <div className="mt-1.5">
        <div className="flex items-center justify-between text-[10px] text-gray-500 mb-0.5">
          <span>Budget Used</span>
          <span className="font-medium text-white">{formatPercent(budgetPercentUsed)}</span>
        </div>
        <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${budgetBarColor}`}
            style={{ width: `${Math.min(100, budgetPercentUsed)}%` }}
          />
        </div>
      </div>

      {/* Fourth row: Budget and Hours */}
      <div className="flex items-center gap-3 mt-1.5">
        <div className="flex items-center gap-1">
          <DollarSign size={11} className="text-gray-500" />
          <span className="text-[11px] text-gray-400">
            {formatCurrency(project.spent)} / {formatCurrency(project.budget)}
          </span>
        </div>
        {project.hoursRemaining !== undefined && project.hoursRemaining !== null && (
          <div className="flex items-center gap-1">
            <Clock size={11} className="text-gray-500" />
            <span className="text-[11px] text-gray-400">{formatHours(project.hoursRemaining)} left</span>
          </div>
        )}
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-board-border space-y-2">
          {/* Hours details */}
          {project.hoursEstimate !== undefined && (
            <div className="flex items-center gap-2">
              <Clock size={12} className="text-gray-500" />
              <span className="text-xs text-gray-400">
                Hours: {formatHours(project.hoursRemaining)} remaining of {formatHours(project.hoursEstimate)} estimate
              </span>
            </div>
          )}

          {/* Notes */}
          {project.notes && (
            <div className="text-xs text-gray-400">
              <span className="text-gray-500">Notes: </span>
              {formatNotes(project.notes)}
            </div>
          )}

          {/* External ID */}
          <div className="flex items-center gap-2">
            <Hash size={12} className="text-gray-500" />
            <span className="text-xs text-gray-500">ID: {project.externalId}</span>
          </div>

          {/* Timestamps */}
          <div className="flex items-center gap-2">
            <Calendar size={12} className="text-gray-500" />
            <span className="text-xs text-gray-500">
              Updated: {formatDate(project.updatedAt)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
