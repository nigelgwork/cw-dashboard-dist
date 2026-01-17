import { useState } from 'react';
import { X } from 'lucide-react';
import type { Quotation, QuotationStatus, Priority, Employee, CreateQuotationData } from '../../types';

interface QuotationFormProps {
  quotation: Quotation | null;
  employees: Employee[];
  onSubmit: (data: CreateQuotationData) => Promise<void>;
  onClose: () => void;
}

export default function QuotationForm({ quotation, employees, onSubmit, onClose }: QuotationFormProps) {
  const [formData, setFormData] = useState<CreateQuotationData>({
    reference: quotation?.reference ?? '',
    clientName: quotation?.clientName ?? '',
    projectName: quotation?.projectName ?? '',
    description: quotation?.description ?? '',
    value: quotation?.value ?? undefined,
    assignedTo: quotation?.assignedTo ?? undefined,
    status: quotation?.status ?? 'draft',
    priority: quotation?.priority ?? 'medium',
    dueDate: quotation?.dueDate ?? '',
    sentDate: quotation?.sentDate ?? '',
    followUpDate: quotation?.followUpDate ?? '',
    probability: quotation?.probability ?? 50,
    notes: quotation?.notes ?? '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.clientName.trim()) {
      setError('Client name is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onSubmit(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save quotation');
      setLoading(false);
    }
  };

  const handleChange = (field: keyof CreateQuotationData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-board-panel border border-board-border rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-board-border">
          <h2 className="text-lg font-semibold text-white">
            {quotation ? 'Edit Quotation' : 'New Quotation'}
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

          {/* Client Name & Reference */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Client Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.clientName}
                onChange={(e) => handleChange('clientName', e.target.value)}
                className="w-full px-3 py-2 bg-board-bg border border-board-border rounded-md text-white focus:outline-none focus:border-blue-500"
                placeholder="Client company name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Reference</label>
              <input
                type="text"
                value={formData.reference ?? ''}
                onChange={(e) => handleChange('reference', e.target.value)}
                className="w-full px-3 py-2 bg-board-bg border border-board-border rounded-md text-white focus:outline-none focus:border-blue-500"
                placeholder="Q-2024-001"
              />
            </div>
          </div>

          {/* Project Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Project Name</label>
            <input
              type="text"
              value={formData.projectName ?? ''}
              onChange={(e) => handleChange('projectName', e.target.value)}
              className="w-full px-3 py-2 bg-board-bg border border-board-border rounded-md text-white focus:outline-none focus:border-blue-500"
              placeholder="Project or proposal name"
            />
          </div>

          {/* Value & Probability */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Value ($)</label>
              <input
                type="number"
                value={formData.value ?? ''}
                onChange={(e) => handleChange('value', e.target.value ? parseFloat(e.target.value) : undefined)}
                className="w-full px-3 py-2 bg-board-bg border border-board-border rounded-md text-white focus:outline-none focus:border-blue-500"
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Probability ({formData.probability}%)
              </label>
              <input
                type="range"
                value={formData.probability ?? 50}
                onChange={(e) => handleChange('probability', parseInt(e.target.value))}
                className="w-full"
                min="0"
                max="100"
                step="5"
              />
            </div>
          </div>

          {/* Status & Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value as QuotationStatus)}
                className="w-full px-3 py-2 bg-board-bg border border-board-border rounded-md text-white focus:outline-none focus:border-blue-500"
              >
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="follow_up">Follow Up</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => handleChange('priority', e.target.value as Priority)}
                className="w-full px-3 py-2 bg-board-bg border border-board-border rounded-md text-white focus:outline-none focus:border-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Assigned To */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Assigned To</label>
            <select
              value={formData.assignedTo ?? ''}
              onChange={(e) => handleChange('assignedTo', e.target.value ? parseInt(e.target.value) : undefined)}
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

          {/* Dates */}
          <div className="grid grid-cols-3 gap-4">
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
              <label className="block text-sm font-medium text-gray-300 mb-1">Sent Date</label>
              <input
                type="date"
                value={formData.sentDate ?? ''}
                onChange={(e) => handleChange('sentDate', e.target.value)}
                className="w-full px-3 py-2 bg-board-bg border border-board-border rounded-md text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Follow Up Date</label>
              <input
                type="date"
                value={formData.followUpDate ?? ''}
                onChange={(e) => handleChange('followUpDate', e.target.value)}
                className="w-full px-3 py-2 bg-board-bg border border-board-border rounded-md text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
            <textarea
              value={formData.description ?? ''}
              onChange={(e) => handleChange('description', e.target.value)}
              className="w-full px-3 py-2 bg-board-bg border border-board-border rounded-md text-white focus:outline-none focus:border-blue-500 resize-none"
              rows={3}
              placeholder="Brief description of the quotation..."
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Notes</label>
            <textarea
              value={formData.notes ?? ''}
              onChange={(e) => handleChange('notes', e.target.value)}
              className="w-full px-3 py-2 bg-board-bg border border-board-border rounded-md text-white focus:outline-none focus:border-blue-500 resize-none"
              rows={2}
              placeholder="Internal notes..."
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
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-md transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : quotation ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
