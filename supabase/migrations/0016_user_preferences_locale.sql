-- Store the user's preferred UI locale; null means follow the device/system locale.

ALTER TABLE public.user_preferences
    ADD COLUMN IF NOT EXISTS locale TEXT;
