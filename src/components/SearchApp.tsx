'use client';

import { useState, useCallback } from 'react';
import type { ImportSummary } from '@/lib/lead-importer';
import {
  NormalizedPlace,
  SearchMode,
  RankPreference,
  SearchStats,
} from '@/types/places';
import { haversineDistance } from '@/lib/haversine';
import { exportToCSV } from '@/lib/csvExport';
import ControlPanel from './ControlPanel';
import MapPanel from './MapPanel';
import ResultsTable from './ResultsTable';
import StatsBar from './StatsBar';

export const DEFAULT_TYPES = [
  // Beauty & wellness
  'barber_shop',
  'hair_salon',
  'beauty_salon',
  'nail_salon',
  'beautician',
  'makeup_artist',
  'massage',
  'massage_spa',
  'spa',
  'skin_care_clinic',
  'tanning_studio',
  'yoga_studio',

  // Automotive
  'car_repair',
  'car_wash',
  'tire_shop',
  'auto_parts_store',

  // Home & local services
  'laundry',
  'tailor',
  'florist',
  'locksmith',
  'moving_company',
  'storage',
  'courier_service',

  // Trades
  'electrician',
  'plumber',
  'painter',
  'roofing_contractor',

  // Pets
  'pet_store',
  'pet_care',
  'pet_boarding_service',
  'veterinary_care',

  // Food & drink
  'bakery',
  'cake_shop',
  'coffee_shop',
  'cafe',
  'restaurant',
  'catering_service',

  // Fitness
  'fitness_center',
  'gym',
  'sports_coaching',
  'sports_school',

  // Health & professional
  'dentist',
  'physiotherapist',
  'lawyer',
  'accounting',
];

