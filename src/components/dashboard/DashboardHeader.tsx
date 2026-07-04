import Image from 'next/image';
import Link from 'next/link';

export default function DashboardHeader({ onSettingsClick }: { onSettingsClick: () => void }) {
  return (
    <header className="flex-shrink-0 h-12 bg-white border-b border-slate-200 flex items-center px-5 gap-3">
      <Image src="/icons/icon-48.png" alt="LeadGen" width={28} height={28} className="flex-shrink-0" />
      <span className="text-sm font-semibold text-slate-900 tracking-tight">LeadGen</span>
      <div className="w-px h-4 bg-slate-200 mx-1" />
      <span className="text-sm font-semibold text-brand-green">Dashboard</span>
      <div className="ml-auto flex items-center gap-3">
        <Link href="/" className="text-xs text-slate-500 hover:text-slate-800 transition-colors">Search</Link>
        <Link href="/leads" className="text-xs text-slate-500 hover:text-slate-800 transition-colors">All Leads</Link>
        <button
          onClick={onSettingsClick}
          className="text-xs text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg px-3 py-1.5 transition-colors"
        >
          Settings
        </button>
      </div>
    </header>
  );
}
