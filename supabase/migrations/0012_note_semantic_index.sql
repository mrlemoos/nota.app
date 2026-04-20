-- Semantic search index: one row per note with pgvector embedding (OpenAI-compatible /v1/embeddings).
-- Dimension must match NOTA_SEMANTIC_EMBEDDINGS_DIMENSIONS and the active model (default 1536).
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.note_semantic_index (
    note_id UUID PRIMARY KEY REFERENCES public.notes(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    embedding vector(1536) NOT NULL,
    search_document TEXT NOT NULL DEFAULT '',
    content_hash TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_note_semantic_index_user_id
    ON public.note_semantic_index (user_id);

CREATE INDEX IF NOT EXISTS idx_note_semantic_index_embedding_hnsw
    ON public.note_semantic_index
    USING hnsw (embedding vector_cosine_ops);

ALTER TABLE public.note_semantic_index ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own semantic index rows"
    ON public.note_semantic_index FOR SELECT
    TO authenticated
    USING (user_id = (auth.jwt()->>'sub'));

CREATE POLICY "Users can insert own semantic index rows"
    ON public.note_semantic_index FOR INSERT
    TO authenticated
    WITH CHECK (user_id = (auth.jwt()->>'sub'));

CREATE POLICY "Users can update own semantic index rows"
    ON public.note_semantic_index FOR UPDATE
    TO authenticated
    USING (user_id = (auth.jwt()->>'sub'))
    WITH CHECK (user_id = (auth.jwt()->>'sub'));

CREATE POLICY "Users can delete own semantic index rows"
    ON public.note_semantic_index FOR DELETE
    TO authenticated
    USING (user_id = (auth.jwt()->>'sub'));

COMMENT ON TABLE public.note_semantic_index IS
    'Per-note embedding for semantic search; rebuilt by nota-server (OpenAI-compatible embeddings API).';

-- Called by nota-server (service role) for vector similarity; not exposed to browsers.
CREATE OR REPLACE FUNCTION public.match_note_semantic_index(
    p_user_id TEXT,
    p_query_embedding vector(1536),
    p_match_count INT DEFAULT 80
)
RETURNS TABLE (note_id UUID, distance DOUBLE PRECISION)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT s.note_id,
           (s.embedding <=> p_query_embedding)::double precision AS distance
    FROM public.note_semantic_index s
    WHERE s.user_id = p_user_id
    ORDER BY s.embedding <=> p_query_embedding
    LIMIT LEAST(GREATEST(p_match_count, 1), 500);
$$;

REVOKE ALL ON FUNCTION public.match_note_semantic_index(TEXT, vector(1536), INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.match_note_semantic_index(TEXT, vector(1536), INT) TO service_role;
