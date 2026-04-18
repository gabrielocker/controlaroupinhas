import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

async function getBackupData() {
  const { data: categories } = await supabase.from('categories').select('*');
  const { data: clothes } = await supabase.from('clothes').select('*');
  const { data: clothesCategories } = await supabase.from('clothes_categories').select('*');
  const { data: usageLog } = await supabase.from('usage_log').select('*');
  const { data: looks } = await supabase.from('looks').select('*');
  const { data: lookItems } = await supabase.from('look_items').select('*');

  return {
    version: 3,
    exported_at: new Date().toISOString(),
    categories,
    clothes,
    clothes_categories: clothesCategories,
    usage_log: usageLog,
    looks,
    look_items: lookItems,
  };
}

export async function exportBackup(): Promise<void> {
  const backup = await getBackupData();
  const jsonString = JSON.stringify(backup);

  if (Platform.OS === 'web') {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'backup_roupinhas.json';
    a.click();
    URL.revokeObjectURL(url);
  } else {
    const { File, Paths } = require('expo-file-system');
    const Sharing = require('expo-sharing');
    const backupFile = new File(Paths.document, 'backup_roupinhas.json');
    backupFile.write(jsonString);
    await Sharing.shareAsync(backupFile.uri, { mimeType: 'application/json' });
  }
}

function readFileWeb(): Promise<string> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) { reject(new Error('Nenhum arquivo selecionado')); return; }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    };
    input.click();
  });
}

export async function importBackup(): Promise<boolean> {
  let content: string;

  if (Platform.OS === 'web') {
    content = await readFileWeb();
  } else {
    const { File } = require('expo-file-system');
    const DocumentPicker = require('expo-document-picker');
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });
    if (result.canceled) return false;
    const sourceFile = new File(result.assets[0].uri);
    content = await sourceFile.text();
  }

  const backup = JSON.parse(content);

  if (!backup.version || !backup.categories || !backup.clothes) {
    throw new Error('Arquivo de backup inválido');
  }

  // Clear existing data (order matters for foreign keys)
  await supabase.from('look_items').delete().neq('look_id', -1);
  await supabase.from('looks').delete().neq('id', -1);
  await supabase.from('usage_log').delete().neq('id', -1);
  await supabase.from('clothes_categories').delete().neq('clothing_id', -1);
  await supabase.from('clothes').delete().neq('id', -1);
  await supabase.from('categories').delete().neq('id', -1);

  // Restore categories
  if (backup.categories?.length > 0) {
    const { error } = await supabase.from('categories').insert(backup.categories);
    if (error) throw error;
  }

  // Restore clothes (images are URLs in v3, or may have base64 in v2)
  if (backup.clothes?.length > 0) {
    const clothesRows = backup.clothes.map((item: any) => ({
      id: item.id,
      title: item.title,
      image_path: item.image_path,
      created_at: item.created_at,
    }));
    const { error } = await supabase.from('clothes').insert(clothesRows);
    if (error) throw error;
  }

  // Restore relations
  if (backup.clothes_categories?.length > 0) {
    const { error } = await supabase.from('clothes_categories').insert(backup.clothes_categories);
    if (error) throw error;
  }

  // Restore usage log
  if (backup.usage_log?.length > 0) {
    const { error } = await supabase.from('usage_log').insert(backup.usage_log);
    if (error) throw error;
  }

  // Restore looks
  if (backup.looks?.length > 0) {
    const { error } = await supabase.from('looks').insert(backup.looks);
    if (error) throw error;
  }

  // Restore look items
  if (backup.look_items?.length > 0) {
    const { error } = await supabase.from('look_items').insert(backup.look_items);
    if (error) throw error;
  }

  return true;
}
