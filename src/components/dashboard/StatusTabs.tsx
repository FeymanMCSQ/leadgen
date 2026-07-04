import { DashboardGroup, GROUP_LABELS, DashboardSummary } from './types';

const TABS: DashboardGroup[] = ['todo', 'potential', 'inProgress', 'approved', 'declined'];

export default function StatusTabs({
  active,
  onChange,
  counts,
}: {
  active: DashboardGroup;
  onChange: (g: DashboardGroup) => void;
  counts: DashboardSummary['countsByGroup'];
}) {
  return (
    <div className="flex gap-1 border-b border-slate-200">
      {TABS.map((tab) => {
        const count = counts[tab];
        const isActive = tab === active;
        return (
          <button
            key={tab}
            onClick={() => onChange(tab)}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-1.5 ${
              isActive
                ? 'text-brand-green border-b-2 border-brand-green -mb-px bg-white'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            {GROUP_LABELS[tab]}
            {count > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold tabular-nums ${
                isActive ? 'bg-brand-green text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
