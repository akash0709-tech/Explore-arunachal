import { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";

import "leaflet/dist/leaflet.css";

function FitRoute({ coordinates }) {
  const map = useMap();

  useEffect(() => {
    if (coordinates.length > 1) map.fitBounds(coordinates, { padding: [28, 28] });
  }, [coordinates, map]);

  return null;
}

function markerIcon(type) {
  const markerClass = ["start", "destination", "pass", "waypoint", "checkpoint"].includes(type)
    ? type
    : "waypoint";
  return L.divIcon({
    className: `trip-map__marker trip-map__marker--${markerClass}`,
    html: "<span></span>",
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
}

export function TripMap({ geometry, isLoading, error }) {
  const coordinates = useMemo(
    () => (geometry?.geometry?.coordinates ?? []).map(([lng, lat]) => [lat, lng]),
    [geometry]
  );
  const markers = geometry?.markers ?? [];

  if (isLoading) {
    return <div className="trip-map__message" role="status">Loading route map…</div>;
  }
  if (error) {
    return <div className="trip-map__message trip-map__message--error" role="alert">{error}</div>;
  }
  if (coordinates.length < 2) {
    return <div className="trip-map__message">No route geometry is available for these stops.</div>;
  }

  return (
    <div className="trip-map">
      {geometry.approximate && (
        <p className="trip-map__notice" role="note">
          Road directions are temporarily unavailable; the map shows approximate straight-line segments.
        </p>
      )}
      <MapContainer center={coordinates[0]} zoom={7} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitRoute coordinates={coordinates} />
        <Polyline
          positions={coordinates}
          pathOptions={{ color: "#e89a2e", weight: 5, opacity: 0.88, className: "trip-map__route" }}
        />
        {markers.map((marker) => {
          const type = marker.name === "Bhalukpong" ? "checkpoint" : marker.type;
          return (
            <Marker
              key={marker.id}
              position={[marker.lat, marker.lng]}
              icon={markerIcon(type)}
              title={marker.name}
            />
          );
        })}
      </MapContainer>
      <div className="trip-map__legend" aria-label="Map legend">
        <span><i className="trip-map__legend-dot trip-map__legend-dot--start" /> Start</span>
        <span><i className="trip-map__legend-dot trip-map__legend-dot--destination" /> Destination</span>
        <span><i className="trip-map__legend-dot trip-map__legend-dot--pass" /> Pass</span>
        <span><i className="trip-map__legend-dot trip-map__legend-dot--checkpoint" /> Checkpoint</span>
      </div>
    </div>
  );
}
