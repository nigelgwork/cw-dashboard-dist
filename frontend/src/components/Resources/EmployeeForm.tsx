import { useState } from 'react';
import { X } from 'lucide-react';
import type { Employee, CreateEmployeeData } from '../../types';

interface EmployeeFormProps {
  employee: Employee | null;
  onSubmit: (data: CreateEmployeeData) => Promise<void>;
  onClose: () => void;
}

const defaultColors = [
  '#6366F1', '#8B5CF6', '#EC4899', '#EF4444', '#F97316',
  '#EAB308', '#22C55E', '#14B8A6', '#06B6D4', '#3B82F6',
];

export default function EmployeeForm({ employee, onSubmit, onClose }: EmployeeFormProps) {
  const [formData, setFormData] = useState<CreateEmployeeData>({
    firstName: employee?.firstName ?? '',
    lastName: employee?.lastName ?? '',
    displayName: employee?.displayName ?? '',
    email: employee?.email ?? '',
    role: employee?.role ?? '',
    department: employee?.department ?? '',
    color: employee?.color ?? defaultColors[Math.floor(Math.random() * defaultColors.length)],
    isSenior: employee?.isSenior ?? false,
    isActive: employee?.isActive ?? true,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setError('First and last name are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onSubmit(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save employee');
      setLoading(false);
    }
  };

  const handleChange = (field: keyof CreateEmployeeData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-board-panel border border-board-border rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-board-border">
          <h2 className="text-lg font-semibold text-white">
            {employee ? 'Edit Employee' : 'New Employee'}
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

          {/* Name */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                First Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                className="w-full px-3 py-2 bg-board-bg border border-board-border rounded-md text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Last Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                className="w-full px-3 py-2 bg-board-bg border border-board-border rounded-md text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Display Name</label>
            <input
              type="text"
              value={formData.displayName ?? ''}
              onChange={(e) => handleChange('displayName', e.target.value)}
              className="w-full px-3 py-2 bg-board-bg border border-board-border rounded-md text-white focus:outline-none focus:border-blue-500"
              placeholder={`${formData.firstName} ${formData.lastName}`.trim() || 'Display name'}
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
            <input
              type="email"
              value={formData.email ?? ''}
              onChange={(e) => handleChange('email', e.target.value)}
              className="w-full px-3 py-2 bg-board-bg border border-board-border rounded-md text-white focus:outline-none focus:border-blue-500"
              placeholder="email@example.com"
            />
          </div>

          {/* Role & Department */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Role</label>
              <input
                type="text"
                value={formData.role ?? ''}
                onChange={(e) => handleChange('role', e.target.value)}
                className="w-full px-3 py-2 bg-board-bg border border-board-border rounded-md text-white focus:outline-none focus:border-blue-500"
                placeholder="Developer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Department</label>
              <input
                type="text"
                value={formData.department ?? ''}
                onChange={(e) => handleChange('department', e.target.value)}
                className="w-full px-3 py-2 bg-board-bg border border-board-border rounded-md text-white focus:outline-none focus:border-blue-500"
                placeholder="Engineering"
              />
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Avatar Color</label>
            <div className="flex gap-2 flex-wrap">
              {defaultColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleChange('color', color)}
                  className={`w-8 h-8 rounded-full transition-all ${
                    formData.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-board-panel' : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isSenior ?? false}
                onChange={(e) => handleChange('isSenior', e.target.checked)}
                className="w-4 h-4 rounded border-board-border bg-board-bg text-purple-500 focus:ring-purple-500"
              />
              <span className="text-sm text-gray-300">Senior</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isActive ?? true}
                onChange={(e) => handleChange('isActive', e.target.checked)}
                className="w-4 h-4 rounded border-board-border bg-board-bg text-purple-500 focus:ring-purple-500"
              />
              <span className="text-sm text-gray-300">Active</span>
            </label>
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
              {loading ? 'Saving...' : employee ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
