import './tailwind.css';
import {
  Position,
  MapProps,
  OfflineMapProps,
  Coordinate,
  MapElement,
} from './lib/types';
import { spiral } from './lib/spiral';
import {
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
  useCallback,
} from 'react';
import * as React from 'react';
import { ConfigContext, configDefaults } from './ConfigContext';
import { useDebounce } from './lib/debounce';

const defaultOfflineMapProps: MapProps = {
  latitude: 49.2827,
  longitude: -123.1207,
  zoom: 12,
  realZoom: 12,
  mapElements: [],
  mapLines: [],
};

const TILE_SIZE = 256;
const BUFFER = 5;
const COORDINATE_PRECISION = 1e9;

const globalImageCache: Record<string, HTMLImageElement | null> = {};

function LatLngToOSM(lat: number, lng: number, zoom: number) {
  const lat_rad = (lat * Math.PI) / 180;
  const N = Math.pow(2, zoom);
  const y_rad = Math.log(Math.tan(lat_rad) + 1 / Math.cos(lat_rad));
  const float_x_tile = (0.5 + lng / 360) * N;
  const float_y_tile = (N * (1 - y_rad / Math.PI)) / 2;
  return [float_x_tile, float_y_tile];
}

function ShowCoordinates({
  latitude,
  longitude,
  zoom,
}: Omit<Coordinate, 'realZoom'>) {
  const { showCoordinates, showCoordinatesClassName, showCoordinatesStyle } =
    useContext(ConfigContext);

  return (
    <>
      {showCoordinates && (
        <div className={showCoordinatesClassName} style={showCoordinatesStyle}>
          {Math.round(latitude * COORDINATE_PRECISION) / COORDINATE_PRECISION},{' '}
          {Math.round(longitude * COORDINATE_PRECISION) / COORDINATE_PRECISION},{' '}
          {zoom}
        </div>
      )}
    </>
  );
}

function ShowCenter() {
  const { showCenter, showCenterClassName, showCenterStyle } =
    useContext(ConfigContext);
  return (
    <>
      {showCenter && (
        <div className={showCenterClassName} style={showCenterStyle}></div>
      )}
    </>
  );
}

function MapElements({
  mapElements,
  canvasReference,
  coordinate,
}: {
  mapElements: MapElement[];
  canvasReference: React.RefObject<HTMLCanvasElement>;
  coordinate: Coordinate;
}) {
  const width = canvasReference.current?.width || 0;
  const height = canvasReference.current?.height || 0;
  const { latitude, longitude, realZoom } = coordinate;

  return (
    <>
      {mapElements.map((element, index) => {
        const {
          latitude: elemLatitude,
          longitude: elemLongitude,
          element: reactElement,
        } = element;

        const [elemX, elemY] = LatLngToOSM(
          elemLatitude,
          elemLongitude,
          realZoom
        );

        const [realX, realY] = LatLngToOSM(latitude, longitude, realZoom);

        const dx = width / 2 + (elemX - realX) * TILE_SIZE;
        const dy = height / 2 + (elemY - realY) * TILE_SIZE;

        if (!dx || !dy) return null;
        if (dx < 0 || dx > width || dy < 0 || dy > height) return null;

        return (
          <div
            key={index}
            className="absolute translate-x-[-50%] translate-y-[-50%]"
            style={{ left: dx, top: dy, transform: 'translate(-50%, -50%)' }}
          >
            {reactElement}
          </div>
        );
      })}
    </>
  );
}

