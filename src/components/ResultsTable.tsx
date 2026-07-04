'use client';

import { useState, useMemo } from 'react';
import { NormalizedPlace } from '@/types/places';

type SortKey = 'name' | 'primaryType' | 'distanceMeters' | 'rating' | 'userRatingCount';

const NUMERIC_KEYS = new Set<SortKey>(['distanceMeters', 'rating', 'userRatingCount']);

function StatusBadge({ status }: { status?: string }) {
  if (!status) return <span className="text-slate-300">—</span>;
  const isOp = status === 'OPERATIONAL';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${
      isOp ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
    }`}>
      {status.toLowerCase().replace(/_/g, ' ')}
    </span>
  );
}

function RatingDisplay({ rating, count }: { rating?: number; count?: number }) {
  if (rating == null) return <span className="text-slate-300">—</span>;
  return (
    <span className="flex items-center gap-1 whitespace-nowrap">
      <span className="text-amber-500 text-[11px]">★</span>
      <span className="font-medium text-slate-700">{rating.toFixed(1)}</span>
      {count != null && <span className="text-slate-400 text-[11px]">({count.toLocaleString()})</span>}
    </span>
  );
}

export default function ResultsTable({ places }: { places: NormalizedPlace[] }) {
  const [filter, setFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('distanceMeters');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const filtered = useMemo(() => {
    if (!filter.trim()) return places;
    const q = filter.toLowerCase();
    return places.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.primaryType ?? '').toLowerCase().includes(q) ||
        (p.formattedAddress ?? '').toLowerCase().includes(q) ||
        (p.sourceQuery ?? '').toLowerCase().includes(q)
    );
  }, [places, filter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aRaw = a[sortKey];
      const bRaw = b[sortKey];

      if (NUMERIC_KEYS.has(sortKey)) {
        const aVal = aRaw == null ? Infinity : (aRaw as number);
        const bVal = bRaw == null ? Infinity : (bRaw as number);
        if (aVal === Infinity && bVal === Infinity) return 0;
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const aStr = String(aRaw ?? '');
      const bStr = String(bRaw ?? '');
      return sortDir === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
  }, [filtered, sortKey, sortDir]);

  const SortTh = ({ label, col }: { label: string; col: SortKey }) => (
    <th
      className="px-4 py-3 text-left cursor-pointer select-none whitespace-nowrap group"
      onClick={() => handleSort(col)}
    >
      <span className="flex items-center gap-1.5">
        {label}
        <span className={`transition-opacity text-indigo-400 text-[10px] ${sortKey === col ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'}`}>
          {sortDir === 'asc' ? '▲' : '▼'}
        </span>
      </span>
    </th>
  );

  const StaticTh = ({ label }: { label: string }) => (
    <th className="px-4 py-3 text-left whitespace-nowrap">{label}</th>
  );

  if (places.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-8">
        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-slate-600">No results yet</p>
          <p className="text-xs text-slate-400 mt-1">Configure your search in the sidebar and hit Run Search</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Filter bar */}
      <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50 flex items-center gap-3 flex-shrink-0">
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter results…"
            className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 w-56 transition-colors placeholder-slate-400"
          />
        </div>
        <span className="text-xs text-slate-400">
          {sorted.length === places.length
            ? `${places.length} results`
            : `${sorted.length} of ${places.length}`}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-auto flex-1">
        <table className="text-xs min-w-max w-full border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-800 text-slate-300 text-[10px] uppercase tracking-wide font-semibold">
              <SortTh label="Name" col="name" />
              <SortTh label="Type" col="primaryType" />
              <StaticTh label="Address" />
              <StaticTh label="Phone" />
              <StaticTh label="Website" />
              <SortTh label="Rating" col="rating" />
              <StaticTh label="Status" />
              <StaticTh label="Maps" />
              <StaticTh label="Place ID" />
              <StaticTh label="Source" />
              <SortTh label="Dist (m)" col="distanceMeters" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((place, i) => (
              <tr
                key={place.placeId}
                className={`border-b border-slate-100 hover:bg-indigo-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}`}
              >
                <td className="px-4 py-2.5 font-medium text-slate-900 max-w-[200px] truncate" title={place.name}>
                  {place.name}
                </td>
                <td className="px-4 py-2.5 max-w-[130px] truncate">
                  <span className="text-slate-500">
                    {place.primaryType ? place.primaryType.replace(/_/g, ' ') : '—'}
                  </span>
                </td>
                <td className="px-4 py-2.5 max-w-[220px] truncate text-slate-500" title={place.formattedAddress}>
                  {place.formattedAddress ?? '—'}
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap text-slate-600">
                  {place.nationalPhoneNumber ?? <span className="text-slate-300">—</span>}
                </td>
                <td className="px-4 py-2.5">
                  {place.websiteUri ? (
                    <a
                      href={place.websiteUri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-800 hover:underline font-medium transition-colors"
                    >
                      Link ↗
                    </a>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <RatingDisplay rating={place.rating} count={place.userRatingCount} />
                </td>
                <td className="px-4 py-2.5">
                  <StatusBadge status={place.businessStatus} />
                </td>
                <td className="px-4 py-2.5">
                  {place.googleMapsUri ? (
                    <a
                      href={place.googleMapsUri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-800 hover:underline font-medium transition-colors"
                    >
                      Maps ↗
                    </a>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5 font-mono text-[11px] max-w-[130px] truncate text-slate-400" title={place.placeId}>
                  {place.placeId}
                </td>
                <td className="px-4 py-2.5 max-w-[140px] truncate text-slate-400" title={place.sourceQuery}>
                  {place.sourceQuery ?? '—'}
                </td>
                <td className="px-4 py-2.5 text-right text-slate-600 tabular-nums">
                  {place.distanceMeters != null ? `${place.distanceMeters}` : <span className="text-slate-300">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
