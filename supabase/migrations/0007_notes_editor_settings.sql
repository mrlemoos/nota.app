-- Per-note editor layout (font, column width); empty object = app defaults
ALTER TABLE notes
ADD COLUMN IF NOT EXISTS editor_settings JSONB NOT NULL DEFAULT '{}'::jsonb;
