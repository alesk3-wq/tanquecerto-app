import { TileLayer } from 'react-leaflet';

export default function MapTileLayer({ attribution = true }) {
  return (
    <TileLayer
      url={`https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${import.meta.env.VITE_CARTO_API_KEY}`}
      attribution={attribution
        ? '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> &copy; <a href="https://carto.com">CARTO</a>'
        : undefined}
    />
  );
}
