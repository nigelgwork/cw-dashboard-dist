import { useState, useEffect, useCallback } from 'react';
import { Plus, Users, Trash2, Loader2, AlertCircle, ChevronDown, ChevronRight, UserPlus, UserMinus } from 'lucide-react';
import { isElectron } from '../../api/electron-api';
import { teams, employees, cloud } from '../../api';
import type { Team, Employee, CloudStatus, TeamMember } from '../../types';
import { useToast } from '../../context/ToastContext';

interface TeamWithMembers extends Team {
  members: TeamMember[];
}

export default function TeamManagement() {
  const { showToast } = useToast();
  const [teamList, setTeamList] = useState<TeamWithMembers[]>([]);
  const [employeeList, setEmployeeList] = useState<Employee[]>([]);
  const [cloudStatus, setCloudStatus] = useState<CloudStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedTeam, setExpandedTeam] = useState<number | null>(null);
  const [showNewTeamForm, setShowNewTeamForm] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamColor, setNewTeamColor] = useState('#3B82F6');
  const [creating, setCreating] = useState(false);
  const [deletingTeam, setDeletingTeam] = useState<number | null>(null);

  const teamColors = [
    '#3B82F6', '#8B5CF6', '#EC4899', '#EF4444', '#F97316',
    '#EAB308', '#22C55E', '#14B8A6', '#06B6D4', '#6366F1',
  ];

  const loadData = useCallback(async () => {
    if (!teams || !employees || !cloud) return;

    try {
      const status = await cloud.getStatus();
      setCloudStatus(status);

      if (!status.connected) {
        setLoading(false);
        return;
      }

      const [teamsData, employeesData] = await Promise.all([
        teams.getAll(),
        employees.getAll(),
      ]);

      // Load members for each team
      const teamsApi = teams; // Capture for closure
      const teamsWithMembers: TeamWithMembers[] = await Promise.all(
        teamsData.map(async (team) => {
          const members = await teamsApi.getMembers(team.id);
          return { ...team, members };
        })
      );

      setTeamList(teamsWithMembers);
      setEmployeeList(employeesData);
    } catch (err) {
      console.error('Failed to load team data:', err);
      showToast('error', 'Failed to load team data');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (!isElectron()) return;
    loadData();
  }, [loadData]);

  const handleCreateTeam = async () => {
    if (!teams || !newTeamName.trim()) return;

    setCreating(true);
    try {
      await teams.create({
        name: newTeamName.trim(),
        color: newTeamColor,
      });
      setNewTeamName('');
      setShowNewTeamForm(false);
      showToast('success', 'Team created');
      loadData();
    } catch (err) {
      showToast('error', 'Failed to create team');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteTeam = async (teamId: number) => {
    if (!teams) return;
    if (!confirm('Are you sure you want to delete this team?')) return;

    setDeletingTeam(teamId);
    try {
      await teams.delete(teamId);
      showToast('success', 'Team deleted');
      loadData();
    } catch (err) {
      showToast('error', 'Failed to delete team');
    } finally {
      setDeletingTeam(null);
    }
  };

  const handleAddMember = async (teamId: number, employeeId: number) => {
    if (!teams) return;

    try {
      await teams.addMember(teamId, employeeId);
      showToast('success', 'Member added');
      loadData();
    } catch (err) {
      showToast('error', 'Failed to add member');
    }
  };

  const handleRemoveMember = async (teamId: number, employeeId: number) => {
    if (!teams) return;

    try {
      await teams.removeMember(teamId, employeeId);
      showToast('success', 'Member removed');
      loadData();
    } catch (err) {
      showToast('error', 'Failed to remove member');
    }
  };

  // Get employee details from member info
  const getEmployeeForMember = (member: TeamMember): Employee | undefined => {
    return employeeList.find((e) => e.id === member.employeeId);
  };

  const getUnassignedEmployees = (team: TeamWithMembers) => {
    const memberIds = new Set(team.members.map((m) => m.employeeId));
    return employeeList.filter((e) => !memberIds.has(e.id) && e.isActive);
  };

  if (!isElectron()) {
    return (
      <div className="bg-board-panel border border-board-border rounded-lg p-6 text-center">
        <AlertCircle size={32} className="text-yellow-500 mx-auto mb-3" />
        <h3 className="text-white font-medium mb-2">Desktop Only Feature</h3>
        <p className="text-gray-400 text-sm">
          Team management is only available in the desktop application.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (!cloudStatus?.connected) {
    return (
      <div className="bg-board-panel border border-board-border rounded-lg p-6 text-center">
        <AlertCircle size={32} className="text-yellow-500 mx-auto mb-3" />
        <h3 className="text-white font-medium mb-2">Cloud Database Required</h3>
        <p className="text-gray-400 text-sm">
          Connect to a cloud database in the Cloud Database settings to manage teams.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-white">Team Management</h2>
          <button
            onClick={() => setShowNewTeamForm(!showNewTeamForm)}
            className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            New Team
          </button>
        </div>

        {/* New Team Form */}
        {showNewTeamForm && (
          <div className="bg-board-panel border border-board-border rounded-lg p-4 mb-4">
            <h4 className="text-sm font-medium text-white mb-3">Create New Team</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Team Name</label>
                <input
                  type="text"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="e.g., Engineering"
                  className="w-full px-3 py-2 bg-board-bg border border-board-border rounded text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-2">Team Color</label>
                <div className="flex gap-2 flex-wrap">
                  {teamColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewTeamColor(color)}
                      className={`w-6 h-6 rounded-full transition-all ${
                        newTeamColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-board-panel' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={handleCreateTeam}
                  disabled={creating || !newTeamName.trim()}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {creating ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Team'
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowNewTeamForm(false);
                    setNewTeamName('');
                  }}
                  className="px-3 py-1.5 text-gray-400 hover:text-white text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Teams List */}
        {teamList.length === 0 ? (
          <div className="bg-board-panel border border-board-border rounded-lg p-6 text-center">
            <Users size={32} className="text-gray-500 mx-auto mb-3" />
            <h3 className="text-white font-medium mb-2">No Teams Yet</h3>
            <p className="text-gray-400 text-sm">
              Create a team to organize your employees.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {teamList.map((team) => {
              const isExpanded = expandedTeam === team.id;
              const unassigned = getUnassignedEmployees(team);

              return (
                <div
                  key={team.id}
                  className="bg-board-panel border border-board-border rounded-lg overflow-hidden"
                >
                  {/* Team Header */}
                  <div
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-board-border/30 transition-colors"
                    onClick={() => setExpandedTeam(isExpanded ? null : team.id)}
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown size={16} className="text-gray-400" />
                      ) : (
                        <ChevronRight size={16} className="text-gray-400" />
                      )}
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: team.color || '#3B82F6' }}
                      />
                      <span className="text-white font-medium">{team.name}</span>
                      <span className="text-xs text-gray-500">
                        ({team.members.length} member{team.members.length !== 1 ? 's' : ''})
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTeam(team.id);
                      }}
                      disabled={deletingTeam === team.id}
                      className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                    >
                      {deletingTeam === team.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                    </button>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="border-t border-board-border p-3 space-y-3">
                      {/* Current Members */}
                      <div>
                        <h5 className="text-xs text-gray-400 mb-2">Members</h5>
                        {team.members.length === 0 ? (
                          <p className="text-xs text-gray-500 italic">No members assigned</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {team.members.map((member) => {
                              const emp = getEmployeeForMember(member);
                              const displayName = emp
                                ? (emp.displayName || `${emp.firstName} ${emp.lastName}`)
                                : (member.employeeName || 'Unknown');
                              const initial = emp?.firstName?.[0] || displayName[0] || '?';
                              const color = emp?.color || '#6366F1';

                              return (
                                <div
                                  key={member.id}
                                  className="flex items-center gap-2 px-2 py-1 bg-board-bg rounded text-sm"
                                >
                                  <div
                                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs text-white"
                                    style={{ backgroundColor: color }}
                                  >
                                    {initial.toUpperCase()}
                                  </div>
                                  <span className="text-gray-300">{displayName}</span>
                                  {member.isLead && (
                                    <span className="text-xs text-yellow-400">(Lead)</span>
                                  )}
                                  <button
                                    onClick={() => handleRemoveMember(team.id, member.employeeId)}
                                    className="text-gray-500 hover:text-red-400 transition-colors"
                                  >
                                    <UserMinus size={12} />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Add Members */}
                      {unassigned.length > 0 && (
                        <div>
                          <h5 className="text-xs text-gray-400 mb-2">Add Members</h5>
                          <div className="flex flex-wrap gap-2">
                            {unassigned.map((emp) => (
                              <button
                                key={emp.id}
                                onClick={() => handleAddMember(team.id, emp.id)}
                                className="flex items-center gap-2 px-2 py-1 bg-board-border/50 hover:bg-board-border rounded text-sm transition-colors"
                              >
                                <div
                                  className="w-5 h-5 rounded-full flex items-center justify-center text-xs text-white"
                                  style={{ backgroundColor: emp.color || '#6366F1' }}
                                >
                                  {(emp.firstName?.[0] || '?').toUpperCase()}
                                </div>
                                <span className="text-gray-400">
                                  {emp.displayName || `${emp.firstName} ${emp.lastName}`}
                                </span>
                                <UserPlus size={12} className="text-green-400" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Info */}
        <div className="mt-4 p-3 bg-board-border/30 rounded-lg">
          <p className="text-xs text-gray-500">
            Teams help organize employees for filtering in the Resources view.
            Each employee can belong to multiple teams.
          </p>
        </div>
      </div>
    </div>
  );
}
