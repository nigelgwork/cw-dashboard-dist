import { Search, X } from 'lucide-react';
import type { QuotationStatus, Priority, Employee } from '../../types';

interface QuotationFiltersProps {
  statusFilter: QuotationStatus | '';
  setStatusFilter: (status: QuotationStatus | '') => void;
  priorityFilter: Priority | '';
  setPriorityFilter: (priority: Priority | '') => void;
  assigneeFilter: number | '';
  setAssigneeFilter: (assignee: number | '') => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  employees: Employee[];
}

export default function QuotationFilters({
  statusFilter,
  setStatusFilter,
  priorityFilter,
  setPriorityFilter,
  assigneeFilter,
  setAssigneeFilter,
  searchTerm,
  setSearchTerm,
  employees,
}: QuotationFiltersProps) {
  const hasFilters = statusFilter || priorityFilter || assigneeFilter || searchTerm;

  const clearFilters = () => {
    setStatusFilter('');
    setPriorityFilter('');
    setAssigneeFilter('');
    setSearchTerm('');
  };

  return (
    <div className="flex flex-wrap items-center gap-4 mb-6">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Search quotations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-board-panel border border-board-border rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Status filter */}
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value as QuotationStatus | '')}
        className="px-3 py-2 bg-board-panel border border-board-border rounded-md text-white focus:outline-none focus:border-blue-500"
      >
        <option value="">All Statuses</option>
        <option value="draft">Draft</option>
        <option value="sent">Sent</option>
        <option value="follow_up">Follow Up</option>
        <option value="won">Won</option>
        <option value="lost">Lost</option>
      </select>

      {/* Priority filter */}
      <select
        value={priorityFilter}
        onChange={(e) => setPriorityFilter(e.target.value as Priority | '')}
        className="px-3 py-2 bg-board-panel border border-board-border rounded-md text-white focus:outline-none focus:border-blue-500"
      >
        <option value="">All Priorities</option>
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
        <option value="urgent">Urgent</option>
      </select>

      {/* Assignee filter */}
      <select
        value={assigneeFilter}
        onChange={(e) => setAssigneeFilter(e.target.value ? parseInt(e.target.value) : '')}
        className="px-3 py-2 bg-board-panel border border-board-border rounded-md text-white focus:outline-none focus:border-blue-500"
      >
        <option value="">All Assignees</option>
        {employees.map((emp) => (
          <option key={emp.id} value={emp.id}>
            {emp.displayName || `${emp.firstName} ${emp.lastName}`}
          </option>
        ))}
      </select>

      {/* Clear filters */}
      {hasFilters && (
        <button
          onClick={clearFilters}
          className="flex items-center gap-1 px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <X size={16} />
          <span>Clear</span>
        </button>
      )}
    </div>
  );
}
