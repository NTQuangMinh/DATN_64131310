import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import LoginScreen from './src/screens/LoginScreen';
import OrderListScreen from './src/screens/OrderListScreen';
import DeliveryConfirm from './src/screens/DeliveryConfirm';
import DocuSignWebView from './src/screens/DocuSignWebView'; 

const Stack = createStackNavigator();

export default function App() {
  const [userToken, setUserToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      const token = await AsyncStorage.getItem('token');
      setUserToken(token);
      setIsLoading(false);
    };
    bootstrap();
  }, []);

  if (isLoading) return (
    <View style={{flex:1, justifyContent:'center'}}>
      <ActivityIndicator size="large" color="#0000ff" />
    </View>
  );

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {userToken == null ? (
            <Stack.Screen name="Login">
              {(props) => <LoginScreen {...props} onLoginSuccess={(token) => setUserToken(token)} />}
            </Stack.Screen>
          ) : (
            <>
              <Stack.Screen name="OrderList">
                {(props) => <OrderListScreen {...props} onLogout={() => setUserToken(null)} />}
              </Stack.Screen>
              <Stack.Screen name="DeliveryConfirm" component={DeliveryConfirm} />
              <Stack.Screen 
                name="DocuSignWebView" 
                component={DocuSignWebView} 
                options={{ headerShown: true, title: 'Ký xác nhận điện tử' }} 
              />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}