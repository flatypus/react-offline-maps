import { createContext } from 'react';
import { Config } from './lib/types';

export const configDefaults: Config = {
  showCoordinates: true,
  showCoordinatesStyle: {
    position: 'absolute',
    top: '16px',
    left: '16px',
    backgroundColor: 'white',
    padding: '5px',
    border: '1px solid black',
    borderRadius: '5px',
    color: 'black',
  },
  showCoordinatesClassName: '',

  showCenter: true,
  showCenterStyle: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'red',
    padding: '3px',
    borderRadius: '100%',
  },
  showCenterClassName: '',

  mapServer: 'https://tile.openstreetmap.org',
  showOSMBorders: false,
};

export const ConfigContext = createContext<Config>(configDefaults);
