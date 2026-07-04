import { SearchStats } from '@/types/places';

interface StatProps {
  label: string;
  value: number;
  color: 'slate' | 'emerald' | 'amber' | 'green';
}

function Stat({ label, value, color }: StatProps) {
  const colorMap: Record<StatProps['color'], string> = {
    slate: 'text-slate-700',
    emerald: 'text-emerald-600',
    amber: 'text-amber-600',
    green: 'text-brand-green',
  };
  return (
    <div className="px-4 py-2.5">
      <div className={`text-2xl font-bold tabular-nums leading-none ${colorMap[color]}`}>
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-widest text-slate-400 font-medium mt-1">
        {label}
      </div>
    </div>
  );
}

export default function StatsBar({ stats }: { stats: SearchStats }) {
  return (
    <div className="flex items-center bg-white border-b border-slate-200 flex-shrink-0">
      <Stat label="Returned" value={stats.rawReturned} color="slate" />
      <div className="w-px h-10 bg-slate-100" />
      <Stat label="New" value={stats.newAdded} color="emerald" />
      <Stat label="Dupes" value={stats.duplicatesSkipped} color="amber" />
      <div className="w-px h-10 bg-slate-100" />
      <Stat label="Total Unique" value={stats.totalUnique} color="green" />
    </div>
  );
}
