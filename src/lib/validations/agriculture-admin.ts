import { z } from "zod";

import {
  agricultureAccountStatuses,
  agricultureAccountTypes,
} from "@/lib/agriculture/account-types";

export const agricultureUserUpdateSchema = z.strictObject({
  userId: z.string().trim().min(1).max(64),
  accountType: z.enum(agricultureAccountTypes),
  status: z.enum(agricultureAccountStatuses),
});

export const agricultureUserCreateSchema = z.strictObject({
  name: z.string().trim().min(2).max(150),
  email: z.email().transform((value) => value.trim().toLowerCase()),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+ ()-]{7,30}$/),
  accountType: z.enum(agricultureAccountTypes),
});

export const agricultureUserDeleteSchema = z.strictObject({
  userId: z.string().trim().min(1).max(64),
});

export const agriculturePanelStatusSchema = z.strictObject({
  panelId: z.coerce.number().int().positive(),
  isActive: z.enum(["true", "false"]).transform((value) => value === "true"),
});

export const agriculturePanelUpdateSchema = z.strictObject({
  panelId: z.coerce.number().int().positive(),
  titleBn: z.string().trim().min(2).max(120),
  titleEn: z.string().trim().min(2).max(120),
  descriptionBn: z.string().trim().min(2).max(1200),
  descriptionEn: z.string().trim().min(2).max(1200),
});
