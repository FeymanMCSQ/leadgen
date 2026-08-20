'use client';
import { useState } from 'react';
import StatusBadge from './StatusBadge';
import { LeadRow, STATUS_OPTIONS, DashboardGroup } from './types';

interface LeadCardProps {
  lead: LeadRow;
  activeGroup: DashboardGroup;
  onUpdated: (id: string, quotaCounted: boolean) => void;
}

export default function LeadCard({ lead, activeGroup, onUpdated }: LeadCardProps) {
  const [notes, setNotes] = useState(lead.notes ?? '');
  const [status, setStatus] = useState(lead.leadStatus);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [callLoading, setCallLoading] = useState(false);
  const [callError, setCallError] = useState<string | null>(null);

  const patch = async (overrides: { leadStatus?: string; notes?: string } = {}) => {
    const body: Record<string, string> = {};
    const newStatus = overrides.leadStatus ?? status;
    const newNotes = overrides.notes ?? notes;
    if (newStatus !== lead.leadStatus) body.leadStatus = newStatus;
    if (newNotes !== lead.notes) body.notes = newNotes;
    if (Object.keys(body).length === 0) return;

    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/dashboard/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Save failed');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onUpdated(lead.id, data.quotaCounted ?? false);
    } catch {
      // silent — saved state stays false
    } finally {
      setSaving(false);
    }
  };

  const quickAction = (newStatus: string) => {
    setStatus(newStatus);
    patch({ leadStatus: newStatus });
  };

  const markCalled = async () => {
    setCallLoading(true);
    setCallError(null);
    try {
      const res = await fetch(`/api/leads/${lead.id}/call-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome: 'OTHER' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not mark called');
      setStatus(data.updatedLead.leadStatus);
      onUpdated(lead.id, data.quotaCounted ?? false);
    } catch (err) {
      setCallError(err instanceof Error ? err.message : 'Could not mark called');
    } finally {
      setCallLoading(false);
    }
  };

  const downloadPreviewPack = async () => {
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const res = await fetch(`/api/leads/${lead.id}/preview-pack`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Preview pack failed');
      }
      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') ?? '';
      const filename = disposition.match(/filename="?([^"]+)"?/)?.[1] ?? 'preview-pack-business.zip';

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : 'Preview pack failed');
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 hover:border-slate-300 transition-colors">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-slate-900 truncate">{lead.name}</h3>
            <StatusBadge status={status} />
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {lead.categoryBucket ?? lead.primaryType?.replace(/_/g, ' ') ?? '—'}
            {lead.formattedAddress ? ` · ${lead.formattedAddress.split(',').slice(-3, -1).join(',')}` : ''}
          </p>
        </div>
        {lead.leadScore > 0 && (
          <span className="flex-shrink-0 text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 tabular-nums">
            {lead.leadScore}
          </span>
        )}
      </div>

      {/* Links row */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        {lead.nationalPhoneNumber && (
          <a href={`tel:${lead.nationalPhoneNumber}`} className="flex items-center gap-1 text-brand-blue hover:underline font-medium">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
            {lead.nationalPhoneNumber}
          </a>
        )}
        {lead.websiteUri && (
          <a href={lead.websiteUri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-brand-blue hover:underline">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            Website
          </a>
        )}
        {lead.googleMapsUri && (
          <a href={lead.googleMapsUri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-slate-400 hover:text-slate-700">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Maps
          </a>
        )}
        {lead.rating != null && (
          <span className="text-slate-400 flex items-center gap-1">
            <span className="text-amber-500">★</span>
            {lead.rating.toFixed(1)}
            {lead.userRatingCount != null && <span className="text-slate-300">({lead.userRatingCount})</span>}
          </span>
        )}
        {activeGroup !== 'approved' && activeGroup !== 'declined' && (
          <button
            onClick={markCalled}
            disabled={callLoading}
            className="ml-auto text-xs px-3 py-1.5 rounded-lg bg-brand-green text-white hover:bg-brand-green-dark font-medium transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {callLoading ? 'Saving...' : lead.callCount > 0 ? 'Mark Called Again' : 'Mark Called'}
          </button>
        )}
        <button
          onClick={downloadPreviewPack}
          disabled={previewLoading}
          className={`${activeGroup === 'approved' || activeGroup === 'declined' ? 'ml-auto ' : ''}text-xs px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-700 font-medium transition-colors disabled:opacity-50 whitespace-nowrap`}
        >
          {previewLoading ? 'Preparing…' : 'Preview Pack'}
        </button>
      </div>
      {previewError && <p className="text-xs text-red-600">{previewError}</p>}
      {callError && <p className="text-xs text-red-600">{callError}</p>}
      {lead.lastCalledAt && (
        <p className="text-[11px] text-slate-400">
          Last called {new Date(lead.lastCalledAt).toLocaleString()}
          {lead.callCount > 1 ? ` | ${lead.callCount} calls logged` : ''}
        </p>
      )}

      {/* TODO quick actions */}
      {activeGroup === 'todo' && (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => quickAction('PENDING')}   className="text-xs px-3 py-1.5 rounded-lg bg-brand-green text-white hover:bg-brand-green-dark font-medium transition-colors">In Progress</button>
          <button onClick={() => quickAction('SUCCEEDED')} className="text-xs px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-medium transition-colors">Approved</button>
          <button onClick={() => quickAction('DEAD_END')}  className="text-xs px-3 py-1.5 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 font-medium transition-colors">Declined</button>
          <button onClick={() => quickAction('POTENTIAL_RESEARCH')} className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-brand-blue hover:bg-blue-100 border border-blue-200 font-medium transition-colors">Move to Potential</button>
        </div>
      )}

      {/* Notes + status row */}
      <div className="flex items-start gap-2">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add notes…"
          rows={1}
          className="flex-1 text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-brand-green placeholder-slate-300 text-slate-700"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-brand-green text-slate-700"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <button
          onClick={() => patch()}
          disabled={saving}
          className="text-xs px-3 py-1.5 rounded-lg bg-brand-green text-white hover:bg-brand-green-dark font-medium transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          {saving ? '…' : saved ? '✓' : 'Save'}
        </button>
      </div>
    </div>
  );
}
