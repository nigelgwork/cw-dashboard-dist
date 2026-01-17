import { MoreVertical, Calendar, User, DollarSign, Percent } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import type { Quotation, QuotationStatus, Priority } from '../../types';

interface QuotationCardProps {
  quotation: Quotation;
  onEdit: () => void;
  onDelete: () => void;
}

export default function QuotationCard({ quotation, onEdit, onDelete }: QuotationCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const statusColors: Record<QuotationStatus, { bg: string; border: string; text: string }> = {
    draft: { bg: 'bg-gray-500/10', border: 'border-gray-500/30', text: 'text-gray-400' },
    sent: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' },
    follow_up: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400' },
    won: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400' },
    lost: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400' },
  };

  const priorityColors: Record<Priority, string> = {
    low: 'bg-slate-500',
    medium: 'bg-blue-500',
    high: 'bg-orange-500',
    urgent: 'bg-red-500',
  };

  const statusLabels: Record<QuotationStatus, string> = {
    draft: 'Draft',
    sent: 'Sent',
    follow_up: 'Follow Up',
    won: 'Won',
    lost: 'Lost',
  };

  const colors = statusColors[quotation.status];

  return (
    <div className={`${colors.bg} border ${colors.border} rounded-lg p-4 relative group`}>
      {/* Priority indicator */}
      <div className={`absolute top-0 left-4 w-8 h-1 rounded-b ${priorityColors[quotation.priority]}`} />

      {/* Menu button */}
      <div className="absolute top-2 right-2" ref={menuRef}>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-1 text-gray-400 hover:text-white rounded transition-colors opacity-0 group-hover:opacity-100"
        >
          <MoreVertical size={16} />
        </button>
        {showMenu && (
          <div className="absolute right-0 mt-1 w-32 bg-board-panel border border-board-border rounded-md shadow-lg z-10">
            <button
              onClick={() => {
                setShowMenu(false);
                onEdit();
              }}
              className="block w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-board-border/50 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => {
                setShowMenu(false);
                onDelete();
              }}
              className="block w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-board-border/50 transition-colors"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Status badge */}
      <div className="mb-3">
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors.text} ${colors.bg}`}>
          {statusLabels[quotation.status]}
        </span>
      </div>

      {/* Client & Project */}
      <h3 className="text-white font-medium mb-1 pr-6">{quotation.clientName}</h3>
      {quotation.projectName && (
        <p className="text-gray-400 text-sm mb-3 truncate">{quotation.projectName}</p>
      )}

      {/* Reference */}
      {quotation.reference && (
        <p className="text-xs text-gray-500 mb-3">Ref: {quotation.reference}</p>
      )}

      {/* Value */}
      {quotation.value != null && (
        <div className="flex items-center gap-2 text-white mb-2">
          <DollarSign size={14} className="text-emerald-400" />
          <span className="font-semibold">${quotation.value.toLocaleString()}</span>
        </div>
      )}

      {/* Probability */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
        <Percent size={14} />
        <span>{quotation.probability}% probability</span>
      </div>

      {/* Footer info */}
      <div className="flex items-center justify-between text-xs text-gray-500 border-t border-board-border/50 pt-3 mt-3">
        {quotation.assignedToName ? (
          <div className="flex items-center gap-1">
            <User size={12} />
            <span>{quotation.assignedToName}</span>
          </div>
        ) : (
          <span>Unassigned</span>
        )}
        {quotation.dueDate && (
          <div className="flex items-center gap-1">
            <Calendar size={12} />
            <span>{new Date(quotation.dueDate).toLocaleDateString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}
