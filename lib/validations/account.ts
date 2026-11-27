import { z } from "zod";

export const profileSchema = z.strictObject({
  name: z.string().trim().min(3).max(100),
  image: z.union([
    z.url({ protocol: /^https$/ }).max(2048).refine((value) => {
      const url = new URL(value);
      return !url.username && !url.password;
    }, "Use an HTTPS image URL without credentials"),
    z.null(),
  ]),
});

export const passwordSchema = z.strictObject({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(12).max(128),
  confirmation: z.string().max(128),
}).refine((data) => data.newPassword === data.confirmation, "Passwords must match")
  .refine((data) => data.currentPassword !== data.newPassword, "Choose a different password");

export const personalSettingsSchema = z.strictObject({
  theme: z.enum(["light", "dark", "system"]),
  alertNotifications: z.boolean(),
});

export const systemSettingsSchema = z.strictObject({
  dashboardRange: z.enum(["7", "30", "90"]),
  positiveDetectionAlerts: z.boolean(),
  overdueTaskAlerts: z.boolean(),
});

export type PersonalSettings = z.infer<typeof personalSettingsSchema>;
export type SystemSettings = z.infer<typeof systemSettingsSchema>;


export const personalSettingsPatchSchema = personalSettingsSchema.partial().refine(
  (value) => Object.keys(value).length > 0, "Provide at least one preference",
);

export const systemSettingsPatchSchema = systemSettingsSchema.partial().refine(
  (value) => Object.keys(value).length > 0, "Provide at least one setting",
);
