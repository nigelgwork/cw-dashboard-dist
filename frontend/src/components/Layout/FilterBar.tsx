interface FilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  label: string;
  accentColor: string;
}

function FilterSelect({ value, onChange, options, label, accentColor }: FilterSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`px-3 py-2 text-sm bg-board-bg border border-board-border rounded-lg text-white focus:outline-none focus:border-${accentColor}-500`}
    >
      <option value="">{label} ({options.length})</option>
      {options.map(option => (
        <option key={option} value={option}>{option}</option>
      ))}
    </select>
  );
}

interface ProjectFiltersProps {
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  projectStatuses: string[];
  pmFilter: string;
  setPmFilter: (value: string) => void;
  allPMs: string[];
}

export function ProjectFilters({
  statusFilter,
  setStatusFilter,
  projectStatuses,
  pmFilter,
  setPmFilter,
  allPMs,
}: ProjectFiltersProps) {
  return (
    <>
      <FilterSelect
        value={statusFilter}
        onChange={setStatusFilter}
        options={projectStatuses}
        label="All Statuses"
        accentColor="purple"
      />
      <FilterSelect
        value={pmFilter}
        onChange={setPmFilter}
        options={allPMs}
        label="All PMs"
        accentColor="purple"
      />
    </>
  );
}

interface OpportunityFiltersProps {
  stageFilter: string;
  setStageFilter: (value: string) => void;
  stages: string[];
  salesRepFilter: string;
  setSalesRepFilter: (value: string) => void;
  salesReps: string[];
}

export function OpportunityFilters({
  stageFilter,
  setStageFilter,
  stages,
  salesRepFilter,
  setSalesRepFilter,
  salesReps,
}: OpportunityFiltersProps) {
  return (
    <>
      <FilterSelect
        value={stageFilter}
        onChange={setStageFilter}
        options={stages}
        label="All Stages"
        accentColor="emerald"
      />
      <FilterSelect
        value={salesRepFilter}
        onChange={setSalesRepFilter}
        options={salesReps}
        label="All Sales Reps"
        accentColor="emerald"
      />
    </>
  );
}

interface ServiceTicketFiltersProps {
  ticketStatusFilter: string;
  setTicketStatusFilter: (value: string) => void;
  ticketStatuses: string[];
  priorityFilter: string;
  setPriorityFilter: (value: string) => void;
  priorities: string[];
  assigneeFilter: string;
  setAssigneeFilter: (value: string) => void;
  assignees: string[];
}

export function ServiceTicketFilters({
  ticketStatusFilter,
  setTicketStatusFilter,
  ticketStatuses,
  priorityFilter,
  setPriorityFilter,
  priorities,
  assigneeFilter,
  setAssigneeFilter,
  assignees,
}: ServiceTicketFiltersProps) {
  return (
    <>
      <FilterSelect
        value={ticketStatusFilter}
        onChange={setTicketStatusFilter}
        options={ticketStatuses}
        label="All Statuses"
        accentColor="orange"
      />
      <FilterSelect
        value={priorityFilter}
        onChange={setPriorityFilter}
        options={priorities}
        label="All Priorities"
        accentColor="orange"
      />
      <FilterSelect
        value={assigneeFilter}
        onChange={setAssigneeFilter}
        options={assignees}
        label="All Assignees"
        accentColor="orange"
      />
    </>
  );
}
