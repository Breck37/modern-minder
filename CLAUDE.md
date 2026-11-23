# modern-minder

Voice-first personal reminder app. Expo (SDK 54) + React Native + Expo Router +
NativeWind. Local-first: expo-sqlite for storage, local notifications only.
See `README.md` for the full product spec.

## Critical: Expo owns dependency versions

Expo SDK 54 pins the versions of `react`, `react-dom`, `react-native`,
`react-native-*`, `nativewind`, `jest-expo`, `eslint-config-expo` and
`typescript`. **Never bump these by hand or with `pnpm up`.**

This repo was previously broken exactly this way: Dependabot auto-merged
`react-native` 0.81.5 -> 0.88.1 under SDK 54, which made `jest-expo` unable to
resolve `react-native/jest-preset` and took the whole test suite down. The
lockfile was also corrupted by concurrent squash-merges (590 duplicate keys).

- To change any SDK-managed package: `npx expo install --fix`
- To check drift: `npx expo-doctor` (CI enforces this)
- `.github/dependabot.yml` ignores these packages. Keep it that way.

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
