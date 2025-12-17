import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Alert,
  Animated,
  PanResponder,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { API_CONFIG } from '@/config';

const API_BASE = API_CONFIG.BASE_URL;
const WS_BASE = API_CONFIG.WS_URL;

const { width, height } = Dimensions.get('window');

interface Order {
  id: number;
  address: string;
  recipient_name: string;
  recipient_phone: string;
  comment?: string;
  latitude?: number;
  longitude?: number;
  status: string;
}

export default function CourierScreen() {
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [orderPanelExpanded, setOrderPanelExpanded] = useState(false);
  const [orderListPanelVisible, setOrderListPanelVisible] = useState(false);
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');
  const [courierName, setCourierName] = useState('Загрузка...');
  const [courierStatus, setCourierStatus] = useState<'avail' | 'unavail'>('unavail');
  const [courierId, setCourierId] = useState<number | null>(null);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [orderRoute, setOrderRoute] = useState<{ latitude: number; longitude: number }[]>([]);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [orderHistory, setOrderHistory] = useState<Order[]>([]);

  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const sidePanelAnim = useRef(new Animated.Value(-280)).current;
  const orderPanelAnim = useRef(new Animated.Value(height - 60)).current;

  useEffect(() => {
    checkAuth();
    loadCourierInfo();
  }, []);

  useEffect(() => {
    if (courierId) {

      startTracking();
      checkAssignedOrder();
      const interval = setInterval(checkAssignedOrder, 5000);
      return () => clearInterval(interval);
    }
  }, [courierId]);

  useEffect(() => {
    if (mode === 'manual') {
      loadAvailableOrders();
    } else {
      setOrderListPanelVisible(false);
      checkNearestOrder();
    }
  }, [mode]);

  useEffect(() => {
    Animated.timing(sidePanelAnim, {
      toValue: sidePanelOpen ? 0 : -280,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [sidePanelOpen]);

  useEffect(() => {
    Animated.timing(orderPanelAnim, {
      toValue: orderPanelExpanded ? 0 : height - 60,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [orderPanelExpanded]);

  const checkAuth = async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      router.replace('/login');
      return;
    }
  };

  const loadCourierInfo = async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/couriers/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setCourierName(data.name || 'Без имени');
        setCourierId(data.id);
        setCourierStatus(data.status || 'unavail');
      }
    } catch (err) {
      console.error('Ошибка загрузки курьера:', err);
    }
  };

  const startTracking = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Ошибка', 'Разрешение на геолокацию не предоставлено');
      return;
    }

    Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 10,
      },
      (location) => {
        setLocation(location);
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });
        }
        sendPosition(location);
      }
    );
  };

  const sendPosition = async (loc: Location.LocationObject) => {
    if (!courierId) return;

    // Здесь можно добавить WebSocket отправку позиции
    // Пока используем простой fetch для демонстрации
    const token = await AsyncStorage.getItem('token');
    if (!token) return;

    try {
      await fetch(`${API_BASE}/tracking/update_position`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          courier_id: courierId,
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        }),
      });
    } catch (err) {
      console.error('Ошибка отправки позиции:', err);
    }
  };

  const toggleStatus = async () => {
    const newStatus = courierStatus === 'avail' ? 'unavail' : 'avail';
    const token = await AsyncStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/couriers/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setCourierStatus(newStatus);
        Alert.alert('Успех', 'Статус обновлён');
      } else {
        Alert.alert('Ошибка', 'Не удалось обновить статус');
      }
    } catch (err) {
      Alert.alert('Ошибка', 'Ошибка соединения с сервером');
    }
  };

  const loadAvailableOrders = async () => {
    try {
      const res = await fetch(`${API_BASE}/orders/available`);
      if (res.ok) {
        const orders = await res.json();
        setAvailableOrders(orders);
        setOrderListPanelVisible(true);
      }
    } catch (err) {
      console.error('Ошибка загрузки заказов:', err);
    }
  };

  const assignOrderManually = async (orderId: number) => {
    const token = await AsyncStorage.getItem('token');
    if (!token || !courierId) return;

    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/assign/${courierId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setOrderListPanelVisible(false);
        // Загружаем назначенный заказ и показываем панель
        await checkAssignedOrder();
        setOrderPanelExpanded(true);
        Alert.alert('Успех', 'Заказ назначен!');
      } else {
        Alert.alert('Ошибка', 'Ошибка при назначении заказа');
      }
    } catch (err) {
      Alert.alert('Ошибка', 'Ошибка соединения');
    }
  };

  const checkAssignedOrder = async () => {
    if (!courierId) return;

    try {
      const res = await fetch(`${API_BASE}/couriers/${courierId}/orders`);
      if (res.ok) {
        const orders = await res.json();
        const activeOrder = orders.find((o: Order) => o.status === 'assigned');
        if (activeOrder) {
          setCurrentOrder(activeOrder);
          setOrderPanelExpanded(true); // Автоматически показываем панель заказа
          if (activeOrder.latitude && activeOrder.longitude && location) {
            setOrderRoute([
              {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              },
              {
                latitude: activeOrder.latitude,
                longitude: activeOrder.longitude,
              },
            ]);
          }
        } else {
          setCurrentOrder(null);
          setOrderRoute([]);
          setOrderPanelExpanded(false);
        }
      }
    } catch (err) {
      console.error('Ошибка проверки заказа:', err);
    }
  };

  const checkNearestOrder = async () => {
    if (!courierId) return;

    try {
      const res = await fetch(`${API_BASE}/orders/nearest/${courierId}`);
      if (res.ok) {
        const order = await res.json();
        if (order.id) {
          setCurrentOrder(order);
          setOrderPanelExpanded(true); // Автоматически показываем панель заказа
        }
      }
    } catch (err) {
      console.error('Ошибка проверки ближайшего заказа:', err);
    }
  };

  const completeOrder = async () => {
    if (!currentOrder) return;

    const token = await AsyncStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/orders/${currentOrder.id}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        Alert.alert('Успех', 'Заказ успешно доставлен!');
        setCurrentOrder(null);
        setOrderRoute([]);
      } else {
        Alert.alert('Ошибка', 'Ошибка при завершении заказа');
      }
    } catch (err) {
      Alert.alert('Ошибка', 'Ошибка соединения с сервером');
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('courier_id');
    router.replace('/login');
  };

  const loadOrderHistory = async () => {
    if (!courierId) return;

    try {
      const res = await fetch(`${API_BASE}/couriers/${courierId}/orders`);
      if (res.ok) {
        const orders = await res.json();
        // Фильтруем только завершенные заказы
        const completed = orders.filter((o: Order) => o.status === 'delivered');
        setOrderHistory(completed);
        setHistoryModalVisible(true);
      }
    } catch (err) {
      console.error('Ошибка загрузки истории заказов:', err);
      Alert.alert('Ошибка', 'Не удалось загрузить историю заказов');
    }
  };

  return (
    <View style={styles.container}>
      {/* Карта */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: 42.98306,
          longitude: 47.50472,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}>
        {/* Маркер курьера */}
        {location && (
          <Marker
            coordinate={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            }}
            title="Вы здесь"
          />
        )}

        {/* Маркер заказа */}
        {currentOrder && currentOrder.latitude && currentOrder.longitude && (
          <Marker
            coordinate={{
              latitude: currentOrder.latitude,
              longitude: currentOrder.longitude,
            }}
            title="Доставка"
            description={currentOrder.address}
          />
        )}

        {/* Маршрут */}
        {orderRoute.length > 0 && (
          <Polyline
            coordinates={orderRoute}
            strokeColor="#FF6B6B"
            strokeWidth={4}
          />
        )}
      </MapView>

      {/* Шапка */}
      <LinearGradient
        colors={['#1e293b', '#0f172a']}
        style={styles.header}>
        <TouchableOpacity onPress={() => setSidePanelOpen(!sidePanelOpen)}>
          <Ionicons name="menu" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📦 Курьер</Text>
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'auto' && styles.modeButtonActive]}
            onPress={() => setMode('auto')}>
            <Text style={[styles.modeText, mode === 'auto' && styles.modeTextActive]}>
              Авто
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'manual' && styles.modeButtonActive]}
            onPress={() => setMode('manual')}>
            <Text style={[styles.modeText, mode === 'manual' && styles.modeTextActive]}>
              Выбор
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Боковая панель */}
      <Animated.View
        style={[
          styles.sidePanel,
          { transform: [{ translateX: sidePanelAnim }] },
        ]}>
        <LinearGradient colors={['#1e293b', '#0f172a']} style={styles.sidePanelGradient}>
          <View style={styles.courierProfile}>
            <Ionicons name="person-circle" size={32} color="#fff" />
            <Text style={styles.courierName}>{courierName}</Text>
          </View>

          <Text style={styles.menuTitle}>Меню</Text>
          <ScrollView>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                setSidePanelOpen(false);
                loadOrderHistory();
              }}>
              <Ionicons name="time-outline" size={24} color="#f2f2f2" />
              <Text style={styles.menuText}>История заказов</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem}>
              <Ionicons name="help-circle-outline" size={24} color="#f2f2f2" />
              <Text style={styles.menuText}>Помощь</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={24} color="#f2f2f2" />
              <Text style={styles.menuText}>Выйти</Text>
            </TouchableOpacity>
          </ScrollView>

          <TouchableOpacity
            style={[
              styles.statusButton,
              courierStatus === 'avail' ? styles.statusButtonOnline : styles.statusButtonOffline,
            ]}
            onPress={toggleStatus}>
            <Text style={styles.statusButtonText}>
              Статус: {courierStatus === 'avail' ? 'online' : 'offline'}
            </Text>
          </TouchableOpacity>
        </LinearGradient>
      </Animated.View>

      {/* Затемнение */}
      {sidePanelOpen && (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setSidePanelOpen(false)}
        />
      )}

      {/* Панель списка заказов */}
      {orderListPanelVisible && (
        <View style={styles.orderListPanel}>
          <View style={styles.orderListHandle}>
            <View style={styles.orderListHandleBar} />
          </View>
          <ScrollView style={styles.orderListContent}>
            {availableOrders.length === 0 ? (
              <Text style={styles.emptyText}>Нет доступных заказов</Text>
            ) : (
              availableOrders.map((order) => (
                <View key={order.id} style={styles.orderCardItem}>
                  <Text style={styles.orderText}>
                    <Text style={styles.orderLabel}>Адрес:</Text> {order.address}
                  </Text>
                  <Text style={styles.orderText}>
                    <Text style={styles.orderLabel}>Получатель:</Text> {order.recipient_name}
                  </Text>
                  <TouchableOpacity
                    style={styles.assignButton}
                    onPress={() => assignOrderManually(order.id)}>
                    <Text style={styles.assignButtonText}>Взять</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      )}

      {/* Панель текущего заказа */}
      {currentOrder && (
        <Animated.View
          style={[
            styles.orderPanel,
            { transform: [{ translateY: orderPanelAnim }] },
          ]}>
          <TouchableOpacity
            style={styles.orderPanelHandle}
            onPress={() => setOrderPanelExpanded(!orderPanelExpanded)}>
            <View style={styles.orderPanelHandleBar} />
          </TouchableOpacity>
          <View style={styles.orderCard}>
            <Text style={styles.orderCardTitle}>Текущий заказ</Text>
            <Text style={styles.orderInfo}>
              <Text style={styles.orderInfoLabel}>Адрес:</Text> {currentOrder.address}
            </Text>
            <Text style={styles.orderInfo}>
              <Text style={styles.orderInfoLabel}>Получатель:</Text> {currentOrder.recipient_name}
            </Text>
            <Text style={styles.orderInfo}>
              <Text style={styles.orderInfoLabel}>Телефон:</Text> {currentOrder.recipient_phone}
            </Text>
            <Text style={styles.orderInfo}>
              <Text style={styles.orderInfoLabel}>Комментарий:</Text>{' '}
              {currentOrder.comment || '—'}
            </Text>
            <TouchableOpacity style={styles.startButton}>
              <Text style={styles.buttonText}>Начать маршрут</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.completeButton} onPress={completeOrder}>
              <Text style={styles.buttonText}>Доставлено</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* Модальное окно истории заказов */}
      {historyModalVisible && (
        <View style={styles.historyModal}>
          <View style={styles.historyModalContent}>
            <View style={styles.historyModalHeader}>
              <Text style={styles.historyModalTitle}>История заказов</Text>
              <TouchableOpacity
                onPress={() => setHistoryModalVisible(false)}
                style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.historyList}>
              {orderHistory.length === 0 ? (
                <Text style={styles.emptyHistoryText}>Нет завершённых заказов</Text>
              ) : (
                orderHistory.map((order) => (
                  <View key={order.id} style={styles.historyItem}>
                    <Text style={styles.historyItemTitle}>Заказ #{order.id}</Text>
                    <Text style={styles.historyItemText}>
                      <Text style={styles.historyItemLabel}>Адрес:</Text> {order.address}
                    </Text>
                    <Text style={styles.historyItemText}>
                      <Text style={styles.historyItemLabel}>Получатель:</Text> {order.recipient_name}
                    </Text>
                    {order.comment && (
                      <Text style={styles.historyItemText}>
                        <Text style={styles.historyItemLabel}>Комментарий:</Text> {order.comment}
                      </Text>
                    )}
                    <Text style={styles.historyItemStatus}>
                      Статус: {order.status}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  modeToggle: {
    flexDirection: 'row',
    gap: 5,
  },
  modeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  modeButtonActive: {
    backgroundColor: '#3b82f6',
  },
  modeText: {
    fontSize: 14,
    color: '#fff',
  },
  modeTextActive: {
    fontWeight: '600',
  },
  sidePanel: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 280,
    height: '100%',
    zIndex: 20,
  },
  sidePanelGradient: {
    flex: 1,
    paddingTop: 70,
    padding: 20,
  },
  courierProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  courierName: {
    fontSize: 18,
    color: '#fff',
    marginLeft: 10,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f2f2f2',
    marginBottom: 15,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 10,
  },
  menuText: {
    fontSize: 18,
    color: '#f2f2f2',
  },
  statusButton: {
    width: '100%',
    padding: 14,
    borderRadius: 12,
    marginTop: 20,
    alignItems: 'center',
  },
  statusButtonOnline: {
    backgroundColor: '#10b981',
  },
  statusButtonOffline: {
    backgroundColor: '#ef4444',
  },
  statusButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 15,
  },
  orderListPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    zIndex: 9999,
    padding: 20,
  },
  orderListHandle: {
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  orderListHandleBar: {
    width: 60,
    height: 5,
    backgroundColor: '#888',
    borderRadius: 5,
  },
  orderListContent: {
    maxHeight: '100%',
  },
  emptyText: {
    color: '#fff',
    textAlign: 'center',
    padding: 20,
  },
  orderCardItem: {
    backgroundColor: '#334155',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  orderText: {
    color: '#fff',
    fontSize: 15,
    marginBottom: 6,
  },
  orderLabel: {
    fontWeight: '600',
  },
  assignButton: {
    backgroundColor: '#10b981',
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
    alignItems: 'center',
  },
  assignButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  orderPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    zIndex: 9980,
    padding: 20,
  },
  orderPanelHandle: {
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  orderPanelHandleBar: {
    width: 60,
    height: 5,
    backgroundColor: '#666',
    borderRadius: 5,
  },
  orderCard: {
    flex: 1,
  },
  orderCardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#f2f2f2',
    marginBottom: 15,
  },
  orderInfo: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 8,
  },
  orderInfoLabel: {
    fontWeight: '600',
  },
  startButton: {
    backgroundColor: '#10b981',
    padding: 14,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  completeButton: {
    backgroundColor: '#ef4444',
    padding: 14,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  historyModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
  },
  historyModalContent: {
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  historyModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  historyModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  closeButton: {
    padding: 5,
  },
  historyList: {
    maxHeight: '70%',
  },
  emptyHistoryText: {
    color: '#94a3b8',
    textAlign: 'center',
    padding: 20,
    fontSize: 16,
  },
  historyItem: {
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  historyItemTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 10,
  },
  historyItemText: {
    fontSize: 14,
    color: '#e4e4e7',
    marginBottom: 6,
    lineHeight: 20,
  },
  historyItemLabel: {
    fontWeight: '600',
    color: '#fff',
  },
  historyItemStatus: {
    fontSize: 12,
    color: '#10b981',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
});