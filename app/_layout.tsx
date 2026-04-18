import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { initDatabase } from '../src/database/db';
import {
  View, ActivityIndicator, StyleSheet, Platform,
  Text, TextInput, TouchableOpacity, KeyboardAvoidingView,
} from 'react-native';
import { supabase } from '../src/lib/supabase';

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (authError) {
      setError('Email ou senha incorretos');
      setLoading(false);
    } else {
      onLogin();
    }
  };

  return (
    <KeyboardAvoidingView style={loginStyles.container}>
      <View style={loginStyles.card}>
        <Text style={loginStyles.title}>Controla Roupinhas</Text>
        <Text style={loginStyles.subtitle}>Faça login para continuar</Text>
        {error ? <Text style={loginStyles.error}>{error}</Text> : null}
        <TextInput
          style={loginStyles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={loginStyles.input}
          placeholder="Senha"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TouchableOpacity
          style={[loginStyles.button, loading && { opacity: 0.6 }]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={loginStyles.buttonText}>Entrar</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(Platform.OS !== 'web');

  useEffect(() => {
    const init = async () => {
      await initDatabase();
      if (Platform.OS === 'web') {
        const { data } = await supabase.auth.getSession();
        if (data.session) setAuthenticated(true);
      }
      setReady(true);
    };
    init();
  }, []);

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#5B4CDB" />
      </View>
    );
  }

  if (!authenticated) {
    return <LoginScreen onLogin={() => setAuthenticated(true)} />;
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

const loginStyles = StyleSheet.create({
  container: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#f5f5f5', padding: 20,
  },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 32,
    width: '100%', maxWidth: 400,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  title: {
    fontSize: 24, fontWeight: '700', color: '#5B4CDB',
    textAlign: 'center', marginBottom: 4,
  },
  subtitle: {
    fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 24,
  },
  error: {
    color: '#e74c3c', textAlign: 'center', marginBottom: 12, fontSize: 13,
  },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    padding: 12, fontSize: 15, marginBottom: 12, backgroundColor: '#fafafa',
  },
  button: {
    backgroundColor: '#5B4CDB', borderRadius: 8, padding: 14,
    alignItems: 'center', marginTop: 4,
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
