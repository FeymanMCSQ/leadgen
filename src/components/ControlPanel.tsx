'use client';

import { SearchMode, RankPreference } from '@/types/places';

const CATEGORY_GROUPS: { label: string; types: string[] }[] = [
  {
    label: 'Beauty & Wellness',
    types: ['barber_shop', 'hair_salon', 'beauty_salon', 'nail_salon', 'beautician', 'makeup_artist', 'massage', 'massage_spa', 'spa', 'skin_care_clinic', 'tanning_studio', 'yoga_studio'],
  },
  {
    label: 'Automotive',
    types: ['car_repair', 'car_wash', 'tire_shop', 'auto_parts_store'],
  },
  {
    label: 'Home & Local Services',
    types: ['laundry', 'tailor', 'florist', 'locksmith', 'moving_company', 'storage', 'courier_service'],
  },
  {
    label: 'Trades',
    types: ['electrician', 'plumber', 'painter', 'roofing_contractor'],
  },
  {
    label: 'Pets',
    types: ['pet_store', 'pet_care', 'pet_boarding_service', 'veterinary_care'],
  },
  {
    label: 'Food & Drink',
    types: ['bakery', 'cake_shop', 'coffee_shop', 'cafe', 'restaurant', 'catering_service'],
  },
  {
    label: 'Fitness',
    types: ['fitness_center', 'gym', 'sports_coaching', 'sports_school'],
  },
  {
    label: 'Health & Professional',
    types: ['dentist', 'physiotherapist', 'lawyer', 'accounting'],
  },
];

interface ControlPanelProps {
  searchMode: SearchMode;
  onSearchModeChange: (v: SearchMode) => void;
  areaLabel: string;
  onAreaLabelChange: (v: string) => void;
  lat: number;
  onLatChange: (v: number) => void;
  lng: number;
  onLngChange: (v: number) => void;
  radius: number;
  onRadiusChange: (v: number) => void;
  maxResults: number;
  onMaxResultsChange: (v: number) => void;
  rankPreference: RankPreference;
  onRankPreferenceChange: (v: RankPreference) => void;
  selectedTypes: string[];
  onSelectedTypesChange: (types: string[]) => void;
  availableTypes: string[];
  textQuery: string;
  onTextQueryChange: (v: string) => void;
  includeEnrichment: boolean;
  onIncludeEnrichmentChange: (v: boolean) => void;
  onSearch: () => void;
  onClear: () => void;
  onExport: () => void;
  loading: boolean;
  placesCount: number;
}

const inputCls =
  'w-full bg-brand-navy-mid border border-brand-navy-border rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-green focus:border-brand-green transition-colors';

const labelCls = 'block text-[10px] uppercase tracking-widest text-slate-500 font-medium mb-1.5';

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] uppercase tracking-widest text-slate-500 font-medium pt-5 pb-2 border-t border-brand-navy-mid mt-1 first:border-t-0 first:pt-0">
      {children}
    </div>
  );
}

