-- One-time backfill after populating public.supabase_clerk_account_link.
-- Replace UUID-shaped user_id on notes, note_attachments, user_preferences with Clerk ids.
-- Run from SQL editor as a privileged role after Clerk user import and link rows exist.

-- Example: insert links (run from app/script or CSV import)
-- INSERT INTO public.supabase_clerk_account_link (legacy_supabase_user_id, clerk_user_id)
-- VALUES ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'user_2abc...');

BEGIN;

UPDATE public.notes n
SET user_id = m.clerk_user_id
FROM public.supabase_clerk_account_link m
WHERE n.user_id = m.legacy_supabase_user_id::text;

UPDATE public.note_attachments a
SET user_id = m.clerk_user_id
FROM public.supabase_clerk_account_link m
WHERE a.user_id = m.legacy_supabase_user_id::text;

UPDATE public.user_preferences p
SET user_id = m.clerk_user_id
FROM public.supabase_clerk_account_link m
WHERE p.user_id = m.legacy_supabase_user_id::text;

COMMIT;

-- Optional: drop staging table after verification
-- DROP TABLE public.supabase_clerk_account_link;
