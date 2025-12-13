import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapView.css';

// Исправление иконок по умолчанию для Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function MapView({ courierPositions, couriers }) {
  const getCourierName = (courierId) => {
    const courier = couriers.find((c) => c.id === courierId);
    return courier ? courier.name : `Курьер ${courierId}`;
  };

  const onlineCouriers = courierPositions.filter(
    (c) => c.latitude && c.longitude
  );

  return (
    <div className="map" id="map">
      <MapContainer
        center={[42.98306, 47.50472]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='© OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {onlineCouriers.map((courier) => {
          const courierName = getCourierName(courier.courier_id);
          
          // Создаем кастомную иконку с эмодзи
          const emojiIcon = L.divIcon({
            html: '🔵',
            className: 'emoji-icon',
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          });

          // Создаем иконку для подписи
          const labelIcon = L.divIcon({
            className: 'courier-label',
            html: `<div class="courier-label-text">${courierName}</div>`,
            iconSize: [100, 20],
            iconAnchor: [50, 20],
          });

          return (
            <React.Fragment key={courier.courier_id}>
              <Marker
                position={[courier.latitude, courier.longitude]}
                icon={emojiIcon}
              >
                <Popup>{courierName}</Popup>
              </Marker>
              <Marker
                position={[courier.latitude + 0.00025, courier.longitude]}
                icon={labelIcon}
                interactive={false}
              />
            </React.Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
}

export default MapView;

