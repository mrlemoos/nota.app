import { z } from 'zod';

export const updateUserPreferencesFormSchema = z.object({
  intent: z.literal('updateUserPreferences'),
  openTodaysNoteShortcut: z.enum(['true', 'false']).transform((v) => v === 'true'),
});

export type UpdateUserPreferencesFormInput = z.infer<
  typeof updateUserPreferencesFormSchema
>;
