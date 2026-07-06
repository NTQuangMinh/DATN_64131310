import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance from '../api/axiosInstance';
import { Ionicons } from '@expo/vector-icons';

interface LoginProps {
  onLoginSuccess: (token: string) => void;
}

const LoginScreen: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Thông báo', 'Vui lòng nhập tài khoản và mật khẩu');
      return;
    }
    setLoading(true);
    try {
      const response = await axiosInstance.post('/auth/login', { username, password });
      const { token, user } = response.data; 

      if (token && user) {
        await AsyncStorage.setItem('token', token);
        await AsyncStorage.setItem('role', user.role || 'DRIVER');
        await AsyncStorage.setItem('userId', user.id); 
        
        console.log("Đã lưu userId:", user.id);
        onLoginSuccess(token);
      }
    } catch (error: any) {
      console.log("Lỗi Login:", error);
      Alert.alert('Đăng nhập thất bại', 'Sai tên đăng nhập hoặc mật khẩu. Vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="cube" size={40} color="#fff" />
          </View>
          <Text style={styles.logo}>Q-Logistics</Text>
          <Text style={styles.subTitle}>Cổng thông tin dành cho Tài xế</Text>
        </View>
        
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>TÀI KHOẢN</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                placeholder="Nhập tên đăng nhập" 
                value={username} 
                onChangeText={setUsername} 
                autoCapitalize="none" 
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>MẬT KHẨU</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                placeholder="Nhập mật khẩu" 
                value={password} 
                onChangeText={setPassword} 
                secureTextEntry={!showPassword} 
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#9ca3af" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>ĐĂNG NHẬP HỆ THỐNG</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 5 },
  header: { alignItems: 'center', marginBottom: 30 },
  iconContainer: { backgroundColor: '#2563eb', padding: 12, borderRadius: 16, marginBottom: 16, shadowColor: '#2563eb', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 3 },
  logo: { fontSize: 28, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 },
  subTitle: { fontSize: 14, color: '#64748b', marginTop: 6, fontWeight: '500' },
  form: { gap: 20 },
  inputGroup: { gap: 6 },
  label: { fontSize: 11, fontWeight: 'bold', color: '#94a3b8', paddingLeft: 4 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, paddingHorizontal: 12 },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, height: 50, fontSize: 15, color: '#334155', fontWeight: '500' },
  eyeIcon: { padding: 10 },
  button: { backgroundColor: '#2563eb', height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 10, shadowColor: '#2563eb', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 3 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 15, letterSpacing: 0.5 }
});

export default LoginScreen;