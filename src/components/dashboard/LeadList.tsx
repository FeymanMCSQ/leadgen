'use client';
import { useCallback, useEffect, useState } from 'react';
import LeadCard from './LeadCard';
import {
  DashboardGroup,
  DashboardGrouping,
  DashboardSort,
  GROUP_EMPTY,
  GROUPING_OPTIONS,
  LeadRow,
  SORT_OPTIONS,
} from './types';

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
  const [sort, setSort] = useState<DashboardSort>('uncalledFirst');
  const [grouping, setGrouping] = useState<DashboardGrouping>('none');

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ group, limit: '100', sort });
      const res = await fetch(`/api/dashboard/leads?${params}`, {
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
  }, [group, sort]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const handleUpdated = useCallback((_id: string, _quotaCounted: boolean) => {
    fetchLeads();
    onLeadUpdated();
  }, [fetchLeads, onLeadUpdated]);

  if (loading) return (
    <div className="py-20 text-center text-slate-400 text-sm">Loading…</div>
  );
  if (error) return (
    <div className="py-20 text-center text-red-400 text-sm">{error}</div>
  );
  if (leads.length === 0) return (
    <div className="py-20 text-center text-slate-400 text-sm">{GROUP_EMPTY[group]}</div>
  );

  const sections = grouping === 'callStatus'
    ? [
        { label: 'Not called', leads: leads.filter((lead) => lead.callCount === 0) },
        { label: 'Called', leads: leads.filter((lead) => lead.callCount > 0) },
      ]
    : [{ label: null, leads }];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <p className="text-xs text-slate-400 mr-auto">{total} lead{total !== 1 ? 's' : ''}</p>
        <label className="flex items-center gap-1.5 text-xs text-slate-500">
          <span>Sort</span>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as DashboardSort)}
            className="border border-slate-200 rounded-md bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-green"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-xs text-slate-500">
          <span>Group</span>
          <select
            value={grouping}
            onChange={(event) => setGrouping(event.target.value as DashboardGrouping)}
            className="border border-slate-200 rounded-md bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-green"
          >
            {GROUPING_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="space-y-5">
        {sections.map((section) => section.leads.length > 0 && (
          <section key={section.label ?? 'all'}>
            {section.label && (
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-xs font-semibold text-slate-600">{section.label}</h3>
                <span className="text-[10px] text-slate-400 tabular-nums">{section.leads.length}</span>
                <div className="h-px bg-slate-100 flex-1" />
              </div>
            )}
            <div className="space-y-3">
              {section.leads.map((lead) => (
                <LeadCard key={lead.id} lead={lead} activeGroup={group} onUpdated={handleUpdated} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
