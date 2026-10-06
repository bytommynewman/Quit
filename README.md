# Quit

Off weed. A private quit tracker for one person, on every device he owns.

One account, one set of data, synced through a private Supabase project you
control. Phone, laptop and Mac mini all show the same day count. No email is
ever sent (the email is only a username), no social anything, no AI.

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

## One-time setup (about 5 minutes, once)

1. **Create the Supabase project.** https://supabase.com/dashboard → **New
   project**. Name it `quit`, pick a strong database password (save it in your
   password manager; you will rarely need it), region Canada (Central) or US
   East. Wait for it to finish provisioning.
2. **Create the tables.** Left sidebar → **SQL Editor** → **+ New query**.
   Paste the whole of [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
   You should see "Success. No rows returned."
3. **Turn off confirmation emails.** Left sidebar → **Authentication** →
   **Sign In / Providers** → **Email** → switch **Confirm email** off → Save.
   (Otherwise sign-up sends you a verification email. This app never emails
   you.)
4. **Get the two keys.** Left sidebar → **Project Settings** (gear) → **API**
   (or the green **Connect** button at the top → **App Frameworks**). Copy
   **Project URL** and the **anon / public** key.
5. **Tell the app.** In this folder, copy `.env.example` to `.env` and paste
   the two values in. Do this on every machine you run it from (or commit
   `.env` to this private repo — the anon key is public by design).

Then on first launch tap **Create account**, pick an email and password, and
you are in. Use the same login on every device.

## Run it

```
npm install
npx expo start          # phone: scan the QR with Expo Go
npx expo start --web    # laptop / Mac mini: opens in the browser
```

Reminders are phone-only. They are more reliable in a development build
(`npx expo run:ios`) than in Expo Go.

```
npm test          # vitest, pure logic only
npm run typecheck # tsc --noEmit (strict)
```

## Layout

```
src/app/            Expo Router screens: index (home), setup, craving, checkin, slip, settings
src/components/     ui primitives + quit widgets (Chip, ScaleRow, Stepper, TrendBars)
src/constants/      quit.ts (scale items, phases, seed toolkit, crisis lines), theme.ts
src/lib/api/        Supabase data access (one function per operation)
src/lib/hooks/      TanStack Query hooks over the api layer
src/lib/supabase.ts Supabase client (session in iOS Keychain; localStorage on web)
src/lib/auth.tsx    session context
supabase/schema.sql the database: tables, row-level security, triggers
src/lib/quitLogic.ts  pure derived values, unit tested
src/lib/reminders.ts  local notifications
docs/               PLAN.md, RESEARCH.md
```

Not medical advice. Cannabis withdrawal is not dangerous, but worsening
depression, thoughts of self-harm, new paranoia, or vomiting you can't stop
need a doctor the same day. In Canada: call or text 988.
