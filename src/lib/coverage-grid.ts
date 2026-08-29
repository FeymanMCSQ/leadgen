const EARTH_RADIUS_METERS = 6378137;
const SYDNEY_REFERENCE_LATITUDE_RADIANS = -33.8688 * Math.PI / 180;
const SYDNEY_LONGITUDE_SCALE = Math.cos(SYDNEY_REFERENCE_LATITUDE_RADIANS);

export const COVERAGE_GRID_SIZES = [1000, 500] as const;
export type CoverageGridSize = (typeof COVERAGE_GRID_SIZES)[number];

export type CoverageBlock = {
  id: string;
  x: number;
  y: number;
  sizeMeters: CoverageGridSize;
  center: { lat: number; lng: number };
  bounds: [[number, number], [number, number]];
};

export type CoverageRun = {
  id: string;
  centerLat: number;
  centerLng: number;
  radiusMeters: number | null;
  includedTypes: string[];
  rawResultsCount: number;
  completedAt: string;
};

function project(lat: number, lng: number) {
  return {
    x: EARTH_RADIUS_METERS * lng * Math.PI / 180 * SYDNEY_LONGITUDE_SCALE,
    y: EARTH_RADIUS_METERS * lat * Math.PI / 180,
  };
}

function unproject(x: number, y: number) {
  return {
    lat: y / EARTH_RADIUS_METERS * 180 / Math.PI,
    lng: x / (EARTH_RADIUS_METERS * SYDNEY_LONGITUDE_SCALE) * 180 / Math.PI,
  };
}

export function coverageBlockFromIndexes(
  x: number,
  y: number,
  sizeMeters: CoverageGridSize,
): CoverageBlock {
  const southWest = unproject(x * sizeMeters, y * sizeMeters);
  const northEast = unproject((x + 1) * sizeMeters, (y + 1) * sizeMeters);
  const center = unproject((x + 0.5) * sizeMeters, (y + 0.5) * sizeMeters);

  return {
    id: `${sizeMeters}-${x}-${y}`,
    x,
    y,
    sizeMeters,
    center,
    bounds: [
      [southWest.lat, southWest.lng],
      [northEast.lat, northEast.lng],
    ],
  };
}

export function coverageBlockAt(
  lat: number,
  lng: number,
  sizeMeters: CoverageGridSize,
) {
  const point = project(lat, lng);
  return coverageBlockFromIndexes(
    Math.floor(point.x / sizeMeters),
    Math.floor(point.y / sizeMeters),
    sizeMeters,
  );
}

export function coverageBlocksInBounds(
  south: number,
  west: number,
  north: number,
  east: number,
  sizeMeters: CoverageGridSize,
  limit = 600,
) {
  const southWest = project(south, west);
  const northEast = project(north, east);
  const minX = Math.floor(Math.min(southWest.x, northEast.x) / sizeMeters) - 1;
  const maxX = Math.floor(Math.max(southWest.x, northEast.x) / sizeMeters) + 1;
  const minY = Math.floor(Math.min(southWest.y, northEast.y) / sizeMeters) - 1;
  const maxY = Math.floor(Math.max(southWest.y, northEast.y) / sizeMeters) + 1;

  if ((maxX - minX + 1) * (maxY - minY + 1) > limit) return [];

  const blocks: CoverageBlock[] = [];
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      blocks.push(coverageBlockFromIndexes(x, y, sizeMeters));
    }
  }
  return blocks;
}

export function formatCoverageBlock(block: CoverageBlock) {
  return `${block.sizeMeters === 1000 ? '1K' : '500'} ${block.x}:${block.y}`;
}
