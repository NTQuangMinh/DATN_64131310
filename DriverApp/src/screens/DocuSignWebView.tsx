import React from 'react';
import { WebView } from 'react-native-webview';
import { useRoute } from '@react-navigation/native';
import { View, ActivityIndicator } from 'react-native';

const DocuSignWebView = () => {
  const route = useRoute();
  const { signingUrl } = route.params as any;

  return (
    <View style={{ flex: 1 }}>
      <WebView 
        source={{ uri: signingUrl }}
        startInLoadingState={true}
        renderLoading={() => (
          <ActivityIndicator size="large" style={{ position: 'absolute', top: '50%', left: '45%' }} />
        )}
      />
    </View>
  );
};

export default DocuSignWebView;