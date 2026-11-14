/** The form's fixed choices, shared by the page and the server. */

export const OUTPUT_TYPES = ["Ideas", "Lesson Plan"] as const;
export const LANGUAGES = ["English", "Nepali"] as const;

export type OutputType = (typeof OUTPUT_TYPES)[number];
export type Language = (typeof LANGUAGES)[number];
