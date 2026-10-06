# Quit

Off weed. A private, local-first quit tracker for one person.

Everything lives in a SQLite database on the phone. No account, no server, no
email, no social anything. Nothing leaves the device unless you export it.

## What it does

- **Day count** — current run, best run, days since the quit, money not spent.
- **Craving now** — rate it, HALT check (hungry / angry / lonely / tired), pick a
  tool, ten-minute timer, re-rate. You watch the number drop.
- **Check in** — one screen, under a minute, every night: sleep, appetite, mood,
  anxiety, irritability, energy, worst craving, body flags, meals, nicotine,
  drinks, one good thing. The full 19-item Cannabis Withdrawal Scale is behind
  a disclosure for weekly use.
- **Where you are** — the withdrawal timeline for a heavy high-THC vape user,
  day by day, with what to expect and what to focus on.
- **If → then** — pre-decided moves for the known situations (bars, the ex,
  can't sleep, can't eat, someone passes a pen).
- **Milestones** — day 1, 3, 7, 14, 30, 60, 90 with rewards decided up front.
- **People & lines** — parents, therapist, doctor, and 24/7 Canadian crisis
  lines, one tap to call or text.
- **Reminders** — local notifications: evening check-in, morning line.

The plan itself is in [`docs/PLAN.md`](docs/PLAN.md). The research behind every
number is in [`docs/RESEARCH.md`](docs/RESEARCH.md).

## Run it

```
npm install
npx expo start
```

Scan the QR code with Expo Go, or build a development client
(`npx expo run:ios`) — local notifications are more reliable in a dev build
than in Expo Go.

```
npm test          # vitest, pure logic only
npm run typecheck # tsc --noEmit (strict)
```

## Layout

```
src/app/            Expo Router screens: index (home), setup, craving, checkin, slip, settings
src/components/     ui primitives + quit widgets (Chip, ScaleRow, Stepper, TrendBars)
src/constants/      quit.ts (scale items, phases, seed toolkit, crisis lines), theme.ts
src/lib/db/         SQLite schema + data access (expo-sqlite)
src/lib/hooks/      TanStack Query hooks over the db layer
src/lib/quitLogic.ts  pure derived values, unit tested
src/lib/reminders.ts  local notifications
docs/               PLAN.md, RESEARCH.md
```

Not medical advice. Cannabis withdrawal is not dangerous, but worsening
depression, thoughts of self-harm, new paranoia, or vomiting you can't stop
need a doctor the same day. In Canada: call or text 988.
