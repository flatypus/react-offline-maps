import './tailwind.css';
import {
  Position,
  MapProps,
  CanvasSize,
  OfflineMapProps,
  Coordinate,
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

const defaultOfflineMapProps: MapProps = {
  latitude: 49.2827,
  longitude: -123.1207,
  zoom: 12,
  mapElements: [],
};

const TILE_SIZE = 256;

const MINIMUM_X = 800;
const MINIMUM_Y = 600;

const BUFFER = 5;

const COORDINATE_PRECISION = 1e9;

const globalImageCache: Record<string, HTMLImageElement | null> = {};

function LatLngToOSM(lat: number, lng: number, zoom: number) {
  const lat_rad = (lat * Math.PI) / 180;
  const N = Math.pow(2, zoom);
  const y_rad = Math.log(Math.tan(lat_rad) + 1 / Math.cos(lat_rad));
  const float_x_tile = (0.5 + lng / 360) * N;
  const float_y_tile = (N * (1 - y_rad / Math.PI)) / 2;
  return { float_x_tile, float_y_tile };
}

function ShowCoordinates({ latitude, longitude, zoom }: Coordinate) {
  const {
    showCoordinates,
    showCoordinatesClassName,
    showCoordinatesStyle,
  } = useContext(ConfigContext);

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
  const { showCenter, showCenterClassName, showCenterStyle } = useContext(
    ConfigContext
  );
  return (
    <>
      {showCenter && (
        <div className={showCenterClassName} style={showCenterStyle}></div>
      )}
    </>
  );
}

function Map(props: Partial<OfflineMapProps>) {
  const {
    latitude: initialLatitude,
    longitude: initialLongitude,
    zoom: initialZoom,
    className,
    style,
    mapElements,
  } = { ...defaultOfflineMapProps, ...props };

  const canvasReference = useRef<HTMLCanvasElement>(null);
  const parentReference = useRef<HTMLDivElement>(null);
  const dragStart = useRef<Position | null>(null);
  const wheelStart = useRef<number>(0);

  const [, forceUpdate] = useReducer(x => x + 1, 0);

  const [latitude, setLatitude] = useState(initialLatitude);
  const [longitude, setLongitude] = useState(initialLongitude);
  const [zoom, setZoom] = useState(initialZoom);

  const config = useContext(ConfigContext);

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
    renderMap();
  };

  const renderMap = useCallback(() => {
    if (!canvasReference.current) return;

    const canvasSize: CanvasSize = {
      width: canvasReference.current.width,
      height: canvasReference.current.height,
    };

    const context = canvasReference.current.getContext('2d');
    if (!context) return;

    const { float_x_tile, float_y_tile } = LatLngToOSM(
      latitude,
      longitude,
      zoom
    );
    const x_tile = Math.floor(float_x_tile);
    const y_tile = Math.floor(float_y_tile);

    const offset_x = (float_x_tile - x_tile) * TILE_SIZE;
    const offset_y = (float_y_tile - y_tile) * TILE_SIZE;

    context.clearRect(0, 0, canvasSize.width, canvasSize.height);
    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, canvasSize.width, canvasSize.height);

    const drawImage = (x: number, y: number) => {
      if (x < 0 || y < 0) return;
      const src = `${config.mapServer}/${zoom}/${x}/${y}.png`;
      const dx = (x - x_tile) * TILE_SIZE + canvasSize.width / 2 - offset_x;
      const dy = (y - y_tile) * TILE_SIZE + canvasSize.height / 2 - offset_y;

      const draw = (img: HTMLImageElement) => {
        context.drawImage(
          img,
          dx - TILE_SIZE / 2,
          dy - TILE_SIZE / 2,
          TILE_SIZE,
          TILE_SIZE
        );

        if (config.showOSMBorders) {
          context.strokeStyle = '#00000088';
          context.lineWidth = 1;
          context.strokeRect(
            dx - TILE_SIZE / 2,
            dy - TILE_SIZE / 2,
            TILE_SIZE,
            TILE_SIZE
          );
        }
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
  }, [latitude, longitude, zoom, config]);

  useEffect(() => {
    reload();
    forceUpdate();
    window.addEventListener('resize', reload);
    return () => window.removeEventListener('resize', reload);
  }, []);

  return (
    <div
      ref={parentReference}
      className={`${className} w-full h-full relative overflow-hidden`}
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

          dragStart.current = { x: e.clientX, y: e.clientY };

          const coefficient = 1 / Math.pow(2, zoom);

          let newLatitude = latitude + dy * coefficient;
          let newLongitude = longitude + dx * -coefficient;

          if (newLatitude > 85) newLatitude = 85;
          if (newLatitude < -85) newLatitude = -85;
          if (newLongitude > 180) newLongitude = 180;
          if (newLongitude < -180) newLongitude = -180;

          setLongitude(newLongitude);
          setLatitude(newLatitude);
          renderMap();
        }}
        onMouseUp={() => (dragStart.current = null)}
        onWheel={e => {
          wheelStart.current += e.deltaY;
          const newZoom = Math.round(initialZoom - wheelStart.current / 200);

          if (newZoom < 0 || newZoom > 18) return;
          setZoom(newZoom);
          renderMap();
        }}
      ></canvas>

      <ShowCoordinates latitude={latitude} longitude={longitude} zoom={zoom} />

      <ShowCenter />

      {mapElements.map((element, index) => {
        if (!canvasReference.current) return null;
        const {
          latitude: elementLatitude,
          longitude: elementLongitude,
          element: Element,
        } = element;

        const elementOSM = LatLngToOSM(elementLatitude, elementLongitude, zoom);
        const cameraOSM = LatLngToOSM(latitude, longitude, zoom);

        const dx =
          (elementOSM.float_x_tile - cameraOSM.float_x_tile) * TILE_SIZE +
          canvasReference.current?.width / 2 -
          TILE_SIZE / 2;

        const dy =
          (elementOSM.float_y_tile - cameraOSM.float_y_tile) * TILE_SIZE +
          canvasReference.current?.height / 2 -
          TILE_SIZE / 2;

        return (
          <div
            key={index}
            className="absolute translate-x-[-50%] translate-y-[-50%]"
            style={{ left: dx, top: dy }}
          >
            {Element}
          </div>
        );
      })}
    </div>
  );
}

function OfflineMap(props: Partial<OfflineMapProps>) {
  return (
    <ConfigContext.Provider value={{ ...configDefaults, ...props.config }}>
      <Map {...props} />
    </ConfigContext.Provider>
  );
}

export { OfflineMap };
export default OfflineMap;