function MapComponent(props: Partial<OfflineMapProps>) {
  const {
    latitude: initialLatitude,
    longitude: initialLongitude,
    zoom: initialZoom,
    className,
    style,
    mapElements,
    mapLines,
  } = { ...defaultOfflineMapProps, ...props };

  const canvasReference = useRef<HTMLCanvasElement>(null);
  const mapLinesReference = useRef<HTMLCanvasElement>(null);
  const parentReference = useRef<HTMLDivElement>(null);
  const dragStart = useRef<Position | null>(null);
  const wheelStart = useRef<number>(0);
  const renderingZoom = useRef(initialZoom);

  const [, forceUpdate] = useReducer((x) => x + 1, 0);
  const [latitude, setLatitude] = useState(initialLatitude);
  const [longitude, setLongitude] = useState(initialLongitude);
  const [grabbing, setGrabbing] = useState(false);
  const [realZoom, setRealZoom] = useState(initialZoom);
  const [zoom, setZoom] = useDebounce(initialZoom, 100);

  const config = useContext(ConfigContext);

  const reload = () => {
    if (!parentReference.current) return;
    if (!canvasReference.current || !mapLinesReference.current) return;

    const newClientWidth = parentReference.current?.clientWidth || 0;
    const newClientHeight = parentReference.current?.clientHeight || 0;

    canvasReference.current.width = newClientWidth;
    canvasReference.current.height = newClientHeight;
    mapLinesReference.current.width = newClientWidth;
    mapLinesReference.current.height = newClientHeight;
    renderMap();
  };

  const renderMap = useCallback(() => {
    if (!canvasReference.current) return;
    renderingZoom.current = realZoom;

    const { width, height } = canvasReference.current;

    const context = canvasReference.current.getContext('2d');
    if (!context) return;

    const [float_x_tile, float_y_tile] = LatLngToOSM(latitude, longitude, zoom);

    const x_tile = Math.floor(float_x_tile);
    const y_tile = Math.floor(float_y_tile);

    const offset_x = (float_x_tile - x_tile) * TILE_SIZE;
    const offset_y = (float_y_tile - y_tile) * TILE_SIZE;

    const scale = Math.pow(2, realZoom - zoom);

    const lineContext = mapLinesReference?.current?.getContext('2d');
    if (lineContext) {
      lineContext.clearRect(0, 0, width, height);
      for (let line of mapLines) {
        const { color, coordinates } = line;
        lineContext.strokeStyle = color || '#000000';
        lineContext.lineWidth = 2;
        lineContext.beginPath();
        for (let lineIndex = 0; lineIndex < coordinates.length; lineIndex++) {
          const [pointLatitude, pointLongitude] = coordinates[lineIndex];
          const [pointX, pointY] = LatLngToOSM(
            pointLatitude,
            pointLongitude,
            realZoom
          );

          const [realX, realY] = LatLngToOSM(latitude, longitude, realZoom);

          const dx = width / 2 + (pointX - realX) * TILE_SIZE;
          const dy = height / 2 + (pointY - realY) * TILE_SIZE;

          if (lineIndex === 0) {
            lineContext.moveTo(dx, dy);
          } else {
            lineContext.lineTo(dx, dy);
          }
        }
        // lineContext.closePath();
        lineContext.stroke();
      }
    }

    context.clearRect(0, 0, width, height);
    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, width, height);

    const drawImage = async (x: number, y: number) => {
      if (x < 0 || y < 0) return;
      const src = `${config.mapServer}/${zoom}/${x}/${y}.png`;

      const dx = ((x - x_tile) * TILE_SIZE - offset_x) * scale + width / 2;
      const dy = ((y - y_tile) * TILE_SIZE - offset_y) * scale + height / 2;

      const draw = (img: HTMLImageElement) => {
        if (renderingZoom.current !== realZoom) return;
        context.drawImage(img, dx, dy, TILE_SIZE * scale, TILE_SIZE * scale);

        if (config.showOSMBorders) {
          context.strokeStyle = '#00000088';
          context.lineWidth = 0.5;
          context.strokeRect(dx, dy, TILE_SIZE * scale, TILE_SIZE * scale);
        }
      };

      let imageResult = globalImageCache[src];
      if (imageResult) {
        draw(imageResult);
        return;
      }

      const cache = await caches.open('offline-map-cache');
      const result = await cache.match(src);
      const img = new Image();
      img.crossOrigin = 'anonymous';

      if (result) {
        const blob = await result.blob();
        const img = new Image();
        img.onload = () => {
          draw(img);
          globalImageCache[src] = img;
        };
        img.src = URL.createObjectURL(blob);
      } else {
        img.onload = () => {
          draw(img);
          globalImageCache[src] = img;
          if (!config.useOfflineCache) return;
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = TILE_SIZE;
          tempCanvas.height = TILE_SIZE;
          const tempContext = tempCanvas.getContext('2d');
          if (!tempContext) return;
          tempContext.drawImage(img, 0, 0);
          tempCanvas.toBlob(async (blob) => {
            if (blob) await cache.put(src, new Response(blob));
          });
        };
        img.src = src;
      }
    };

    for (let [cell_x, cell_y] of spiral(
      Math.ceil(width / TILE_SIZE) + BUFFER,
      Math.ceil(height / TILE_SIZE) + BUFFER
    )) {
      drawImage(x_tile + cell_x, y_tile + cell_y);
    }
  }, [latitude, longitude, zoom, realZoom, config]);

  useEffect(() => {
    reload();
    forceUpdate();
    window.addEventListener('resize', reload);
    return () => window.removeEventListener('resize', reload);
  }, []);

  useEffect(() => {
    renderMap();
  }, [realZoom, mapLines]);

  return (
    <div
      ref={parentReference}
      className={`${className} w-full h-full relative overflow-hidden`}
      style={{ ...style, cursor: grabbing ? 'move' : 'grab' }}
    >
      <canvas
        className="w-full h-full absolute top-0 left-0"
        ref={canvasReference}
        onResize={reload}
      ></canvas>
      <canvas
        ref={mapLinesReference}
        className="w-full h-full absolute top-0 left-0 z-10"
        onMouseDown={(e) => {
          dragStart.current = { x: e.clientX, y: e.clientY };
          setGrabbing(true);
        }}
        onMouseUp={() => {
          dragStart.current = null;
          setGrabbing(false);
        }}
        onMouseMove={(e) => {
          if (!dragStart.current) return;
          const dx = e.clientX - dragStart.current.x;
          const dy = e.clientY - dragStart.current.y;

          dragStart.current = { x: e.clientX, y: e.clientY };

          const coefficient = 1 / Math.pow(2, zoom);

          let newLatitude = latitude + dy * coefficient;
          let newLongitude = longitude + dx * -coefficient;

          setLatitude(Math.max(-85, Math.min(85, newLatitude)));
          setLongitude(Math.max(-180, Math.min(180, newLongitude)));
          renderMap();
        }}
        onWheel={(e) => {
          const newZoom = initialZoom - (wheelStart.current + e.deltaY) / 200;
          const flooredZoom = Math.floor(newZoom);
          if (flooredZoom < 0 || flooredZoom > 18) return;
          wheelStart.current += e.deltaY;
          setRealZoom(newZoom);
          setZoom(flooredZoom);
        }}
      />
      <ShowCoordinates latitude={latitude} longitude={longitude} zoom={zoom} />
      <ShowCenter />
      <MapElements
        canvasReference={canvasReference}
        coordinate={{ latitude, longitude, zoom, realZoom }}
        mapElements={mapElements}
      />
    </div>
  );
}

function Map(props: Partial<OfflineMapProps>) {
  return (
    <ConfigContext.Provider value={{ ...configDefaults, ...props.config }}>
      <MapComponent {...props} />
    </ConfigContext.Provider>
  );
}

export { Map };
export default Map;
