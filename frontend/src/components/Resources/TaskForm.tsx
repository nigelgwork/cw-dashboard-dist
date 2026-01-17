import { useState } from 'react';
import { X, Search } from 'lucide-react';
import type { ResourceTask, TaskStatus, TaskPriority, Employee, Project, CreateResourceTaskData } from '../../types';

interface TaskFormProps {
  task: ResourceTask | null;
  employees: Employee[];
  projects: Project[];
  defaultEmployeeId: number | null;
  onSubmit: (data: CreateResourceTaskData) => Promise<void>;
  onClose: () => void;
}

export default function TaskForm({ task, employees, projects, defaultEmployeeId, onSubmit, onClose }: TaskFormProps) {
  const [formData, setFormData] = useState<CreateResourceTaskData>({
    employeeId: task?.employeeId ?? defaultEmployeeId ?? undefined,
    projectExternalId: task?.projectExternalId ?? '',
    clientName: task?.clientName ?? '',
    projectName: task?.projectName ?? '',
    description: task?.description ?? '',
    priority: task?.priority ?? 'medium',
    status: task?.status ?? 'todo',
    dueDate: task?.dueDate ?? '',
    estimatedHours: task?.estimatedHours ?? undefined,
    percentComplete: task?.percentComplete ?? 0,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectSearch, setProjectSearch] = useState('');
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [manualEntry, setManualEntry] = useState(!task?.projectExternalId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);
      await onSubmit(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save task');
      setLoading(false);
    }
  };

  const handleChange = (field: keyof CreateResourceTaskData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleProjectSelect = (project: Project) => {
    setFormData((prev) => ({
      ...prev,
      projectExternalId: project.externalId,
      clientName: project.clientName,
      projectName: project.projectName,
    }));
    setShowProjectDropdown(false);
    setProjectSearch('');
  };

  const filteredProjects = projects.filter((p) => {
    const search = projectSearch.toLowerCase();
    return (
      p.projectName?.toLowerCase().includes(search) ||
      p.clientName?.toLowerCase().includes(search) ||
      p.externalId.toLowerCase().includes(search)
    );
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-board-panel border border-board-border rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-board-border">
          <h2 className="text-lg font-semibold text-white">
            {task ? 'Edit Task' : 'New Task'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Project Selection */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-300">Project</label>
              <button
                type="button"
                onClick={() => setManualEntry(!manualEntry)}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                {manualEntry ? 'Select from list' : 'Enter manually'}
              </button>
            </div>

            {manualEntry ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={formData.clientName ?? ''}
                  onChange={(e) => handleChange('clientName', e.target.value)}
                  className="w-full px-3 py-2 bg-board-bg border border-board-border rounded-md text-white focus:outline-none focus:border-blue-500"
                  placeholder="Client name"
                />
                <input
                  type="text"
                  value={formData.projectName ?? ''}
                  onChange={(e) => handleChange('projectName', e.target.value)}
                  className="w-full px-3 py-2 bg-board-bg border border-board-border rounded-md text-white focus:outline-none focus:border-blue-500"
                  placeholder="Project name"
                />
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    value={projectSearch}
                    onChange={(e) => {
                      setProjectSearch(e.target.value);
                      setShowProjectDropdown(true);
                    }}
                    onFocus={() => setShowProjectDropdown(true)}
                    className="w-full pl-9 pr-3 py-2 bg-board-bg border border-board-border rounded-md text-white focus:outline-none focus:border-blue-500"
                    placeholder="Search projects..."
                  />
                </div>

                {formData.projectExternalId && (
                  <div className="mt-2 p-2 bg-board-border/50 rounded text-sm">
                    <span className="text-gray-400">Selected:</span>{' '}
                    <span className="text-white">{formData.clientName} - {formData.projectName}</span>
                  </div>
                )}

                {showProjectDropdown && filteredProjects.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-board-bg border border-board-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {filteredProjects.slice(0, 20).map((project) => (
                      <button
                        key={project.id}
                        type="button"
                        onClick={() => handleProjectSelect(project)}
                        className="w-full px-3 py-2 text-left hover:bg-board-border/50 transition-colors"
                      >
                        <div className="text-white text-sm">{project.clientName}</div>
                        <div className="text-gray-400 text-xs">{project.projectName}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
            <textarea
              value={formData.description ?? ''}
              onChange={(e) => handleChange('description', e.target.value)}
              className="w-full px-3 py-2 bg-board-bg border border-board-border rounded-md text-white focus:outline-none focus:border-blue-500 resize-none"
              rows={3}
              placeholder="Task description..."
            />
          </div>

          {/* Assigned To */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Assigned To</label>
            <select
              value={formData.employeeId ?? ''}
              onChange={(e) => handleChange('employeeId', e.target.value ? parseInt(e.target.value) : undefined)}
              className="w-full px-3 py-2 bg-board-bg border border-board-border rounded-md text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">Unassigned</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.displayName || `${emp.firstName} ${emp.lastName}`}
                </option>
              ))}
            </select>
          </div>

          {/* Status & Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value as TaskStatus)}
                className="w-full px-3 py-2 bg-board-bg border border-board-border rounded-md text-white focus:outline-none focus:border-blue-500"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => handleChange('priority', e.target.value as TaskPriority)}
                className="w-full px-3 py-2 bg-board-bg border border-board-border rounded-md text-white focus:outline-none focus:border-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Due Date & Estimated Hours */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Due Date</label>
              <input
                type="date"
                value={formData.dueDate ?? ''}
                onChange={(e) => handleChange('dueDate', e.target.value)}
                className="w-full px-3 py-2 bg-board-bg border border-board-border rounded-md text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Est. Hours</label>
              <input
                type="number"
                value={formData.estimatedHours ?? ''}
                onChange={(e) => handleChange('estimatedHours', e.target.value ? parseFloat(e.target.value) : undefined)}
                className="w-full px-3 py-2 bg-board-bg border border-board-border rounded-md text-white focus:outline-none focus:border-blue-500"
                placeholder="0"
                step="0.5"
                min="0"
              />
            </div>
          </div>

          {/* Progress */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Progress ({formData.percentComplete ?? 0}%)
            </label>
            <input
              type="range"
              value={formData.percentComplete ?? 0}
              onChange={(e) => handleChange('percentComplete', parseInt(e.target.value))}
              className="w-full"
              min="0"
              max="100"
              step="5"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-board-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-md transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : task ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
