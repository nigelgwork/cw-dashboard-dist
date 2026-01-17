import type { Team } from '../../types';

interface TeamFilterProps {
  teams: Team[];
  value: number | '';
  onChange: (value: number | '') => void;
}

export default function TeamFilter({ teams, value, onChange }: TeamFilterProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : '')}
      className="px-3 py-2 bg-board-panel border border-board-border rounded-md text-white focus:outline-none focus:border-purple-500"
    >
      <option value="">All Teams</option>
      {teams.map((team) => (
        <option key={team.id} value={team.id}>
          {team.name}
        </option>
      ))}
    </select>
  );
}
