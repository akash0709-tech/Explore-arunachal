import { useEffect, useMemo } from "react";
import L from "leaflet";
import { Link } from "react-router-dom";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";

import "leaflet/dist/leaflet.css";

const verifiedIcon = L.divIcon({
  className: "stay-map__marker",
  html: "<span></span>",
  iconSize: [24, 24],
  iconAnchor: [12, 22]
});

function FitStays({ stays }) {
  const map = useMap();
  const points = useMemo(
    () => stays.filter((stay) => stay.location).map((stay) => [stay.location.lat, stay.location.lng]),
    [stays]
  );

  useEffect(() => {
    if (points.length > 1) map.fitBounds(points, { padding: [28, 28] });
    else if (points.length === 1) map.setView(points[0], 11);
  }, [map, points]);

  return null;
}

export function StayMap({ stays }) {
  const withLocation = stays.filter((stay) => stay.location);
  const center = withLocation.length
    ? [withLocation[0].location.lat, withLocation[0].location.lng]
    : [27.1, 93.6];

  if (!withLocation.length) {
    return <p className="stay-map__empty">No approximate map locations are available for these stays.</p>;
  }

  return (
    <div className="stay-map">
      <MapContainer center={center} zoom={8} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitStays stays={withLocation} />
        {withLocation.map((stay) => (
          <Marker
            key={stay._id}
            position={[stay.location.lat, stay.location.lng]}
            icon={verifiedIcon}
            title={stay.name}
          >
            <Popup>
              <div className="stay-map__popup">
                <strong>{stay.name}</strong>
                <span>{stay.town?.name}</span>
                <span>₹{stay.pricePerNight?.toLocaleString("en-IN")} / night</span>
                <Link to={`/stays/${stay._id}`}>View homestay</Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <p className="text-small text-muted">Markers show approximate listing locations.</p>
    </div>
  );
}
