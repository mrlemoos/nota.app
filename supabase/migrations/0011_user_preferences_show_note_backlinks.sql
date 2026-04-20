-- Account-wide toggle for backlinks panel below the note editor (default: visible).
ALTER TABLE user_preferences
    ADD COLUMN IF NOT EXISTS show_note_backlinks BOOLEAN NOT NULL DEFAULT true;
