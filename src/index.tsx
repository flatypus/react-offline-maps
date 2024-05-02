import * as React from 'react';
import './tailwind.css';

type OfflineMapProps = {
  latitude: number;
  longitude: number;
  zoom: number;
};

const defaultOfflineMapProps: OfflineMapProps = {
  latitude: 49.2827,
  longitude: -123.1207,
  zoom: 12,
};

function LatLngToOSM(lat: number, lng: number, zoom: number) {
  const lat_rad = (lat * Math.PI) / 180;
  const N = Math.pow(2, zoom);
  const x_tile = Math.floor((0.5 + lng / 360) * N);
  const y_rad = Math.log(Math.tan(lat_rad) + 1 / Math.cos(lat_rad));
  const y_tile = Math.floor((N * (1 - y_rad / Math.PI)) / 2);
  return { x_tile, y_tile };
}

function OfflineMap(props: Partial<OfflineMapProps>) {
  const { latitude, longitude, zoom } = { ...defaultOfflineMapProps, ...props };
  const { x_tile, y_tile } = LatLngToOSM(latitude, longitude, zoom);

  return (
    <img
      src={`https://a.tile.openstreetmap.org/${zoom}/${x_tile}/${y_tile}.png`}
      alt="map"
    />
  );
}

export { OfflineMap };
export default OfflineMap;
