# Kayro Farms (Expo app)

Step 2 + 3: Supabase login and role routing. Manager sees Record mode, owner (admin) sees Owner mode and can switch to Record mode.

## Run it
1. Install Node 20+ and the **Expo Go** app on your phone (or an Android emulator).
2. In this folder: `npm install`
3. `npx expo install --check` (lets Expo fix any package version drift)
4. Copy `.env.example` to `.env.local` and fill in your Supabase URL and **anon public** key. Never use the service_role key.
5. `npx expo start -c`, then scan the QR code with Expo Go.

## Test checklist
- Sign in as the manager: Manager tabs (Home, Stock, Record, Summary, Profile). Profile shows "Role from server: manager" and the product count.
- Sign out, sign in as the owner: Owner tabs (Overview, Approvals, Stock, Money, More). More > "Switch to Record mode" opens the manager tabs; Profile > "Back to owner view" returns.
- Wrong password: an error message, no crash.
- Set a user's `active` to false in Supabase: "This account is not active yet."
- Close and reopen the app: you stay signed in.

## Notes
- Roles come from the server `profiles` table. Row Level Security is the real protection; the app routing is only convenience.
- Expo Go is fine for now. Background sync and some native modules (Step 4 onward) will need a development build (`eas build --profile development` or `npx expo run:android`).
- Placeholder numbers (MWK 0) are replaced as the recording screens are built.
