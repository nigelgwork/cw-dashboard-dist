import { useState, useEffect, useMemo } from 'react';
import { FolderKanban, TrendingUp, Ticket, Search, Filter, List, LayoutGrid, Code, Settings } from 'lucide-react';
import { Project, Opportunity, ServiceTicket } from '../../types';
import { projects as projectsApi, opportunities as opportunitiesApi, serviceTickets as serviceTicketsApi, isElectron, settings } from '../../api';
import { useWebSocket } from '../../context/WebSocketContext';
import ProjectCard from '../Project/ProjectCard';
import OpportunityCard from '../Opportunity/OpportunityCard';
import ServiceTicketCard from '../ServiceTicket/ServiceTicketCard';
import DetailFieldsModal from '../Project/DetailFieldsModal';

// Setting key for visible detail fields
const PROJECT_DETAIL_VISIBLE_FIELDS_KEY = 'project_detail_visible_fields';

type ViewType = 'projects' | 'opportunities' | 'service-tickets';

interface FullPageViewProps {
  type: ViewType;
  isPinned: (type: ViewType, id: number) => boolean;
  togglePin: (type: ViewType, id: number) => void;
}

// Parse PM name from notes field
const parsePMFromNotes = (notes: string | undefined): string | null => {
  if (!notes) return null;
  const match = notes.match(/PM:\s*([^|]+)/);
  return match ? match[1].trim() : null;
};

// Safely parse and format raw JSON data
const formatRawData = (rawData: string | null | undefined): string => {
  if (!rawData) return 'No raw data available - sync again to populate';
  try {
    return JSON.stringify(JSON.parse(rawData), null, 2);
  } catch {
    // If JSON parsing fails, show the raw string with error message
    return `[Invalid JSON - displaying raw string]\n\n${rawData}`;
  }
};

