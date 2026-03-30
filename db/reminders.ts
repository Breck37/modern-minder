import { getDb } from './client';
import type { Reminder, ReminderCategory, ReminderPriority, RepeatPattern, MotivationStyle } from '@/types/reminder';

function rowToReminder(row: Record<string, unknown>): Reminder {
  return {
    id: row.id as number,
    title: row.title as string,
    notes: (row.notes as string | null) ?? null,
    category: row.category as ReminderCategory,
    priority: row.priority as ReminderPriority,
    motivationStyle: (row.motivationStyle as MotivationStyle | null) ?? null,
    scheduledAt: row.scheduledAt as string,
    timezone: row.timezone as string,
    repeatPattern: row.repeatPattern as RepeatPattern,
    nagEnabled: (row.nagEnabled as number) === 1,
    completedAt: (row.completedAt as string | null) ?? null,
    notificationId: (row.notificationId as string | null) ?? null,
    nagNotificationIds: (row.nagNotificationIds as string | null) ?? null,
    confidence: (row.confidence as number | null) ?? null,
    createdAt: row.createdAt as string,
    updatedAt: row.updatedAt as string,
  };
}

export async function getAllReminders(): Promise<Reminder[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM reminders ORDER BY scheduledAt ASC'
  );
  return rows.map(rowToReminder);
}

export async function getReminderById(id: number): Promise<Reminder | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM reminders WHERE id = ?',
    [id]
  );
  return row ? rowToReminder(row) : null;
}

export async function insertReminder(
  reminder: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt'>
): Promise<number> {
  const db = await getDb();
  const now = new Date().toISOString();
  const result = await db.runAsync(
    `INSERT INTO reminders
      (title, notes, category, priority, motivationStyle, scheduledAt, timezone,
       repeatPattern, nagEnabled, completedAt, notificationId, nagNotificationIds,
       confidence, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      reminder.title,
      reminder.notes ?? null,
      reminder.category,
      reminder.priority,
      reminder.motivationStyle ?? null,
      reminder.scheduledAt,
      reminder.timezone,
      reminder.repeatPattern,
      reminder.nagEnabled ? 1 : 0,
      reminder.completedAt ?? null,
      reminder.notificationId ?? null,
      reminder.nagNotificationIds ?? null,
      reminder.confidence ?? null,
      now,
      now,
    ]
  );
  return result.lastInsertRowId;
}

export async function updateReminder(
  id: number,
  fields: Partial<Omit<Reminder, 'id' | 'createdAt'>>
): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  const entries = Object.entries({ ...fields, updatedAt: now });
  const setClauses = entries.map(([key]) => `${key} = ?`).join(', ');
  const values = entries.map(([key, val]) => {
    if (key === 'nagEnabled') return val ? 1 : 0;
    return val ?? null;
  });
  await db.runAsync(`UPDATE reminders SET ${setClauses} WHERE id = ?`, [
    ...values,
    id,
  ]);
}

export async function markComplete(id: number): Promise<void> {
  await updateReminder(id, { completedAt: new Date().toISOString() });
}

export async function deleteReminder(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM reminders WHERE id = ?', [id]);
}
