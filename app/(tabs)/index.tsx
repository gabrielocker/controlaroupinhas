import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, Image, TouchableOpacity,
  StyleSheet, Dimensions, Alert, ScrollView,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  getClothingPaginated, getTotalPages, registerUse, ClothingItem,
} from '../../src/database/clothes';
import { getAllCategories, Category } from '../../src/database/categories';

const NUM_COLUMNS = 5;
const PAGE_SIZE = NUM_COLUMNS * 20; // 20 rows x 5 columns = 100
const SCREEN_WIDTH = Dimensions.get('window').width;
const ITEM_SIZE = SCREEN_WIDTH / NUM_COLUMNS - 4;

export default function HomeScreen() {
  const router = useRouter();
  const [clothes, setClothes] = useState<ClothingItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async (p: number, catIds: number[]) => {
    setLoading(true);
    try {
      const [items, total, cats] = await Promise.all([
        getClothingPaginated(p, catIds, PAGE_SIZE),
        getTotalPages(catIds, PAGE_SIZE),
        getAllCategories(),
      ]);
      setClothes(items);
      setTotalPages(total);
      setCategories(cats);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData(page, selectedCategories);
    }, [page, selectedCategories])
  );

  const toggleCategory = (id: number) => {
    setSelectedCategories(prev => {
      const next = prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id];
      setPage(1);
      return next;
    });
  };

  const handleUse = async (item: ClothingItem) => {
    await registerUse(item.id);
    loadData(page, selectedCategories);
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

  return (
    <View style={styles.container}>
      {/* Category Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        contentContainerStyle={styles.filterContent}
      >
        {categories.map(cat => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.filterChip,
              selectedCategories.includes(cat.id) && styles.filterChipActive,
            ]}
            onPress={() => toggleCategory(cat.id)}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedCategories.includes(cat.id) && styles.filterChipTextActive,
              ]}
            >
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Grid */}
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

      {/* Pagination */}
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

      {/* FAB */}
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
  filterBar: { maxHeight: 50, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  filterContent: { alignItems: 'center', paddingHorizontal: 8, gap: 6 },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    backgroundColor: '#eee', marginRight: 6,
  },
  filterChipActive: { backgroundColor: '#5B4CDB' },
  filterChipText: { fontSize: 12, color: '#333' },
  filterChipTextActive: { color: '#fff' },
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
