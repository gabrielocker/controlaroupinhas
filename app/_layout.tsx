import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { initDatabase } from '../src/database/db';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initDatabase().then(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#5B4CDB" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="add"
        options={{ headerShown: true, title: 'Adicionar Roupa', presentation: 'modal' }}
      />
      <Stack.Screen
        name="detail/[id]"
        options={{ headerShown: true, title: 'Detalhes' }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
