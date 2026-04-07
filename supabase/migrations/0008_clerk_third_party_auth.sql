-- Clerk third-party auth: user_id stores Clerk user ids (text). RLS uses auth.jwt()->>'sub'.
-- Run Supabase Dashboard: Authentication → Third-party → Clerk with your Clerk domain.
-- Backfill legacy UUID user_id values via public.supabase_clerk_account_link + UPDATE scripts.

-- Staging table for one-time Supabase Auth UUID → Clerk user id mapping (no end-user policies).
CREATE TABLE IF NOT EXISTS public.supabase_clerk_account_link (
    legacy_supabase_user_id UUID PRIMARY KEY,
    clerk_user_id TEXT NOT NULL UNIQUE
);

ALTER TABLE public.supabase_clerk_account_link ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.supabase_clerk_account_link IS
    'Admin migration: map legacy auth.users ids to Clerk user ids before cutting over RLS.';

-- Optional welcome-seed flag (replaces Supabase auth user_metadata.welcome_seeded).
ALTER TABLE public.user_preferences
    ADD COLUMN IF NOT EXISTS welcome_seeded BOOLEAN NOT NULL DEFAULT false;

-- notes: drop RLS policies and auth.users FK
DROP POLICY IF EXISTS "Users can view own notes" ON public.notes;
DROP POLICY IF EXISTS "Users can insert own notes" ON public.notes;
DROP POLICY IF EXISTS "Users can update own notes" ON public.notes;
DROP POLICY IF EXISTS "Users can delete own notes" ON public.notes;

ALTER TABLE public.notes DROP CONSTRAINT IF EXISTS notes_user_id_fkey;

ALTER TABLE public.notes
    ALTER COLUMN user_id TYPE TEXT USING user_id::text;

-- note_attachments
DROP POLICY IF EXISTS "Users can view attachments for own notes" ON public.note_attachments;
DROP POLICY IF EXISTS "Users can insert attachments for own notes" ON public.note_attachments;
DROP POLICY IF EXISTS "Users can delete own note attachments" ON public.note_attachments;
DROP POLICY IF EXISTS "Users can update own note attachments" ON public.note_attachments;

ALTER TABLE public.note_attachments DROP CONSTRAINT IF EXISTS note_attachments_user_id_fkey;

ALTER TABLE public.note_attachments
    ALTER COLUMN user_id TYPE TEXT USING user_id::text;

-- user_preferences
DROP POLICY IF EXISTS "Users can view own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON public.user_preferences;

ALTER TABLE public.user_preferences DROP CONSTRAINT IF EXISTS user_preferences_user_id_fkey;

ALTER TABLE public.user_preferences
    ALTER COLUMN user_id TYPE TEXT USING user_id::text;

-- Storage: note-pdfs policies
DROP POLICY IF EXISTS "note-pdfs select own objects" ON storage.objects;
DROP POLICY IF EXISTS "note-pdfs insert own objects" ON storage.objects;
DROP POLICY IF EXISTS "note-pdfs update own objects" ON storage.objects;
DROP POLICY IF EXISTS "note-pdfs delete own objects" ON storage.objects;

-- notes RLS (Clerk JWT sub)
CREATE POLICY "Users can view own notes"
    ON public.notes FOR SELECT
    TO authenticated
    USING ((SELECT auth.jwt()->>'sub') = user_id);

CREATE POLICY "Users can insert own notes"
    ON public.notes FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT auth.jwt()->>'sub') = user_id);

CREATE POLICY "Users can update own notes"
    ON public.notes FOR UPDATE
    TO authenticated
    USING ((SELECT auth.jwt()->>'sub') = user_id)
    WITH CHECK ((SELECT auth.jwt()->>'sub') = user_id);

CREATE POLICY "Users can delete own notes"
    ON public.notes FOR DELETE
    TO authenticated
    USING ((SELECT auth.jwt()->>'sub') = user_id);

-- note_attachments RLS
CREATE POLICY "Users can view attachments for own notes"
    ON public.note_attachments FOR SELECT
    TO authenticated
    USING (
        user_id = (SELECT auth.jwt()->>'sub')
        AND EXISTS (
            SELECT 1 FROM public.notes
            WHERE notes.id = note_attachments.note_id
            AND notes.user_id = (SELECT auth.jwt()->>'sub')
        )
    );

