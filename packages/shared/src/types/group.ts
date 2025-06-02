import { z } from 'zod';

export const GroupTypeSchema = z.enum(['family', 'friends', 'work', 'other']);
export type GroupType = z.infer<typeof GroupTypeSchema>;

export const GroupMemberRoleSchema = z.enum(['owner', 'admin', 'member']);
export type GroupMemberRole = z.infer<typeof GroupMemberRoleSchema>;

export const GroupMemberSchema = z.object({
  userId: z.string(),
  role: GroupMemberRoleSchema,
  joinedAt: z.date(),
});

export type GroupMember = z.infer<typeof GroupMemberSchema>;

export const GroupSchema = z.object({
  groupId: z.string(),
  lineGroupId: z.string().optional(),
  name: z.string(),
  type: GroupTypeSchema.default('other'),
  description: z.string().optional(),
  pictureUrl: z.string().url().optional(),
  members: z.array(GroupMemberSchema),
  settings: z.object({
    allowGuestWarikan: z.boolean().default(true),
    autoReminder: z.boolean().default(true),
    defaultCurrency: z.string().default('JPY'),
  }),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Group = z.infer<typeof GroupSchema>;