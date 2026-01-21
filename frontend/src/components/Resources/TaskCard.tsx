import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Calendar, MoreVertical } from 'lucide-react';
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

  // Priority border colors
  const priorityBorderColors: Record<TaskPriority, string> = {
    low: 'border-l-slate-400',
    medium: 'border-l-blue-500',
    high: 'border-l-orange-500',
    urgent: 'border-l-red-500',
  };

  // Status text colors for inline display
  const statusTextColors: Record<TaskStatus, string> = {
    todo: 'text-gray-400',
    in_progress: 'text-blue-400',
    review: 'text-amber-400',
    done: 'text-emerald-400',
    blocked: 'text-red-400',
  };

  if (isDragging) {
    return (
      <div className={`bg-board-panel border-l-2 ${priorityBorderColors[task.priority]} rounded py-1 px-1.5 opacity-90 shadow-lg`}>
        <p className="text-[11px] font-semibold text-white truncate">
          {task.clientName || 'No Client'}
        </p>
        <p className="text-[10px] text-gray-400 truncate">
          {task.projectName || task.description || 'Untitled'}
        </p>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-board-panel border-l-2 ${priorityBorderColors[task.priority]} rounded py-1 pr-1 group ${
        isSortableDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="flex gap-0.5">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="px-0.5 text-gray-600 hover:text-gray-400 cursor-grab flex-shrink-0"
        >
          <GripVertical size={10} />
        </button>

        <div className="flex-1 min-w-0">
          {/* Client name - bold */}
          <p className="text-[11px] font-semibold text-white truncate leading-tight">
            {task.clientName || 'No Client'}
          </p>
          {/* Project/Description - 2 lines max */}
          <p className="text-[10px] text-gray-400 leading-tight line-clamp-2">
            {task.projectName || task.description || 'Untitled'}
          </p>
          {/* Status and due date on same line */}
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`text-[9px] font-medium ${statusTextColors[task.status]}`}>
              {task.status === 'in_progress' ? 'WIP' : task.status.toUpperCase()}
            </span>
            {task.dueDate && (
              <span className="text-[9px] text-gray-500 flex items-center gap-0.5">
                <Calendar size={8} />
                {new Date(task.dueDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
              </span>
            )}
          </div>
        </div>

        {/* Menu - only show on hover */}
        {(onEdit || onDelete) && (
          <div className="relative flex-shrink-0" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-0.5 text-gray-600 hover:text-white rounded transition-colors opacity-0 group-hover:opacity-100"
            >
              <MoreVertical size={10} />
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-1 w-16 bg-board-bg border border-board-border rounded shadow-lg z-10">
                {onEdit && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onEdit();
                    }}
                    className="block w-full px-2 py-1 text-left text-[10px] text-gray-300 hover:bg-board-border/50 transition-colors"
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
                    className="block w-full px-2 py-1 text-left text-[10px] text-red-400 hover:bg-board-border/50 transition-colors"
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
