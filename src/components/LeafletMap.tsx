'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Circle,
  MapContainer,
  Marker,
  Popup,
  Rectangle,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import { NormalizedPlace } from '@/types/places';
import {
  CoverageBlock,
  CoverageGridSize,
  CoverageRun,
  coverageBlockAt,
  coverageBlocksInBounds,
  formatCoverageBlock,
} from '@/lib/coverage-grid';

const placeIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const centerIcon = L.divIcon({
  html: '<div style="background:#facc15;width:14px;height:14px;border-radius:50%;border:2px solid #111827;box-shadow:0 0 0 2px white,0 1px 5px rgba(0,0,0,0.55)"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
  className: '',
});

type CoverageStatus = 'untouched' | 'partial' | 'imported' | 'importedLimited' | 'done';

const COMPLETED_BLOCKS_STORAGE_KEY = 'leadgen.completed-coverage-blocks.v1';
const ORIGINAL_KENSINGTON_BLOCK_ID = coverageBlockAt(-33.9173, 151.2313, 1000).id;

const STATUS_STYLES: Record<CoverageStatus, { color: string; fillColor: string; fillOpacity: number }> = {
  untouched: { color: '#111827', fillColor: '#111827', fillOpacity: 0.14 },
  partial: { color: '#1d4ed8', fillColor: '#3b82f6', fillOpacity: 0.28 },
  imported: { color: '#991b1b', fillColor: '#ef4444', fillOpacity: 0.38 },
  importedLimited: { color: '#7f1d1d', fillColor: '#dc2626', fillOpacity: 0.46 },
  done: { color: '#166534', fillColor: '#22c55e', fillOpacity: 0.48 },
};

function formatCoverageStatus(status: CoverageStatus) {
  if (status === 'done') return 'Block done';
  if (status === 'importedLimited') return 'Imported - 20 result limit';
  if (status === 'imported') return 'Imported';
  if (status === 'partial') return 'Partly imported';
  return 'Unsearched';
}

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng]);
  }, [lat, lng, map]);
  return null;
}

