import { Text, View } from 'react-native';
import type { ReminderCategory } from '@/types/reminder';

interface CategoryBadgeProps {
  category: ReminderCategory;
}

const CATEGORY_STYLES: Record<ReminderCategory, { bg: string; text: string }> = {
  Personal: { bg: 'bg-violet-100', text: 'text-violet-700' },
  Work: { bg: 'bg-blue-100', text: 'text-blue-700' },
  Health: { bg: 'bg-green-100', text: 'text-green-700' },
  Bills: { bg: 'bg-red-100', text: 'text-red-700' },
  Family: { bg: 'bg-orange-100', text: 'text-orange-700' },
  Errands: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  Fitness: { bg: 'bg-teal-100', text: 'text-teal-700' },
  Social: { bg: 'bg-pink-100', text: 'text-pink-700' },
  Other: { bg: 'bg-gray-100', text: 'text-gray-600' },
};

export function CategoryBadge({ category }: CategoryBadgeProps) {
  const { bg, text } = CATEGORY_STYLES[category] ?? CATEGORY_STYLES.Other;
  return (
    <View className={`rounded-full px-2 py-0.5 ${bg}`}>
      <Text className={`text-xs font-medium ${text}`}>{category}</Text>
    </View>
  );
}
