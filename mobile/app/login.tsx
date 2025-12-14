import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { API_CONFIG } from '@/config';

const API_BASE = API_CONFIG.BASE_URL;


export default function LoginScreen() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);


  const checkAuth = async () => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      router.replace('/courier');
    }
  };

  const handleSubmit = async () => {
    // Валидация телефона
    const phoneRegex = /^\+\d{6,15}$/;
    if (!phoneRegex.test(phone)) {
      Alert.alert('Ошибка', 'Телефон должен начинаться с "+" и содержать от 6 до 15 цифр');
      return;
    }

    // Валидация пароля
    if (!/^[A-Za-z0-9]+$/.test(password)) {
      Alert.alert('Ошибка', 'Пароль должен содержать только латинские буквы и цифры');
      return;
    }

    if (mode === 'register') {
      if (password !== confirmPassword) {
        Alert.alert('Ошибка', 'Пароли не совпадают');
        return;
      }
      if (!name.trim()) {
        Alert.alert('Ошибка', 'Введите имя');
        return;
      }
    }

    const url = mode === 'login' ? `${API_BASE}/auth/login` : `${API_BASE}/auth/register`;
    const payload =
      mode === 'login'
        ? { phone, password }
        : { phone, password, name };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert('Ошибка', data.detail || 'Ошибка запроса');
        return;
      }

      if (mode === 'login') {
        await AsyncStorage.setItem('token', data.access_token);
        router.replace('/courier');
      } else {
        Alert.alert('Успех', 'Регистрация успешна, войдите 👌');
        setMode('login');
        setPhone('');
        setPassword('');
        setConfirmPassword('');
        setName('');
      }
    } catch (err) {
      Alert.alert('Ошибка', 'Сервер недоступен');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}>
      <LinearGradient
        colors={['#0f172a', '#1e293b']}
        style={styles.gradient}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
            <Text style={styles.title}>📦 Курьер</Text>

            <View style={styles.tabs}>
              <TouchableOpacity
                style={[styles.tab, mode === 'login' && styles.tabActive]}
                onPress={() => setMode('login')}>
                <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>
                  Войти
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, mode === 'register' && styles.tabActive]}
                onPress={() => setMode('register')}>
                <Text style={[styles.tabText, mode === 'register' && styles.tabTextActive]}>
                  Регистрация
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.form}>
              {mode === 'register' && (
                <TextInput
                  style={styles.input}
                  placeholder="Ваше имя"
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              )}
              <TextInput
                style={styles.input}
                placeholder="Номер телефона"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                placeholder="Пароль"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />
              {mode === 'register' && (
                <TextInput
                  style={styles.input}
                  placeholder="Повторите пароль"
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              )}
              <TouchableOpacity style={styles.button} onPress={handleSubmit}>
                <Text style={styles.buttonText}>
                  {mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 24,
    padding: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 32,
    color: '#fff',
  },
  tabs: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 10,
  },
  tab: {
    flex: 1,
    padding: 14,
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: 12,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#3b82f6',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#e4e4e7',
  },
  tabTextActive: {
    color: '#fff',
  },
  form: {
    gap: 16,
  },
  input: {
    width: '100%',
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    color: '#fff',
    fontSize: 16,
  },
  button: {
    width: '100%',
    padding: 16,
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

