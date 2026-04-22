-- User-controlled toggle for Semantic Search in the command palette (default: enabled).
ALTER TABLE user_preferences
    ADD COLUMN IF NOT EXISTS semantic_search_enabled BOOLEAN NOT NULL DEFAULT true;