CREATE POLICY "Users can insert attachments for own notes"
    ON public.note_attachments FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = (SELECT auth.jwt()->>'sub')
        AND EXISTS (
            SELECT 1 FROM public.notes
            WHERE notes.id = note_attachments.note_id
            AND notes.user_id = (SELECT auth.jwt()->>'sub')
        )
    );

CREATE POLICY "Users can update own note attachments"
    ON public.note_attachments FOR UPDATE
    TO authenticated
    USING (
        user_id = (SELECT auth.jwt()->>'sub')
        AND EXISTS (
            SELECT 1 FROM public.notes
            WHERE notes.id = note_attachments.note_id
            AND notes.user_id = (SELECT auth.jwt()->>'sub')
        )
    )
    WITH CHECK (
        user_id = (SELECT auth.jwt()->>'sub')
        AND EXISTS (
            SELECT 1 FROM public.notes
            WHERE notes.id = note_attachments.note_id
            AND notes.user_id = (SELECT auth.jwt()->>'sub')
        )
    );

CREATE POLICY "Users can delete own note attachments"
    ON public.note_attachments FOR DELETE
    TO authenticated
    USING (
        user_id = (SELECT auth.jwt()->>'sub')
        AND EXISTS (
            SELECT 1 FROM public.notes
            WHERE notes.id = note_attachments.note_id
            AND notes.user_id = (SELECT auth.jwt()->>'sub')
        )
    );

-- user_preferences RLS
CREATE POLICY "Users can view own preferences"
    ON public.user_preferences FOR SELECT
    TO authenticated
    USING (user_id = (SELECT auth.jwt()->>'sub'));

CREATE POLICY "Users can insert own preferences"
    ON public.user_preferences FOR INSERT
    TO authenticated
    WITH CHECK (user_id = (SELECT auth.jwt()->>'sub'));

CREATE POLICY "Users can update own preferences"
    ON public.user_preferences FOR UPDATE
    TO authenticated
    USING (user_id = (SELECT auth.jwt()->>'sub'))
    WITH CHECK (user_id = (SELECT auth.jwt()->>'sub'));

-- Storage paths: {user_id}/{note_id}/...
CREATE POLICY "note-pdfs select own objects"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'note-pdfs'
        AND (string_to_array(name, '/'))[1] = (SELECT auth.jwt()->>'sub')
        AND EXISTS (
            SELECT 1 FROM public.notes n
            WHERE n.id::text = (string_to_array(name, '/'))[2]
            AND n.user_id = (SELECT auth.jwt()->>'sub')
        )
    );

CREATE POLICY "note-pdfs insert own objects"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'note-pdfs'
        AND (string_to_array(name, '/'))[1] = (SELECT auth.jwt()->>'sub')
        AND EXISTS (
            SELECT 1 FROM public.notes n
            WHERE n.id::text = (string_to_array(name, '/'))[2]
            AND n.user_id = (SELECT auth.jwt()->>'sub')
        )
    );

CREATE POLICY "note-pdfs update own objects"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'note-pdfs'
        AND (string_to_array(name, '/'))[1] = (SELECT auth.jwt()->>'sub')
        AND EXISTS (
            SELECT 1 FROM public.notes n
            WHERE n.id::text = (string_to_array(name, '/'))[2]
            AND n.user_id = (SELECT auth.jwt()->>'sub')
        )
    )
    WITH CHECK (
        bucket_id = 'note-pdfs'
        AND (string_to_array(name, '/'))[1] = (SELECT auth.jwt()->>'sub')
        AND EXISTS (
            SELECT 1 FROM public.notes n
            WHERE n.id::text = (string_to_array(name, '/'))[2]
            AND n.user_id = (SELECT auth.jwt()->>'sub')
        )
    );

CREATE POLICY "note-pdfs delete own objects"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'note-pdfs'
        AND (string_to_array(name, '/'))[1] = (SELECT auth.jwt()->>'sub')
        AND EXISTS (
            SELECT 1 FROM public.notes n
            WHERE n.id::text = (string_to_array(name, '/'))[2]
            AND n.user_id = (SELECT auth.jwt()->>'sub')
        )
    );
