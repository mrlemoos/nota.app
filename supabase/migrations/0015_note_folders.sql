-- Folders organise notes; notes.folder_id null = root (no UI label).

CREATE TABLE IF NOT EXISTS public.folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_folders_user_name
    ON public.folders (user_id, lower(name));

ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own folders"
    ON public.folders FOR SELECT
    TO authenticated
    USING ((SELECT auth.jwt()->>'sub') = user_id);

CREATE POLICY "Users can insert own folders"
    ON public.folders FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT auth.jwt()->>'sub') = user_id);

CREATE POLICY "Users can update own folders"
    ON public.folders FOR UPDATE
    TO authenticated
    USING ((SELECT auth.jwt()->>'sub') = user_id)
    WITH CHECK ((SELECT auth.jwt()->>'sub') = user_id);

CREATE POLICY "Users can delete own folders"
    ON public.folders FOR DELETE
    TO authenticated
    USING ((SELECT auth.jwt()->>'sub') = user_id);

DROP TRIGGER IF EXISTS update_folders_updated_at ON public.folders;
CREATE TRIGGER update_folders_updated_at
    BEFORE UPDATE ON public.folders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.notes
    ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.folders(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_notes_user_folder_updated
    ON public.notes (user_id, folder_id, updated_at DESC);

ALTER TABLE public.user_preferences
    ADD COLUMN IF NOT EXISTS delete_empty_folders BOOLEAN NOT NULL DEFAULT true;
