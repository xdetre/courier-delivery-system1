import React from 'react';
import './History.css';

function History({ orders, selectedCourierId, couriers }) {
  const getCourierName = (courierId) => {
    const courier = couriers.find((c) => c.id === courierId);
    return courier ? courier.name : `Курьер ${courierId}`;
  };

  const getStatusLabel = (status) => {
    const statusLabels = {
      pending: 'Ожидает',
      assigned: 'Назначен',
      delivered: 'Доставлен',
      cancelled: 'Отменен',
    };
    return statusLabels[status] || status;
  };

  const getStatusClass = (status) => {
    const statusClasses = {
      pending: 'status-pending',
      assigned: 'status-assigned',
      delivered: 'status-delivered',
      cancelled: 'status-cancelled',
    };
    return statusClasses[status] || '';
  };

  return (
    <div className="history">
      <h3>
        История заказов
        {selectedCourierId && (
          <span className="courier-name-badge">
            {' '}
            - {getCourierName(selectedCourierId)}
          </span>
        )}
      </h3>
      {!selectedCourierId ? (
        <p>Выберите курьера, чтобы увидеть его заказы</p>
      ) : orders.length === 0 ? (
        <p>У выбранного курьера нет заказов</p>
      ) : (
        <div className="orders-list">
          {orders.map((order) => (
            <div key={order.id} className="order-item">
              <div className="order-header">
                <span className="order-id">Заказ #{order.id}</span>
                <span className={`order-status ${getStatusClass(order.status)}`}>
                  {getStatusLabel(order.status)}
                </span>
              </div>
              <div className="order-details">
                <p>
                  <strong>Адрес:</strong> {order.address}
                </p>
                <p>
                  <strong>Получатель:</strong> {order.recipient_name}
                </p>
                {order.recipient_phone && (
                  <p>
                    <strong>Телефон:</strong> {order.recipient_phone}
                  </p>
                )}
                {order.comment && (
                  <p>
                    <strong>Комментарий:</strong> {order.comment}
                  </p>
                )}
                {order.created_at && (
                  <p className="order-date">
                    <strong>Создан:</strong>{' '}
                    {new Date(order.created_at).toLocaleString('ru-RU')}
                  </p>
                )}
                {order.delivered_at && (
                  <p className="order-date">
                    <strong>Доставлен:</strong>{' '}
                    {new Date(order.delivered_at).toLocaleString('ru-RU')}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default History;