export default function ControlPanel({
  searchMode, onSearchModeChange,
  areaLabel, onAreaLabelChange,
  lat, onLatChange,
  lng, onLngChange,
  radius, onRadiusChange,
  maxResults, onMaxResultsChange,
  rankPreference, onRankPreferenceChange,
  selectedTypes, onSelectedTypesChange,
  availableTypes,
  textQuery, onTextQueryChange,
  includeEnrichment, onIncludeEnrichmentChange,
  onSearch, onClear, onExport,
  loading, placesCount,
}: ControlPanelProps) {
  const toggleType = (type: string) => {
    onSelectedTypesChange(
      selectedTypes.includes(type)
        ? selectedTypes.filter((t) => t !== type)
        : [...selectedTypes, type]
    );
  };

  return (
    <div className="p-4 space-y-0">
      {/* Mode toggle */}
      <div className="pb-4">
        <div className="flex bg-brand-navy-mid rounded-lg p-0.5">
          <button
            onClick={() => onSearchModeChange('nearby')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
              searchMode === 'nearby'
                ? 'bg-brand-green text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Nearby
          </button>
          <button
            onClick={() => onSearchModeChange('text')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
              searchMode === 'text'
                ? 'bg-brand-green text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Text
          </button>
        </div>
      </div>

      {/* Location section */}
      <SectionHeading>Location</SectionHeading>
      <div className="space-y-3">
        <div>
          <label className={labelCls}>Area</label>
          <input
            type="text"
            value={areaLabel}
            onChange={(e) => onAreaLabelChange(e.target.value)}
            className={inputCls}
            placeholder="e.g. Kensington NSW"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>Latitude</label>
            <input
              type="number"
              step="any"
              value={lat}
              onChange={(e) => onLatChange(parseFloat(e.target.value))}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Longitude</label>
            <input
              type="number"
              step="any"
              value={lng}
              onChange={(e) => onLngChange(parseFloat(e.target.value))}
              className={inputCls}
            />
          </div>
        </div>
        <div>
          <label className={labelCls}>Radius (m)</label>
          <input
            type="number"
            min={1}
            value={radius}
            onChange={(e) => onRadiusChange(parseInt(e.target.value, 10))}
            className={inputCls}
          />
        </div>
      </div>

      {/* Search settings section */}
      <SectionHeading>Search Settings</SectionHeading>
      <div className="space-y-3">
        <div>
          <label className={labelCls}>Max Results (1–20)</label>
          <input
            type="number"
            min={1}
            max={20}
            value={maxResults}
            onChange={(e) => onMaxResultsChange(parseInt(e.target.value, 10))}
            className={inputCls}
          />
        </div>

        {searchMode === 'nearby' && (
          <div>
            <label className={labelCls}>Rank By</label>
            <div className="flex bg-brand-navy-mid rounded-lg p-0.5">
              <button
                onClick={() => onRankPreferenceChange('DISTANCE')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                  rankPreference === 'DISTANCE'
                    ? 'bg-brand-navy-light text-slate-100'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Distance
              </button>
              <button
                onClick={() => onRankPreferenceChange('POPULARITY')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                  rankPreference === 'POPULARITY'
                    ? 'bg-brand-navy-light text-slate-100'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Popularity
              </button>
            </div>
          </div>
        )}

        {searchMode === 'text' && (
          <div>
            <label className={labelCls}>Search Query</label>
            <input
              type="text"
              value={textQuery}
              onChange={(e) => onTextQueryChange(e.target.value)}
              className={inputCls}
              placeholder="e.g. barbers in Kensington NSW"
            />
          </div>
        )}
      </div>

      {/* Categories section */}
      {searchMode === 'nearby' && (
        <>
          <SectionHeading>Categories</SectionHeading>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500">
                {selectedTypes.length}/{availableTypes.length} selected
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => onSelectedTypesChange(availableTypes)}
                  className="text-[11px] text-brand-green hover:text-brand-green-dark transition-colors"
                >
                  All
                </button>
                <span className="text-slate-700">·</span>
                <button
                  onClick={() => onSelectedTypesChange([])}
                  className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
                >
                  None
                </button>
              </div>
            </div>
            <div className="max-h-56 overflow-y-auto rounded-lg bg-brand-navy-mid border border-brand-navy-border p-1.5">
              {CATEGORY_GROUPS.map((group) => (
                <div key={group.label}>
                  <div className="px-2 pt-2 pb-1 text-[9px] uppercase tracking-widest text-slate-600 font-semibold select-none">
                    {group.label}
                  </div>
                  {group.types.map((type) => {
                    const checked = selectedTypes.includes(type);
                    return (
                      <label
                        key={type}
                        className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
                          checked ? 'bg-brand-green/20' : 'hover:bg-brand-navy-light'
                        }`}
                      >
                        <div className={`w-3.5 h-3.5 rounded flex-shrink-0 flex items-center justify-center border transition-colors ${
                          checked ? 'bg-brand-green border-brand-green' : 'border-brand-navy-border'
                        }`}>
                          {checked && (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                              <path d="M2 6l3 3 5-5" />
                            </svg>
                          )}
                        </div>
                        <input type="checkbox" checked={checked} onChange={() => toggleType(type)} className="sr-only" />
                        <span className={`text-xs transition-colors ${checked ? 'text-slate-200' : 'text-slate-400'}`}>
                          {type.replace(/_/g, ' ')}
                        </span>
                      </label>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Options section */}
      <SectionHeading>Options</SectionHeading>
      <label className="flex items-start gap-3 cursor-pointer group">
        <div className={`mt-0.5 w-3.5 h-3.5 rounded flex-shrink-0 flex items-center justify-center border transition-colors ${
          includeEnrichment ? 'bg-brand-green border-brand-green' : 'border-brand-navy-border group-hover:border-slate-500'
        }`}>
          {includeEnrichment && (
            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
              <path d="M2 6l3 3 5-5" />
            </svg>
          )}
        </div>
        <input
          type="checkbox"
          checked={includeEnrichment}
          onChange={(e) => onIncludeEnrichmentChange(e.target.checked)}
          className="sr-only"
        />
        <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors leading-relaxed">
          Include website + phone
          <span className="block text-slate-600 text-[11px] mt-0.5">Uses more API quota</span>
        </span>
      </label>

      {/* Action buttons */}
      <div className="pt-5 space-y-2">
        <button
          onClick={onSearch}
          disabled={loading}
          className="w-full bg-brand-green hover:bg-brand-green-dark active:bg-brand-green-dark text-white rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Searching…
            </>
          ) : (
            'Run Search'
          )}
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onClear}
            disabled={loading}
            className="bg-brand-navy-mid hover:bg-brand-navy-light text-slate-300 rounded-lg px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear ({placesCount})
          </button>
          <button
            onClick={onExport}
            disabled={loading || placesCount === 0}
            className="bg-brand-navy-mid hover:bg-brand-navy-light text-slate-300 hover:text-slate-100 rounded-lg px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Export CSV
          </button>
        </div>
      </div>
    </div>
  );
}
