import { z } from 'zod';

export const ScheduleTypeSchema = z.enum(['event', 'task', 'reminder']);
export type ScheduleType = z.infer<typeof ScheduleTypeSchema>;

export const ScheduleStatusSchema = z.enum(['pending', 'confirmed', 'completed', 'cancelled']);
export type ScheduleStatus = z.infer<typeof ScheduleStatusSchema>;

export const RecurrenceSchema = z.object({
  frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  interval: z.number().default(1),
  endDate: z.date().optional(),
  daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
  dayOfMonth: z.number().min(1).max(31).optional(),
});

export type Recurrence = z.infer<typeof RecurrenceSchema>;

export const ScheduleSchema = z.object({
  scheduleId: z.string(),
  userId: z.string(),
  groupId: z.string().optional(),
  type: ScheduleTypeSchema,
  title: z.string(),
  description: z.string().optional(),
  startTime: z.date(),
  endTime: z.date().optional(),
  allDay: z.boolean().default(false),
  location: z.string().optional(),
  status: ScheduleStatusSchema.default('pending'),
  recurrence: RecurrenceSchema.optional(),
  reminders: z.array(z.object({
    type: z.enum(['notification', 'email']),
    minutesBefore: z.number(),
  })).optional(),
  participants: z.array(z.object({
    userId: z.string(),
    status: z.enum(['pending', 'accepted', 'declined']),
  })).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Schedule = z.infer<typeof ScheduleSchema>;