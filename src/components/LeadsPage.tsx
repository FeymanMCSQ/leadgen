'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

type LeadStatus =
  | 'TODO' | 'POTENTIAL_RESEARCH' | 'PENDING' | 'CONTACTED'
  | 'DEAD_END' | 'SUCCEEDED' | 'DISCARDED' | 'DO_NOT_CALL';

type GatekeeperRisk = 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN';

interface BusinessLead {
  id: string;
  name: string;
  categoryBucket?: string;
  suburb?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  leadScore: number;
  gatekeeperRisk: GatekeeperRisk;
  leadStatus: LeadStatus;
  notes?: string;
  googleMapsUri?: string;
}

const TABS: { status: LeadStatus; label: string }[] = [
  { status: 'TODO', label: 'TODO' },
  { status: 'POTENTIAL_RESEARCH', label: 'Research' },
  { status: 'PENDING', label: 'Pending' },
  { status: 'CONTACTED', label: 'Contacted' },
  { status: 'DEAD_END', label: 'Dead End' },
  { status: 'SUCCEEDED', label: 'Succeeded' },
  { status: 'DISCARDED', label: 'Discarded' },
  { status: 'DO_NOT_CALL', label: 'Do Not Call' },
];

const ALL_STATUSES: LeadStatus[] = [
  'TODO', 'POTENTIAL_RESEARCH', 'PENDING', 'CONTACTED',
  'DEAD_END', 'SUCCEEDED', 'DISCARDED', 'DO_NOT_CALL',
];

const RISK_COLORS: Record<GatekeeperRisk, string> = {
  LOW: 'text-emerald-600',
  MEDIUM: 'text-amber-600',
  HIGH: 'text-red-600',
  UNKNOWN: 'text-slate-400',
};

export default function LeadsPage() {
  const [activeTab, setActiveTab] = useState<LeadStatus>('TODO');
  const [leads, setLeads] = useState<BusinessLead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchLeads = useCallback(async (status: LeadStatus) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leads?status=${status}&limit=200&sort=leadScore&order=desc`);
      const data = await res.json();
      setLeads(data.leads ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLeads(activeTab); }, [activeTab, fetchLeads]);

  const patchLead = async (id: string, leadStatus: LeadStatus, notes?: string) => {
    await fetch(`/api/leads/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadStatus, notes }),
    });
    fetchLeads(activeTab);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-50">
      <div className="flex-shrink-0 h-10 bg-white border-b border-slate-200 flex items-center px-5">
        <span className="text-xs font-semibold text-brand-green">Lead Database</span>
        <span className="ml-auto text-xs text-slate-400">{total} in this tab</span>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 px-4 flex gap-1 pt-2">
        {TABS.map((tab) => (
          <button
            key={tab.status}
            onClick={() => setActiveTab(tab.status)}
            className={`px-3 py-1.5 text-xs font-medium rounded-t-md transition-colors ${
              activeTab === tab.status
                ? 'bg-brand-green text-white'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full text-slate-400 text-sm">Loading...</div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
            <p className="text-slate-500 text-sm font-medium">No leads in this bucket</p>
            <p className="text-slate-400 text-xs">Import search results from the <Link href="/" className="text-brand-green hover:underline">search page</Link></p>
          </div>
        ) : (
          <table className="text-xs min-w-max w-full border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-brand-navy text-slate-300 text-[10px] uppercase tracking-wide font-semibold">
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Suburb</th>
                <th className="px-4 py-3 text-left">Phone</th>
                <th className="px-4 py-3 text-left">Website</th>
                <th className="px-4 py-3 text-left">Rating</th>
                <th className="px-4 py-3 text-left">Score</th>
                <th className="px-4 py-3 text-left">GK Risk</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left w-48">Notes</th>
                <th className="px-4 py-3 text-left">Maps</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead, i) => (
                <LeadRow
                  key={lead.id}
                  lead={lead}
                  striped={i % 2 !== 0}
                  onStatusChange={(s) => patchLead(lead.id, s, lead.notes)}
                  onNotesSave={(n) => patchLead(lead.id, lead.leadStatus, n)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function LeadRow({
  lead,
  striped,
  onStatusChange,
  onNotesSave,
}: {
  lead: BusinessLead;
  striped: boolean;
  onStatusChange: (s: LeadStatus) => void;
  onNotesSave: (n: string) => void;
}) {
  const [notes, setNotes] = useState(lead.notes ?? '');

  return (
    <tr className={`border-b border-slate-100 hover:bg-brand-green-light transition-colors ${striped ? 'bg-slate-50/60' : 'bg-white'}`}>
      <td className="px-4 py-2.5 font-medium text-slate-900 max-w-[180px] truncate" title={lead.name}>{lead.name}</td>
      <td className="px-4 py-2.5 text-slate-500">{lead.categoryBucket ?? '—'}</td>
      <td className="px-4 py-2.5 text-slate-500 max-w-[120px] truncate">{lead.suburb ?? '—'}</td>
      <td className="px-4 py-2.5 whitespace-nowrap text-slate-600">{lead.nationalPhoneNumber ?? <span className="text-slate-300">—</span>}</td>
      <td className="px-4 py-2.5">
        {lead.websiteUri
          ? <a href={lead.websiteUri} target="_blank" rel="noopener noreferrer" className="text-brand-blue hover:underline font-medium">Link ↗</a>
          : <span className="text-slate-300">—</span>}
      </td>
      <td className="px-4 py-2.5">
        {lead.rating != null
          ? <span className="flex items-center gap-1"><span className="text-amber-500">★</span><span className="font-medium text-slate-700">{lead.rating.toFixed(1)}</span></span>
          : <span className="text-slate-300">—</span>}
      </td>
      <td className="px-4 py-2.5 font-medium text-slate-700">{lead.leadScore}</td>
      <td className={`px-4 py-2.5 font-medium ${RISK_COLORS[lead.gatekeeperRisk]}`}>{lead.gatekeeperRisk.toLowerCase()}</td>
      <td className="px-4 py-2.5">
        <select
          value={lead.leadStatus}
          onChange={(e) => onStatusChange(e.target.value as LeadStatus)}
          className="text-xs border border-slate-200 rounded px-1.5 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-brand-green"
        >
          {ALL_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
      </td>
      <td className="px-4 py-2.5">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => onNotesSave(notes)}
          rows={1}
          placeholder="Add notes..."
          className="text-xs border border-slate-200 rounded px-2 py-1 bg-white w-44 resize-none focus:outline-none focus:ring-1 focus:ring-brand-green placeholder-slate-300"
        />
      </td>
      <td className="px-4 py-2.5">
        {lead.googleMapsUri
          ? <a href={lead.googleMapsUri} target="_blank" rel="noopener noreferrer" className="text-brand-blue hover:underline font-medium">Maps ↗</a>
          : <span className="text-slate-300">—</span>}
      </td>
    </tr>
  );
}
