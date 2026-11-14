import { LANGUAGES, OUTPUT_TYPES, type Language, type OutputType } from "./config.ts";

export const DEFAULT_LOCATION = "General Classroom Setting";

/** Longest accepted value per field, so one request cannot be arbitrarily large. */
export const MAX_FIELD = 500;
export const MAX_OUTCOMES = 2000;

/** The form exactly as typed. */
export type FormInput = {
  topic: string;
  outcomes: string;
  age_group: string;
  output_type: string;
  time_minutes: string;
  location: string;
  language: string;
};

/** The form checked and normalised. */
export type GenerationRequest = {
  topic: string;
  outcomes: string[];
  ageGroup: string;
  outputType: OutputType;
  timeMinutes: number | null;
  location: string;
  language: Language;
};

/** The form is not filled in correctly; the message is written for the person at the keyboard. */
export class InputError extends Error {}

/** Split comma-separated learning outcomes, dropping blanks and surrounding spaces. */
export function parseOutcomes(text: string): string[] {
  return text
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function text(value: unknown, max: number): string {
  if (value == null) return "";
  if (typeof value !== "string") throw new InputError("The form was sent in an unexpected shape. Reload the page.");
  if (value.length > max) throw new InputError(`A field is too long (the limit is ${max} characters).`);
  return value;
}

/** Check the form. Class time is only needed (and only checked) for a lesson plan: the ideas prompt does not use it. */
export function validate(raw: Partial<Record<keyof FormInput, unknown>>): GenerationRequest {
  const topic = text(raw.topic, MAX_FIELD).trim();
  const ageGroup = text(raw.age_group, MAX_FIELD).trim();
  const outcomes = parseOutcomes(text(raw.outcomes, MAX_OUTCOMES));
  const outputType = text(raw.output_type, 50);
  const language = text(raw.language, 50) || "English";
  const timeText = text(raw.time_minutes, 10).trim();
  const location = text(raw.location, MAX_FIELD).trim();

  if (!topic || outcomes.length === 0 || !ageGroup) throw new InputError("Please fill in all fields.");
  if (!(OUTPUT_TYPES as readonly string[]).includes(outputType)) {
    throw new InputError(`Choose an output type: ${OUTPUT_TYPES.join(" or ")}.`);
  }
  if (!(LANGUAGES as readonly string[]).includes(language)) {
    throw new InputError(`Choose a language: ${LANGUAGES.join(" or ")}.`);
  }

  let timeMinutes: number | null = null;
  if (outputType === "Lesson Plan") {
    if (!timeText) throw new InputError("Please provide a value for class time.");
    if (!/^[+-]?\d+$/.test(timeText)) throw new InputError("Time must be a valid integer number.");
    timeMinutes = Number.parseInt(timeText, 10);
    if (timeMinutes <= 0) throw new InputError("Time must be greater than zero.");
  }

  return {
    topic,
    outcomes,
    ageGroup,
    outputType: outputType as OutputType,
    timeMinutes,
    location: location || DEFAULT_LOCATION,
    language: language as Language,
  };
}
