import { useState, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, Image, TouchableOpacity,
  StyleSheet, Dimensions, ScrollView,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { searchClothes, ClothingItem } from '../../src/database/clothes';
import { getAllCategories, Category } from '../../src/database/categories';

const NUM_COLUMNS = 5;
const SIDEBAR_WIDTH = 50;
const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_WIDTH = SCREEN_WIDTH - SIDEBAR_WIDTH;
const ITEM_SIZE = GRID_WIDTH / NUM_COLUMNS - 4;

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [results, setResults] = useState<ClothingItem[]>([]);
  const [searched, setSearched] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getAllCategories().then(setCategories);
    }, [])
  );

  const doSearch = async () => {
    const items = await searchClothes(query.trim(), selectedCategories);
    setResults(items);
    setSearched(true);
  };

  const toggleCategory = (id: number) => {
    setSelectedCategories(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const renderItem = ({ item }: { item: ClothingItem }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/detail/${item.id}`)}
    >
      <Image source={{ uri: item.image_path }} style={styles.image} />
      <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color="#999" />
        <TextInput
          style={styles.input}
          placeholder="Buscar por título..."
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={doSearch}
          returnKeyType="search"
        />
        <TouchableOpacity onPress={doSearch}>
          <Text style={styles.searchButton}>Buscar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        {/* Sidebar de categorias */}
        <ScrollView
          style={styles.sidebar}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.sidebarContent}
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

        {/* Grid de resultados */}
        <FlatList
          style={styles.gridContainer}
          data={results}
          renderItem={renderItem}
          keyExtractor={item => String(item.id)}
          numColumns={NUM_COLUMNS}
          contentContainerStyle={styles.grid}
          ListEmptyComponent={
            searched ? (
              <View style={styles.empty}>
                <Ionicons name="search-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>Nenhum resultado encontrado</Text>
              </View>
            ) : null
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', margin: 10, paddingHorizontal: 12,
    borderRadius: 10, elevation: 2, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2,
  },
  input: { flex: 1, height: 44, marginLeft: 8, fontSize: 15 },
  searchButton: { color: '#5B4CDB', fontWeight: '600', fontSize: 15 },
  body: { flex: 1, flexDirection: 'row' },
  sidebar: {
    width: SIDEBAR_WIDTH,
    backgroundColor: '#fff',
    borderRightWidth: 1,
    borderRightColor: '#eee',
  },
  sidebarContent: { paddingVertical: 4, paddingHorizontal: 3, gap: 3 },
  filterChip: {
    paddingHorizontal: 4, paddingVertical: 5, borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  filterChipActive: { backgroundColor: '#5B4CDB' },
  filterChipText: { fontSize: 8, color: '#333', textAlign: 'center' },
  filterChipTextActive: { color: '#fff' },
  gridContainer: { flex: 1 },
  grid: { padding: 2 },
  card: {
    width: ITEM_SIZE, height: ITEM_SIZE * 1.3, margin: 2,
    borderRadius: 6, overflow: 'hidden', backgroundColor: '#fff',
    elevation: 2,
  },
  image: { width: '100%', height: '85%', resizeMode: 'cover' },
  cardTitle: { fontSize: 9, textAlign: 'center', paddingHorizontal: 2, paddingTop: 2 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyText: { marginTop: 8, color: '#999' },
});
