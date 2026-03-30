import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync('modernminder.db');
  }
  return db;
}

export async function runMigrations(): Promise<void> {
  const database = await getDb();
  await database.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      notes TEXT,
      category TEXT NOT NULL DEFAULT 'Other',
      priority TEXT NOT NULL DEFAULT 'medium',
      motivationStyle TEXT,
      scheduledAt TEXT NOT NULL,
      timezone TEXT NOT NULL DEFAULT 'UTC',
      repeatPattern TEXT NOT NULL DEFAULT 'none',
      nagEnabled INTEGER NOT NULL DEFAULT 0,
      completedAt TEXT,
      notificationId TEXT,
      nagNotificationIds TEXT,
      confidence REAL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `);
}
