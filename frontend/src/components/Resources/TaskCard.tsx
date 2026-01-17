import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Calendar, Clock, MoreVertical } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import type { ResourceTask, TaskStatus, TaskPriority } from '../../types';

interface TaskCardProps {
  task: ResourceTask;
  isDragging?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function TaskCard({ task, isDragging, onEdit, onDelete }: TaskCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const priorityColors: Record<TaskPriority, string> = {
    low: 'bg-slate-500',
    medium: 'bg-blue-500',
    high: 'bg-orange-500',
    urgent: 'bg-red-500',
  };

  const statusColors: Record<TaskStatus, { bg: string; text: string }> = {
    todo: { bg: 'bg-gray-500/20', text: 'text-gray-400' },
    in_progress: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
    review: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
    done: { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
    blocked: { bg: 'bg-red-500/20', text: 'text-red-400' },
  };

  const statusLabels: Record<TaskStatus, string> = {
    todo: 'To Do',
    in_progress: 'In Progress',
    review: 'Review',
    done: 'Done',
    blocked: 'Blocked',
  };

  const colors = statusColors[task.status] || statusColors.todo;

  if (isDragging) {
    return (
      <div className="bg-board-bg border border-purple-500 rounded-lg p-3 opacity-90 shadow-lg">
        <div className="flex items-start gap-2">
          <div className={`w-1 h-full rounded ${priorityColors[task.priority]}`} />
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">
              {task.description || task.projectName || 'Untitled'}
            </p>
            {task.clientName && (
              <p className="text-gray-500 text-xs truncate">{task.clientName}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-board-bg border border-board-border rounded-lg p-3 group ${
        isSortableDragging ? 'opacity-50' : ''
      }`}
    >
      {/* Priority indicator */}
      <div className={`absolute top-0 left-3 w-6 h-1 rounded-b ${priorityColors[task.priority]}`} />

      <div className="flex items-start gap-2">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 p-0.5 text-gray-500 hover:text-gray-300 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical size={14} />
        </button>

        <div className="flex-1 min-w-0">
          {/* Status badge */}
          <div className="mb-2">
            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${colors.bg} ${colors.text}`}>
              {statusLabels[task.status]}
            </span>
          </div>

          {/* Task info */}
          <p className="text-white text-sm font-medium mb-1 truncate">
            {task.description || task.projectName || 'Untitled'}
          </p>
          {task.clientName && (
            <p className="text-gray-500 text-xs mb-2 truncate">{task.clientName}</p>
          )}

          {/* Meta info */}
          <div className="flex items-center gap-3 text-xs text-gray-500">
            {task.dueDate && (
              <div className="flex items-center gap-1">
                <Calendar size={12} />
                <span>{new Date(task.dueDate).toLocaleDateString()}</span>
              </div>
            )}
            {task.estimatedHours && (
              <div className="flex items-center gap-1">
                <Clock size={12} />
                <span>{task.estimatedHours}h</span>
              </div>
            )}
          </div>

          {/* Progress bar */}
          {task.percentComplete > 0 && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>Progress</span>
                <span>{task.percentComplete}%</span>
              </div>
              <div className="h-1 bg-board-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 transition-all"
                  style={{ width: `${task.percentComplete}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Menu */}
        {(onEdit || onDelete) && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 text-gray-500 hover:text-white rounded transition-colors opacity-0 group-hover:opacity-100"
            >
              <MoreVertical size={14} />
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-1 w-24 bg-board-panel border border-board-border rounded-md shadow-lg z-10">
                {onEdit && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onEdit();
                    }}
                    className="block w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-board-border/50 transition-colors"
                  >
                    Edit
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onDelete();
                    }}
                    className="block w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-board-border/50 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
