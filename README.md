# React Offline Maps

## A simple offline maps component for React

Traditional maps, like [leaflet](https://github.com/Leaflet/Leaflet), require an internet connection to continually pull tile data from map servers. This is a drop-in react component that renders a generic ['slippy map'](https://wiki.openstreetmap.org/wiki/Slippy_map), but with built-in browser caching. 

Tiles are first pulled from the internet with a given connection, and then saved in both a local cache and an in-browser cache (via the CacheStorage API). The next time the tile is to be requested, the component checks for the resource in the in-memory cache first. If the page is reloaded, no problem! The component simply pulls the resource from the CacheStorage. This allows for clean and efficient map rendering with minimal latency waiting for tiles to load, even when on connection.

This map component also features a couple of cool but useful configuration features:

```typescript
<Map
  config={{ showCoordinates: true, showCenter: true }}
  latitude={49.541125} // starting position
  longitude={-112.15398}
  zoom={12}
  className="min-h-screen w-screen"
  mapElements={[
    {
      element: ( // render a pin!
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
```

The API also allows for rendering lines directly on the map through the mapLines parameter.

<img width="1251" alt="image" src="https://github.com/flatypus/react-offline-maps/assets/68029599/80b0d602-a25c-4d7e-915b-8ecfe630087c">
