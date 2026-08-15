import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";
import "leaflet/dist/leaflet.css";

function FitRoute({ positions }) {
  const map = useMap();

  useEffect(() => {
    if (positions.length > 1) {
      const bounds = L.latLngBounds(positions);

      map.fitBounds(bounds, {
        padding: [40, 40],
      });
    }
  }, [map, positions]);

  return null;
}

function TripMap({ geometry, locations }) {
  if (
    !geometry ||
    !geometry.coordinates?.length ||
    !locations?.current ||
    !locations?.pickup ||
    !locations?.dropoff
  ) {
    return null;
  }

  const positions = geometry.coordinates.map(
    ([longitude, latitude]) => [latitude, longitude]
  );

  const currentPosition = [
    locations.current.coordinates.latitude,
    locations.current.coordinates.longitude,
  ];

  const pickupPosition = [
    locations.pickup.coordinates.latitude,
    locations.pickup.coordinates.longitude,
  ];

  const dropoffPosition = [
    locations.dropoff.coordinates.latitude,
    locations.dropoff.coordinates.longitude,
  ];

  return (
    <div className="trip-map">
      <MapContainer
        center={positions[0]}
        zoom={6}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Polyline
          positions={positions}
          pathOptions={{
            color: "#111827",
            weight: 5,
          }}
        />

        <Marker position={currentPosition}>
          <Popup>
            <strong>Current location</strong>
            <br />
            {locations.current.name}
          </Popup>
        </Marker>

        <Marker position={pickupPosition}>
          <Popup>
            <strong>Pickup</strong>
            <br />
            {locations.pickup.name}
          </Popup>
        </Marker>

        <Marker position={dropoffPosition}>
          <Popup>
            <strong>Drop-off</strong>
            <br />
            {locations.dropoff.name}
          </Popup>
        </Marker>

        <FitRoute positions={positions} />
      </MapContainer>
    </div>
  );
}

export default TripMap;