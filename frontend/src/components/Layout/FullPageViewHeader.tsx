import { Search, Filter, LayoutGrid, List, Code, Settings, LucideIcon } from 'lucide-react';
import { isElectron } from '../../api';

export type ViewMode = 'detailed' | 'compact' | 'raw';

interface FullPageViewHeaderProps {
  icon: LucideIcon;
  color: string;
  label: string;
  itemCount: number;
  totalCount: number;
  hasActiveFilters: boolean;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  searchText: string;
  onSearchChange: (text: string) => void;
  showDetailSettings?: boolean;
  onOpenDetailSettings?: () => void;
}

export default function FullPageViewHeader({
  icon: Icon,
  color,
  label,
  itemCount,
  totalCount,
  hasActiveFilters,
  viewMode,
  onViewModeChange,
  showFilters,
  onToggleFilters,
  searchText,
  onSearchChange,
  showDetailSettings,
  onOpenDetailSettings,
}: FullPageViewHeaderProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-board-panel border-b border-board-border flex-shrink-0">
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${color}`}>
        <Icon size={16} className="text-white" />
        <span className="text-white font-semibold">{label}</span>
        <span className="text-white/80 text-sm">
          {itemCount}{hasActiveFilters ? `/${totalCount}` : ''}
        </span>
      </div>

      {/* View mode toggle */}
      <div className="flex items-center bg-board-bg border border-board-border rounded-lg overflow-hidden">
        <button
          onClick={() => onViewModeChange('detailed')}
          className={`p-2 transition-colors ${viewMode === 'detailed' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:text-white'}`}
          title="Detailed view"
        >
          <LayoutGrid size={18} />
        </button>
        <button
          onClick={() => onViewModeChange('compact')}
          className={`p-2 transition-colors ${viewMode === 'compact' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:text-white'}`}
          title="Compact view"
        >
          <List size={18} />
        </button>
        <button
          onClick={() => onViewModeChange('raw')}
          className={`p-2 transition-colors ${viewMode === 'raw' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:text-white'}`}
          title="Raw data view"
        >
          <Code size={18} />
        </button>
      </div>

      <button
        onClick={onToggleFilters}
        className={`p-2 rounded transition-colors ${showFilters || hasActiveFilters ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:text-white hover:bg-board-border'}`}
        title="Toggle filters"
      >
        <Filter size={18} />
      </button>

      {/* Detail Fields Settings - Only for Projects */}
      {showDetailSettings && isElectron() && onOpenDetailSettings && (
        <button
          onClick={onOpenDetailSettings}
          className="p-2 rounded text-gray-400 hover:text-white hover:bg-board-border transition-colors"
          title="Configure detail fields"
        >
          <Settings size={18} />
        </button>
      )}

      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={searchText}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={`Search ${label.toLowerCase()}...`}
          className="w-full pl-10 pr-4 py-2 text-sm bg-board-bg border border-board-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
      </div>
    </div>
  );
}
