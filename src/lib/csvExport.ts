import { NormalizedPlace } from '@/types/places';

const COLUMNS: (keyof NormalizedPlace)[] = [
  'placeId',
  'name',
  'primaryType',
  'formattedAddress',
  'latitude',
  'longitude',
  'nationalPhoneNumber',
  'websiteUri',
  'rating',
  'userRatingCount',
  'businessStatus',
  'googleMapsUri',
  'sourceQuery',
  'distanceMeters',
];

function escapeCell(val: unknown): string {
  return `"${String(val ?? '').replace(/"/g, '""')}"`;
}

export function exportToCSV(places: NormalizedPlace[]): void {
  const rows = [
    COLUMNS.join(','),
    ...places.map((p) => COLUMNS.map((col) => escapeCell(p[col])).join(',')),
  ];
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
