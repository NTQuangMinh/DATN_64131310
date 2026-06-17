import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Modal, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance from '../api/axiosInstance';
import { Ionicons } from '@expo/vector-icons';

interface ChangePasswordProps {
  visible: boolean;
  onClose: () => void;
}

const ChangePasswordModal: React.FC<ChangePasswordProps> = ({ visible, onClose }) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp');
      return;
    }

    setLoading(true);
    try {
      const userId = await AsyncStorage.getItem('userId');
      // Gọi API đổi mật khẩu (Sẽ cấu hình ở Bước 3)
      await axiosInstance.put(`/users/${userId}/change-password`, {
        oldPassword,
        newPassword
      });

      Alert.alert('Thành công', 'Đổi mật khẩu thành công!');
      setOldPassword(''); setNewPassword(''); setConfirmPassword('');
      onClose();
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.error || 'Mật khẩu cũ không chính xác!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Đổi mật khẩu</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color="#64748b" /></TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Mật khẩu hiện tại"
            placeholderTextColor="#94a3b8" // 🌟 Thêm màu cho chữ mờ
            secureTextEntry
            value={oldPassword}
            onChangeText={setOldPassword}
          />
          <TextInput
            style={styles.input}
            placeholder="Mật khẩu mới (Tối thiểu 6 ký tự)"
            placeholderTextColor="#94a3b8" // 🌟 Thêm màu cho chữ mờ
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
          />
          <TextInput
            style={styles.input}
            placeholder="Xác nhận mật khẩu mới"
            placeholderTextColor="#94a3b8" // 🌟 Thêm màu cho chữ mờ
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>CẬP NHẬT MẬT KHẨU</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', padding: 24, borderRadius: 24, elevation: 5 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  input: { 
    backgroundColor: '#f8fafc', 
    borderWidth: 1, 
    borderColor: '#e2e8f0', 
    borderRadius: 12, 
    padding: 14, 
    marginBottom: 12, 
    fontSize: 15,
    color: '#0f172a' 
  },
  submitBtn: { backgroundColor: '#2563eb', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  submitText: { color: '#fff', fontWeight: 'bold' }
});

export default ChangePasswordModal;