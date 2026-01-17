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
      className={`flex-shrink-0 w-72 bg-board-panel border border-board-border rounded-lg flex flex-col max-h-full ${
        isOver ? 'ring-2 ring-purple-500/50' : ''
      }`}
    >
      {/* Header */}
      <div className="p-3 border-b border-board-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          {employee ? (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
              style={{ backgroundColor: employee.color }}
            >
              {employee.firstName[0]}
              {employee.lastName[0]}
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-board-border flex items-center justify-center">
              <User size={16} className="text-gray-400" />
            </div>
          )}
          <div>
            <h3 className="text-white font-medium text-sm">{title}</h3>
            <span className="text-xs text-gray-500">{tasks.length} tasks</span>
          </div>
        </div>

        {employee && onEditEmployee && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 text-gray-400 hover:text-white rounded transition-colors"
            >
              <MoreVertical size={16} />
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-1 w-32 bg-board-bg border border-board-border rounded-md shadow-lg z-10">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onEditEmployee();
                  }}
                  className="block w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-board-border/50 transition-colors"
                >
                  Edit Employee
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tasks */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
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

        {tasks.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm">
            No tasks assigned
          </div>
        )}
      </div>

      {/* Add task button */}
      <div className="p-2 border-t border-board-border">
        <button
          onClick={onAddTask}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-gray-400 hover:text-white hover:bg-board-border/50 rounded transition-colors text-sm"
        >
          <Plus size={16} />
          <span>Add Task</span>
        </button>
      </div>
    </div>
  );
}
