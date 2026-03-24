-- Private bucket for per-note PDF attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'note-pdfs',
    'note-pdfs',
    false,
    26214400,
    ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Metadata for PDF files stored in note-pdfs
CREATE TABLE IF NOT EXISTS note_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID NOT NULL REFERENCES notes (id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    filename TEXT NOT NULL,
    content_type TEXT NOT NULL DEFAULT 'application/pdf',
    size_bytes BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT note_attachments_storage_path_key UNIQUE (storage_path)
);

CREATE INDEX IF NOT EXISTS idx_note_attachments_note_created
    ON note_attachments (note_id, created_at DESC);

ALTER TABLE note_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attachments for own notes"
    ON note_attachments FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM notes
            WHERE notes.id = note_attachments.note_id
            AND notes.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert attachments for own notes"
    ON note_attachments FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM notes
            WHERE notes.id = note_attachments.note_id
            AND notes.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own note attachments"
    ON note_attachments FOR DELETE
    TO authenticated
    USING (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM notes
            WHERE notes.id = note_attachments.note_id
            AND notes.user_id = auth.uid()
        )
    );

-- Storage path: {user_id}/{note_id}/{uuid}.pdf
CREATE POLICY "note-pdfs select own objects"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'note-pdfs'
        AND (string_to_array(name, '/'))[1] = auth.uid()::text
        AND EXISTS (
            SELECT 1 FROM public.notes n
            WHERE n.id::text = (string_to_array(name, '/'))[2]
            AND n.user_id = auth.uid()
        )
    );

CREATE POLICY "note-pdfs insert own objects"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'note-pdfs'
        AND (string_to_array(name, '/'))[1] = auth.uid()::text
        AND EXISTS (
            SELECT 1 FROM public.notes n
            WHERE n.id::text = (string_to_array(name, '/'))[2]
            AND n.user_id = auth.uid()
        )
    );

CREATE POLICY "note-pdfs update own objects"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'note-pdfs'
        AND (string_to_array(name, '/'))[1] = auth.uid()::text
        AND EXISTS (
            SELECT 1 FROM public.notes n
            WHERE n.id::text = (string_to_array(name, '/'))[2]
            AND n.user_id = auth.uid()
        )
    )
    WITH CHECK (
        bucket_id = 'note-pdfs'
        AND (string_to_array(name, '/'))[1] = auth.uid()::text
        AND EXISTS (
            SELECT 1 FROM public.notes n
            WHERE n.id::text = (string_to_array(name, '/'))[2]
            AND n.user_id = auth.uid()
        )
    );

CREATE POLICY "note-pdfs delete own objects"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'note-pdfs'
        AND (string_to_array(name, '/'))[1] = auth.uid()::text
        AND EXISTS (
            SELECT 1 FROM public.notes n
            WHERE n.id::text = (string_to_array(name, '/'))[2]
            AND n.user_id = auth.uid()
        )
    );