export default function FullPageView({ type, isPinned, togglePin }: FullPageViewProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [serviceTickets, setServiceTickets] = useState<ServiceTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const { lastMessage } = useWebSocket();

  // View mode toggle: 'detailed' | 'compact' | 'raw'
  const [viewMode, setViewMode] = useState<'detailed' | 'compact' | 'raw'>('detailed');

  // Project-specific filters
  const [statusFilter, setStatusFilter] = useState('');
  const [pmFilter, setPmFilter] = useState('');
  const [projectStatuses, setProjectStatuses] = useState<string[]>([]);

  // Opportunity-specific filters
  const [stageFilter, setStageFilter] = useState('');
  const [salesRepFilter, setSalesRepFilter] = useState('');
  const [stages, setStages] = useState<string[]>([]);
  const [salesReps, setSalesReps] = useState<string[]>([]);

  // Service ticket-specific filters
  const [ticketStatusFilter, setTicketStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [ticketStatuses, setTicketStatuses] = useState<string[]>([]);
  const [priorities, setPriorities] = useState<string[]>([]);
  const [assignees, setAssignees] = useState<string[]>([]);

  // Detail fields to display on project cards
  const [visibleDetailFields, setVisibleDetailFields] = useState<string[]>([]);
  const [showDetailFieldsModal, setShowDetailFieldsModal] = useState(false);

  // Fetch visible detail fields setting
  useEffect(() => {
    if (type === 'projects' && settings) {
      settings.get(PROJECT_DETAIL_VISIBLE_FIELDS_KEY).then(value => {
        if (value) {
          try {
            setVisibleDetailFields(JSON.parse(value));
          } catch {
            setVisibleDetailFields([]);
          }
        }
      }).catch(() => {});
    }
  }, [type]);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (type === 'projects') {
          const [data, statusesData] = await Promise.all([
            projectsApi.getAll({}),
            projectsApi.getStatuses(),
          ]);
          setProjects(data);
          setProjectStatuses(statusesData);
        } else if (type === 'opportunities') {
          const [data, stagesData, repsData] = await Promise.all([
            opportunitiesApi.getAll({}),
            opportunitiesApi.getStages(),
            opportunitiesApi.getSalesReps(),
          ]);
          setOpportunities(data);
          setStages(stagesData);
          setSalesReps(repsData);
        } else if (type === 'service-tickets') {
          const [data, statusesData, prioritiesData, assigneesData] = await Promise.all([
            serviceTicketsApi.getAll({}),
            serviceTicketsApi.getStatuses(),
            serviceTicketsApi.getPriorities(),
            serviceTicketsApi.getAssignees(),
          ]);
          setServiceTickets(data);
          setTicketStatuses(statusesData);
          setPriorities(prioritiesData);
          setAssignees(assigneesData);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [type]);

  // Handle WebSocket updates (web mode only - Electron uses IPC events)
  const isElectronApp = isElectron();
  useEffect(() => {
    if (isElectronApp || !lastMessage) return;
    const { type: msgType } = lastMessage;

    if (type === 'projects' && msgType.startsWith('project_')) {
      projectsApi.getAll({}).then(setProjects).catch(console.error);
    }
    if (type === 'opportunities' && msgType.startsWith('opportunity_')) {
      opportunitiesApi.getAll({}).then(setOpportunities).catch(console.error);
    }
    if (type === 'service-tickets' && msgType.startsWith('service_ticket_')) {
      serviceTicketsApi.getAll({}).then(setServiceTickets).catch(console.error);
    }
  }, [lastMessage, type, isElectronApp]);

  // Get unique PMs from projects
  const allPMs = useMemo(() => {
    const pms = new Set<string>();
    projects.forEach(p => {
      const pm = parsePMFromNotes(p.notes);
      if (pm) pms.add(pm);
    });
    return Array.from(pms).sort((a, b) => a.localeCompare(b));
  }, [projects]);

  // Filter projects
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      if (statusFilter && project.status !== statusFilter) return false;
      if (pmFilter) {
        const pm = parsePMFromNotes(project.notes);
        if (pm !== pmFilter) return false;
      }
      if (searchText.trim()) {
        const search = searchText.toLowerCase().trim();
        const matchesClient = project.clientName.toLowerCase().includes(search);
        const matchesProject = project.projectName.toLowerCase().includes(search);
        if (!matchesClient && !matchesProject) return false;
      }
      return true;
    });
  }, [projects, statusFilter, pmFilter, searchText]);

  // Filter opportunities
  const filteredOpportunities = useMemo(() => {
    return opportunities.filter(o => {
      if (stageFilter && o.stage !== stageFilter) return false;
      if (salesRepFilter && o.salesRep !== salesRepFilter) return false;
      if (searchText.trim()) {
        const search = searchText.toLowerCase().trim();
        const matchesCompany = o.companyName?.toLowerCase().includes(search);
        const matchesName = o.opportunityName?.toLowerCase().includes(search);
        if (!matchesCompany && !matchesName) return false;
      }
      return true;
    });
  }, [opportunities, stageFilter, salesRepFilter, searchText]);

  // Filter service tickets
  const filteredServiceTickets = useMemo(() => {
    return serviceTickets.filter(t => {
      if (ticketStatusFilter && t.status !== ticketStatusFilter) return false;
      if (priorityFilter && t.priority !== priorityFilter) return false;
      if (assigneeFilter && t.assignedTo !== assigneeFilter) return false;
      if (searchText.trim()) {
        const search = searchText.toLowerCase().trim();
        const matchesSummary = t.summary?.toLowerCase().includes(search);
        const matchesCompany = t.companyName?.toLowerCase().includes(search);
        const matchesExternal = t.externalId?.toLowerCase().includes(search);
        if (!matchesSummary && !matchesCompany && !matchesExternal) return false;
      }
      return true;
    });
  }, [serviceTickets, ticketStatusFilter, priorityFilter, assigneeFilter, searchText]);

  const hasActiveFilters = type === 'projects'
    ? statusFilter !== '' || pmFilter !== '' || searchText.trim() !== ''
    : type === 'opportunities'
    ? stageFilter !== '' || salesRepFilter !== '' || searchText.trim() !== ''
    : ticketStatusFilter !== '' || priorityFilter !== '' || assigneeFilter !== '' || searchText.trim() !== '';

  const items = type === 'projects'
    ? filteredProjects
    : type === 'opportunities'
    ? filteredOpportunities
    : filteredServiceTickets;
  const totalCount = type === 'projects'
    ? projects.length
    : type === 'opportunities'
    ? opportunities.length
    : serviceTickets.length;

  const getTypeConfig = () => {
    switch (type) {
      case 'projects':
        return { icon: FolderKanban, color: 'bg-purple-500', label: 'Projects' };
      case 'opportunities':
        return { icon: TrendingUp, color: 'bg-emerald-500', label: 'Opportunities' };
      case 'service-tickets':
        return { icon: Ticket, color: 'bg-orange-500', label: 'Service Tickets' };
    }
  };

  const config = getTypeConfig();
  const Icon = config.icon;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)]">
        <div className="text-gray-400">Loading {config.label.toLowerCase()}...</div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-board-panel border-b border-board-border flex-shrink-0">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${config.color}`}>
          <Icon size={16} className="text-white" />
          <span className="text-white font-semibold">{config.label}</span>
          <span className="text-white/80 text-sm">
            {items.length}{hasActiveFilters ? `/${totalCount}` : ''}
          </span>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center bg-board-bg border border-board-border rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode('detailed')}
            className={`p-2 transition-colors ${viewMode === 'detailed' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:text-white'}`}
            title="Detailed view"
          >
            <LayoutGrid size={18} />
          </button>
          <button
            onClick={() => setViewMode('compact')}
            className={`p-2 transition-colors ${viewMode === 'compact' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:text-white'}`}
            title="Compact view"
          >
            <List size={18} />
          </button>
          <button
            onClick={() => setViewMode('raw')}
            className={`p-2 transition-colors ${viewMode === 'raw' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:text-white'}`}
            title="Raw data view"
          >
            <Code size={18} />
          </button>
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`p-2 rounded transition-colors ${showFilters || hasActiveFilters ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:text-white hover:bg-board-border'}`}
          title="Toggle filters"
        >
          <Filter size={18} />
        </button>

        {/* Detail Fields Settings - Only for Projects */}
        {type === 'projects' && isElectron() && (
          <button
            onClick={() => setShowDetailFieldsModal(true)}
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
            onChange={(e) => setSearchText(e.target.value)}
            placeholder={`Search ${config.label.toLowerCase()}...`}
            className="w-full pl-10 pr-4 py-2 text-sm bg-board-bg border border-board-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="px-4 py-3 bg-board-panel border-b border-board-border flex items-center gap-3 flex-shrink-0">
          {type === 'projects' && (
            <>
              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-sm bg-board-bg border border-board-border rounded-lg text-white focus:outline-none focus:border-purple-500"
              >
                <option value="">All Statuses ({projectStatuses.length})</option>
                {projectStatuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>

              {/* PM filter */}
              <select
                value={pmFilter}
                onChange={(e) => setPmFilter(e.target.value)}
                className="px-3 py-2 text-sm bg-board-bg border border-board-border rounded-lg text-white focus:outline-none focus:border-purple-500"
              >
                <option value="">All PMs ({allPMs.length})</option>
                {allPMs.map(pm => (
                  <option key={pm} value={pm}>{pm}</option>
                ))}
              </select>
            </>
          )}

          {type === 'opportunities' && (
            <>
              {/* Stage filter */}
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="px-3 py-2 text-sm bg-board-bg border border-board-border rounded-lg text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">All Stages ({stages.length})</option>
                {stages.map(stage => (
                  <option key={stage} value={stage}>{stage}</option>
                ))}
              </select>

              {/* Sales rep filter */}
              <select
                value={salesRepFilter}
                onChange={(e) => setSalesRepFilter(e.target.value)}
                className="px-3 py-2 text-sm bg-board-bg border border-board-border rounded-lg text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">All Sales Reps ({salesReps.length})</option>
                {salesReps.map(rep => (
                  <option key={rep} value={rep}>{rep}</option>
                ))}
              </select>
            </>
          )}

          {type === 'service-tickets' && (
            <>
              {/* Status filter */}
              <select
                value={ticketStatusFilter}
                onChange={(e) => setTicketStatusFilter(e.target.value)}
                className="px-3 py-2 text-sm bg-board-bg border border-board-border rounded-lg text-white focus:outline-none focus:border-orange-500"
              >
                <option value="">All Statuses ({ticketStatuses.length})</option>
                {ticketStatuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>

              {/* Priority filter */}
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-3 py-2 text-sm bg-board-bg border border-board-border rounded-lg text-white focus:outline-none focus:border-orange-500"
              >
                <option value="">All Priorities ({priorities.length})</option>
                {priorities.map(priority => (
                  <option key={priority} value={priority}>{priority}</option>
                ))}
              </select>

              {/* Assignee filter */}
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="px-3 py-2 text-sm bg-board-bg border border-board-border rounded-lg text-white focus:outline-none focus:border-orange-500"
              >
                <option value="">All Assignees ({assignees.length})</option>
                {assignees.map(assignee => (
                  <option key={assignee} value={assignee}>{assignee}</option>
                ))}
              </select>
            </>
          )}
        </div>
      )}

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {items.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            {hasActiveFilters ? `No matching ${config.label.toLowerCase()}` : `No ${config.label.toLowerCase()}`}
          </div>
        ) : viewMode === 'raw' ? (
          /* Raw data view - shows JSON for each item */
          <div className="space-y-2">
            {type === 'projects' && filteredProjects.map((project) => (
              <div key={project.id} className="bg-board-bg border border-board-border rounded p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white">{project.clientName} - {project.projectName}</span>
                  <span className="text-xs text-gray-500">ID: {project.externalId}</span>
                </div>
                <pre className="text-xs text-gray-300 bg-gray-900 p-2 rounded overflow-x-auto max-h-64 overflow-y-auto">
                  {formatRawData(project.rawData)}
                </pre>
                {project.detailRawData && (
                  <>
                    <div className="text-xs text-purple-400 mt-3 mb-1 font-medium">Detail Data:</div>
                    <pre className="text-xs text-gray-300 bg-gray-900 p-2 rounded overflow-x-auto max-h-64 overflow-y-auto">
                      {formatRawData(project.detailRawData)}
                    </pre>
                  </>
                )}
              </div>
            ))}
            {type === 'opportunities' && filteredOpportunities.map((opportunity) => (
              <div key={opportunity.id} className="bg-board-bg border border-board-border rounded p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white">{opportunity.companyName} - {opportunity.opportunityName}</span>
                  <span className="text-xs text-gray-500">ID: {opportunity.id}</span>
                </div>
                <pre className="text-xs text-gray-300 bg-gray-900 p-2 rounded overflow-x-auto max-h-64 overflow-y-auto">
                  {formatRawData(opportunity.rawData)}
                </pre>
              </div>
            ))}
            {type === 'service-tickets' && filteredServiceTickets.map((ticket) => (
              <div key={ticket.id} className="bg-board-bg border border-board-border rounded p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white">{ticket.companyName} - {ticket.summary}</span>
                  <span className="text-xs text-gray-500">ID: {ticket.id}</span>
                </div>
                <pre className="text-xs text-gray-300 bg-gray-900 p-2 rounded overflow-x-auto max-h-64 overflow-y-auto">
                  {formatRawData(ticket.rawData)}
                </pre>
              </div>
            ))}
          </div>
        ) : (
          /* Normal card view */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-3">
            {type === 'projects' && filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                isPinned={isPinned('projects', project.id)}
                onTogglePin={() => togglePin('projects', project.id)}
                alwaysExpanded={viewMode === 'detailed'}
                visibleDetailFields={visibleDetailFields}
              />
            ))}
            {type === 'opportunities' && filteredOpportunities.map((opportunity) => (
              <OpportunityCard
                key={opportunity.id}
                opportunity={opportunity}
                isPinned={isPinned('opportunities', opportunity.id)}
                onTogglePin={() => togglePin('opportunities', opportunity.id)}
                alwaysExpanded={viewMode === 'detailed'}
              />
            ))}
            {type === 'service-tickets' && filteredServiceTickets.map((ticket) => (
              <ServiceTicketCard
                key={ticket.id}
                ticket={ticket}
                isPinned={isPinned('service-tickets', ticket.id)}
                onTogglePin={() => togglePin('service-tickets', ticket.id)}
                alwaysExpanded={viewMode === 'detailed'}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail Fields Modal */}
      <DetailFieldsModal
        isOpen={showDetailFieldsModal}
        onClose={() => setShowDetailFieldsModal(false)}
        onSave={(fields) => setVisibleDetailFields(fields)}
      />
    </div>
  );
}
