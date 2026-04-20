import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CategoryBadge } from './CategoryBadge';
import type { Reminder } from '@/types/reminder';

interface ReminderCardProps {
  reminder: Reminder;
  onPress: () => void;
  onComplete: () => void;
}

function formatScheduledAt(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  if (isToday) return `Today at ${timeStr}`;
  if (isTomorrow) return `Tomorrow at ${timeStr}`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ` at ${timeStr}`;
}

export function ReminderCard({ reminder, onPress, onComplete }: ReminderCardProps) {
  const isCompleted = !!reminder.completedAt;

  return (
    <Pressable
      onPress={onPress}
      className="mx-4 mb-3 rounded-2xl bg-white p-4 shadow-sm active:opacity-75"
      style={{ elevation: 2 }}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text
            className={`text-base font-semibold leading-snug ${
              isCompleted ? 'text-gray-400 line-through' : 'text-gray-900'
            }`}
            numberOfLines={2}
          >
            {reminder.title}
          </Text>

          <View className="mt-2 flex-row items-center gap-2">
            <CategoryBadge category={reminder.category} />
            <Text className={`text-xs ${isCompleted ? 'text-gray-400' : 'text-gray-500'}`}>
              {formatScheduledAt(reminder.scheduledAt)}
            </Text>
          </View>
        </View>

        {!isCompleted && (
          <Pressable
            onPress={onComplete}
            hitSlop={8}
            className="mt-0.5 h-7 w-7 items-center justify-center rounded-full border-2 border-gray-300 active:border-emerald-500 active:bg-emerald-50"
          >
            <Ionicons name="checkmark" size={14} color="#9ca3af" />
          </Pressable>
        )}

        {isCompleted && (
          <View className="mt-0.5 h-7 w-7 items-center justify-center rounded-full bg-emerald-500">
            <Ionicons name="checkmark" size={14} color="white" />
          </View>
        )}
      </View>
    </Pressable>
  );
}
