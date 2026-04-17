import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('controlaroupinhas.db');
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');
  return db;
}

export async function initDatabase(): Promise<void> {
  const database = await getDatabase();

  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS clothes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      image_path TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS clothes_categories (
      clothing_id INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      PRIMARY KEY (clothing_id, category_id),
      FOREIGN KEY (clothing_id) REFERENCES clothes(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS usage_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clothing_id INTEGER NOT NULL,
      used_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (clothing_id) REFERENCES clothes(id) ON DELETE CASCADE
    );
  `);

  // Seed default categories
  const defaultCategories = [
    'Calçado', 'Chapéu', 'Calça', 'Camiseta', 'Shorts',
    'Camisa', 'Agasalho', 'Sobretudo', 'Meia', 'Cueca/Calcinha',
    'Vestido', 'Saia', 'Bermuda'
  ];

  for (const name of defaultCategories) {
    await database.runAsync(
      'INSERT OR IGNORE INTO categories (name) VALUES (?)',
      [name]
    );
  }
}
