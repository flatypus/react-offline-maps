import 'react-app-polyfill/ie11';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Map } from '../src';

const App = () => {
  return (
    <Map
      config={{
        showCoordinates: true,
        showCenter: true,
      }}
      latitude={49.541125}
      longitude={-112.15398}
      zoom={12}
      className="min-h-screen w-screen"
      mapElements={[
        {
          element: (
            <img
              className="translate-y-[-50%]"
              width={40}
              height={32}
              src="https://upload.wikimedia.org/wikipedia/commons/9/9e/Pin-location.png"
            />
          ),
          latitude: 49.541125,
          longitude: -112.15398,
        },
      ]}
    />
  );
};

ReactDOM.render(<App />, document.getElementById('root'));