export default function SearchApp() {
  const [searchMode, setSearchMode] = useState<SearchMode>('nearby');
  const [areaLabel, setAreaLabel] = useState('Kensington NSW');
  const [lat, setLat] = useState(-33.9173);
  const [lng, setLng] = useState(151.2313);
  const [radius, setRadius] = useState(1000);
  const [maxResults, setMaxResults] = useState(20);
  const [rankPreference, setRankPreference] = useState<RankPreference>('DISTANCE');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['barber_shop']);
  const [textQuery, setTextQuery] = useState('barbers in Kensington NSW');
  const [includeEnrichment, setIncludeEnrichment] = useState(false);

  const [places, setPlaces] = useState<NormalizedPlace[]>([]);
  const [stats, setStats] = useState<SearchStats>({
    rawReturned: 0,
    newAdded: 0,
    duplicatesSkipped: 0,
    totalUnique: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [importing, setImporting] = useState(false);

  const handleSearch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let response: Response;
      let sourceQuery: string;

      if (searchMode === 'nearby') {
        if (selectedTypes.length === 0) {
          setError('Please select at least one category.');
          setLoading(false);
          return;
        }
        if (isNaN(lat) || isNaN(lng)) {
          setError('Invalid coordinates.');
          setLoading(false);
          return;
        }
        sourceQuery = `${selectedTypes.join('+')} near ${areaLabel}`;
        response = await fetch('/api/places/nearby', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            includedTypes: selectedTypes,
            center: { latitude: lat, longitude: lng },
            radius,
            maxResultCount: Math.min(Math.max(maxResults, 1), 20),
            rankPreference,
            includeEnrichmentFields: includeEnrichment,
          }),
        });
      } else {
        if (!textQuery.trim()) {
          setError('Please enter a search query.');
          setLoading(false);
          return;
        }
        sourceQuery = textQuery;
        response = await fetch('/api/places/text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            textQuery,
            maxResultCount: Math.min(Math.max(maxResults, 1), 20),
            includeEnrichmentFields: includeEnrichment,
          }),
        });
      }

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? 'An error occurred.');
        return;
      }

      if (!data.places || data.places.length === 0) {
        setError('No results found for this search.');
        setStats((prev) => ({ ...prev, rawReturned: data.rawCount ?? 0, newAdded: 0, duplicatesSkipped: 0 }));
        return;
      }

      const incoming: NormalizedPlace[] = data.places.map((p: NormalizedPlace) => ({
        ...p,
        sourceQuery,
        distanceMeters:
          p.latitude != null && p.longitude != null
            ? haversineDistance(lat, lng, p.latitude, p.longitude)
            : undefined,
      }));

      setPlaces((prev) => {
        const existingIds = new Set(prev.map((p) => p.placeId));
        const newOnes = incoming.filter((p) => !existingIds.has(p.placeId));
        const dups = incoming.length - newOnes.length;
        setStats({ rawReturned: data.rawCount, newAdded: newOnes.length, duplicatesSkipped: dups, totalUnique: prev.length + newOnes.length });
        return [...prev, ...newOnes];
      });
    } catch (err) {
      setError('Network error. Please check your connection.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [searchMode, selectedTypes, areaLabel, lat, lng, radius, maxResults, rankPreference, textQuery, includeEnrichment]);

  const handleClear = useCallback(() => {
    setPlaces([]);
    setStats({ rawReturned: 0, newAdded: 0, duplicatesSkipped: 0, totalUnique: 0 });
    setError(null);
  }, []);

  const handleExport = useCallback(() => {
    if (places.length === 0) { setError('No results to export.'); return; }
    exportToCSV(places);
  }, [places]);

  const handleImport = useCallback(async () => {
    if (places.length === 0) { setError('No results to import.'); return; }
    setImporting(true);
    setImportSummary(null);
    try {
      const res = await fetch('/api/leads/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          places,
          source: searchMode === 'nearby' ? 'GOOGLE_NEARBY' : 'GOOGLE_TEXT',
          mode: searchMode,
          areaLabel,
          centerLat: lat,
          centerLng: lng,
          radiusMeters: radius,
          textQuery,
          includedTypes: selectedTypes,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Import failed'); return; }
      setImportSummary(data as ImportSummary);
    } catch { setError('Import failed — network error'); }
    finally { setImporting(false); }
  }, [places, searchMode, areaLabel, lat, lng, radius, textQuery, selectedTypes]);

  const importedPlaceIds = importSummary
    ? new Set(importSummary.imported.map((i) => i.googlePlaceId))
    : undefined;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-50">
      {/* Action bar */}
      <div className="flex-shrink-0 h-10 bg-white border-b border-slate-200 flex items-center px-5 gap-3">
        <p className="text-xs text-slate-400">Search Google Places by area, category, and radius</p>
        <button
          onClick={handleImport}
          disabled={importing || places.length === 0}
          className="ml-auto bg-brand-green hover:bg-brand-green-dark text-white rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {importing ? 'Importing...' : 'Import to DB'}
        </button>

        {/* Error toast */}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-1.5 rounded-lg">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-1 hover:text-red-900 transition-colors">✕</button>
          </div>
        )}
      </div>

      {importSummary && (
        <div className="flex items-center gap-4 px-4 py-2 bg-brand-green-light border-b border-brand-green/20 text-xs text-slate-700 flex-shrink-0">
          <span className="font-medium text-brand-green-dark">Import complete</span>
          <span>Raw: {importSummary.rawResultsCount}</span>
          <span className="text-brand-green font-medium">New: {importSummary.newLeadsCount}</span>
          <span>Existing: {importSummary.existingLeadsCount}</span>
          <span className="text-brand-blue font-medium">TODO: {importSummary.todoCount}</span>
          <span>Research: {importSummary.potentialCount}</span>
          <span>Discarded: {importSummary.discardedCount}</span>
          <button onClick={() => setImportSummary(null)} className="ml-auto text-slate-400 hover:text-slate-700">✕</button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Dark sidebar */}
        <aside className="w-72 bg-brand-navy flex-shrink-0 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <ControlPanel
              searchMode={searchMode}
              onSearchModeChange={setSearchMode}
              areaLabel={areaLabel}
              onAreaLabelChange={setAreaLabel}
              lat={lat}
              onLatChange={setLat}
              lng={lng}
              onLngChange={setLng}
              radius={radius}
              onRadiusChange={setRadius}
              maxResults={maxResults}
              onMaxResultsChange={setMaxResults}
              rankPreference={rankPreference}
              onRankPreferenceChange={setRankPreference}
              selectedTypes={selectedTypes}
              onSelectedTypesChange={setSelectedTypes}
              availableTypes={DEFAULT_TYPES}
              textQuery={textQuery}
              onTextQueryChange={setTextQuery}
              includeEnrichment={includeEnrichment}
              onIncludeEnrichmentChange={setIncludeEnrichment}
              onSearch={handleSearch}
              onClear={handleClear}
              onExport={handleExport}
              loading={loading}
              placesCount={places.length}
            />
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <StatsBar stats={stats} />

          <div className="h-80 flex-shrink-0 border-b border-slate-200">
            <MapPanel center={{ lat, lng }} radius={radius} places={places} />
          </div>

          <div className="flex-1 overflow-hidden bg-white">
            <ResultsTable places={places} importedPlaceIds={importedPlaceIds} />
          </div>
        </main>
      </div>
    </div>
  );
}
