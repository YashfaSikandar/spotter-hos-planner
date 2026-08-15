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


/* ================================
   CUSTOM BLUE MAP ICON
================================ */

function createLocationIcon(type) {
  let symbol = "●";

  if (type === "current") {
    symbol = "●";
  }

  if (type === "pickup") {
    symbol = "↓";
  }

  if (type === "dropoff") {
    symbol = "↑";
  }

  return L.divIcon({
    className: "custom-map-marker",
    html: `
      <div class="map-marker-icon">
        <span>${symbol}</span>
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -20],
  });
}


const currentIcon = createLocationIcon("current");
const pickupIcon = createLocationIcon("pickup");
const dropoffIcon = createLocationIcon("dropoff");


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


        {/* ROUTE */}

        <Polyline
          positions={positions}
          pathOptions={{
            color: "#111827",
            weight: 5,
          }}
        />


        {/* CURRENT LOCATION */}

        <Marker
          position={currentPosition}
          icon={currentIcon}
        >
          <Popup>
            <strong>Current location</strong>
            <br />
            {locations.current.name}
          </Popup>
        </Marker>


        {/* PICKUP */}

        <Marker
          position={pickupPosition}
          icon={pickupIcon}
        >
          <Popup>
            <strong>Pickup</strong>
            <br />
            {locations.pickup.name}
          </Popup>
        </Marker>


        {/* DROP-OFF */}

        <Marker
          position={dropoffPosition}
          icon={dropoffIcon}
        >
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