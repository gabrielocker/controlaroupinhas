import { useState, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, Image, TouchableOpacity,
  StyleSheet, Dimensions, Alert, Modal, ScrollView,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getAllLooks, createLook, deleteLook, LookWithItems } from '../../src/database/looks';
import { getClothingPaginated, ClothingItem } from '../../src/database/clothes';

const SCREEN_WIDTH = Dimensions.get('window').width;
const THUMB_SIZE = 56;

export default function LooksScreen() {
  const router = useRouter();
  const [looks, setLooks] = useState<LookWithItems[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [lookName, setLookName] = useState('');
  const [allClothes, setAllClothes] = useState<ClothingItem[]>([]);
  const [selectedClothes, setSelectedClothes] = useState<number[]>([]);

  const loadLooks = useCallback(async () => {
    const data = await getAllLooks();
    setLooks(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadLooks();
    }, [])
  );

  const openCreate = async () => {
    const clothes = await getClothingPaginated(1, [], 500);
    setAllClothes(clothes);
    setSelectedClothes([]);
    setLookName('');
    setCreateModalOpen(true);
  };

  const toggleClothing = (id: number) => {
    setSelectedClothes(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleCreate = async () => {
    if (!lookName.trim()) {
      Alert.alert('Erro', 'Digite um nome para o look.');
      return;
    }
    if (selectedClothes.length < 2) {
      Alert.alert('Erro', 'Selecione ao menos 2 peças.');
      return;
    }
    await createLook(lookName, selectedClothes);
    setCreateModalOpen(false);
    loadLooks();
  };

  const handleDelete = (look: LookWithItems) => {
    Alert.alert(
      'Excluir Look',
      `Deseja excluir "${look.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir', style: 'destructive',
          onPress: async () => {
            await deleteLook(look.id);
            loadLooks();
          },
        },
      ]
    );
  };

  const renderLook = ({ item: look }: { item: LookWithItems }) => (
    <View style={styles.lookCard}>
      <View style={styles.lookHeader}>
        <Text style={styles.lookName}>{look.name}</Text>
        <TouchableOpacity onPress={() => handleDelete(look)}>
          <Ionicons name="trash-outline" size={20} color="#e74c3c" />
        </TouchableOpacity>
      </View>
      <Text style={styles.lookDate}>
        {new Date(look.created_at).toLocaleDateString('pt-BR')}
        {' · '}{look.items.length} peças
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbRow}>
        {look.items.map(cloth => (
          <TouchableOpacity
            key={cloth.id}
            onPress={() => router.push(`/detail/${cloth.id}`)}
          >
            <Image source={{ uri: cloth.image_path }} style={styles.thumb} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={looks}
        renderItem={renderLook}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="layers-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Nenhum look salvo</Text>
            <Text style={styles.emptySubText}>Crie combinações de roupas!</Text>
          </View>
        }
      />

      {/* FAB to create look */}
      <TouchableOpacity style={styles.fab} onPress={openCreate}>
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      {/* Create Look Modal */}
      <Modal visible={createModalOpen} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setCreateModalOpen(false)}>
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Novo Look</Text>
            <TouchableOpacity onPress={handleCreate}>
              <Text style={styles.saveText}>Salvar</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.nameInput}
            placeholder="Nome do look (ex: Casual sexta)"
            value={lookName}
            onChangeText={setLookName}
          />

          <Text style={styles.selectLabel}>
            Selecione as peças ({selectedClothes.length} selecionadas)
          </Text>

          <FlatList
            data={allClothes}
            keyExtractor={item => String(item.id)}
            numColumns={4}
            contentContainerStyle={styles.clothesGrid}
            renderItem={({ item }) => {
              const selected = selectedClothes.includes(item.id);
              return (
                <TouchableOpacity
                  style={[styles.clothesCard, selected && styles.clothesCardSelected]}
                  onPress={() => toggleClothing(item.id)}
                >
                  <Image source={{ uri: item.image_path }} style={styles.clothesImage} />
                  {selected && (
                    <View style={styles.checkOverlay}>
                      <Ionicons name="checkmark-circle" size={24} color="#5B4CDB" />
                    </View>
                  )}
                  <Text style={styles.clothesTitle} numberOfLines={1}>{item.title}</Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

const CARD_SIZE = (SCREEN_WIDTH - 40) / 4;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  list: { padding: 12 },
  lookCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    marginBottom: 12, elevation: 2, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2,
  },
  lookHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  lookName: { fontSize: 17, fontWeight: '700', color: '#333' },
  lookDate: { fontSize: 12, color: '#999', marginTop: 4 },
  thumbRow: { marginTop: 10 },
  thumb: {
    width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: 8,
    marginRight: 8, resizeMode: 'cover',
  },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 120 },
  emptyText: { marginTop: 8, color: '#999', fontSize: 16 },
  emptySubText: { marginTop: 4, color: '#bbb', fontSize: 13 },
  fab: {
    position: 'absolute', bottom: 70, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#5B4CDB', justifyContent: 'center', alignItems: 'center',
    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 4,
  },
  modalContainer: { flex: 1, backgroundColor: '#f5f5f5', paddingTop: 50 },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#eee', backgroundColor: '#fff',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#333' },
  saveText: { fontSize: 16, fontWeight: '600', color: '#5B4CDB' },
  nameInput: {
    backgroundColor: '#fff', margin: 12, paddingHorizontal: 16,
    paddingVertical: 12, borderRadius: 10, fontSize: 16,
    borderWidth: 1, borderColor: '#eee',
  },
  selectLabel: {
    fontSize: 14, color: '#666', marginHorizontal: 12, marginBottom: 8,
  },
  clothesGrid: { paddingHorizontal: 8 },
  clothesCard: {
    width: CARD_SIZE, height: CARD_SIZE * 1.3, margin: 4,
    borderRadius: 8, overflow: 'hidden', backgroundColor: '#fff',
    elevation: 2, borderWidth: 2, borderColor: 'transparent',
  },
  clothesCardSelected: { borderColor: '#5B4CDB' },
  clothesImage: { width: '100%', height: '80%', resizeMode: 'cover' },
  clothesTitle: { fontSize: 10, textAlign: 'center', paddingHorizontal: 2, paddingTop: 2 },
  checkOverlay: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 12,
  },
});
