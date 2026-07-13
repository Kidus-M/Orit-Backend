import { z } from "zod";

export const fourDigitPinSchema = z
  .string()
  .regex(/^\d{4}$/, "PIN must contain exactly 4 numbers");
