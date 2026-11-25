# Plan: Lists, Location Alerts & Spoken Replies

Extends the MVP plan in the [README](../README.md). Everything there still stands; this adds three features on top of it.

1. **Voice-managed lists** — _"Add avocados and eggs to my shopping list"_, _"Add a circular saw to my wants list"_
2. **Location-aware list alerts** — _"Looks like you're at a grocery store. Tap to see your shopping list."_ / _"You're at Walmart. You need Advil, which they should carry."_
3. **Spoken replies** — the app answers out loud (_"Added avocados and eggs to Shopping."_)

## TL;DR / Feasibility

| Feature         | Feasible?           | Main cost / risk                                                                                                    |
| --------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Lists           | Yes, easy           | Parser prompt gets broader; same single AI call                                                                     |
| Location alerts | Yes, with limits    | "Always" location permission, iOS 20-region cap, store lookup needs a places source, "they should carry" is a guess |
| Spoken replies  | Yes, free on-device | On-device voices are decent, not premium; cloud voices cost money and need network                                  |

Changes to the MVP non-goals: location alerts need **background location**, and a places lookup is best done through a **tiny backend proxy** (so API keys aren't in the app). Both are called out below.

---

## 1. Lists

### Behaviour

- Each list is stored and managed separately (Shopping, Todo, Wants, Hardware, …).
- Default lists created on first run: **Shopping**, **Todo**, **Wants**.
- Saying an unknown list name creates it (_"add drill bits to my garage list"_ → new **Garage** list), confirmed via toast/voice so typos don't silently spawn lists.
- Lists have aliases so natural phrasing resolves: `grocery`, `groceries`, `shopping` → **Shopping**.
- Items can be checked off, removed, and the list cleared — by voice or by tap.

### Voice commands (examples)

| Say                                         | Intent                        |
| ------------------------------------------- | ----------------------------- |
| "Add avocados and eggs to my shopping list" | `list.add_items`              |
| "Put a circular saw on my wants list"       | `list.add_items`              |
| "Take eggs off the shopping list"           | `list.remove_items`           |
| "I got the eggs" / "Check off eggs"         | `list.check_items`            |
| "What's on my shopping list?"               | `list.read`                   |
| "Clear my shopping list"                    | `list.clear` (confirm first)  |
| "Make a new list called camping"            | `list.create`                 |
| "Remind me to pay rent on the 1st"          | `reminder.create` (unchanged) |

### Parser change

Today's parser returns one reminder. It becomes an **intent router** — still one AI call per command, still one shot (no chat loop). Output is a discriminated union:

```ts
type ParsedCommand =
  | { intent: 'reminder.create'; reminder: ReminderDraft; confidence: number }
  | {
      intent: 'list.add_items' | 'list.remove_items' | 'list.check_items';
      listName: string; // raw name as spoken, resolved locally
      items: {
        text: string;
        quantity?: string;
        storeCategories: StoreCategory[];
      }[];
      confidence: number;
    }
  | {
      intent: 'list.read' | 'list.clear' | 'list.create';
      listName: string;
      confidence: number;
    };
```

- Splitting "avocados and eggs" into two items is done by the model.
- The model also tags each item with **store categories** (see §2). Doing it at add-time means no extra AI call later.
- The app sends the current list names + aliases in the prompt so the model picks an existing list when it can. Final name matching happens locally (exact → alias → fuzzy).
- Same confidence rule as reminders: **>= 0.75** auto-apply, else show a small review sheet.

### Data model additions (SQLite)

**List**

| Field                     | Type                                                 |
| ------------------------- | ---------------------------------------------------- |
| `id`                      | uuid                                                 |
| `name`                    | string (display, e.g. "Shopping")                    |
| `aliases`                 | JSON string[] (e.g. `["grocery","groceries"]`)       |
| `icon`                    | string \| null                                       |
| `defaultStoreCategories`  | JSON StoreCategory[] (e.g. Shopping → `["grocery"]`) |
| `locationAlertsEnabled`   | boolean                                              |
| `sortOrder`               | number                                               |
| `archivedAt`              | datetime \| null                                     |
| `createdAt` / `updatedAt` | datetime                                             |

**ListItem**

| Field                     | Type                            |
| ------------------------- | ------------------------------- |
| `id`                      | uuid                            |
| `listId`                  | uuid → List                     |
| `text`                    | string                          |
| `quantity`                | string \| null ("2", "a dozen") |
| `notes`                   | string \| null                  |
| `storeCategories`         | JSON StoreCategory[]            |
| `checkedAt`               | datetime \| null                |
| `createdAt` / `updatedAt` | datetime                        |

`StoreCategory` is a fixed enum: `grocery`, `pharmacy`, `hardware`, `big_box`, `electronics`, `home_goods`, `pet`, `office`, `clothing`, `auto`, `other`.

### Screens

- **Lists** tab: all lists with unchecked-item counts.
- **List Detail**: items, tap to check, swipe to delete, mic button scoped to this list (_"eggs, milk, bread"_ goes straight in).
- Home gets a segmented toggle or tab bar: **Reminders | Lists**.

---

## 2. Location-aware list alerts

### How it works

1. The app keeps a small set of **geofences** (circular regions) around stores that match what's on your lists.
2. When the OS says you entered one, a background task looks up which unchecked items match that store's categories.
3. If something matches, it fires a local notification. Tapping opens that list (deep link `modernminder://lists/<id>?place=<placeId>`).

Example matching:

| Store      | Store categories                        | Notification                                                  |
| ---------- | --------------------------------------- | ------------------------------------------------------------- |
| Kroger     | grocery                                 | "Looks like you're at a grocery store. 5 things on Shopping." |
| Walmart    | grocery, pharmacy, big_box, hardware, … | "You're at Walmart. You need Advil, which they should carry." |
| Home Depot | hardware                                | "You're at Home Depot. Circular saw is on your Wants list."   |

### "They should carry it" — be honest

There's no affordable, reliable API for per-store stock. The plan is a **category match**, not an inventory check:

- Each item gets store categories when added (AI does this: Advil → `pharmacy`, `grocery`, `big_box`).
- Each store gets categories from a **chain lookup table** (bundled JSON, ~100 big US chains: Walmart, Target, Costco, CVS, Walgreens, Home Depot, Lowe's, Kroger, …) with a fallback to the place type returned by the places source.
- Copy says _"should carry"_ / _"likely has"_, never _"has in stock"_.

### Where store locations come from

| Option                                         | Cost                                                 | Notes                                                                                                                  |
| ---------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **A. User-saved places** ("this is my Kroger") | Free                                                 | Most reliable; zero API calls. Good first step.                                                                        |
| **B. Apple MapKit POI search** (iOS)           | Free, no API key                                     | Needs a small custom Expo native module (`MKLocalPointsOfInterestRequest`). iOS only. **Recommended for auto-detect.** |
| C. Google Places API (New) Nearby Search       | Paid after a monthly free cap; check current pricing | Cross-platform, great data. Key must not ship in the app → needs a proxy. Easy to rack up calls if not cached.         |
| D. Foursquare Places                           | Free tier, then paid                                 | Good chain/category data; same key/proxy concern.                                                                      |
| E. OpenStreetMap (Overpass)                    | Free                                                 | Spotty in places, rate limited, but has `brand` tags for chains. Fine as a fallback.                                   |

**Recommendation:** ship **A** first, then add **B** for automatic detection on iOS (primary target, and free). Revisit **C** only if Android becomes a priority, behind a small serverless proxy with caching.

### Platform limits (the important part)

- **"Always" location permission is required.** Geofences only fire in the background with it. iOS asks for "When In Use" first, then lets you upgrade to "Always" later; we should ask at the moment the user turns on location alerts, with a clear reason. App Store review checks that the purpose string justifies it.
- **iOS caps an app at 20 monitored regions** (Android: 100). So we can't fence every store in town. Strategy:
  - Use **significant location change** (cheap, ~500 m+ moves) to wake up.
  - On wake, refresh the 20 nearest relevant stores (only categories that have unchecked items) and re-register fences.
  - If no list has unchecked items, register **zero** fences and stop monitoring.
- **Geofence accuracy/latency:** realistic radius 100–200 m; entry can lag by a minute or more, and dense strip malls can trigger on the store next door. Mitigation: per-store cooldown and copy that says _"looks like"_.
- **No native dwell on iOS** (Android has `DWELL`). Driving past a Walmart would trigger. Mitigation: ignore entries while moving fast (speed from the location fix > ~5 m/s), and only alert once per store per 4 hours.
- **Background run time is short** (seconds). The task must only read SQLite + fire a notification; no AI calls in the background.
- Users can kill the feature by disabling Background App Refresh / location; the app should detect that and show it in Settings.

### Libraries

- `expo-location` (already installed): `startGeofencingAsync`, `startLocationUpdatesAsync` (significant changes on iOS via low accuracy + distance filter).
- `expo-task-manager` (new): background task definitions for geofence events.
- `expo-notifications` (already installed): local notification with deep link.
- `app.json`: add `NSLocationAlwaysAndWhenInUseUsageDescription`, `UIBackgroundModes: ["location"]`, Android `ACCESS_BACKGROUND_LOCATION`. Update the location purpose strings (they currently only mention timezone).

### Data model additions

**Place** (saved or discovered store)

| Field                    | Type                            |
| ------------------------ | ------------------------------- |
| `id`                     | uuid                            |
| `name`                   | string ("Walmart Supercenter")  |
| `chain`                  | string \| null ("walmart")      |
| `storeCategories`        | JSON StoreCategory[]            |
| `latitude` / `longitude` | number                          |
| `radiusMeters`           | number (default 150)            |
| `source`                 | user \| mapkit \| google \| osm |
| `lastFetchedAt`          | datetime                        |

**LocationAlertLog** (for cooldowns / no spam)

| Field        | Type             |
| ------------ | ---------------- |
| `id`         | uuid             |
| `placeId`    | uuid             |
| `itemIds`    | JSON uuid[]      |
| `notifiedAt` | datetime         |
| `openedAt`   | datetime \| null |

### Alert rules

- One notification per store visit, 4 h cooldown per store.
- Respect quiet hours (default 9 PM–7 AM, configurable).
- Per-list toggle (`locationAlertsEnabled`), e.g. off for **Wants** by default.
- Max 3 location alerts per day unless the user opts in to more.

---

## 3. Spoken replies (TTS)

### Behaviour

- After every voice command the app speaks a short confirmation: _"Added avocados and eggs to Shopping."_ / _"Reminder set for tomorrow at 9."_
- _"What's on my shopping list?"_ reads the unchecked items.
- Toggle in Settings: **Always / Only when I used voice / Off**. Default: only when I used voice. Respect silent mode.
- Replies are **template strings** built from the parsed result, not a second AI call. Fast, free, and predictable.

### Options

| Option                        | Cost                 | Quality / notes                                                                                                                                    |
| ----------------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`expo-speech`** (on-device) | Free                 | Uses iOS/Android system voices; works offline; instant. iOS "Enhanced/Premium" voices sound good if the user has downloaded them. **Recommended.** |
| OpenAI TTS                    | Low, per character   | Natural voices; needs network + adds ~0.5–1 s latency; key needs a proxy.                                                                          |
| ElevenLabs                    | Higher, subscription | Best voices; same network/proxy concerns. Overkill for confirmations.                                                                              |

**Recommendation:** `expo-speech` now. Keep a `speak(text)` wrapper in `lib/` so a cloud voice can be swapped in later without touching screens.

### Gotchas

- Stop speech recognition before speaking, or the app hears itself.
- Set the audio session to duck other audio (music/podcasts) rather than stop it.
- Keep replies under ~8 words where possible; longer readouts (list contents) cap at ~10 items, then _"and 4 more."_

---

## Changes to the original plan

| Area         | Before                                     | After                                                                             |
| ------------ | ------------------------------------------ | --------------------------------------------------------------------------------- |
| Non-goals    | No AI chat interface                       | Still true: spoken replies are one-shot confirmations, not a conversation         |
| Backend      | None                                       | Still none for lists + TTS. Optional tiny proxy only if a paid places API is used |
| AI parsing   | Reminder only                              | Intent router (reminders + list commands + item store categories)                 |
| Permissions  | Mic, notifications, location (when in use) | + Location "Always" (only when user enables location alerts)                      |
| New packages | —                                          | `expo-task-manager`, `expo-speech`; custom MapKit module in phase 3               |

> Side note: `EXPO_PUBLIC_AI_API_KEY` is bundled into the app and readable by anyone with the binary. Fine for a personal build; if this ships publicly, the same proxy that would hold a places key should hold the AI key too.

## Implementation phases

Assumes MVP days 1–5 from the README are done first.

| Phase | Scope                                                                                                     |
| ----- | --------------------------------------------------------------------------------------------------------- |
| 1     | Lists: tables, Lists + List Detail screens, intent-router parser, add/remove/check/read/clear by voice    |
| 2     | Spoken replies with `expo-speech`, settings toggle, mic/speech audio handoff                              |
| 3     | Location alerts with **user-saved places**: Always permission flow, geofencing task, cooldowns, deep link |
| 4     | Auto store detection on iOS via MapKit POI module + chain category table + 20-region rotation             |
| 5     | (Optional) Cloud voice and/or Google Places via proxy; Android parity                                     |

### Definition of done

- [ ] "Add avocados and eggs to my shopping list" adds two items to Shopping
- [ ] "Add a circular saw to my wants list" adds to Wants, separate from Shopping
- [ ] Lists persist across restarts and work offline (except AI parsing)
- [ ] App speaks a confirmation after each voice command
- [ ] Arriving at a saved store with matching items sends one notification that opens the right list
- [ ] No location monitoring runs when no list has unchecked items

## Open questions

- Should "Wants" items ever trigger store alerts, or only appear when you open the list? (Plan: off by default.)
- Share lists with a partner later? That would bring back accounts/sync, which is a big jump; keep out for now.
- Android: is it in scope for location alerts, or iOS-only to start?
