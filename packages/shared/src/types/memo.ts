import { z } from 'zod';

// Personal Memo
export const PersonalMemoSchema = z.object({
  memoId: z.string(),
  userId: z.string(),
  title: z.string(),
  content: z.string(),
  tags: z.array(z.string()).default([]),
  isArchived: z.boolean().default(false),
  aiSummary: z.string().optional(),
  suggestedTags: z.array(z.string()).optional(),
  parentPageId: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type PersonalMemo = z.infer<typeof PersonalMemoSchema>;

// Memo Page (for hierarchical structure)
export const MemoPageSchema = z.object({
  pageId: z.string(),
  userId: z.string(),
  title: z.string(),
  parentPageId: z.string().optional(),
  order: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type MemoPage = z.infer<typeof MemoPageSchema>;

// Shared Memo
export const SharedMemoTypeSchema = z.enum(['meeting', 'outing', 'custom']);
export type SharedMemoType = z.infer<typeof SharedMemoTypeSchema>;

export const SharedMemoStatusSchema = z.enum(['active', 'archived']);
export type SharedMemoStatus = z.infer<typeof SharedMemoStatusSchema>;

export const SharedMemoEditorSchema = z.object({
  userId: z.string(),
  displayName: z.string(),
  addedAt: z.date(),
  lastEditedAt: z.date().optional(),
});

export type SharedMemoEditor = z.infer<typeof SharedMemoEditorSchema>;

export const SharedMemoSchema = z.object({
  memoId: z.string(),
  groupId: z.string(),
  createdBy: z.string(),
  title: z.string(),
  content: z.string(),
  type: SharedMemoTypeSchema,
  template: z.string().optional(),
  readableUserIds: z.array(z.string()),
  editors: z.array(SharedMemoEditorSchema),
  status: SharedMemoStatusSchema.default('active'),
  aiStructuredContent: z.record(z.string(), z.any()).optional(),
  lastEditedBy: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type SharedMemo = z.infer<typeof SharedMemoSchema>;

// Memo templates
export const MEMO_TEMPLATES = {
  meeting: {
    title: '会議メモ',
    sections: [
      { key: 'date', label: '日時', type: 'datetime' },
      { key: 'attendees', label: '参加者', type: 'list' },
      { key: 'agenda', label: '議題', type: 'list' },
      { key: 'decisions', label: '決定事項', type: 'list' },
      { key: 'todos', label: 'TODO', type: 'list' },
      { key: 'nextMeeting', label: '次回予定', type: 'text' },
    ],
  },
  outing: {
    title: 'お出かけメモ',
    sections: [
      { key: 'destination', label: '目的地', type: 'text' },
      { key: 'date', label: '日程', type: 'date' },
      { key: 'participants', label: '参加者', type: 'list' },
      { key: 'transportation', label: '交通手段', type: 'text' },
      { key: 'budget', label: '予算', type: 'number' },
      { key: 'items', label: '持ち物', type: 'list' },
      { key: 'schedule', label: 'スケジュール', type: 'list' },
      { key: 'notes', label: '備考', type: 'text' },
    ],
  },
} as const;