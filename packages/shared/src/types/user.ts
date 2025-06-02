import { z } from 'zod';

export const UserPlanSchema = z.enum(['free', 'minimum', 'businessman', 'pro', 'enterprise']);
export type UserPlan = z.infer<typeof UserPlanSchema>;

export const UserSchema = z.object({
  userId: z.string(),
  lineUserId: z.string(),
  displayName: z.string().optional(),
  pictureUrl: z.string().url().optional(),
  plan: UserPlanSchema.default('free'),
  planExpiresAt: z.date().optional(),
  settings: z.object({
    language: z.enum(['ja', 'en']).default('ja'),
    timezone: z.string().default('Asia/Tokyo'),
    notifications: z.object({
      reminder: z.boolean().default(true),
      daily: z.boolean().default(true),
      weekly: z.boolean().default(false),
    }),
  }),
  usage: z.object({
    apiCalls: z.number().default(0),
    lastApiCall: z.date().optional(),
    monthlyApiCalls: z.number().default(0),
  }),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type User = z.infer<typeof UserSchema>;