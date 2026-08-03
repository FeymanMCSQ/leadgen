'use client';
import { useCallback, useEffect, useState } from 'react';
import LeadCard from './LeadCard';
import { DashboardGroup, GROUP_EMPTY, LeadRow } from './types';

export default function LeadList({
  group,
  onLeadUpdated,
}: {
  group: DashboardGroup;
  onLeadUpdated: () => void;
}) {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/dashboard/leads?group=${group}&limit=100`, {
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      setLeads(data.leads ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setError('Could not load leads.');
    } finally {
      setLoading(false);
    }
  }, [group]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const handleUpdated = useCallback((id: string, _quotaCounted: boolean) => {
    setLeads((prev) => prev.filter((l) => l.id !== id));
    setTotal((prev) => Math.max(0, prev - 1));
    onLeadUpdated();
  }, [onLeadUpdated]);

  if (loading) return (
    <div className="py-20 text-center text-slate-400 text-sm">Loading…</div>
  );
  if (error) return (
    <div className="py-20 text-center text-red-400 text-sm">{error}</div>
  );
  if (leads.length === 0) return (
    <div className="py-20 text-center text-slate-400 text-sm">{GROUP_EMPTY[group]}</div>
  );

  return (
    <div>
      <p className="text-xs text-slate-400 mb-3">{total} lead{total !== 1 ? 's' : ''}</p>
      <div className="space-y-3">
        {leads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} activeGroup={group} onUpdated={handleUpdated} />
        ))}
      </div>
    </div>
  );
}
