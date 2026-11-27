# Plan: Reliable Reminder Alarms

Core MVP feature: reminders and firm follow-ups must fire on time, days, weeks or months ahead, even if the app is closed, killed, or the phone restarted. The [README](../README.md) covers _what_ fires (scheduling rules, firm reminders, notification actions). This doc covers _how_ we make it reliable.

## TL;DR

- **Scheduling far ahead is fine.** iOS and Android both hold scheduled local notifications themselves; the app doesn't need to be running. A reminder booked 3 months out fires without the app being opened.
- **The real limit is count, not time.** iOS keeps only **64 pending notifications per app** and silently drops the rest. Firm reminders (up to 7 notifications each) and recurring reminders eat that fast.
- **Fix: a rolling-window scheduler.** SQLite is the source of truth; the OS only ever holds the next ~50 notifications. The app tops the window back up whenever it gets a chance to run.
- **Optional "real alarm" mode** via Apple's AlarmKit (iOS 26+): loud, rings through silent mode and Focus, like the Clock app. Good fit for `urgent` reminders.

## What survives what

| Situation                       | iOS                                                   | Android                                                                                  |
| ------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| App in background / swiped away | Fires                                                 | Fires                                                                                    |
| Phone restarted                 | Fires (OS persists them)                              | Alarms are cleared on reboot; `expo-notifications` re-registers them on boot. Must test. |
| Scheduled > 24 h out            | Fires (no time limit)                                 | Fires                                                                                    |
| > 64 pending                    | **Extras silently dropped**                           | No hard cap (~500 alarms), but exact alarms need permission (below)                      |
| Silent mode / Focus             | Silenced unless marked **Time Sensitive** or AlarmKit | Depends on channel importance + Do Not Disturb settings                                  |
| App deleted / reinstalled       | All gone (expected)                                   | All gone                                                                                 |

## Rolling-window scheduler

One function, `syncSchedule()`, in `lib/scheduler.ts`. It's idempotent: safe to call any time.

1. Read every active reminder from SQLite and **expand the upcoming occurrences**: next due time, repeat occurrences, and firm-reminder nags.
2. Sort by time and take the **first 50**. Keep ~14 slots free as headroom (snooze, nags added from notification actions).
3. Diff against what the OS has pending (`getAllScheduledNotificationsAsync`). Cancel what shouldn't be there, schedule what's missing. Notification ids are deterministic: `<reminderId>:<occurrenceISO>:<nagIndex>`.
4. Store `scheduledThrough` (the time of the last notification in the window).

**When it runs**

