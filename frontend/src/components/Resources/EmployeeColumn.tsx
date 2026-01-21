import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, MoreVertical, User } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import type { Employee, ResourceTask } from '../../types';
import TaskCard from './TaskCard';

interface EmployeeColumnProps {
  id: string;
  title: string;
  employee?: Employee;
  tasks: ResourceTask[];
  onAddTask: () => void;
  onEditTask: (task: ResourceTask) => void;
  onDeleteTask: (id: number) => void;
  onEditEmployee?: () => void;
}

export default function EmployeeColumn({
  id,
  title,
  employee,
  tasks,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onEditEmployee,
}: EmployeeColumnProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const taskIds = tasks.map((t) => t.id);

  return (
    <div
      ref={setNodeRef}
      className={`bg-board-panel rounded-md flex flex-col min-h-0 h-full overflow-hidden ${
        isOver ? 'ring-1 ring-purple-500/50' : ''
      }`}
    >
      {/* Header - Compact */}
      <div className="px-1.5 py-1 bg-slate-700 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {employee ? (
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
              style={{ backgroundColor: employee.color }}
            >
              {employee.firstName?.[0] || '?'}
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full bg-board-border flex items-center justify-center flex-shrink-0">
              <User size={12} className="text-gray-400" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="text-white font-medium text-xs truncate">{title}</h3>
            <span className="text-[10px] text-gray-400">{tasks.length}</span>
          </div>
        </div>

        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={onAddTask}
            className="p-0.5 text-gray-400 hover:text-white rounded transition-colors"
            title="Add task"
          >
            <Plus size={12} />
          </button>
          {employee && onEditEmployee && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-0.5 text-gray-400 hover:text-white rounded transition-colors"
              >
                <MoreVertical size={12} />
              </button>
              {showMenu && (
                <div className="absolute right-0 mt-1 w-24 bg-board-bg border border-board-border rounded shadow-lg z-10">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onEditEmployee();
                    }}
                    className="block w-full px-2 py-1.5 text-left text-xs text-gray-300 hover:bg-board-border/50 transition-colors"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tasks - Compact spacing */}
      <div className="flex-1 min-h-0 overflow-y-auto p-1 space-y-0.5 bg-board-bg">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={() => onEditTask(task)}
              onDelete={() => onDeleteTask(task.id)}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
