import React from 'react';
import './CouriersList.css';

function CouriersList({ couriers, onRefresh, onCourierClick, selectedCourierId }) {
  return (
    <div className="couriers">
      <h3>
        Курьеры{' '}
        <button id="refresh-btn" onClick={onRefresh}>
          🔃
        </button>
      </h3>
      <div id="couriers-list">
        {couriers.length === 0 ? (
          <p>Нет курьеров</p>
        ) : (
          couriers.map((courier) => (
            <div
              key={courier.id}
              className={`courier-item ${
                courier.status === 'avail' ? 'active' : 'inactive'
              } ${selectedCourierId === courier.id ? 'selected' : ''}`}
              onClick={() => onCourierClick(courier.id)}
            >
              {courier.name} ({courier.status})
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default CouriersList;



