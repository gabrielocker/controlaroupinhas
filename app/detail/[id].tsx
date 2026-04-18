import { useState, useEffect } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet,
  Alert, ScrollView, Dimensions, FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getClothingDetail, registerUse, decrementUse, deleteClothing, getRelatedClothesByLooks, ClothingDetail, ClothingItem } from '../../src/database/clothes';

const SCREEN_WIDTH = Dimensions.get('window').width;
const RELATED_ITEM_SIZE = SCREEN_WIDTH / 5 - 8;

export default function DetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<ClothingDetail | null>(null);
  const [relatedClothes, setRelatedClothes] = useState<ClothingItem[]>([]);

  const loadItem = async () => {
    if (!id) return;
    const detail = await getClothingDetail(Number(id));
    setItem(detail);
    const related = await getRelatedClothesByLooks(Number(id));
    setRelatedClothes(related);
  };

  useEffect(() => {
    loadItem();
  }, [id]);

  const handleUse = async () => {
    if (!item) return;
    await registerUse(item.id);
    loadItem();
  };

  const handleDecrement = async () => {
    if (!item || item.use_count <= 0) return;
    await decrementUse(item.id);
    loadItem();
  };

  const handleDelete = () => {
    if (!item) return;
    Alert.alert(
      'Excluir Roupa',
      `Deseja excluir "${item.title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            await deleteClothing(item.id);
            router.back();
          },
        },
      ]
    );
  };

  if (!item) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Image source={{ uri: item.image_path }} style={styles.image} />

      <Text style={styles.title}>{item.title}</Text>

      <View style={styles.categoriesRow}>
        {item.categories.map(cat => (
          <View key={cat.id} style={styles.catBadge}>
            <Text style={styles.catBadgeText}>{cat.name}</Text>
          </View>
        ))}
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Ionicons name="repeat" size={24} color="#5B4CDB" />
          <Text style={styles.statNumber}>{item.use_count}</Text>
          <Text style={styles.statLabel}>usos</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="calendar" size={24} color="#5B4CDB" />
          <Text style={styles.statNumber}>
            {new Date(item.created_at).toLocaleDateString('pt-BR')}
          </Text>
          <Text style={styles.statLabel}>adicionada em</Text>
        </View>
      </View>

      <View style={styles.useRow}>
        <TouchableOpacity
          style={[styles.decrementButton, item.use_count <= 0 && styles.disabledButton]}
          onPress={handleDecrement}
          disabled={item.use_count <= 0}
        >
          <Ionicons name="remove-circle" size={22} color="#fff" />
          <Text style={styles.useButtonText}>-1</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.useButton} onPress={handleUse}>
          <Ionicons name="add-circle" size={22} color="#fff" />
          <Text style={styles.useButtonText}>+1 Uso</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
        <Ionicons name="trash" size={20} color="#e74c3c" />
        <Text style={styles.deleteButtonText}>Excluir Roupa</Text>
      </TouchableOpacity>

      {relatedClothes.length > 0 && (
        <View style={styles.relatedSection}>
          <Text style={styles.relatedTitle}>Combina com (dos seus Looks)</Text>
          <View style={styles.relatedGrid}>
            {relatedClothes.map(rc => (
              <TouchableOpacity
                key={rc.id}
                style={styles.relatedCard}
                onPress={() => router.push(`/detail/${rc.id}`)}
              >
                <Image source={{ uri: rc.image_path }} style={styles.relatedImage} />
                <Text style={styles.relatedCardTitle} numberOfLines={1}>{rc.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { alignItems: 'center', paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#999' },
  image: {
    width: SCREEN_WIDTH, height: SCREEN_WIDTH * 1.2,
    resizeMode: 'cover',
  },
  title: { fontSize: 22, fontWeight: '700', color: '#333', marginTop: 16, paddingHorizontal: 16 },
  categoriesRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    paddingHorizontal: 16, marginTop: 12,
  },
  catBadge: {
    backgroundColor: '#5B4CDB', paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 14,
  },
  catBadgeText: { color: '#fff', fontSize: 12, fontWeight: '500' },
  statsRow: {
    flexDirection: 'row', gap: 16, marginTop: 20, paddingHorizontal: 16,
  },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16,
    alignItems: 'center', elevation: 2, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2,
  },
  statNumber: { fontSize: 20, fontWeight: '700', color: '#333', marginTop: 4 },
  statLabel: { fontSize: 12, color: '#999', marginTop: 2 },
  useRow: {
    flexDirection: 'row', gap: 12, marginTop: 24,
    justifyContent: 'center', paddingHorizontal: 16,
  },
  useButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#5B4CDB', paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: 10,
  },
  decrementButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FF9500', paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: 10,
  },
  disabledButton: { opacity: 0.4 },
  useButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  deleteButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16,
    padding: 12,
  },
  deleteButtonText: { color: '#e74c3c', fontSize: 15 },
  relatedSection: {
    width: '100%', paddingHorizontal: 16, marginTop: 24,
    marginBottom: 20,
  },
  relatedTitle: {
    fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 12,
  },
  relatedGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
  },
  relatedCard: {
    width: RELATED_ITEM_SIZE, height: RELATED_ITEM_SIZE * 1.3,
    borderRadius: 6, overflow: 'hidden', backgroundColor: '#fff',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 2,
  },
  relatedImage: { width: '100%', height: '85%', resizeMode: 'cover' },
  relatedCardTitle: { fontSize: 8, textAlign: 'center', paddingHorizontal: 2, paddingTop: 2 },
});
