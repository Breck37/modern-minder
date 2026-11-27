# modern-minder

Voice-first personal reminder app. Expo (SDK 58) + React Native + Expo Router +
NativeWind. Local-first: expo-sqlite for storage, local notifications only.
See `README.md` for the full product spec.

## Critical: Expo owns dependency versions

The Expo SDK pins the versions of `expo-*`, `react`, `react-dom`,
`react-native`, `react-native-*`, `jest-expo`, `eslint-config-expo` and
`typescript`. **Never bump these by hand or with `pnpm up`.**

This repo was previously broken exactly this way: Dependabot auto-merged
`react-native` 0.81 -> 0.88 while Expo stayed on SDK 54, which made `jest-expo`
unable to resolve `react-native/jest-preset` and took the test suite down. The
lockfile was also corrupted by concurrent squash-merges (duplicate keys). Fixed
by upgrading to SDK 58, which ships React Native 0.88.

- To upgrade the SDK: `npx expo install expo@<sdk> --fix`
- To check drift: `npx expo-doctor` (CI reports it)
- `.github/dependabot.yml` ignores minor/major bumps of these packages, and
  auto-merge only takes patch updates. Keep it that way.

Other pins that are not SDK-managed but must stay put:

- `tailwindcss` stays on v3: NativeWind 4 only supports Tailwind CSS v3.
- `eslint` stays on v9: `eslint-plugin-react` (via `eslint-config-expo`)
  crashes on ESLint 10.

## Commands

```bash
pnpm install          # pnpm only - do not use npm or yarn
pnpm start            # Expo dev server
pnpm web              # web preview (works in a cloud session)
pnpm lint
pnpm typecheck
pnpm test
pnpm format           # prettier --write .
```

Node 22, pnpm 10.28.2 (pinned via `packageManager`).

## Conventions

- **Styling is Tailwind via NativeWind** — use `className`, not `StyleSheet`.
  `prettier-plugin-tailwindcss` sorts classes; run `pnpm format` before committing.
- Routing is file-based via Expo Router under `app/`.
  Route groups: `app/(onboarding)/`, `app/(app)/`.
- State: `zustand` in `store/`. DB access in `db/`. Shared helpers in `lib/`.
- TypeScript strict; no `any` without a comment explaining why.

## Working remotely (cloud sessions)

Native iOS/Android builds are **not** possible in a cloud Linux container —
no Xcode, no simulator. What does work here:

- editing, `pnpm lint` / `typecheck` / `test`
- `pnpm web` for a browser preview that can be screenshotted
- device builds via **EAS Build** (`eas.json` is configured), which runs on
  Expo's hosted macOS machines and needs no local laptop

Always commit and push before the session ends — containers are ephemeral.

## Known quirk: expo-doctor in cloud sessions

Two `expo-doctor` checks (Expo config schema, React Native Directory) call
external APIs with Node's `fetch`, which does not honour the cloud container's
HTTPS proxy, so they report `ENOTFOUND exp.host` here. The host is reachable
(`curl https://exp.host` returns 200) — it is a proxy-awareness quirk, not a
project fault. The check that matters, "packages match versions required by
installed Expo SDK", runs offline and must stay green.
