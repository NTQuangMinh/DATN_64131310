import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance from '../api/axiosInstance';

interface LoginProps {
  onLoginSuccess: (token: string) => void;
}

const LoginScreen: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
  if (!username || !password) {
    Alert.alert('Thông báo', 'Vui lòng nhập tài khoản và mật khẩu');
    return;
  }
  setLoading(true);
  try {
    const response = await axiosInstance.post('/auth/login', { username, password });
    
    // CẤU TRÚC MỚI: Dựa trên ảnh Swagger của bạn
    const { token, user } = response.data; 

    if (token && user) {
      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('role', user.role || 'DRIVER');
      await AsyncStorage.setItem('userId', user.id); // Lưu c7c2a594... vào máy
      
      console.log("Đã lưu userId:", user.id);
      onLoginSuccess(token);
    }
  } catch (error: any) {
    console.log("Lỗi Login:", error);
    Alert.alert('Lỗi', 'Đăng nhập thất bại.');
  } finally {
    setLoading(false);
  }
};

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>🚛 DELIVERY</Text>
      <Text style={styles.subTitle}>Dành cho Tài xế</Text>
      
      <TextInput 
        style={styles.input} 
        placeholder="Tên đăng nhập" 
        value={username} 
        onChangeText={setUsername} 
        autoCapitalize="none" 
      />
      <TextInput 
        style={styles.input} 
        placeholder="Mật khẩu" 
        value={password} 
        onChangeText={setPassword} 
        secureTextEntry 
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>ĐĂNG NHẬP</Text>}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 30, backgroundColor: '#fff' },
  logo: { fontSize: 32, fontWeight: 'bold', textAlign: 'center', color: '#007AFF' },
  subTitle: { textAlign: 'center', color: '#8e8e93', marginBottom: 40 },
  input: { borderBottomWidth: 1, borderColor: '#ddd', padding: 12, marginBottom: 20, fontSize: 16 },
  button: { backgroundColor: '#007AFF', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});

export default LoginScreen;