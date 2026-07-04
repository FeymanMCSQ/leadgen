import { DashboardGroup } from './types';

const BADGE: Record<DashboardGroup | 'other', { bg: string; text: string; label: string }> = {
  todo:       { bg: 'bg-green-100',   text: 'text-green-800',   label: 'To Do' },
  potential:  { bg: 'bg-blue-100',    text: 'text-blue-800',    label: 'Potential' },
  inProgress: { bg: 'bg-amber-100',   text: 'text-amber-800',   label: 'In Progress' },
  approved:   { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'Approved' },
  declined:   { bg: 'bg-slate-100',   text: 'text-slate-600',   label: 'Declined' },
  other:      { bg: 'bg-slate-100',   text: 'text-slate-500',   label: 'Unknown' },
};

const STATUS_TO_GROUP: Record<string, DashboardGroup | 'other'> = {
  TODO: 'todo', POTENTIAL_RESEARCH: 'potential',
  PENDING: 'inProgress', CONTACTED: 'inProgress',
  SUCCEEDED: 'approved',
  DEAD_END: 'declined', DISCARDED: 'declined', DO_NOT_CALL: 'declined',
};

export default function StatusBadge({ status }: { status: string }) {
  const group = STATUS_TO_GROUP[status] ?? 'other';
  const { bg, text, label } = BADGE[group];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${bg} ${text}`}>
      {label}
    </span>
  );
}
