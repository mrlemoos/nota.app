-- Optional due date / deadline flags per note
ALTER TABLE notes
  ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS is_deadline BOOLEAN NOT NULL DEFAULT false;
