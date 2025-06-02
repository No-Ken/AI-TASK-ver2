import { z } from 'zod';

export const WarikanStatusSchema = z.enum(['active', 'settled', 'cancelled']);
export type WarikanStatus = z.infer<typeof WarikanStatusSchema>;

export const WarikanMemberSchema = z.object({
  userId: z.string(),
  displayName: z.string(),
  amount: z.number(),
  isPaid: z.boolean().default(false),
  paidAt: z.date().optional(),
});

export type WarikanMember = z.infer<typeof WarikanMemberSchema>;

export const WarikanSchema = z.object({
  warikanId: z.string(),
  createdBy: z.string(),
  groupId: z.string().optional(),
  title: z.string(),
  totalAmount: z.number(),
  currency: z.string().default('JPY'),
  members: z.array(WarikanMemberSchema),
  status: WarikanStatusSchema.default('active'),
  description: z.string().optional(),
  receiptUrl: z.string().url().optional(),
  settledAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Warikan = z.infer<typeof WarikanSchema>;