function GridViewport({
  sizeMeters,
  onChange,
}: {
  sizeMeters: CoverageGridSize;
  onChange: (blocks: CoverageBlock[]) => void;
}) {
  const map = useMapEvents({
    moveend: update,
    zoomend: update,
  });

  function update() {
    const bounds = map.getBounds();
    onChange(coverageBlocksInBounds(
      bounds.getSouth(),
      bounds.getWest(),
      bounds.getNorth(),
      bounds.getEast(),
      sizeMeters,
    ));
  }

  useEffect(() => {
    update();
    // The map is stable; grid size is the meaningful refresh trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, sizeMeters]);

  return null;
}

function getBlockStatus(
  block: CoverageBlock,
  runs: CoverageRun[],
  selectedTypes: string[],
): CoverageStatus {
  if (selectedTypes.length === 0) return 'untouched';

  const importedTypes = new Set<string>();
  const limitedTypes = new Set<string>();

  for (const run of runs) {
    if (run.radiusMeters !== block.sizeMeters) continue;
    if (coverageBlockAt(run.centerLat, run.centerLng, block.sizeMeters).id !== block.id) continue;

    for (const type of run.includedTypes) {
      importedTypes.add(type);
      if (run.rawResultsCount >= 20) limitedTypes.add(type);
    }
  }

  if (selectedTypes.every((type) => importedTypes.has(type))) {
    return selectedTypes.some((type) => limitedTypes.has(type)) ? 'importedLimited' : 'imported';
  }
  if (selectedTypes.some((type) => importedTypes.has(type))) return 'partial';
  return 'untouched';
}

interface LeafletMapProps {
  center: { lat: number; lng: number };
  radius: number;
  places: NormalizedPlace[];
  selectedTypes: string[];
  coverageVersion: number;
  onCellSelect: (block: CoverageBlock) => boolean;
}

export default function LeafletMap({
  center,
  radius,
  places,
  selectedTypes,
  coverageVersion,
  onCellSelect,
}: LeafletMapProps) {
  const [gridEnabled, setGridEnabled] = useState(true);
  const [gridSize, setGridSize] = useState<CoverageGridSize>(1000);
  const [visibleBlocks, setVisibleBlocks] = useState<CoverageBlock[]>([]);
  const [runs, setRuns] = useState<CoverageRun[]>([]);
  const [coverageLoading, setCoverageLoading] = useState(true);
  const [completedBlockIds, setCompletedBlockIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(COMPLETED_BLOCKS_STORAGE_KEY);
      const blockIds = stored === null
        ? [ORIGINAL_KENSINGTON_BLOCK_ID]
        : JSON.parse(stored);
      if (!Array.isArray(blockIds)) return;
      const validIds = blockIds.filter((id): id is string => typeof id === 'string');
      setCompletedBlockIds(new Set(validIds));
      if (stored === null) {
        window.localStorage.setItem(COMPLETED_BLOCKS_STORAGE_KEY, JSON.stringify(validIds));
      }
    } catch (error) {
      console.error('Could not restore completed coverage blocks', error);
    }
  }, []);

  useEffect(() => {
    if (radius === 500 || radius === 1000) setGridSize(radius);
  }, [radius]);

  useEffect(() => {
    const controller = new AbortController();
    setCoverageLoading(true);
    fetch('/api/coverage', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? 'Coverage request failed');
        setRuns(data.runs ?? []);
      })
      .catch((error) => {
        if (error.name !== 'AbortError') console.error(error);
      })
      .finally(() => {
        if (!controller.signal.aborted) setCoverageLoading(false);
      });
    return () => controller.abort();
  }, [coverageVersion]);

  const selectedBlock = useMemo(
    () => coverageBlockAt(center.lat, center.lng, gridSize),
    [center.lat, center.lng, gridSize],
  );

  const blockStatuses = useMemo(() => {
    const statuses = new Map<string, CoverageStatus>();
    for (const block of visibleBlocks) {
      statuses.set(
        block.id,
        completedBlockIds.has(block.id) ? 'done' : getBlockStatus(block, runs, selectedTypes),
      );
    }
    return statuses;
  }, [completedBlockIds, runs, selectedTypes, visibleBlocks]);

  const importedVisible = Array.from(blockStatuses.values()).filter(
    (status) => status === 'imported' || status === 'importedLimited',
  ).length;
  const doneVisible = Array.from(blockStatuses.values()).filter((status) => status === 'done').length;
  const selectedStatus = blockStatuses.get(selectedBlock.id)
    ?? (completedBlockIds.has(selectedBlock.id) ? 'done' : getBlockStatus(selectedBlock, runs, selectedTypes));

  const selectBlock = useCallback((block: CoverageBlock) => {
    onCellSelect(block);
  }, [onCellSelect]);

  const chooseGridSize = (size: CoverageGridSize) => {
    if (size === gridSize) return;
    const block = coverageBlockAt(center.lat, center.lng, size);
    if (onCellSelect(block)) setGridSize(size);
  };

  const selectNextBlock = () => {
    const candidates = visibleBlocks
      .filter((block) => block.id !== selectedBlock.id)
      .filter((block) => {
        const status = blockStatuses.get(block.id) ?? 'untouched';
        return status === 'untouched' || status === 'partial';
      })
      .sort((a, b) => {
        const distanceA = (a.x - selectedBlock.x) ** 2 + (a.y - selectedBlock.y) ** 2;
        const distanceB = (b.x - selectedBlock.x) ** 2 + (b.y - selectedBlock.y) ** 2;
        return distanceA - distanceB || a.y - b.y || a.x - b.x;
      });
    if (candidates[0]) selectBlock(candidates[0]);
  };

  const toggleSelectedBlockDone = () => {
    setCompletedBlockIds((previous) => {
      const next = new Set(previous);
      if (next.has(selectedBlock.id)) next.delete(selectedBlock.id);
      else next.add(selectedBlock.id);
      window.localStorage.setItem(COMPLETED_BLOCKS_STORAGE_KEY, JSON.stringify(Array.from(next)));
      return next;
    });
  };

  return (
    <div className="relative h-full w-full">
      <MapContainer center={[center.lat, center.lng]} zoom={14} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <RecenterMap lat={center.lat} lng={center.lng} />
        <GridViewport sizeMeters={gridSize} onChange={setVisibleBlocks} />

        {gridEnabled && visibleBlocks.map((block) => {
          const status = blockStatuses.get(block.id) ?? 'untouched';
          const style = STATUS_STYLES[status];
          const selected = block.id === selectedBlock.id;
          return (
            <Rectangle
              key={block.id}
              bounds={block.bounds}
              pathOptions={{
                ...style,
                color: selected ? '#facc15' : style.color,
                weight: selected ? 5 : 1.25,
                fillOpacity: selected ? Math.max(style.fillOpacity, 0.24) : style.fillOpacity,
              }}
              eventHandlers={{ click: () => selectBlock(block) }}
            >
              {selected ? (
                <Tooltip permanent direction="center" opacity={1}>
                  <div className="text-center text-[10px] font-bold uppercase text-slate-900">Current</div>
                </Tooltip>
              ) : (
                <Tooltip sticky>
                  <div className="text-xs">
                    <div className="font-semibold">{formatCoverageBlock(block)}</div>
                    <div>{formatCoverageStatus(status)}</div>
                  </div>
                </Tooltip>
              )}
            </Rectangle>
          );
        })}

        <Marker position={[center.lat, center.lng]} icon={centerIcon}>
          <Popup>{formatCoverageBlock(selectedBlock)} search center</Popup>
        </Marker>

        <Circle center={[center.lat, center.lng]} radius={radius} color="#2563eb" weight={1.5} fillOpacity={0.04} />

        {places.map((place) => {
          if (place.latitude == null || place.longitude == null) return null;
          return (
            <Marker key={place.placeId} position={[place.latitude, place.longitude]} icon={placeIcon}>
              <Popup>
                <div className="min-w-[180px] space-y-1 text-sm">
                  <div className="font-semibold">{place.name}</div>
                  {place.primaryType && <div className="text-xs text-gray-500">{place.primaryType}</div>}
                  {place.formattedAddress && <div className="text-xs">{place.formattedAddress}</div>}
                  {place.nationalPhoneNumber && <div className="text-xs">{place.nationalPhoneNumber}</div>}
                  {place.websiteUri && (
                    <a href={place.websiteUri} target="_blank" rel="noopener noreferrer" className="block text-xs text-blue-600 hover:underline">Website</a>
                  )}
                  {place.googleMapsUri && (
                    <a href={place.googleMapsUri} target="_blank" rel="noopener noreferrer" className="block text-xs text-blue-600 hover:underline">Google Maps</a>
                  )}
                  {place.distanceMeters != null && <div className="text-xs text-gray-400">{place.distanceMeters}m from center</div>}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      <div className="absolute left-12 top-3 z-[1000] flex max-w-[calc(100%-4rem)] items-center gap-2 rounded-md border border-slate-200 bg-white/95 p-1.5 shadow-sm backdrop-blur-sm">
        <button
          type="button"
          onClick={() => setGridEnabled((enabled) => !enabled)}
          className={`h-7 rounded px-2 text-xs font-medium ${gridEnabled ? 'bg-brand-green text-white' : 'bg-slate-100 text-slate-600'}`}
        >
          Grid
        </button>
        <div className="flex h-7 rounded bg-slate-100 p-0.5" aria-label="Grid size">
          {([1000, 500] as CoverageGridSize[]).map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => chooseGridSize(size)}
              className={`rounded px-2 text-[11px] font-medium ${gridSize === size ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
            >
              {size === 1000 ? '1 km' : '500 m'}
            </button>
          ))}
        </div>
        <div className="hidden min-w-0 sm:block">
          <div className="truncate text-[11px] font-semibold text-amber-700">Current · {formatCoverageBlock(selectedBlock)}</div>
          <div className={`text-[10px] ${selectedStatus === 'done' ? 'font-semibold text-green-700' : selectedStatus === 'imported' || selectedStatus === 'importedLimited' ? 'text-red-700' : 'text-slate-500'}`}>
            {coverageLoading ? 'Loading coverage' : formatCoverageStatus(selectedStatus)}
          </div>
        </div>
        <button
          type="button"
          onClick={toggleSelectedBlockDone}
          className={`h-7 rounded px-2.5 text-[11px] font-semibold ${selectedStatus === 'done' ? 'bg-green-100 text-green-800' : 'bg-green-600 text-white hover:bg-green-700'}`}
        >
          {selectedStatus === 'done' ? 'Reopen block' : 'Mark block done'}
        </button>
        <button
          type="button"
          onClick={selectNextBlock}
          disabled={!gridEnabled || visibleBlocks.length === 0}
          className="h-7 rounded bg-slate-800 px-2.5 text-[11px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next unsearched
        </button>
      </div>

      {gridEnabled && (
        <div className="absolute bottom-5 left-3 z-[1000] flex items-center gap-3 rounded-md border border-slate-200 bg-white/95 px-2.5 py-1.5 text-[10px] text-slate-600 shadow-sm">
          <span><i className="mr-1 inline-block h-2 w-2 bg-green-500" />Done</span>
          <span><i className="mr-1 inline-block h-2 w-2 bg-red-500" />Imported</span>
          <span><i className="mr-1 inline-block h-2 w-2 bg-blue-500" />Partial</span>
          <span><i className="mr-1 inline-block h-2 w-2 bg-slate-900" />Unsearched</span>
          <span><i className="mr-1 inline-block h-2 w-2 border-2 border-yellow-400 bg-white" />Current</span>
          <span className="tabular-nums text-slate-400">{doneVisible} done · {importedVisible} imported</span>
        </div>
      )}
    </div>
  );
}
