export type ReminderCategory =
  | 'Personal'
  | 'Work'
  | 'Health'
  | 'Bills'
  | 'Family'
  | 'Errands'
  | 'Fitness'
  | 'Social'
  | 'Other';

export type ReminderPriority = 'low' | 'medium' | 'high' | 'urgent';

export type RepeatPattern = 'none' | 'daily' | 'weekly' | 'monthly';

export type MotivationStyle = 'gentle' | 'firm' | 'urgent';

export interface Reminder {
  id: number;
  title: string;
  notes: string | null;
  category: ReminderCategory;
  priority: ReminderPriority;
  motivationStyle: MotivationStyle | null;
  scheduledAt: string; // ISO 8601
  timezone: string; // IANA timezone string
  repeatPattern: RepeatPattern;
  nagEnabled: boolean;
  completedAt: string | null; // ISO 8601 or null
  notificationId: string | null;
  nagNotificationIds: string | null; // JSON array string
  confidence: number | null; // 0-1
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export interface ParsedReminder {
  title: string;
  category: ReminderCategory;
  scheduledAt: string;
  repeatPattern: RepeatPattern;
  priority: ReminderPriority;
  motivationStyle: MotivationStyle | null;
  confidence: number;
  notes?: string;
}
