import { z } from "zod";

export const examSchema = z
  .object({
    title: z.string().min(1, "Title is required").max(200),
    description: z.string().max(2000).default(""),
    durationMinutes: z.coerce.number().int().min(1).max(480),
    startAt: z.coerce.date(),
    endAt: z.coerce.date(),
  })
  .refine((data) => data.endAt > data.startAt, {
    message: "End date must be after start date",
    path: ["endAt"],
  });

export const optionSchema = z.object({
  text: z.string().min(1, "Option text is required").max(500),
  isCorrect: z.boolean().default(false),
});

export const questionSchema = z
  .object({
    text: z.string().min(1, "Question text is required").max(2000),
    type: z.enum(["SINGLE", "MULTIPLE", "SHORT_TEXT"]),
    points: z.coerce.number().int().min(1).max(100),
    options: z.array(optionSchema).min(1, "At least 1 option is required").max(10),
  })
  .refine((data) => data.type === "SHORT_TEXT" || data.options.length >= 2, {
    message: "At least 2 options are required",
    path: ["options"],
  })
  .refine(
    (data) => data.type === "SHORT_TEXT" || data.options.some((o) => o.isCorrect),
    {
      message: "At least one option must be marked correct",
      path: ["options"],
    },
  )
  .refine(
    (data) =>
      data.type !== "SINGLE" ||
      data.options.filter((o) => o.isCorrect).length === 1,
    {
      message: "Single-choice questions must have exactly one correct option",
      path: ["options"],
    },
  )
  .transform((data) => ({
    ...data,
    options:
      data.type === "SHORT_TEXT"
        ? data.options.map((o) => ({ ...o, isCorrect: true }))
        : data.options,
  }));
