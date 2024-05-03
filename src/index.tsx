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

type Position = {
  x: number;
  y: number;
};

type OfflineMapProps = Partial<
  MapProps & { className: string; style: React.CSSProperties }
>;

const TILE_SIZE = 256;

const MINIMUM_X = 800;
const MINIMUM_Y = 600;

const BUFFER = 5;

const COORDINATE_PRECISION = 1e7;

const globalImageCache: Record<string, HTMLImageElement | null> = {};

function LatLngToOSM(lat: number, lng: number, zoom: number) {
  const lat_rad = (lat * Math.PI) / 180;
  const N = Math.pow(2, zoom);
  const y_rad = Math.log(Math.tan(lat_rad) + 1 / Math.cos(lat_rad));
  const float_x_tile = (0.5 + lng / 360) * N;
  const float_y_tile = (N * (1 - y_rad / Math.PI)) / 2;
  return { float_x_tile, float_y_tile };
}

function renderMap(
  canvasReference: HTMLCanvasElement,
  latitude: number,
  longitude: number,
  zoom: number,
  canvasSize: CanvasSize
) {
  const ctx = canvasReference.getContext('2d');
  if (!ctx) return;

  const { float_x_tile, float_y_tile } = LatLngToOSM(latitude, longitude, zoom);
  const x_tile = Math.floor(float_x_tile);
  const y_tile = Math.floor(float_y_tile);

  const offset_x = (float_x_tile - x_tile) * TILE_SIZE;
  const offset_y = (float_y_tile - y_tile) * TILE_SIZE;

  ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

  const drawImage = (x: number, y: number) => {
    if (x < 0 || y < 0) return;
    const src = `https://a.tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
    const dx = (x - x_tile) * TILE_SIZE + canvasSize.width / 2 - offset_x;
    const dy = (y - y_tile) * TILE_SIZE + canvasSize.height / 2 - offset_y;

    const draw = (img: HTMLImageElement) => {
      ctx.drawImage(
        img,
        dx - TILE_SIZE / 2,
        dy - TILE_SIZE / 2,
        TILE_SIZE,
        TILE_SIZE
      );
    };

    const cache = globalImageCache[src];
    if (cache) {
      draw(cache);
      return;
    }

    const img = new Image();
    img.onload = () => {
      draw(img);
      globalImageCache[src] = img;
    };

    img.onerror = () => {
      globalImageCache[src] = null;
    };

    img.src = src;
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
  const dragStart = useRef<Position | null>(null);
  const wheelStart = useRef<number>(0);

  const [latitude, setLatitude] = useState(initialLatitude);
  const [longitude, setLongitude] = useState(initialLongitude);
  const [zoom, setZoom] = useState(initialZoom);

  const reload = () => {
    if (!canvasReference.current || !parentReference.current) return;

    const newClientWidth = parentReference.current?.clientWidth || 0;
    const newClientHeight = parentReference.current?.clientHeight || 0;
    const newSize = {
      width: newClientWidth < MINIMUM_X ? MINIMUM_X : newClientWidth,
      height: newClientHeight < MINIMUM_Y ? MINIMUM_Y : newClientHeight,
    };
    canvasReference.current.width = newSize.width;
    canvasReference.current.height = newSize.height;
    renderMap(canvasReference.current, latitude, longitude, zoom, newSize);
  };

  useEffect(() => {
    reload();
    window.addEventListener('resize', reload);
    return () => window.removeEventListener('resize', reload);
  }, []);

  return (
    <div
      ref={parentReference}
      className={`${className} w-full h-full relative`}
      style={style}
    >
      <canvas
        ref={canvasReference}
        onResize={reload}
        onMouseDown={e => (dragStart.current = { x: e.clientX, y: e.clientY })}
        onMouseMove={e => {
          if (!dragStart.current) return;
          const dx = e.clientX - dragStart.current.x;
          const dy = e.clientY - dragStart.current.y;

          const coefficient = 0.05 / Math.pow(2, zoom);

          let newLatitude = latitude + dy * coefficient;
          let newLongitude = longitude + dx * -coefficient;

          if (newLatitude > 85) newLatitude = 85;
          if (newLatitude < -85) newLatitude = -85;
          if (newLongitude > 180) newLongitude = 180;
          if (newLongitude < -180) newLongitude = -180;

          setLongitude(newLongitude);
          setLatitude(newLatitude);
          if (!canvasReference.current) return;

          renderMap(canvasReference.current, newLatitude, newLongitude, zoom, {
            width: canvasReference.current.width,
            height: canvasReference.current.height,
          });
        }}
        onMouseUp={() => (dragStart.current = null)}
        onWheel={e => {
          wheelStart.current += e.deltaY;
          const newZoom = Math.round(initialZoom - wheelStart.current / 100);

          if (newZoom < 0 || newZoom > 18) return;
          setZoom(newZoom);

          if (!canvasReference.current) return;
          renderMap(canvasReference.current, latitude, longitude, newZoom, {
            width: canvasReference.current.width,
            height: canvasReference.current.height,
          });
        }}
      ></canvas>
      <div className="bg-red-500 absolute top-4 left-4 rounded-lg p-2">
        {Math.round(latitude * COORDINATE_PRECISION) / COORDINATE_PRECISION},{' '}
        {Math.round(longitude * COORDINATE_PRECISION) / COORDINATE_PRECISION},{' '}
        {zoom}
      </div>
    </div>
  );
}

export { OfflineMap };
export default OfflineMap;
