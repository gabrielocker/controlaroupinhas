import { getDatabase } from './db';

export interface ClothingItem {
  id: number;
  title: string;
  image_path: string;
  created_at: string;
  use_count: number;
}

export interface ClothingDetail extends ClothingItem {
  categories: { id: number; name: string }[];
}

export async function addClothing(
  title: string,
  imagePath: string,
  categoryIds: number[]
): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    'INSERT INTO clothes (title, image_path) VALUES (?, ?)',
    [title.trim(), imagePath]
  );
  const clothingId = result.lastInsertRowId;

  for (const catId of categoryIds) {
    await db.runAsync(
      'INSERT INTO clothes_categories (clothing_id, category_id) VALUES (?, ?)',
      [clothingId, catId]
    );
  }
  return clothingId;
}

export async function deleteClothing(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM clothes WHERE id = ?', [id]);
}

export async function getClothingPaginated(
  page: number,
  categoryIds: number[] = [],
  pageSize: number = 100
): Promise<ClothingItem[]> {
  const db = await getDatabase();
  const offset = (page - 1) * pageSize;

  if (categoryIds.length === 0) {
    return db.getAllAsync<ClothingItem>(
      `SELECT c.*, COALESCE(u.cnt, 0) as use_count
       FROM clothes c
       LEFT JOIN (SELECT clothing_id, COUNT(*) as cnt FROM usage_log GROUP BY clothing_id) u
         ON c.id = u.clothing_id
       ORDER BY use_count DESC, c.created_at DESC
       LIMIT ? OFFSET ?`,
      [pageSize, offset]
    );
  }

  const placeholders = categoryIds.map(() => '?').join(',');
  return db.getAllAsync<ClothingItem>(
    `SELECT c.*, COALESCE(u.cnt, 0) as use_count
     FROM clothes c
     LEFT JOIN (SELECT clothing_id, COUNT(*) as cnt FROM usage_log GROUP BY clothing_id) u
       ON c.id = u.clothing_id
     WHERE c.id IN (
       SELECT clothing_id FROM clothes_categories
       WHERE category_id IN (${placeholders})
       GROUP BY clothing_id
       HAVING COUNT(DISTINCT category_id) = ?
     )
     ORDER BY use_count DESC, c.created_at DESC
     LIMIT ? OFFSET ?`,
    [...categoryIds, categoryIds.length, pageSize, offset]
  );
}

export async function getTotalPages(
  categoryIds: number[] = [],
  pageSize: number = 100
): Promise<number> {
  const db = await getDatabase();

  let result: { total: number };
  if (categoryIds.length === 0) {
    result = (await db.getFirstAsync<{ total: number }>(
      'SELECT COUNT(*) as total FROM clothes'
    ))!;
  } else {
    const placeholders = categoryIds.map(() => '?').join(',');
    result = (await db.getFirstAsync<{ total: number }>(
      `SELECT COUNT(DISTINCT clothing_id) as total
       FROM clothes_categories
       WHERE category_id IN (${placeholders})
       GROUP BY clothing_id
       HAVING COUNT(DISTINCT category_id) = ?`,
      [...categoryIds, categoryIds.length]
    )) || { total: 0 };
  }

  return Math.max(1, Math.ceil(result.total / pageSize));
}

export async function searchClothes(
  titleQuery: string,
  categoryIds: number[]
): Promise<ClothingItem[]> {
  const db = await getDatabase();

  if (!titleQuery && categoryIds.length === 0) {
    return getClothingPaginated(1, [], 200);
  }

  let sql = `SELECT c.*, COALESCE(u.cnt, 0) as use_count
     FROM clothes c
     LEFT JOIN (SELECT clothing_id, COUNT(*) as cnt FROM usage_log GROUP BY clothing_id) u
       ON c.id = u.clothing_id
     WHERE 1=1`;
  const params: (string | number)[] = [];

  if (titleQuery) {
    sql += ' AND c.title LIKE ?';
    params.push(`%${titleQuery}%`);
  }

  if (categoryIds.length > 0) {
    const placeholders = categoryIds.map(() => '?').join(',');
    sql += ` AND c.id IN (
      SELECT clothing_id FROM clothes_categories
      WHERE category_id IN (${placeholders})
      GROUP BY clothing_id
      HAVING COUNT(DISTINCT category_id) = ?
    )`;
    params.push(...categoryIds, categoryIds.length);
  }

  sql += ' ORDER BY use_count DESC, c.created_at DESC LIMIT 200';
  return db.getAllAsync<ClothingItem>(sql, params);
}

export async function getClothingDetail(id: number): Promise<ClothingDetail | null> {
  const db = await getDatabase();
  const item = await db.getFirstAsync<ClothingItem>(
    `SELECT c.*, COALESCE(u.cnt, 0) as use_count
     FROM clothes c
     LEFT JOIN (SELECT clothing_id, COUNT(*) as cnt FROM usage_log GROUP BY clothing_id) u
       ON c.id = u.clothing_id
     WHERE c.id = ?`,
    [id]
  );
  if (!item) return null;

  const categories = await db.getAllAsync<{ id: number; name: string }>(
    `SELECT cat.id, cat.name
     FROM categories cat
     JOIN clothes_categories cc ON cat.id = cc.category_id
     WHERE cc.clothing_id = ?
     ORDER BY cat.name`,
    [id]
  );

  return { ...item, categories };
}

export async function registerUse(clothingId: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('INSERT INTO usage_log (clothing_id) VALUES (?)', [clothingId]);
}
