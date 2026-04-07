/**
 * Deprecated: Nota uses **Clerk** for sign-in, not Supabase Auth.
 *
 * For local development, create a user in the [Clerk Dashboard](https://dashboard.clerk.com)
 * or use Clerk’s test accounts, then sign in through the app.
 *
 * For migrating legacy Supabase `auth.users` rows to Clerk `user_id` strings in Postgres,
 * use `supabase/scripts/backfill-clerk-user-ids.sql` after provisioning matching Clerk users.
 */
console.error(
  'bootstrap-dev-user.ts is deprecated: sign-in is Clerk-only. See the script header in apps/nota.app/scripts/bootstrap-dev-user.ts.',
);
process.exit(1);
