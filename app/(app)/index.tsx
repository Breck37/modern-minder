import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ReminderCard } from '@/components/reminders/ReminderCard';
import { useRemindersStore } from '@/store/reminders';
import type { Reminder, ReminderCategory } from '@/types/reminder';

const CATEGORIES: ReminderCategory[] = [
  'Personal',
  'Work',
  'Health',
  'Bills',
  'Family',
  'Errands',
  'Fitness',
  'Social',
  'Other',
];

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reminders = useRemindersStore((s) => s.reminders);
  const completeReminder = useRemindersStore((s) => s.completeReminder);

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<ReminderCategory | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  const filtered = useMemo(() => {
    return reminders.filter((r: Reminder) => {
      const isCompleted = !!r.completedAt;
      if (isCompleted !== showCompleted) return false;
      if (activeCategory && r.category !== activeCategory) return false;
      if (search.trim()) {
        return r.title.toLowerCase().includes(search.trim().toLowerCase());
      }
      return true;
    });
  }, [reminders, showCompleted, activeCategory, search]);

  const handleComplete = useCallback(
    (id: number) => {
      completeReminder(id);
    },
    [completeReminder]
  );

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-4 pb-3 pt-4">
        <Text className="text-2xl font-bold text-gray-900">Reminders</Text>
      </View>

      {/* Search bar */}
      <View className="mx-4 mb-3 flex-row items-center rounded-xl bg-white px-3 py-2 shadow-sm">
        <Ionicons name="search" size={18} color="#9ca3af" />
        <TextInput
          className="ml-2 flex-1 text-base text-gray-800"
          placeholder="Search reminders…"
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color="#9ca3af" />
          </Pressable>
        )}
      </View>

      {/* Category filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="px-4 pb-3 gap-2"
      >
        <Pressable
          onPress={() => setActiveCategory(null)}
          className={`rounded-full px-3 py-1.5 ${
            activeCategory === null ? 'bg-gray-900' : 'bg-white'
          }`}
        >
          <Text
            className={`text-sm font-medium ${
              activeCategory === null ? 'text-white' : 'text-gray-600'
            }`}
          >
            All
          </Text>
        </Pressable>
        {CATEGORIES.map((cat) => (
          <Pressable
            key={cat}
            onPress={() => setActiveCategory(activeCategory === cat ? null : cat)}
            className={`rounded-full px-3 py-1.5 ${
              activeCategory === cat ? 'bg-gray-900' : 'bg-white'
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                activeCategory === cat ? 'text-white' : 'text-gray-600'
              }`}
            >
              {cat}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Upcoming / Completed toggle */}
      <View className="mx-4 mb-4 flex-row rounded-xl bg-gray-200 p-1">
        <Pressable
          onPress={() => setShowCompleted(false)}
          className={`flex-1 rounded-lg py-1.5 ${!showCompleted ? 'bg-white shadow-sm' : ''}`}
        >
          <Text
            className={`text-center text-sm font-medium ${
              !showCompleted ? 'text-gray-900' : 'text-gray-500'
            }`}
          >
            Upcoming
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setShowCompleted(true)}
          className={`flex-1 rounded-lg py-1.5 ${showCompleted ? 'bg-white shadow-sm' : ''}`}
        >
          <Text
            className={`text-center text-sm font-medium ${
              showCompleted ? 'text-gray-900' : 'text-gray-500'
            }`}
          >
            Completed
          </Text>
        </Pressable>
      </View>

      {/* Reminder list */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <ReminderCard
            reminder={item}
            onPress={() => router.push(`/(app)/reminder/${item.id}`)}
            onComplete={() => handleComplete(item.id)}
          />
        )}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center px-8 pt-16">
            <Ionicons name="mic-circle-outline" size={64} color="#d1d5db" />
            <Text className="mt-4 text-center text-base font-medium text-gray-400">
              {showCompleted
                ? 'No completed reminders yet'
                : 'Tap the mic to add your first reminder'}
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      />

      {/* FAB — mic button */}
      <View
        className="absolute bottom-0 left-0 right-0 items-center"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        <Pressable
          onPress={() => router.push('/(app)/voice-capture')}
          className="h-16 w-16 items-center justify-center rounded-full bg-gray-900 shadow-lg active:scale-95 active:opacity-90"
        >
          <Ionicons name="mic" size={28} color="white" />
        </Pressable>
      </View>
    </View>
  );
}
