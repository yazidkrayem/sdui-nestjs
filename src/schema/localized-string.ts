import { z } from 'zod';

/**
 * Bilingual string for user-visible text props.
 * Accepts both the new `{ en, ar }` object and legacy plain strings stored
 * before Session 6 migrated all text props to LocalizedString.
 * Flutter uses device locale; falls back to `en`; the `getLocalized()` helper
 * on the frontend handles both shapes transparently.
 */
export const LocalizedStringSchema = z.union([
  z.object({
    en: z.string().min(1, 'English text is required'),
    ar: z.string().min(1, 'Arabic text is required'),
  }),
  z.string().min(1), // legacy: plain string stored before Session 6
]);

export type LocalizedString = z.infer<typeof LocalizedStringSchema>;
