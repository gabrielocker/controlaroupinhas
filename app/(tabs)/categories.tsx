import { useState, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getAllCategories, createCategory, deleteCategory, Category } from '../../src/database/categories';

export default function CategoriesScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newName, setNewName] = useState('');

  const loadCategories = useCallback(async () => {
    const cats = await getAllCategories();
    setCategories(cats);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCategories();
    }, [])
  );

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      await createCategory(name);
      setNewName('');
      loadCategories();
    } catch {
      Alert.alert('Erro', 'Essa categoria já existe.');
    }
  };

  const handleDelete = (cat: Category) => {
    Alert.alert(
      'Excluir Categoria',
      `Deseja excluir "${cat.name}"? As roupas não serão excluídas, apenas perderão essa categoria.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            await deleteCategory(cat.id);
            loadCategories();
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          placeholder="Nova categoria..."
          value={newName}
          onChangeText={setNewName}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
        />
        <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={categories}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Ionicons name="pricetag" size={18} color="#5B4CDB" />
            <Text style={styles.name}>{item.name}</Text>
            <TouchableOpacity onPress={() => handleDelete(item)}>
              <Ionicons name="trash-outline" size={20} color="#e74c3c" />
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Nenhuma categoria</Text>
          </View>
        }
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  addRow: {
    flexDirection: 'row', padding: 12, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  input: {
    flex: 1, height: 44, backgroundColor: '#f0f0f0', borderRadius: 8,
    paddingHorizontal: 12, fontSize: 15, marginRight: 8,
  },
  addButton: {
    width: 44, height: 44, borderRadius: 8, backgroundColor: '#5B4CDB',
    justifyContent: 'center', alignItems: 'center',
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  name: { flex: 1, marginLeft: 10, fontSize: 16, color: '#333' },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#999' },
});
