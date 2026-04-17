import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image,
  StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { File, Paths } from 'expo-file-system';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getAllCategories, Category } from '../src/database/categories';
import { addClothing } from '../src/database/clothes';

export default function AddClothingScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getAllCategories().then(setCategories);
  }, []);

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [3, 4],
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permissão necessária', 'Permita o acesso à câmera nas configurações.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      allowsEditing: true,
      aspect: [3, 4],
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const toggleCategory = (id: number) => {
    setSelectedCategories(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Atenção', 'Informe um título para a roupa.');
      return;
    }
    if (!imageUri) {
      Alert.alert('Atenção', 'Adicione uma foto da roupa.');
      return;
    }
    if (selectedCategories.length === 0) {
      Alert.alert('Atenção', 'Selecione pelo menos uma categoria.');
      return;
    }

    setSaving(true);
    try {
      // Copy image to app's document directory for persistence
      const filename = `clothing_${Date.now()}.jpg`;
      const source = new File(imageUri);
      const bytes = source.bytesSync();
      const dest = new File(Paths.document, filename);
      dest.write(bytes);
      const destPath = dest.uri;

      await addClothing(title.trim(), destPath, selectedCategories);
      router.back();
    } catch (err: any) {
      Alert.alert('Erro', 'Não foi possível salvar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Image */}
        <View style={styles.imageSection}>
          {imageUri ? (
            <TouchableOpacity onPress={pickFromGallery}>
              <Image source={{ uri: imageUri }} style={styles.preview} />
            </TouchableOpacity>
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image-outline" size={48} color="#ccc" />
              <Text style={styles.placeholderText}>Adicione uma foto</Text>
            </View>
          )}
          <View style={styles.imageButtons}>
            <TouchableOpacity style={styles.imageBtn} onPress={takePhoto}>
              <Ionicons name="camera" size={20} color="#fff" />
              <Text style={styles.imageBtnText}>Câmera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.imageBtn} onPress={pickFromGallery}>
              <Ionicons name="images" size={20} color="#fff" />
              <Text style={styles.imageBtnText}>Galeria</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.label}>Título</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Camiseta azul Nike"
          value={title}
          onChangeText={setTitle}
        />

        {/* Categories */}
        <Text style={styles.label}>Categorias</Text>
        <View style={styles.categoriesGrid}>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.catChip,
                selectedCategories.includes(cat.id) && styles.catChipActive,
              ]}
              onPress={() => toggleCategory(cat.id)}
            >
              <Text
                style={[
                  styles.catChipText,
                  selectedCategories.includes(cat.id) && styles.catChipTextActive,
                ]}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Salvando...' : 'Salvar Roupa'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scroll: { padding: 16 },
  imageSection: { alignItems: 'center', marginBottom: 20 },
  preview: { width: 200, height: 260, borderRadius: 12 },
  imagePlaceholder: {
    width: 200, height: 260, borderRadius: 12, backgroundColor: '#e0e0e0',
    justifyContent: 'center', alignItems: 'center',
  },
  placeholderText: { color: '#999', marginTop: 8 },
  imageButtons: { flexDirection: 'row', gap: 12, marginTop: 12 },
  imageBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#5B4CDB', paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 8,
  },
  imageBtnText: { color: '#fff', fontWeight: '500' },
  label: { fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 8 },
  input: {
    backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 14,
    height: 44, fontSize: 15, marginBottom: 12,
  },
  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  catChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#e0e0e0',
  },
  catChipActive: { backgroundColor: '#5B4CDB' },
  catChipText: { fontSize: 13, color: '#333' },
  catChipTextActive: { color: '#fff' },
  saveButton: {
    backgroundColor: '#5B4CDB', padding: 16, borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
