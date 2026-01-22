import { useState, useEffect, useCallback } from 'react';
import { Plus, List, LayoutGrid, UserPlus, AlertCircle, Cloud, CloudOff, Eye, EyeOff, GripVertical } from 'lucide-react';
import { DndContext, DragEndEvent, DragOverEvent, DragStartEvent, closestCenter, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { employees, resourceTasks, cloud, teams, projects } from '../../api';
import type { Employee, ResourceTask, CloudStatus, Team, Project, CreateResourceTaskData, CreateEmployeeData } from '../../types';
import EmployeeColumn from './EmployeeColumn';
import TaskCard from './TaskCard';
import TaskForm from './TaskForm';
import EmployeeForm from './EmployeeForm';
import TeamFilter from './TeamFilter';

type ViewMode = 'whiteboard' | 'list';
type TaskMapType = Record<number | 'unassigned', ResourceTask[]>;
type DragItemType = 'task' | 'employee';

// Filter tasks based on showCompleted setting
function filterTasks(tasks: ResourceTask[], showCompleted: boolean): ResourceTask[] {
  if (showCompleted) return tasks;
  return tasks.filter((t) => t.status !== 'done');
}

// Sortable wrapper for employee columns
interface SortableEmployeeColumnProps {
  employee: Employee;
  tasks: ResourceTask[];
  onAddTask: () => void;
  onEditTask: (task: ResourceTask) => void;
  onDeleteTask: (id: number) => void;
  onEditEmployee: () => void;
}

function SortableEmployeeColumn({
  employee,
  tasks,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onEditEmployee,
}: SortableEmployeeColumnProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `emp-sortable-${employee.id}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {/* Drag handle overlay */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-0 left-0 right-0 h-7 cursor-grab z-10 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
        title="Drag to reorder"
      >
        <GripVertical size={12} className="text-gray-400" />
      </div>
      <EmployeeColumn
        id={`employee-${employee.id}`}
        title={employee.displayName || `${employee.firstName} ${employee.lastName}`}
        employee={employee}
        tasks={tasks}
        onAddTask={onAddTask}
        onEditTask={onEditTask}
        onDeleteTask={onDeleteTask}
        onEditEmployee={onEditEmployee}
      />
    </div>
  );
}

// Employee task group for list view
interface EmployeeTaskGroupProps {
  title: string;
  color: string;
  tasks: ResourceTask[];
  onEditTask: (task: ResourceTask) => void;
  onDeleteTask: (id: number) => void;
  onAddTask: () => void;
  onEditEmployee?: () => void;
}

function EmployeeTaskGroup({
  title,
  color,
  tasks,
  onEditTask,
  onDeleteTask,
  onAddTask,
  onEditEmployee,
}: EmployeeTaskGroupProps) {
  return (
    <div className="bg-board-panel border border-board-border rounded-lg overflow-hidden">
      {/* Employee header */}
      <div className="px-3 py-2 bg-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
            style={{ backgroundColor: color }}
          >
            {title[0]}
          </div>
          <span className="text-sm font-medium text-white">{title}</span>
          <span className="text-xs text-gray-400">({tasks.length} tasks)</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onAddTask}
            className="text-xs text-gray-400 hover:text-white transition-colors"
          >
            + Add Task
          </button>
          {onEditEmployee && (
            <button
              onClick={onEditEmployee}
              className="text-xs text-gray-400 hover:text-white transition-colors"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Tasks table */}
      {tasks.length > 0 ? (
        <table className="w-full">
          <thead className="bg-board-border/30">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">Client / Project</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 w-24">Status</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 w-24">Priority</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 w-28">Due</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-400 w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-board-border/50">
            {tasks.map((task) => (
              <tr key={task.id} className="hover:bg-board-border/20 transition-colors">
                <td className="px-3 py-2">
                  <div className="text-sm text-white">{task.clientName || 'No Client'}</div>
                  <div className="text-xs text-gray-500">{task.projectName || task.description || '-'}</div>
                </td>
                <td className="px-3 py-2">
                  <StatusBadge status={task.status} />
                </td>
                <td className="px-3 py-2">
                  <PriorityBadge priority={task.priority} />
                </td>
                <td className="px-3 py-2 text-xs text-gray-400">
                  {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => onEditTask(task)}
                    className="text-blue-400 hover:text-blue-300 text-xs mr-2"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDeleteTask(task.id)}
                    className="text-red-400 hover:text-red-300 text-xs"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="px-3 py-4 text-center text-xs text-gray-500">No tasks</div>
      )}
    </div>
  );
}

export default function ResourcesView() {
  const [employeeList, setEmployeeList] = useState<Employee[]>([]);
  const [taskMap, setTaskMap] = useState<TaskMapType>({ unassigned: [] });
  const [teamList, setTeamList] = useState<Team[]>([]);
  const [projectList, setProjectList] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cloudStatus, setCloudStatus] = useState<CloudStatus | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('whiteboard');
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [editingTask, setEditingTask] = useState<ResourceTask | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);

  // Filters
  const [teamFilter, setTeamFilter] = useState<number | ''>('');
  const [showCompleted, setShowCompleted] = useState(false);

  // Drag state
  const [activeTask, setActiveTask] = useState<ResourceTask | null>(null);
  const [activeEmployee, setActiveEmployee] = useState<Employee | null>(null);
  const [dragType, setDragType] = useState<DragItemType | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const loadData = useCallback(async () => {
    if (!employees || !resourceTasks || !cloud) return;

    try {
      setLoading(true);
      setError(null);

      const status = await cloud.getStatus();
      setCloudStatus(status);

      if (!status.connected) {
        setEmployeeList([]);
        setTaskMap({ unassigned: [] });
        setLoading(false);
        return;
      }

      const [empData, taskData, teamData] = await Promise.all([
        employees.getAll({ isActive: true }),
        resourceTasks.getAll(),
        teams?.getAll({ isActive: true }) ?? [],
      ]);

      // Filter employees by team if needed
      let filteredEmployees = empData;
      if (teamFilter && teams) {
        const teamMembers = await teams.getMembers(teamFilter);
        const memberIds = new Set(teamMembers.map((m) => m.employeeId));
        filteredEmployees = empData.filter((e) => memberIds.has(e.id));
      }

      setEmployeeList(filteredEmployees);
      setTeamList(teamData);

      // Group tasks by employee
      const grouped: Record<number | 'unassigned', ResourceTask[]> = { unassigned: [] };
      for (const emp of filteredEmployees) {
        grouped[emp.id] = [];
      }
      for (const task of taskData) {
        if (task.employeeId === null) {
          grouped.unassigned.push(task);
        } else if (grouped[task.employeeId]) {
          grouped[task.employeeId].push(task);
        }
      }

      // Sort tasks by sortOrder
      for (const key of Object.keys(grouped)) {
        grouped[key as keyof typeof grouped].sort((a, b) => a.sortOrder - b.sortOrder);
      }

      setTaskMap(grouped);

      // Load projects for task form
      if (projects) {
        const projectData = await projects.getAll({ includeInactive: false, limit: 500 });
        setProjectList(projectData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [teamFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeId = active.id as string;

    // Check if dragging an employee column
    if (activeId.startsWith('emp-sortable-')) {
      const empId = parseInt(activeId.replace('emp-sortable-', ''));
      const emp = employeeList.find((e) => e.id === empId);
      if (emp) {
        setActiveEmployee(emp);
        setDragType('employee');
        return;
      }
    }

    // Otherwise it's a task
    const taskId = active.id as number;
    for (const tasks of Object.values(taskMap)) {
      const task = tasks.find((t) => t.id === taskId);
      if (task) {
        setActiveTask(task);
        setDragType('task');
        break;
      }
    }
  };

  const handleDragOver = (_event: DragOverEvent) => {
    // Handled in drag end
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    // Reset drag state
    const wasDraggingEmployee = dragType === 'employee';
    setActiveTask(null);
    setActiveEmployee(null);
    setDragType(null);

    if (!over) return;

    // Handle employee reordering
    if (wasDraggingEmployee) {
      const activeId = (active.id as string).replace('emp-sortable-', '');
      const overId = (over.id as string).replace('emp-sortable-', '');

      if (activeId !== overId && employees) {
        const oldIndex = employeeList.findIndex((e) => e.id === parseInt(activeId));
        const newIndex = employeeList.findIndex((e) => e.id === parseInt(overId));

        if (oldIndex !== -1 && newIndex !== -1) {
          const newOrder = arrayMove(employeeList, oldIndex, newIndex);
          setEmployeeList(newOrder);

          // Persist the new order
          try {
            await employees.reorder(newOrder.map((e) => e.id));
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to reorder employees');
            loadData(); // Revert on error
          }
        }
      }
      return;
    }

    // Handle task movement
    if (!resourceTasks) return;

    const taskId = active.id as number;
    const overId = over.id as string | number;

    // Determine target employee
    let targetEmployeeId: number | null = null;
    if (overId === 'unassigned') {
      targetEmployeeId = null;
    } else if (typeof overId === 'number') {
      // Dropped on another task - get its employee
      for (const [empId, tasks] of Object.entries(taskMap)) {
        if (tasks.find((t) => t.id === overId)) {
          targetEmployeeId = empId === 'unassigned' ? null : parseInt(empId);
          break;
        }
      }
    } else if (overId.toString().startsWith('employee-')) {
      targetEmployeeId = parseInt(overId.toString().replace('employee-', ''));
    }

    // Find current employee for the task
    let currentEmployeeId: number | null = null;
    for (const [empId, tasks] of Object.entries(taskMap)) {
      if (tasks.find((t) => t.id === taskId)) {
        currentEmployeeId = empId === 'unassigned' ? null : parseInt(empId);
        break;
      }
    }

    // Move if different
    if (targetEmployeeId !== currentEmployeeId) {
      try {
        await resourceTasks.moveToEmployee(taskId, targetEmployeeId);
        loadData();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to move task');
      }
    }
  };

  // Task handlers
  const handleCreateTask = (employeeId?: number) => {
    setEditingTask(null);
    setSelectedEmployeeId(employeeId ?? null);
    setShowTaskForm(true);
  };

  const handleEditTask = (task: ResourceTask) => {
    setEditingTask(task);
    setSelectedEmployeeId(task.employeeId);
    setShowTaskForm(true);
  };

  const handleDeleteTask = async (id: number) => {
    if (!resourceTasks) return;
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      await resourceTasks.delete(id);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task');
    }
  };

  const handleTaskFormSubmit = async (data: CreateResourceTaskData) => {
    if (!resourceTasks) return;

    try {
      if (editingTask) {
        await resourceTasks.update(editingTask.id, data);
      } else {
        await resourceTasks.create(data);
      }
      setShowTaskForm(false);
      setEditingTask(null);
      loadData();
    } catch (err) {
      throw err;
    }
  };

  // Employee handlers
  const handleCreateEmployee = () => {
    setEditingEmployee(null);
    setShowEmployeeForm(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setShowEmployeeForm(true);
  };

  const handleEmployeeFormSubmit = async (data: CreateEmployeeData) => {
    if (!employees) return;

    try {
      if (editingEmployee) {
        await employees.update(editingEmployee.id, data);
      } else {
        await employees.create(data);
      }
      setShowEmployeeForm(false);
      setEditingEmployee(null);
      loadData();
    } catch (err) {
      throw err;
    }
  };

  // Show cloud connection required message
  if (!cloudStatus?.connected) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-xl font-semibold text-white">Resources</h2>
        </div>
        <div className="bg-board-panel border border-board-border rounded-lg p-8 text-center">
          <CloudOff className="mx-auto mb-4 text-gray-500" size={48} />
          <h3 className="text-lg font-medium text-white mb-2">Cloud Database Required</h3>
          <p className="text-gray-400 mb-4">
            Resource management requires a cloud database connection. Configure your Neon PostgreSQL connection in Settings.
          </p>
          {cloudStatus?.lastError && (
            <p className="text-sm text-red-400 mb-4">Last error: {cloudStatus.lastError}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 h-[calc(100vh-3.5rem)] flex flex-col">
      {/* Header - Compact */}
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-white">Resources</h2>
          <div className="flex items-center gap-1 text-xs text-emerald-400">
            <Cloud size={12} />
            <span>Connected</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Team filter */}
          <TeamFilter teams={teamList} value={teamFilter} onChange={setTeamFilter} />

          {/* Show/hide completed toggle */}
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs transition-colors ${
              showCompleted ? 'bg-emerald-600 text-white' : 'bg-board-border text-gray-400 hover:text-white'
            }`}
            title={showCompleted ? 'Hide completed tasks' : 'Show completed tasks'}
          >
            {showCompleted ? <Eye size={12} /> : <EyeOff size={12} />}
            <span>Done</span>
          </button>

          {/* View mode toggle */}
          <div className="flex items-center bg-board-border rounded">
            <button
              onClick={() => setViewMode('whiteboard')}
              className={`p-1.5 rounded-l transition-colors ${
                viewMode === 'whiteboard' ? 'bg-purple-500 text-white' : 'text-gray-400 hover:text-white'
              }`}
              title="Whiteboard view"
            >
              <LayoutGrid size={14} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-r transition-colors ${
                viewMode === 'list' ? 'bg-purple-500 text-white' : 'text-gray-400 hover:text-white'
              }`}
              title="List view"
            >
              <List size={14} />
            </button>
          </div>

          <button
            onClick={handleCreateEmployee}
            className="flex items-center gap-1.5 px-2 py-1.5 bg-board-border hover:bg-board-border/70 text-white rounded text-xs transition-colors"
          >
            <UserPlus size={14} />
            <span>Employee</span>
          </button>

          <button
            onClick={() => handleCreateTask()}
            className="flex items-center gap-1.5 px-2 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs transition-colors"
          >
            <Plus size={14} />
            <span>Task</span>
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-2 px-2 py-1.5 bg-red-500/10 border border-red-500/30 rounded flex items-center gap-2 text-red-400 text-xs flex-shrink-0">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center flex-1">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
        </div>
      )}

      {/* Whiteboard */}
      {!loading && viewMode === 'whiteboard' && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          {/* Grid layout - fits employees in rows */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div
              className="grid gap-1.5 min-h-full"
              style={{
                gridTemplateColumns: `repeat(auto-fill, minmax(160px, 1fr))`,
              }}
            >
              {/* Employee columns - sortable */}
              <SortableContext
                items={employeeList.map((e) => `emp-sortable-${e.id}`)}
                strategy={horizontalListSortingStrategy}
              >
                {employeeList.map((emp) => (
                  <SortableEmployeeColumn
                    key={emp.id}
                    employee={emp}
                    tasks={filterTasks(taskMap[emp.id] || [], showCompleted)}
                    onAddTask={() => handleCreateTask(emp.id)}
                    onEditTask={handleEditTask}
                    onDeleteTask={handleDeleteTask}
                    onEditEmployee={() => handleEditEmployee(emp)}
                  />
                ))}
              </SortableContext>

              {/* Unassigned column - at the end */}
              <EmployeeColumn
                id="unassigned"
                title="Unassigned"
                tasks={filterTasks(taskMap.unassigned || [], showCompleted)}
                onAddTask={() => handleCreateTask()}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
              />
            </div>
          </div>

          <DragOverlay>
            {activeTask && <TaskCard task={activeTask} isDragging />}
            {activeEmployee && (
              <div className="bg-board-panel rounded-md p-2 opacity-90 shadow-lg border border-purple-500">
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                    style={{ backgroundColor: activeEmployee.color }}
                  >
                    {activeEmployee.firstName?.[0] || '?'}
                  </div>
                  <span className="text-xs text-white font-medium">
                    {activeEmployee.displayName || activeEmployee.firstName}
                  </span>
                </div>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* List view - grouped by employee */}
      {!loading && viewMode === 'list' && (
        <div className="flex-1 overflow-y-auto space-y-3">
          {/* Employee task groups */}
          {employeeList.map((emp) => {
            const empTasks = filterTasks(taskMap[emp.id] || [], showCompleted);
            return (
              <EmployeeTaskGroup
                key={emp.id}
                title={emp.displayName || `${emp.firstName} ${emp.lastName}`}
                color={emp.color}
                tasks={empTasks}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
                onAddTask={() => handleCreateTask(emp.id)}
                onEditEmployee={() => handleEditEmployee(emp)}
              />
            );
          })}

          {/* Unassigned tasks - at the end */}
          {filterTasks(taskMap.unassigned || [], showCompleted).length > 0 && (
            <EmployeeTaskGroup
              title="Unassigned"
              color="#6B7280"
              tasks={filterTasks(taskMap.unassigned || [], showCompleted)}
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteTask}
              onAddTask={() => handleCreateTask()}
            />
          )}
        </div>
      )}

      {/* Task Form Modal */}
      {showTaskForm && (
        <TaskForm
          task={editingTask}
          employees={employeeList}
          projects={projectList}
          defaultEmployeeId={selectedEmployeeId}
          onSubmit={handleTaskFormSubmit}
          onClose={() => {
            setShowTaskForm(false);
            setEditingTask(null);
          }}
        />
      )}

      {/* Employee Form Modal */}
      {showEmployeeForm && (
        <EmployeeForm
          employee={editingEmployee}
          onSubmit={handleEmployeeFormSubmit}
          onClose={() => {
            setShowEmployeeForm(false);
            setEditingEmployee(null);
          }}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    todo: 'bg-gray-500/20 text-gray-400',
    in_progress: 'bg-blue-500/20 text-blue-400',
    review: 'bg-amber-500/20 text-amber-400',
    done: 'bg-emerald-500/20 text-emerald-400',
    blocked: 'bg-red-500/20 text-red-400',
  };

  const labels: Record<string, string> = {
    todo: 'To Do',
    in_progress: 'In Progress',
    review: 'Review',
    done: 'Done',
    blocked: 'Blocked',
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${colors[status] || colors.todo}`}>
      {labels[status] || status}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    low: 'bg-slate-500/20 text-slate-400',
    medium: 'bg-blue-500/20 text-blue-400',
    high: 'bg-orange-500/20 text-orange-400',
    urgent: 'bg-red-500/20 text-red-400',
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${colors[priority] || colors.medium}`}>
      {priority}
    </span>
  );
}
