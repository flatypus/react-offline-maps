export type Coordinate = {
  latitude: number;
  longitude: number;
  zoom: number;
};

export type MapProps = Coordinate & {
  mapElements: MapElement[];
};

export type Config = Partial<{
  showCoordinates: boolean;
  showCoordinatesStyle: React.CSSProperties;
  showCoordinatesClassName: string;

  showCenter: boolean;
  showCenterStyle: React.CSSProperties;
  showCenterClassName: string;

  mapServer: string;
  showOSMBorders: boolean;
}>;

export type CanvasSize = {
  width: number;
  height: number;
};

export type Position = {
  x: number;
  y: number;
};

export type OfflineMapProps = Partial<
  MapProps & {
    className: string;
    style: React.CSSProperties;
    config: Config;
  }
>;

export type MapElement = {
  latitude: number;
  longitude: number;
  element: JSX.Element;
};