import './tailwind.css';
import { spiral } from './lib/spiral';
import { useEffect, useRef, useState } from 'react';
import * as React from 'react';

type MapProps = {
  latitude: number;
  longitude: number;
  zoom: number;
};

const defaultOfflineMapProps: MapProps = {
  latitude: 49.2827,
  longitude: -123.1207,
  zoom: 12,
};

type CanvasSize = {
  width: number;
  height: number;
};

type OfflineMapProps = Partial<
  MapProps & { className: string; style: React.CSSProperties }
>;

const TILE_SIZE = 256;

const MINIMUM_X = 800;
const MINIMUM_Y = 600;

const BUFFER = 5;

function LatLngToOSM(lat: number, lng: number, zoom: number) {
  const lat_rad = (lat * Math.PI) / 180;
  const N = Math.pow(2, zoom);
  const x_tile = Math.floor((0.5 + lng / 360) * N);
  const y_rad = Math.log(Math.tan(lat_rad) + 1 / Math.cos(lat_rad));
  const y_tile = Math.floor((N * (1 - y_rad / Math.PI)) / 2);
  return { x_tile, y_tile };
}

function renderMap(
  canvasReference: HTMLCanvasElement,
  x_tile: number,
  y_tile: number,
  zoom: number,
  canvasSize: CanvasSize
) {
  const ctx = canvasReference.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

  const drawImage = (x: number, y: number) => {
    const img = new Image();
    img.onload = () => {
      const dx = (x - x_tile) * TILE_SIZE + canvasSize.width / 2;
      const dy = (y - y_tile) * TILE_SIZE + canvasSize.height / 2;
      ctx.drawImage(
        img,
        dx - TILE_SIZE / 2,
        dy - TILE_SIZE / 2,
        TILE_SIZE,
        TILE_SIZE
      );
    };
    img.src = `https://a.tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
  };

  Promise.allSettled(
    spiral(
      Math.ceil(canvasSize.width / TILE_SIZE) + BUFFER,
      Math.ceil(canvasSize.height / TILE_SIZE) + BUFFER
    ).map(cell => drawImage(x_tile + cell[0], y_tile + cell[1]))
  );
}

function OfflineMap(props: Partial<OfflineMapProps>) {
  const {
    latitude: initialLatitude,
    longitude: initialLongitude,
    zoom: initialZoom,
    className,
    style,
  } = { ...defaultOfflineMapProps, ...props };

  const canvasReference = useRef<HTMLCanvasElement>(null);
  const parentReference = useRef<HTMLDivElement>(null);

  const { x_tile, y_tile } = LatLngToOSM(
    initialLatitude,
    initialLongitude,
    initialZoom
  );

  const [latitude, setLatitude] = useState(initialLatitude);
  const [longitude, setLongitude] = useState(initialLongitude);
  const [zoom, setZoom] = useState(initialZoom);

  () => {
    console.log(latitude, longitude, zoom, setLatitude, setLongitude, setZoom);
  };

  const reload = () => {
    if (!canvasReference.current || !parentReference.current) return;
    console.log(
      parentReference.current.clientWidth,
      parentReference.current.clientHeight
    );
    const newClientWidth = parentReference.current?.clientWidth || 0;
    const newClientHeight = parentReference.current?.clientHeight || 0;
    const newSize = {
      width: newClientWidth < MINIMUM_X ? MINIMUM_X : newClientWidth,
      height: newClientHeight < MINIMUM_Y ? MINIMUM_Y : newClientHeight,
    };
    canvasReference.current.width = newSize.width;
    canvasReference.current.height = newSize.height;
    renderMap(canvasReference.current, x_tile, y_tile, zoom, newSize);
  };

  useEffect(() => {
    reload();
    window.addEventListener('resize', reload);
    return () => window.removeEventListener('resize', reload);
  }, [latitude, longitude, zoom]);

  return (
    <div
      ref={parentReference}
      className={`${className} w-full h-full`}
      style={style}
    >
      <canvas ref={canvasReference} onResize={reload}></canvas>
    </div>
  );
}

export { OfflineMap };
export default OfflineMap;
