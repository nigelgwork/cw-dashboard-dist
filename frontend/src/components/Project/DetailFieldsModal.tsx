import { useState, useEffect } from 'react';
import { X, Loader2, CheckCircle, FileText } from 'lucide-react';
import { electronProjectsApi, electronSettingsApi, isElectron } from '../../api/electron-api';
import { useToast } from '../../context/ToastContext';
import { getFieldDisplayNameWithCategory, groupFieldsByCategory } from '../../utils/detailFieldNames';

// Setting key for visible detail fields
const PROJECT_DETAIL_VISIBLE_FIELDS_KEY = 'project_detail_visible_fields';

interface DetailFieldsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (fields: string[]) => void;
}

export default function DetailFieldsModal({ isOpen, onClose, onSave }: DetailFieldsModalProps) {
  const { showToast } = useToast();
  const [availableFields, setAvailableFields] = useState<string[]>([]);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load fields when modal opens
  useEffect(() => {
    if (!isOpen || !isElectron()) return;

    const loadFields = async () => {
      setLoading(true);
      try {
        // Load available fields from projects
        const fields = await electronProjectsApi.getAvailableDetailFields();
        setAvailableFields(fields);

        // Load currently selected fields from settings
        const savedFields = await electronSettingsApi.get(PROJECT_DETAIL_VISIBLE_FIELDS_KEY);
        if (savedFields) {
          try {
            setSelectedFields(JSON.parse(savedFields));
          } catch {
            setSelectedFields([]);
          }
        }
      } catch (err) {
        console.error('Failed to load detail fields:', err);
        showToast('error', 'Failed to load detail fields');
      } finally {
        setLoading(false);
      }
    };
    loadFields();
  }, [isOpen, showToast]);

  const handleSave = async () => {
    if (!isElectron()) return;
    setSaving(true);
    try {
      await electronSettingsApi.set(PROJECT_DETAIL_VISIBLE_FIELDS_KEY, JSON.stringify(selectedFields));
      showToast('success', 'Detail fields saved');
      onSave?.(selectedFields);
      onClose();
    } catch (err) {
      showToast('error', 'Failed to save detail fields');
    } finally {
      setSaving(false);
    }
  };

  const toggleField = (field: string) => {
    setSelectedFields(prev =>
      prev.includes(field)
        ? prev.filter(f => f !== field)
        : [...prev, field]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-board-panel border border-board-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-board-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <FileText size={20} className="text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Project Detail Fields</h2>
              <p className="text-xs text-gray-400">Select fields to display on project cards</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-board-border rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 size={32} className="text-purple-400 animate-spin mb-3" />
              <p className="text-gray-400 text-sm">Loading available fields...</p>
            </div>
          ) : availableFields.length === 0 ? (
            <div className="text-center py-12">
              <FileText size={48} className="text-gray-600 mx-auto mb-4" />
              <h3 className="text-white font-medium mb-2">No Detail Data Available</h3>
              <p className="text-gray-400 text-sm max-w-sm mx-auto">
                To configure detail fields, you need to import a Project Detail feed, link it to your Projects feed, and run a sync.
              </p>
            </div>
          ) : (
            <>
              {/* Selection controls */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-300">
                  {selectedFields.length} of {availableFields.length} fields selected
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedFields([])}
                    className="px-3 py-1.5 text-xs text-gray-400 hover:text-white border border-board-border rounded transition-colors"
                  >
                    Clear All
                  </button>
                  <button
                    onClick={() => setSelectedFields([...availableFields])}
                    className="px-3 py-1.5 text-xs text-gray-400 hover:text-white border border-board-border rounded transition-colors"
                  >
                    Select All
                  </button>
                </div>
              </div>

              {/* Field groups */}
              <div className="space-y-4">
                {Object.entries(groupFieldsByCategory(availableFields)).map(([category, fields]) => (
                  <div key={category}>
                    <h4 className="text-xs font-medium text-purple-400 uppercase tracking-wide mb-2 sticky top-0 bg-board-panel py-1 z-10">
                      {category}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {fields.map(field => (
                        <label
                          key={field}
                          className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                            selectedFields.includes(field)
                              ? 'bg-purple-500/20 border border-purple-500/30'
                              : 'bg-board-bg border border-board-border hover:border-gray-600'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedFields.includes(field)}
                            onChange={() => toggleField(field)}
                            className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-purple-500 focus:ring-purple-500 focus:ring-offset-0"
                          />
                          <span
                            className="text-sm text-gray-300 truncate"
                            title={`${getFieldDisplayNameWithCategory(field)} (${field})`}
                          >
                            {getFieldDisplayNameWithCategory(field).split(': ')[1] || getFieldDisplayNameWithCategory(field)}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-board-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-board-border rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading || availableFields.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle size={16} />
                Save Selection
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
