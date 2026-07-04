'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { NormalizedPlace } from '@/types/places';

// Leaflet's bundled marker PNGs are loaded from CDN to avoid webpack asset issues
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
  html: `<div style="background:#ef4444;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 0 5px rgba(0,0,0,0.5)"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
  className: '',
});

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng]);
  }, [lat, lng, map]);
  return null;
}

interface LeafletMapProps {
  center: { lat: number; lng: number };
  radius: number;
  places: NormalizedPlace[];
}

export default function LeafletMap({ center, radius, places }: LeafletMapProps) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={14}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <RecenterMap lat={center.lat} lng={center.lng} />

      {/* Center marker */}
      <Marker position={[center.lat, center.lng]} icon={centerIcon}>
        <Popup>Search center</Popup>
      </Marker>

      {/* Radius circle */}
      <Circle
        center={[center.lat, center.lng]}
        radius={radius}
        color="#3b82f6"
        weight={1.5}
        fillOpacity={0.05}
      />

      {/* Place markers */}
      {places.map((place) => {
        if (place.latitude == null || place.longitude == null) return null;
        return (
          <Marker
            key={place.placeId}
            position={[place.latitude, place.longitude]}
            icon={placeIcon}
          >
            <Popup>
              <div className="text-sm min-w-[180px] space-y-1">
                <div className="font-semibold">{place.name}</div>
                {place.primaryType && (
                  <div className="text-gray-500 text-xs">{place.primaryType}</div>
                )}
                {place.formattedAddress && (
                  <div className="text-xs">{place.formattedAddress}</div>
                )}
                {place.nationalPhoneNumber && (
                  <div className="text-xs">{place.nationalPhoneNumber}</div>
                )}
                {place.websiteUri && (
                  <a
                    href={place.websiteUri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline block"
                  >
                    Website
                  </a>
                )}
                {place.googleMapsUri && (
                  <a
                    href={place.googleMapsUri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline block"
                  >
                    Google Maps
                  </a>
                )}
                {place.distanceMeters != null && (
                  <div className="text-xs text-gray-400">{place.distanceMeters}m from center</div>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
