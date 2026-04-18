import { useState, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, Image, TouchableOpacity,
  StyleSheet, Dimensions, ScrollView, Modal,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  getClothingPaginated, getTotalPages, registerUse, searchClothes, ClothingItem,
} from '../../src/database/clothes';
import { getAllCategories, Category } from '../../src/database/categories';

const NUM_COLUMNS = 5;
const PAGE_SIZE = NUM_COLUMNS * 20;
const SCREEN_WIDTH = Dimensions.get('window').width;
const ITEM_SIZE = SCREEN_WIDTH / NUM_COLUMNS - 4;

export default function HomeScreen() {
  const router = useRouter();
  const [clothes, setClothes] = useState<ClothingItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const loadData = useCallback(async (p: number, catIds: number[], search: string) => {
    setLoading(true);
    try {
      const cats = await getAllCategories();
      setCategories(cats);

      if (search.trim()) {
        const items = await searchClothes(search.trim(), catIds);
        setClothes(items);
        setTotalPages(1);
      } else {
        const [items, total] = await Promise.all([
          getClothingPaginated(p, catIds, PAGE_SIZE),
          getTotalPages(catIds, PAGE_SIZE),
        ]);
        setClothes(items);
        setTotalPages(total);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData(page, selectedCategories, query);
    }, [page, selectedCategories, query])
  );

  const toggleCategory = (id: number) => {
    setSelectedCategories(prev => {
      const next = prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id];
      setPage(1);
      return next;
    });
  };

  const clearFilters = () => {
    setQuery('');
    setSelectedCategories([]);
    setPage(1);
  };

  const handleUse = async (item: ClothingItem) => {
    await registerUse(item.id);
    loadData(page, selectedCategories, query);
  };

  const renderItem = ({ item }: { item: ClothingItem }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/detail/${item.id}`)}
      activeOpacity={0.7}
    >
      <Image source={{ uri: item.image_path }} style={styles.image} />
      <View style={styles.useCountBadge}>
        <Text style={styles.useCountText}>{item.use_count}</Text>
      </View>
      <TouchableOpacity
        style={styles.plusButton}
        onPress={() => handleUse(item)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="add-circle" size={24} color="#5B4CDB" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const hasActiveFilters = selectedCategories.length > 0 || query.trim().length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#999" />
          <TextInput
            style={styles.input}
            placeholder="Buscar por tÃ­tulo..."
            value={query}
            onChangeText={text => { setQuery(text); setPage(1); }}
            returnKeyType="search"
          />
        </View>
        <TouchableOpacity style={styles.filterToggle} onPress={() => setMenuOpen(true)}>
          <Ionicons name="options" size={20} color="#fff" />
          {selectedCategories.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{selectedCategories.length}</Text>
            </View>
          )}
        </TouchableOpacity>
        {hasActiveFilters && (
          <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
            <Ionicons name="close-circle" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <Modal visible={menuOpen} transparent animationType="fade">
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setMenuOpen(false)}
        >
          <View style={styles.menuContainer}>
            <Text style={styles.menuTitle}>Filtrar Categorias</Text>
            <ScrollView style={styles.menuScroll}>
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.menuItem,
                    selectedCategories.includes(cat.id) && styles.menuItemActive,
                  ]}
                  onPress={() => toggleCategory(cat.id)}
                >
                  <Text
                    style={[
                      styles.menuItemText,
                      selectedCategories.includes(cat.id) && styles.menuItemTextActive,
                    ]}
                  >
                    {cat.name}
                  </Text>
                  {selectedCategories.includes(cat.id) && (
                    <Ionicons name="checkmark" size={18} color="#fff" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.menuClose} onPress={() => setMenuOpen(false)}>
              <Text style={styles.menuCloseText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <FlatList
        data={clothes}
        renderItem={renderItem}
        keyExtractor={item => String(item.id)}
        numColumns={NUM_COLUMNS}
        contentContainerStyle={styles.grid}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="shirt-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Nenhuma roupa cadastrada</Text>
          </View>
        }
      />

      {!query.trim() && (
        <View style={styles.pagination}>
          <TouchableOpacity
            onPress={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            <Ionicons name="chevron-back" size={28} color={page <= 1 ? '#ccc' : '#5B4CDB'} />
          </TouchableOpacity>
          <Text style={styles.pageText}>{page} / {totalPages}</Text>
          <TouchableOpacity
            onPress={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            <Ionicons name="chevron-forward" size={28} color={page >= totalPages ? '#ccc' : '#5B4CDB'} />
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/add')}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  topRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 8,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee',
    gap: 8,
  },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f0f0f0', paddingHorizontal: 10,
    borderRadius: 10, height: 40,
  },
  input: { flex: 1, height: 40, marginLeft: 6, fontSize: 14 },
  filterToggle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#5B4CDB', justifyContent: 'center', alignItems: 'center',
  },
  clearButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#FF3B30', justifyContent: 'center', alignItems: 'center',
  },
  badge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: '#FF3B30', borderRadius: 10,
    minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  menuContainer: {
    width: '80%', maxHeight: '70%', backgroundColor: '#fff',
    borderRadius: 16, padding: 16,
  },
  menuTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 12, textAlign: 'center' },
  menuScroll: { maxHeight: 400 },
  menuItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10,
    backgroundColor: '#f0f0f0', marginBottom: 6,
  },
  menuItemActive: { backgroundColor: '#5B4CDB' },
  menuItemText: { fontSize: 15, color: '#333' },
  menuItemTextActive: { color: '#fff', fontWeight: '600' },
  menuClose: {
    marginTop: 12, paddingVertical: 12, borderRadius: 10,
    backgroundColor: '#5B4CDB', alignItems: 'center',
  },
  menuCloseText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  grid: { padding: 2 },
  card: {
    width: ITEM_SIZE, height: ITEM_SIZE * 1.3, margin: 2,
    borderRadius: 6, overflow: 'hidden', backgroundColor: '#fff',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 2,
  },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
  useCountBadge: {
    position: 'absolute', top: 2, left: 2,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10,
    paddingHorizontal: 5, paddingVertical: 1,
  },
  useCountText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  plusButton: {
    position: 'absolute', bottom: 2, right: 2,
    backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 12,
  },
  pagination: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    paddingVertical: 8, backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#eee',
  },
  pageText: { marginHorizontal: 16, fontSize: 14, color: '#333' },
  fab: {
    position: 'absolute', bottom: 70, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#5B4CDB', justifyContent: 'center', alignItems: 'center',
    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 4,
  },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  emptyText: { marginTop: 8, color: '#999', fontSize: 16 },
});
