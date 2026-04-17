import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { getDatabase } from './db';

export async function exportBackup(): Promise<void> {
  const db = await getDatabase();

  const categories = await db.getAllAsync('SELECT * FROM categories');
  const clothes = await db.getAllAsync('SELECT * FROM clothes');
  const clothesCategories = await db.getAllAsync('SELECT * FROM clothes_categories');
  const usageLog = await db.getAllAsync('SELECT * FROM usage_log');

  // Export images as base64
  const clothesWithImages = [];
  for (const item of clothes as any[]) {
    let imageBase64 = '';
    try {
      const imgFile = new File(item.image_path);
      imageBase64 = await imgFile.base64();
    } catch {
      // Image may have been deleted
    }
    clothesWithImages.push({ ...item, image_base64: imageBase64 });
  }

  const backup = {
    version: 1,
    exported_at: new Date().toISOString(),
    categories,
    clothes: clothesWithImages,
    clothes_categories: clothesCategories,
    usage_log: usageLog,
  };

  const backupFile = new File(Paths.document, 'backup_roupinhas.json');
  backupFile.write(JSON.stringify(backup));
  await Sharing.shareAsync(backupFile.uri, { mimeType: 'application/json' });
}

export async function importBackup(): Promise<boolean> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });

  if (result.canceled) return false;

  const pickedFile = result.assets[0];
  const sourceFile = new File(pickedFile.uri);
  const content = await sourceFile.text();
  const backup = JSON.parse(content);

  if (!backup.version || !backup.categories || !backup.clothes) {
    throw new Error('Arquivo de backup inválido');
  }

  const db = await getDatabase();

  // Clear existing data
  await db.execAsync('DELETE FROM usage_log');
  await db.execAsync('DELETE FROM clothes_categories');
  await db.execAsync('DELETE FROM clothes');
  await db.execAsync('DELETE FROM categories');

  // Restore categories
  for (const cat of backup.categories) {
    await db.runAsync(
      'INSERT INTO categories (id, name) VALUES (?, ?)',
      [cat.id, cat.name]
    );
  }

  // Restore clothes and images
  for (const item of backup.clothes) {
    let imagePath = item.image_path;

    if (item.image_base64) {
      const filename = `clothing_${item.id}_${Date.now()}.jpg`;
      const destFile = new File(Paths.document, filename);
      const bytes = Uint8Array.from(atob(item.image_base64), c => c.charCodeAt(0));
      destFile.write(bytes);
      imagePath = destFile.uri;
    }

    await db.runAsync(
      'INSERT INTO clothes (id, title, image_path, created_at) VALUES (?, ?, ?, ?)',
      [item.id, item.title, imagePath, item.created_at]
    );
  }

  // Restore relations
  for (const cc of backup.clothes_categories) {
    await db.runAsync(
      'INSERT INTO clothes_categories (clothing_id, category_id) VALUES (?, ?)',
      [cc.clothing_id, cc.category_id]
    );
  }

  // Restore usage log
  for (const log of backup.usage_log) {
    await db.runAsync(
      'INSERT INTO usage_log (id, clothing_id, used_at) VALUES (?, ?, ?)',
      [log.id, log.clothing_id, log.used_at]
    );
  }

  return true;
}
