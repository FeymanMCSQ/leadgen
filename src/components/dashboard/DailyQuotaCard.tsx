import { DashboardSummary } from './types';

export default function DailyQuotaCard({ summary, onSettingsClick }: { summary: DashboardSummary; onSettingsClick: () => void }) {
  const { quota, completedToday } = summary;
  const pct = Math.min(100, Math.round((completedToday / quota) * 100));
  const done = completedToday >= quota;

  return (
    <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex items-center gap-6 shadow-sm">
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-2xl font-bold text-slate-900 tabular-nums">{completedToday}</span>
          <span className="text-slate-400 text-sm">/ {quota} calls today</span>
          {done && <span className="text-xs font-medium text-brand-green ml-1">✓ Quota complete</span>}
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-green rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[11px] text-slate-400 mt-1.5">Resets at midnight · {summary.timezone}</p>
      </div>
      <button
        onClick={onSettingsClick}
        className="flex-shrink-0 text-xs text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg px-3 py-1.5 transition-colors"
      >
        Settings
      </button>
    </div>
  );
}
