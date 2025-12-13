import React, { useState, useEffect } from 'react';
import './App.css';
import CouriersList from './components/CouriersList';
import MapView from './components/MapView';
import Menu from './components/Menu';
import History from './components/History';

const API_BASE = process.env.REACT_APP_API_BASE || '/api';

function App() {
  const [couriers, setCouriers] = useState([]);
  const [courierPositions, setCourierPositions] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Загрузка списка курьеров
  const loadCouriers = async () => {
    try {
      const response = await fetch(`${API_BASE}/couriers`);
      const data = await response.json();
      setCouriers(data);
    } catch (error) {
      console.error('Ошибка загрузки курьеров:', error);
    }
  };

  // Загрузка позиций всех курьеров
  const loadAllCouriers = async () => {
    try {
      const response = await fetch(`${API_BASE}/tracking/all_positions`);
      const data = await response.json();
      setCourierPositions(data);
    } catch (error) {
      console.error('Ошибка загрузки позиций:', error);
    }
  };

  useEffect(() => {
    loadCouriers();
    loadAllCouriers();
    
    // Обновляем позиции каждые 5 секунд
    const interval = setInterval(() => {
      loadAllCouriers();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    loadCouriers();
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="container">
      <CouriersList 
        couriers={couriers} 
        onRefresh={handleRefresh}
      />
      <MapView 
        courierPositions={courierPositions}
        couriers={couriers}
        key={refreshKey}
      />
      <Menu />
      <History />
    </div>
  );
}

export default App;
