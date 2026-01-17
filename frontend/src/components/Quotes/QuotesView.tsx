import { useState, useEffect, useCallback } from 'react';
import { Plus, List, LayoutGrid, AlertCircle, Cloud, CloudOff } from 'lucide-react';
import { quotations, cloud, employees } from '../../api';
import type { Quotation, QuotationStatus, Priority, Employee, CloudStatus, CreateQuotationData } from '../../types';
import QuotationCard from './QuotationCard';
import QuotationForm from './QuotationForm';
import QuotationFilters from './QuotationFilters';

type ViewMode = 'cards' | 'list';

export default function QuotesView() {
  const [items, setItems] = useState<Quotation[]>([]);
  const [employeeList, setEmployeeList] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cloudStatus, setCloudStatus] = useState<CloudStatus | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Quotation | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<QuotationStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<Priority | ''>('');
  const [assigneeFilter, setAssigneeFilter] = useState<number | ''>('');
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = useCallback(async () => {
    if (!quotations || !cloud) return;

    try {
      setLoading(true);
      setError(null);

      const status = await cloud.getStatus();
      setCloudStatus(status);

      if (!status.connected) {
        setItems([]);
        setLoading(false);
        return;
      }

      const [quotationData, employeeData] = await Promise.all([
        quotations.getAll({
          status: statusFilter || undefined,
          priority: priorityFilter || undefined,
          assignedTo: assigneeFilter || undefined,
        }),
        employees?.getAll({ isActive: true }) ?? [],
      ]);

      setItems(quotationData);
      setEmployeeList(employeeData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quotations');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, assigneeFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = () => {
    setEditingItem(null);
    setShowForm(true);
  };

  const handleEdit = (item: Quotation) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!quotations) return;
    if (!confirm('Are you sure you want to delete this quotation?')) return;

    try {
      await quotations.delete(id);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete quotation');
    }
  };

  const handleFormSubmit = async (data: CreateQuotationData) => {
    if (!quotations) return;

    try {
      if (editingItem) {
        await quotations.update(editingItem.id, data);
      } else {
        await quotations.create(data);
      }
      setShowForm(false);
      setEditingItem(null);
      loadData();
    } catch (err) {
      throw err;
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingItem(null);
  };

  // Filter items by search term
  const filteredItems = items.filter((item) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      item.clientName.toLowerCase().includes(search) ||
      item.projectName?.toLowerCase().includes(search) ||
      item.reference?.toLowerCase().includes(search) ||
      item.description?.toLowerCase().includes(search)
    );
  });

  // Show cloud connection required message
  if (!cloudStatus?.connected) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-xl font-semibold text-white">Quotes & Proposals</h2>
        </div>
        <div className="bg-board-panel border border-board-border rounded-lg p-8 text-center">
          <CloudOff className="mx-auto mb-4 text-gray-500" size={48} />
          <h3 className="text-lg font-medium text-white mb-2">Cloud Database Required</h3>
          <p className="text-gray-400 mb-4">
            Quotes require a cloud database connection. Configure your Neon PostgreSQL connection in Settings.
          </p>
          {cloudStatus?.lastError && (
            <p className="text-sm text-red-400 mb-4">Last error: {cloudStatus.lastError}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-white">Quotes & Proposals</h2>
          <div className="flex items-center gap-1 text-sm text-emerald-400">
            <Cloud size={14} />
            <span>Connected</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* View mode toggle */}
          <div className="flex items-center bg-board-border rounded-md">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2 rounded-l-md transition-colors ${
                viewMode === 'cards' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'
              }`}
              title="Card view"
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-r-md transition-colors ${
                viewMode === 'list' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'
              }`}
              title="List view"
            >
              <List size={18} />
            </button>
          </div>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-md transition-colors"
          >
            <Plus size={18} />
            <span>New Quote</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <QuotationFilters
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        priorityFilter={priorityFilter}
        setPriorityFilter={setPriorityFilter}
        assigneeFilter={assigneeFilter}
        setAssigneeFilter={setAssigneeFilter}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        employees={employeeList}
      />

      {/* Error message */}
      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3 text-red-400">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredItems.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400 mb-4">
            {items.length === 0 ? 'No quotations yet. Create your first one!' : 'No quotations match your filters.'}
          </p>
          {items.length === 0 && (
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-md transition-colors"
            >
              Create Quotation
            </button>
          )}
        </div>
      )}

      {/* Content */}
      {!loading && filteredItems.length > 0 && (
        viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredItems.map((item) => (
              <QuotationCard
                key={item.id}
                quotation={item}
                onEdit={() => handleEdit(item)}
                onDelete={() => handleDelete(item.id)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-board-panel border border-board-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-board-border/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Reference</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Value</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Priority</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Assigned</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Due Date</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-board-border">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-board-border/30 transition-colors">
                    <td className="px-4 py-3 text-sm text-white">{item.reference || '-'}</td>
                    <td className="px-4 py-3 text-sm text-white">{item.clientName}</td>
                    <td className="px-4 py-3 text-sm text-white">
                      {item.value != null ? `$${item.value.toLocaleString()}` : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-4 py-3">
                      <PriorityBadge priority={item.priority} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">{item.assignedToName || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleEdit(item)}
                        className="text-blue-400 hover:text-blue-300 text-sm mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Form Modal */}
      {showForm && (
        <QuotationForm
          quotation={editingItem}
          employees={employeeList}
          onSubmit={handleFormSubmit}
          onClose={handleFormClose}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: QuotationStatus }) {
  const colors: Record<QuotationStatus, string> = {
    draft: 'bg-gray-500/20 text-gray-400',
    sent: 'bg-blue-500/20 text-blue-400',
    follow_up: 'bg-amber-500/20 text-amber-400',
    won: 'bg-emerald-500/20 text-emerald-400',
    lost: 'bg-red-500/20 text-red-400',
  };

  const labels: Record<QuotationStatus, string> = {
    draft: 'Draft',
    sent: 'Sent',
    follow_up: 'Follow Up',
    won: 'Won',
    lost: 'Lost',
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${colors[status]}`}>
      {labels[status]}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: Priority }) {
  const colors: Record<Priority, string> = {
    low: 'bg-slate-500/20 text-slate-400',
    medium: 'bg-blue-500/20 text-blue-400',
    high: 'bg-orange-500/20 text-orange-400',
    urgent: 'bg-red-500/20 text-red-400',
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${colors[priority]}`}>
      {priority}
    </span>
  );
}
