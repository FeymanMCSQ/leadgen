'use client';

import dynamic from 'next/dynamic';
import { NormalizedPlace } from '@/types/places';
import { CoverageBlock } from '@/lib/coverage-grid';

const LeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-gray-100 text-gray-500 text-sm">
      Loading map...
    </div>
  ),
});

interface MapPanelProps {
  center: { lat: number; lng: number };
  radius: number;
  places: NormalizedPlace[];
  selectedTypes: string[];
  coverageVersion: number;
  onCellSelect: (block: CoverageBlock) => boolean;
}

export default function MapPanel({
  center,
  radius,
  places,
  selectedTypes,
  coverageVersion,
  onCellSelect,
}: MapPanelProps) {
  return (
    <div className="h-full w-full">
      <LeafletMap
        center={center}
        radius={radius}
        places={places}
        selectedTypes={selectedTypes}
        coverageVersion={coverageVersion}
        onCellSelect={onCellSelect}
      />
    </div>
  );
}
