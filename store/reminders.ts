import { create } from 'zustand';
import {
  getAllReminders,
  insertReminder,
  markComplete,
  deleteReminder,
} from '@/db/reminders';
import type { Reminder } from '@/types/reminder';

interface RemindersState {
  reminders: Reminder[];
  isLoading: boolean;
  loadReminders: () => Promise<void>;
  addReminder: (reminder: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt'>) => Promise<number>;
  completeReminder: (id: number) => Promise<void>;
  removeReminder: (id: number) => Promise<void>;
}

export const useRemindersStore = create<RemindersState>((set) => ({
  reminders: [],
  isLoading: false,

  loadReminders: async () => {
    set({ isLoading: true });
    const reminders = await getAllReminders();
    set({ reminders, isLoading: false });
  },

  addReminder: async (reminder) => {
    const id = await insertReminder(reminder);
    const reminders = await getAllReminders();
    set({ reminders });
    return id;
  },

  completeReminder: async (id) => {
    await markComplete(id);
    const reminders = await getAllReminders();
    set({ reminders });
  },

  removeReminder: async (id) => {
    await deleteReminder(id);
    const reminders = await getAllReminders();
    set({ reminders });
  },
}));
