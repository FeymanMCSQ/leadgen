'use client';
import { useCallback, useEffect, useState } from 'react';
import DailyQuotaCard from './DailyQuotaCard';
import StatusTabs from './StatusTabs';
import LeadList from './LeadList';
import SettingsModal from './SettingsModal';
import { DashboardGroup, DashboardSummary } from './types';

export default function DashboardApp() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [activeGroup, setActiveGroup] = useState<DashboardGroup>('todo');
  const [showSettings, setShowSettings] = useState(false);
  const [summaryError, setSummaryError] = useState(false);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/summary', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error();
      setSummary(data);
      setSummaryError(false);
    } catch {
      setSummaryError(true);
    }
  }, []);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  const handleLeadUpdated = useCallback(() => {
    fetchSummary();
  }, [fetchSummary]);

  const handleSettingsSave = useCallback((_newQuota: number) => {
    setShowSettings(false);
    fetchSummary();
  }, [fetchSummary]);

  return (
    <div className="h-full bg-slate-50 flex flex-col overflow-auto">
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-6 space-y-5">
        {/* Quota card */}
        {summary ? (
          <DailyQuotaCard summary={summary} onSettingsClick={() => setShowSettings(true)} />
        ) : summaryError ? (
          <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 text-sm text-red-400">Failed to load dashboard.</div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 h-16 animate-pulse" />
        )}

        {/* Tabs + list */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {summary ? (
            <div className="px-4 pt-4">
              <StatusTabs
                active={activeGroup}
                onChange={setActiveGroup}
                counts={summary.countsByGroup}
              />
            </div>
          ) : (
            <div className="h-10 animate-pulse bg-slate-50" />
          )}
          <div className="px-4 pb-4 pt-4">
            <LeadList
              key={activeGroup}
              group={activeGroup}
              onLeadUpdated={handleLeadUpdated}
            />
          </div>
        </div>
      </main>

      {showSettings && summary && (
        <SettingsModal
          quota={summary.quota}
          onClose={() => setShowSettings(false)}
          onSave={handleSettingsSave}
        />
      )}
    </div>
  );
}