- After any reminder is created, edited, completed, snoozed or deleted
- App launch and every return to foreground
- When a notification is delivered or tapped, or an action (Complete/Snooze) is pressed
- Periodic background task (`expo-background-task`, roughly every few hours at the OS's discretion)
- Timezone or clock change

**Safety net:** if the window ever runs out before the app runs again (very unlikely: it needs 50+ notifications to fire with the app never opened), the last scheduled notification in the window is a quiet _"Open Modern Minder to keep your reminders on track"_ placeholder.

### Firm reminders inside the window

A high-priority reminder is 1 notification + 6 nags = 7 slots, and urgent ones also need 7. To keep that affordable:

- Nags are only expanded for occurrences in the **next 48 hours**. Further-out reminders take 1 slot until they come into range.
- Completing a reminder (in-app or via the notification's **Complete** action) cancels its remaining nags immediately, then re-syncs.
- Snooze cancels the current nag chain and schedules a new one from the snooze time.

### Repeating reminders

- Each occurrence is scheduled as its own **date trigger**, not an OS repeat trigger. OS repeat triggers can't carry per-occurrence nags or be marked complete one occurrence at a time.
- Occurrences are generated from `repeatPattern` + `repeatInterval` and stored with wall-clock time + IANA timezone. A "9 AM every Monday" reminder stays 9 AM across daylight-saving changes and travel.

### Notification actions without opening the app

- Register a notification category with **Complete / Snooze 10 / Snooze 30**, which the README already specifies.
- Handle actions in a background task (`Notifications.registerTaskAsync`) so tapping **Complete** stops the nags without launching the UI.

## Breaking through silent mode

| Level                        | How                                                                                        | Use for                     |
| ---------------------------- | ------------------------------------------------------------------------------------------ | --------------------------- |
| Normal                       | Default                                                                                    | low / medium priority       |
| **Time Sensitive** (iOS)     | `interruptionLevel: 'timeSensitive'` + Time Sensitive capability. No Apple approval needed | high / urgent, and nags     |
| **AlarmKit alarm** (iOS 26+) | Full alarm UI, rings through silent + Focus, survives reboot. Needs a native module        | urgent, opt-in per reminder |
| Critical Alerts              | Needs a special Apple entitlement, granted mainly for health/safety apps                   | Not planned                 |

**AlarmKit:** no official Expo module yet. Community wrappers exist (`expo-alarm-kit`, `react-native-ios-alarmkit`, `react-native-nitro-ios-alarm-kit`), all young with few users. AlarmKit alarms don't count toward the 64-notification limit. The plan is to evaluate one in a later phase or write a thin Expo module. iOS 26+ only, falls back to Time Sensitive notifications on older iOS.

**Android:** use a high-importance notification channel for high/urgent. Exact timing on Android 12+ needs `SCHEDULE_EXACT_ALARM` (user can revoke) or `USE_EXACT_ALARM` (only allowed for alarm/calendar-type apps in Play review). Without it, delivery can drift by several minutes.

## Data model additions

**Reminder** (existing) gains:

| Field          | Type                                       |
| -------------- | ------------------------------------------ |
| `alertLevel`   | normal \| time_sensitive \| alarm          |
| `snoozedUntil` | datetime \| null                           |
| `deletedAt`    | datetime \| null (soft delete, sync-ready) |

**ReminderOccurrence** (new, one row per fired or upcoming occurrence of a repeating reminder)

| Field         | Type                                      |
| ------------- | ----------------------------------------- |
| `id`          | uuid                                      |
| `reminderId`  | uuid → Reminder                           |
| `dueAt`       | datetime                                  |
| `status`      | pending \| completed \| skipped \| missed |
| `completedAt` | datetime \| null                          |
| `nagsSent`    | number                                    |

Lets "Every Monday stretch" be completed for this week without ending the series, and gives a history.

## Edge cases to handle

- **Notification permission revoked** → banner on Home, and reminders still appear in the app as overdue.
- **Missed while phone was off** → on next launch, mark past occurrences `missed` and show them at the top. Don't fire a burst of stale notifications.
- **Timezone change / travel** → re-sync. Wall-clock reminders follow the user; reminders the user marks as "fixed time" (rare) don't.
- **Clock set manually** → re-sync on `significantTimeChange`.
- **App update / reinstall from backup** → re-sync on first launch after update.

## Definition of done

- [ ] Reminder set 7 days out fires on time with the app force-quit
- [ ] Reminder fires after the phone is restarted (iOS and Android)
- [ ] 30 reminders × firm nags scheduled → none silently lost; the window refills as they fire
- [ ] Weekly repeating reminder fires 4 weeks in a row without opening the app in between, assuming the background task ran at least once. Verified on device.
- [ ] Complete from the notification stops all remaining nags without opening the app
- [ ] High/urgent reminders break through Focus (Time Sensitive)
- [ ] Daylight-saving change keeps a 9 AM reminder at 9 AM

## Where this fits

This is MVP work (README days 4–5), and it comes **before** lists. The README's 5-day plan underestimates it. Realistic estimate: scheduling + actions + firm nags with the rolling window is ~3–4 days on its own, plus device testing for reboot and DST. AlarmKit mode is a later, optional phase.
