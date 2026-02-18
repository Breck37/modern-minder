# Modern Minder

A fast, voice-first personal reminder app. Speak a single sentence and have a reminder scheduled automatically, with "firm" follow-ups that encourage completion.

> **Working name**: Nudge / ModernNudge / SolidMinder — branding finalized post-MVP.

## Product Goal

Speed, reliability, and low cognitive load over customization. One voice command creates a fully scheduled reminder with no extra taps.

## Target User & Key Use Cases

- Individual user who wants reminders without typing
- Hands-busy moments (driving, cooking, walking)
- Users who routinely dismiss reminders and want follow-through
- Quick capture: _"Remind me to pay the electric bill tomorrow at 9"_
- Recurring habits: _"Every Monday remind me to stretch"_
- Time-sensitive nudges: _"Call dad tonight"_

## Non-Goals (MVP)

- No cloud sync or multi-device support
- No user accounts or authentication
- No shared reminders
- No SMS or phone calls
- No AI chat interface
- No complex recurrence rules beyond basic patterns

## MVP Features

- **Push-to-talk voice input** (primary input method)
- Speech-to-text transcription
- AI parsing of transcript into structured reminder data
- Automatic scheduling when confidence is high (>= 0.75)
- Manual edit screen when confidence is low (< 0.75)
- **Categories**: Personal, Work, Health, Bills, Family, Errands, Fitness, Social, Other
- Local notifications only (offline-first)
- **"Firm reminder" behavior** — re-notify until marked complete
- Notification actions: Snooze, Complete, Reschedule
- Reminder list with status (upcoming, completed)
- Search reminders by text
- Filter by category
- First-run onboarding explaining voice usage and firm reminders

## Screens & Navigation

| Screen                   | Purpose                                                                                   |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| **Onboarding**           | Explain voice-first flow, request mic + notification permissions, example voice command   |
| **Home / Reminder List** | Upcoming reminders (default), category filter, search, completed toggle                   |
| **Voice Capture**        | Large mic button, live waveform / listening state, auto-stop after silence                |
| **Reminder Review**      | Only shown if confidence < threshold — editable title, time, category fields with confirm |
| **Reminder Detail**      | View reminder info, edit / reschedule, mark complete                                      |

## Data Model

### Reminder

| Field                | Type                                                                          |
| -------------------- | ----------------------------------------------------------------------------- |
| `id`                 | uuid                                                                          |
| `title`              | string                                                                        |
| `notes`              | string \| null                                                                |
| `category`           | enum (Personal, Work, Health, Bills, Family, Errands, Fitness, Social, Other) |
| `priority`           | low \| medium \| high \| urgent                                               |
| `motivationStyle`    | calm \| firm \| tough_love \| funny                                           |
| `scheduledAt`        | ISO local datetime                                                            |
| `timezone`           | IANA string                                                                   |
| `repeatPattern`      | none \| daily \| weekly \| monthly                                            |
| `repeatInterval`     | number                                                                        |
| `nagEnabled`         | boolean                                                                       |
| `nagIntervalMinutes` | number \| null                                                                |
| `nagMaxRetries`      | number \| null                                                                |
| `completedAt`        | datetime \| null                                                              |
| `createdAt`          | datetime                                                                      |
| `updatedAt`          | datetime                                                                      |
| `confidence`         | 0–1 float                                                                     |

**Storage**: SQLite (single local database via `expo-sqlite`)

## Voice Flow

1. User taps mic
2. App enters listening state
3. Speech captured and transcribed
4. Transcript sent to AI parser
5. AI returns structured reminder JSON
6. App evaluates confidence score
   - **>= 0.75** — auto-save + confirm via toast
   - **< 0.75** — show Reminder Review screen
7. Reminder saved to SQLite
8. Local notification scheduled immediately

No conversational loop. One shot per command.

## Scheduling & Notification Rules

| Input                               | Resolved Time               |
| ----------------------------------- | --------------------------- |
| Date but no time                    | 9:00 AM                     |
| "Tonight"                           | 7:00 PM                     |
| "Morning" / "Afternoon" / "Evening" | 9:00 AM / 2:00 PM / 7:00 PM |
| Time but no date (future today)     | Today                       |
| Time but no date (already passed)   | Tomorrow                    |

- Timezone based on device location (falls back to manual selection if no permission)
- Local notifications scheduled at save time
- **Notification actions**: Complete, Snooze 10 min, Snooze 30 min

## "Firm Reminder" Behavior

| Priority | Re-notify interval | Max retries |
| -------- | ------------------ | ----------- |
| High     | Every 30 min       | 6           |
| Urgent   | Every 10 min       | 6           |

- Each nag uses the same notification ID group
- Stops immediately when marked complete
- Messaging uses assertive but non-shaming language
- No full-screen OS takeovers; firmness via repetition + tone

## Tech Stack

| Layer         | Technology                                          |
| ------------- | --------------------------------------------------- |
| Framework     | Expo (managed workflow)                             |
| Language      | TypeScript (strict)                                 |
| Navigation    | Expo Router (file-based)                            |
| Styling       | NativeWind (Tailwind CSS for React Native)          |
| Database      | SQLite (`expo-sqlite`)                              |
| Voice         | `expo-speech-recognition`                           |
| Notifications | Expo Notifications (local only)                     |
| State         | Zustand                                             |
| AI Parsing    | Claude / OpenAI (lightweight call for parsing only) |
| Backend       | None                                                |

## Development

### Prerequisites

- Node.js 20+
- pnpm
- Expo CLI (`npx expo`)
- EAS CLI (`npx eas-cli`) for builds

### Getting Started

```bash
pnpm install
npx expo start
```

### Scripts

| Command             | Description           |
| ------------------- | --------------------- |
| `pnpm start`        | Start Expo dev server |
| `pnpm ios`          | Run on iOS            |
| `pnpm android`      | Run on Android        |
| `pnpm web`          | Start web dev server  |
| `pnpm lint`         | Run ESLint            |
| `pnpm format`       | Format with Prettier  |
| `pnpm format:check` | Check formatting      |
| `pnpm test`         | Run Jest tests        |

### Environment Variables

Copy `.env.local.example` to `.env` and fill in your API key:

```bash
cp .env.local.example .env
```

## Implementation Plan

| Day | Milestone                                                                 |
| --- | ------------------------------------------------------------------------- |
| 1   | App scaffold, navigation, SQLite setup, reminder list screen              |
| 2   | Voice capture + transcription, raw transcript display                     |
| 3   | AI parsing integration, reminder creation logic, confidence threshold     |
| 4   | Local notification scheduling, notification actions (complete/snooze)     |
| 5   | Firm reminder nag logic, reminder detail + edit, search & category filter |

### Definition of Done

- [ ] Create reminder by voice
- [ ] Receive notification at correct time
- [ ] Snooze and complete works
- [ ] No crashes offline
- [ ] Clean app state after restart

## Assumptions & Open Questions

- Single user, single device
- English language only
- iOS primary target, Android secondary
- Notification permissions granted
- AI service availability is acceptable for personal use
- Branding/name finalized post-MVP
