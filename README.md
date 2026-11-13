# Kayro Farms (Expo app)

Mobile farm records for the Kayro Farms manager and owner. The app uses Expo Router and Supabase Auth with the role stored in `profiles`.

## Run it
1. Install Node 20+ and the **Expo Go** app on your phone (or an Android emulator).
2. In this folder: `npm install`
3. `npx expo install --check` (lets Expo fix any package version drift)
4. Copy `.env.example` to `.env.local` and fill in your Supabase URL and **anon public** key. Never use the service_role key.
5. `npx expo start -c`, then scan the QR code with Expo Go.

## Manager workflows

- Record opening stock and receipts, sales (including customer credit and partial deposits), customer payments, expenses, activities and activity inputs, stock losses, and livestock batches.
- Review recent records, sales, collected payments, expenses, and opening/closing quantities in the daily summary, then submit the day to the owner.
- Review active product prices, product quantities, low-stock thresholds, and poultry batches.

## Owner workflows

- Review farm overview, submitted day records, and pending correction requests.
- Review today's sales and expenses and customer credit balances.
- Add products using an existing category and active unit; update selling prices and low-stock thresholds.
- Switch into Record mode to enter farm records.

## Supabase database setup

The mobile app constants match the supplied Supabase enums: `movement_type` (`opening`, `received`, `sold`, `used`, `lost`, `adjustment`), `payment_type` (`cash`, `credit`, `part_paid`), `payment_method` (`cash`, `mobile_money`, `bank`), `source_type` (`own_harvest`, `supplier`, `purchase`), `day_status` (`open`, `submitted`), `request_status` (`pending`, `approved`, `rejected`), `user_role` (`manager`, `admin`), and `item_category` (`livestock`, `produce`, `feed`, `manure`, `chemical`, `other`).

Apply `supabase/migrations/20261113000100_farm_atomic_entries_and_balances.sql` in the Supabase SQL Editor after reviewing it against the live schema. It adds role-checked RPCs so sale/activity/receipt/loss records and their trigger-created stock movements are saved atomically, a manager-safe daily closeout operation, and RLS-safe stock and batch balance summaries. It also seeds any legacy batch starting count that has no opening/receipt movement into the stock ledger. Do not manually create a second movement for a sale or activity input; the existing triggers create those movements.

Before applying, confirm the helper functions and live definitions still match those supplied (`is_staff`, `can_write_date`, `farm_today`) and that the `stock_purchase` expense category exists and is active. The migration does not change existing RLS policies. Use the anon key in the app, never the Supabase `service_role` key.

## Quick verification

- `npx tsc --noEmit`
- `npx expo export --platform android --no-bytecode --output-dir .expo/export-check`

## Notes
- Roles come from the server `profiles` table. Row Level Security is the real protection; the app routing is only convenience.
- Expo Go is fine for now. Background sync and some native modules (Step 4 onward) will need a development build (`eas build --profile development` or `npx expo run:android`).
- Product categories and units must be available in Supabase before the owner can add products.
