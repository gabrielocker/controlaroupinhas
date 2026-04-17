import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { exportBackup, importBackup } from '../../src/database/backup';

export default function BackupScreen() {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      await exportBackup();
    } catch (err: any) {
      Alert.alert('Erro', 'Não foi possível exportar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    Alert.alert(
      'Importar Backup',
      'Isso substituirá todos os dados atuais. Deseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Importar',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const success = await importBackup();
              if (success) {
                Alert.alert('Sucesso', 'Backup importado com sucesso!');
              }
            } catch (err: any) {
              Alert.alert('Erro', 'Falha ao importar: ' + err.message);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#5B4CDB" />
        <Text style={styles.loadingText}>Processando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Ionicons name="cloud-upload-outline" size={40} color="#5B4CDB" />
        <Text style={styles.title}>Exportar Backup</Text>
        <Text style={styles.desc}>
          Salva todas as roupas, categorias e histórico de uso em um arquivo JSON.
        </Text>
        <TouchableOpacity style={styles.button} onPress={handleExport}>
          <Text style={styles.buttonText}>Exportar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Ionicons name="cloud-download-outline" size={40} color="#5B4CDB" />
        <Text style={styles.title}>Importar Backup</Text>
        <Text style={styles.desc}>
          Restaura dados de um arquivo de backup. Os dados atuais serão substituídos.
        </Text>
        <TouchableOpacity style={[styles.button, styles.importButton]} onPress={handleImport}>
          <Text style={styles.buttonText}>Importar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16, gap: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#666' },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 24,
    alignItems: 'center', elevation: 2, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3,
  },
  title: { fontSize: 18, fontWeight: '600', marginTop: 12, color: '#333' },
  desc: { fontSize: 13, color: '#888', textAlign: 'center', marginTop: 8, marginBottom: 16 },
  button: {
    backgroundColor: '#5B4CDB', paddingHorizontal: 32, paddingVertical: 12,
    borderRadius: 8,
  },
  importButton: { backgroundColor: '#e67e22' },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
