import { z } from 'zod';

// Personal Memo Template Categories
export const PersonalMemoTemplateCategorySchema = z.enum(['business', 'private']);
export type PersonalMemoTemplateCategory = z.infer<typeof PersonalMemoTemplateCategorySchema>;

// Personal Memo Template Types
export const PersonalMemoTemplateSchema = z.enum([
  // ビジネス用
  'meeting_note', 'project_plan', 'task_list', 'idea_business', 'client_memo', 'report',
  // プライベート用
  'daily_diary', 'shopping_list', 'health_record', 'study_note', 'idea_personal', 'travel_plan',
  // SNS系
  'instagram_place', 'instagram_food', 'tiktok_place', 'tiktok_food', 'sns_inspiration',
  'custom'
]);
export type PersonalMemoTemplate = z.infer<typeof PersonalMemoTemplateSchema>;

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
  template: PersonalMemoTemplateSchema.optional(),
  templateData: z.record(z.string(), z.any()).optional(),
  snsPostData: SNSPostSchema.optional(), // SNS投稿データ
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

// SNS Post Data Schemas
export const SNSAuthorSchema = z.object({
  username: z.string(),
  displayName: z.string().optional(),
  profileImage: z.string().optional(),
  verified: z.boolean().optional(),
});

export const SNSContentSchema = z.object({
  caption: z.string().optional(),
  description: z.string().optional(),
  hashtags: z.array(z.string()).default([]),
  mentions: z.array(z.string()).default([]),
});

export const SNSMediaSchema = z.object({
  type: z.enum(['image', 'video', 'carousel']),
  thumbnailUrl: z.string().optional(),
  mediaUrls: z.array(z.string()).default([]),
  duration: z.number().optional(),
});

export const SNSLocationSchema = z.object({
  name: z.string(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  address: z.string().optional(),
});

export const SNSEngagementSchema = z.object({
  likes: z.number().optional(),
  comments: z.number().optional(),
  shares: z.number().optional(),
  views: z.number().optional(),
});

export const SNSPostSchema = z.object({
  platform: z.enum(['instagram', 'tiktok']),
  postId: z.string(),
  url: z.string(),
  author: SNSAuthorSchema,
  content: SNSContentSchema,
  media: SNSMediaSchema,
  location: SNSLocationSchema.optional(),
  engagement: SNSEngagementSchema,
  postedAt: z.date(),
  scrapedAt: z.date(),
});

export type SNSPost = z.infer<typeof SNSPostSchema>;

// Shared Memo
export const SharedMemoTypeSchema = z.enum([
  // ビジネス系
  'meeting', 'project', 'brainstorming', 'training', 'interview', 'presentation',
  'sprint_planning', 'retrospective', 'daily_standup', 'client_meeting',
  // イベント系
  'event', 'workshop', 'seminar', 'conference', 'networking',
  // 社内活動系
  'party_planning', 'team_building', 'welcome_party', 'farewell_party', 
  'year_end_party', 'company_outing', 'sports_event',
  // 学習系
  'study_group', 'book_club', 'language_exchange', 'skill_sharing',
  // プライベート系
  'trip_planning', 'outing', 'dining', 'hobby_meetup', 'sports_club',
  'volunteer', 'family_event', 'birthday_party', 'wedding_planning',
  // 特殊系
  'emergency_response', 'maintenance', 'health_safety', 'budget_planning',
  'custom'
]);
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

// Personal Memo templates
export const PERSONAL_MEMO_TEMPLATES = {
  // ビジネス用テンプレート
  meeting_note: {
    title: '会議メモ（個人用）',
    category: 'business' as PersonalMemoTemplateCategory,
    sections: [
      { key: 'date', label: '日時', type: 'datetime' },
      { key: 'meeting_type', label: '会議種別', type: 'text' },
      { key: 'participants', label: '参加者', type: 'list' },
      { key: 'agenda', label: '議題', type: 'list' },
      { key: 'my_notes', label: '個人メモ', type: 'text' },
      { key: 'action_items', label: '自分のアクション', type: 'list' },
      { key: 'follow_up', label: 'フォローアップ事項', type: 'list' },
    ],
  },
  project_plan: {
    title: 'プロジェクト計画',
    category: 'business' as PersonalMemoTemplateCategory,
    sections: [
      { key: 'project_name', label: 'プロジェクト名', type: 'text' },
      { key: 'objective', label: '目的・目標', type: 'text' },
      { key: 'deliverables', label: '成果物', type: 'list' },
      { key: 'timeline', label: 'スケジュール', type: 'list' },
      { key: 'resources', label: '必要リソース', type: 'list' },
      { key: 'risks', label: 'リスク・課題', type: 'list' },
      { key: 'next_steps', label: '次のステップ', type: 'list' },
    ],
  },
  task_list: {
    title: 'タスクリスト（業務）',
    category: 'business' as PersonalMemoTemplateCategory,
    sections: [
      { key: 'date', label: '日付', type: 'date' },
      { key: 'priority_high', label: '高優先度タスク', type: 'list' },
      { key: 'priority_medium', label: '中優先度タスク', type: 'list' },
      { key: 'priority_low', label: '低優先度タスク', type: 'list' },
      { key: 'deadlines', label: '期限のあるタスク', type: 'list' },
      { key: 'notes', label: '備考', type: 'text' },
    ],
  },
  idea_business: {
    title: 'ビジネスアイデア',
    category: 'business' as PersonalMemoTemplateCategory,
    sections: [
      { key: 'idea_name', label: 'アイデア名', type: 'text' },
      { key: 'background', label: '背景・課題', type: 'text' },
      { key: 'solution', label: '解決策', type: 'text' },
      { key: 'target', label: 'ターゲット', type: 'text' },
      { key: 'benefits', label: 'メリット・効果', type: 'list' },
      { key: 'challenges', label: '課題・リスク', type: 'list' },
      { key: 'implementation', label: '実装方法', type: 'list' },
    ],
  },
  client_memo: {
    title: 'クライアントメモ',
    category: 'business' as PersonalMemoTemplateCategory,
    sections: [
      { key: 'client_name', label: 'クライアント名', type: 'text' },
      { key: 'contact_date', label: '連絡日時', type: 'datetime' },
      { key: 'contact_method', label: '連絡方法', type: 'text' },
      { key: 'discussion_points', label: '話し合った内容', type: 'list' },
      { key: 'requirements', label: '要望・要件', type: 'list' },
      { key: 'next_actions', label: '次回アクション', type: 'list' },
      { key: 'deadline', label: '期限', type: 'date' },
    ],
  },
  report: {
    title: 'レポート・報告書',
    category: 'business' as PersonalMemoTemplateCategory,
    sections: [
      { key: 'title', label: 'タイトル', type: 'text' },
      { key: 'date', label: '作成日', type: 'date' },
      { key: 'summary', label: '概要', type: 'text' },
      { key: 'achievements', label: '実績・成果', type: 'list' },
      { key: 'issues', label: '課題・問題', type: 'list' },
      { key: 'recommendations', label: '提案・改善案', type: 'list' },
      { key: 'next_period', label: '次期予定', type: 'text' },
    ],
  },

  // プライベート用テンプレート
  daily_diary: {
    title: '日記',
    category: 'private' as PersonalMemoTemplateCategory,
    sections: [
      { key: 'date', label: '日付', type: 'date' },
      { key: 'weather', label: '天気', type: 'text' },
      { key: 'mood', label: '気分', type: 'text' },
      { key: 'events', label: '今日の出来事', type: 'list' },
      { key: 'gratitude', label: '感謝したこと', type: 'list' },
      { key: 'reflection', label: '振り返り', type: 'text' },
      { key: 'tomorrow', label: '明日の予定', type: 'text' },
    ],
  },
  shopping_list: {
    title: '買い物リスト',
    category: 'private' as PersonalMemoTemplateCategory,
    sections: [
      { key: 'store', label: '店名', type: 'text' },
      { key: 'date', label: '予定日', type: 'date' },
      { key: 'groceries', label: '食料品', type: 'list' },
      { key: 'household', label: '日用品', type: 'list' },
      { key: 'clothes', label: '衣類', type: 'list' },
      { key: 'others', label: 'その他', type: 'list' },
      { key: 'budget', label: '予算', type: 'number' },
    ],
  },
  health_record: {
    title: '健康記録',
    category: 'private' as PersonalMemoTemplateCategory,
    sections: [
      { key: 'date', label: '日付', type: 'date' },
      { key: 'weight', label: '体重', type: 'number' },
      { key: 'exercise', label: '運動内容', type: 'list' },
      { key: 'meals', label: '食事記録', type: 'list' },
      { key: 'sleep', label: '睡眠時間', type: 'text' },
      { key: 'mood', label: '体調・気分', type: 'text' },
      { key: 'notes', label: '健康メモ', type: 'text' },
    ],
  },
  study_note: {
    title: '学習記録',
    category: 'private' as PersonalMemoTemplateCategory,
    sections: [
      { key: 'subject', label: '科目・分野', type: 'text' },
      { key: 'date', label: '学習日', type: 'date' },
      { key: 'duration', label: '学習時間', type: 'text' },
      { key: 'goals', label: '学習目標', type: 'list' },
      { key: 'content', label: '学習内容', type: 'text' },
      { key: 'key_points', label: '重要ポイント', type: 'list' },
      { key: 'questions', label: '疑問点', type: 'list' },
      { key: 'next_plan', label: '次回の計画', type: 'text' },
    ],
  },
  idea_personal: {
    title: '個人アイデア',
    category: 'private' as PersonalMemoTemplateCategory,
    sections: [
      { key: 'idea_title', label: 'アイデア名', type: 'text' },
      { key: 'category', label: 'カテゴリ', type: 'text' },
      { key: 'description', label: '内容・詳細', type: 'text' },
      { key: 'inspiration', label: 'ひらめいたきっかけ', type: 'text' },
      { key: 'benefits', label: '良い点・メリット', type: 'list' },
      { key: 'steps', label: '実現方法', type: 'list' },
      { key: 'timeline', label: 'いつまでに', type: 'text' },
    ],
  },
  travel_plan: {
    title: '旅行計画',
    category: 'private' as PersonalMemoTemplateCategory,
    sections: [
      { key: 'destination', label: '目的地', type: 'text' },
      { key: 'dates', label: '日程', type: 'text' },
      { key: 'companions', label: '同行者', type: 'list' },
      { key: 'transportation', label: '交通手段', type: 'text' },
      { key: 'accommodation', label: '宿泊先', type: 'text' },
      { key: 'activities', label: 'やりたいこと', type: 'list' },
      { key: 'packing', label: '持ち物', type: 'list' },
      { key: 'budget', label: '予算', type: 'number' },
    ],
  },

  // SNS系テンプレート
  instagram_place: {
    title: 'Instagram 行きたい場所',
    category: 'private' as PersonalMemoTemplateCategory,
    sections: [
      { key: 'place_name', label: '場所名', type: 'text' },
      { key: 'location', label: '住所・アクセス', type: 'text' },
      { key: 'place_type', label: '種類', type: 'text' },
      { key: 'what_to_do', label: 'やりたいこと', type: 'list' },
      { key: 'best_time', label: 'ベストタイム', type: 'text' },
      { key: 'budget_estimate', label: '予算目安', type: 'text' },
      { key: 'companions', label: '一緒に行きたい人', type: 'list' },
      { key: 'notes', label: '特記事項', type: 'text' },
      { key: 'sns_url', label: 'Instagram URL', type: 'text' },
      { key: 'author_info', label: '投稿者', type: 'text' },
      { key: 'saved_date', label: '保存日', type: 'date' },
    ],
  },

  instagram_food: {
    title: 'Instagram グルメ',
    category: 'private' as PersonalMemoTemplateCategory,
    sections: [
      { key: 'restaurant_name', label: 'レストラン名', type: 'text' },
      { key: 'location', label: '住所・アクセス', type: 'text' },
      { key: 'cuisine_type', label: '料理ジャンル', type: 'text' },
      { key: 'recommended_dishes', label: 'おすすめ料理', type: 'list' },
      { key: 'price_range', label: '価格帯', type: 'text' },
      { key: 'opening_hours', label: '営業時間', type: 'text' },
      { key: 'reservation_needed', label: '予約必要性', type: 'text' },
      { key: 'special_occasions', label: '利用シーン', type: 'list' },
      { key: 'companions', label: '一緒に行きたい人', type: 'list' },
      { key: 'notes', label: 'メモ', type: 'text' },
      { key: 'sns_url', label: 'Instagram URL', type: 'text' },
      { key: 'author_info', label: '投稿者', type: 'text' },
      { key: 'saved_date', label: '保存日', type: 'date' },
    ],
  },

  tiktok_place: {
    title: 'TikTok 行きたい場所',
    category: 'private' as PersonalMemoTemplateCategory,
    sections: [
      { key: 'place_name', label: '場所名', type: 'text' },
      { key: 'location', label: '住所・アクセス', type: 'text' },
      { key: 'trending_reason', label: 'バズった理由', type: 'text' },
      { key: 'what_to_do', label: 'やりたいこと', type: 'list' },
      { key: 'photo_spots', label: '撮影スポット', type: 'list' },
      { key: 'best_time', label: 'ベストタイム', type: 'text' },
      { key: 'budget_estimate', label: '予算目安', type: 'text' },
      { key: 'companions', label: '一緒に行きたい人', type: 'list' },
      { key: 'tips', label: 'コツ・注意点', type: 'list' },
      { key: 'sns_url', label: 'TikTok URL', type: 'text' },
      { key: 'author_info', label: '投稿者', type: 'text' },
      { key: 'saved_date', label: '保存日', type: 'date' },
    ],
  },

  tiktok_food: {
    title: 'TikTok グルメ',
    category: 'private' as PersonalMemoTemplateCategory,
    sections: [
      { key: 'restaurant_name', label: 'レストラン名', type: 'text' },
      { key: 'location', label: '住所・アクセス', type: 'text' },
      { key: 'trending_dish', label: 'バズった料理', type: 'text' },
      { key: 'what_makes_special', label: '特徴・おすすめポイント', type: 'list' },
      { key: 'price_range', label: '価格帯', type: 'text' },
      { key: 'order_tips', label: '注文のコツ', type: 'list' },
      { key: 'best_time_to_visit', label: '行く時間帯', type: 'text' },
      { key: 'companions', label: '一緒に行きたい人', type: 'list' },
      { key: 'photo_tips', label: '写真撮影のコツ', type: 'list' },
      { key: 'notes', label: 'メモ', type: 'text' },
      { key: 'sns_url', label: 'TikTok URL', type: 'text' },
      { key: 'author_info', label: '投稿者', type: 'text' },
      { key: 'saved_date', label: '保存日', type: 'date' },
    ],
  },

  sns_inspiration: {
    title: 'SNS インスピレーション',
    category: 'private' as PersonalMemoTemplateCategory,
    sections: [
      { key: 'inspiration_type', label: 'インスピレーションの種類', type: 'text' },
      { key: 'main_idea', label: 'メインアイデア', type: 'text' },
      { key: 'why_inspiring', label: '何が刺さったか', type: 'text' },
      { key: 'action_items', label: '試してみたいこと', type: 'list' },
      { key: 'resources_needed', label: '必要なもの', type: 'list' },
      { key: 'timeline', label: 'いつ実行するか', type: 'text' },
      { key: 'similar_ideas', label: '関連アイデア', type: 'list' },
      { key: 'notes', label: 'その他メモ', type: 'text' },
      { key: 'sns_url', label: 'SNS URL', type: 'text' },
      { key: 'author_info', label: '投稿者', type: 'text' },
      { key: 'saved_date', label: '保存日', type: 'date' },
    ],
  },
} as const;

// Shared Memo templates
export const SHARED_MEMO_TEMPLATES = {
  // === ビジネス系テンプレート ===
  meeting: {
    title: '会議メモ',
    category: 'business',
    icon: '🗓️',
    description: '一般的な会議や打ち合わせ用',
    sections: [
      { key: 'date', label: '日時', type: 'datetime' },
      { key: 'attendees', label: '参加者', type: 'list' },
      { key: 'agenda', label: '議題', type: 'list' },
      { key: 'decisions', label: '決定事項', type: 'list' },
      { key: 'todos', label: 'TODO', type: 'list' },
      { key: 'nextMeeting', label: '次回予定', type: 'text' },
    ],
  },
  
  client_meeting: {
    title: 'クライアント打ち合わせ',
    category: 'business',
    icon: '🤝',
    description: '顧客や取引先との打ち合わせ用',
    sections: [
      { key: 'client_name', label: 'クライアント名', type: 'text' },
      { key: 'date', label: '日時', type: 'datetime' },
      { key: 'location', label: '場所', type: 'text' },
      { key: 'our_attendees', label: '当社参加者', type: 'list' },
      { key: 'client_attendees', label: '先方参加者', type: 'list' },
      { key: 'objectives', label: '打ち合わせ目的', type: 'list' },
      { key: 'discussion_points', label: '話し合った内容', type: 'list' },
      { key: 'client_requirements', label: 'クライアント要望', type: 'list' },
      { key: 'our_proposals', label: '当社提案', type: 'list' },
      { key: 'next_actions', label: '次回アクション', type: 'list' },
      { key: 'follow_up_date', label: 'フォローアップ日', type: 'date' },
    ],
  },
  
  daily_standup: {
    title: 'デイリースタンドアップ',
    category: 'business',
    icon: '☕',
    description: 'アジャイル開発チームの朝会用',
    sections: [
      { key: 'date', label: '日付', type: 'date' },
      { key: 'sprint', label: 'スプリント', type: 'text' },
      { key: 'attendees', label: '参加者', type: 'list' },
      { key: 'yesterday_completed', label: '昨日完了したこと', type: 'list' },
      { key: 'today_plan', label: '今日の予定', type: 'list' },
      { key: 'blockers', label: '障害・困っていること', type: 'list' },
      { key: 'help_needed', label: 'サポートが必要なこと', type: 'list' },
      { key: 'sprint_progress', label: 'スプリント進捗', type: 'text' },
    ],
  },
  
  sprint_planning: {
    title: 'スプリントプランニング',
    category: 'business',
    icon: '🏃',
    description: 'アジャイル開発のスプリント計画用',
    sections: [
      { key: 'sprint_number', label: 'スプリント番号', type: 'text' },
      { key: 'start_date', label: '開始日', type: 'date' },
      { key: 'end_date', label: '終了日', type: 'date' },
      { key: 'team_members', label: 'チームメンバー', type: 'list' },
      { key: 'sprint_goal', label: 'スプリントゴール', type: 'text' },
      { key: 'user_stories', label: 'ユーザーストーリー', type: 'list' },
      { key: 'story_points', label: 'ストーリーポイント合計', type: 'number' },
      { key: 'capacity', label: 'チームキャパシティ', type: 'number' },
      { key: 'risks', label: 'リスク要因', type: 'list' },
      { key: 'dependencies', label: '依存関係', type: 'list' },
    ],
  },
  
  retrospective: {
    title: 'スプリント振り返り',
    category: 'business',
    icon: '🔄',
    description: 'スプリントやプロジェクトの振り返り用',
    sections: [
      { key: 'sprint_period', label: '対象期間', type: 'text' },
      { key: 'attendees', label: '参加者', type: 'list' },
      { key: 'what_went_well', label: 'うまくいったこと', type: 'list' },
      { key: 'what_could_improve', label: '改善できること', type: 'list' },
      { key: 'action_items', label: 'アクションアイテム', type: 'list' },
      { key: 'keep_doing', label: '継続すること', type: 'list' },
      { key: 'start_doing', label: '新しく始めること', type: 'list' },
      { key: 'stop_doing', label: 'やめること', type: 'list' },
      { key: 'team_happiness', label: 'チームの満足度', type: 'number' },
    ],
  },
  
  project: {
    title: 'プロジェクト管理',
    category: 'business',
    icon: '📊',
    description: 'プロジェクトの管理や進捗確認用',
    sections: [
      { key: 'project_name', label: 'プロジェクト名', type: 'text' },
      { key: 'start_date', label: '開始日', type: 'date' },
      { key: 'end_date', label: '終了予定日', type: 'date' },
      { key: 'team_members', label: 'チームメンバー', type: 'list' },
      { key: 'objectives', label: '目標・成果物', type: 'list' },
      { key: 'milestones', label: 'マイルストーン', type: 'list' },
      { key: 'risks', label: 'リスク・課題', type: 'list' },
      { key: 'progress', label: '進捗状況', type: 'text' },
    ],
  },
  
  brainstorming: {
    title: 'ブレインストーミング',
    category: 'business',
    icon: '💡',
    description: 'アイデア出しや創造的な話し合い用',
    sections: [
      { key: 'theme', label: 'テーマ・課題', type: 'text' },
      { key: 'date', label: '実施日時', type: 'datetime' },
      { key: 'facilitator', label: 'ファシリテーター', type: 'text' },
      { key: 'participants', label: '参加者', type: 'list' },
      { key: 'ground_rules', label: 'ルール・前提', type: 'list' },
      { key: 'ideas', label: 'アイデア一覧', type: 'list' },
      { key: 'categories', label: 'カテゴリ分け', type: 'list' },
      { key: 'top_ideas', label: '有望アイデア', type: 'list' },
      { key: 'next_steps', label: '次のアクション', type: 'list' },
    ],
  },
  
  training: {
    title: '研修・トレーニング',
    category: 'business',
    icon: '🎓',
    description: '社内研修やスキルアップトレーニング用',
    sections: [
      { key: 'training_title', label: '研修タイトル', type: 'text' },
      { key: 'date', label: '実施日時', type: 'datetime' },
      { key: 'instructor', label: '講師', type: 'text' },
      { key: 'participants', label: '参加者', type: 'list' },
      { key: 'objectives', label: '研修目標', type: 'list' },
      { key: 'curriculum', label: 'カリキュラム', type: 'list' },
      { key: 'materials', label: '研修教材', type: 'list' },
      { key: 'exercises', label: '演習・実習', type: 'list' },
      { key: 'feedback', label: 'フィードバック', type: 'list' },
      { key: 'follow_up', label: 'フォローアップ予定', type: 'text' },
    ],
  },
  
  interview: {
    title: '面接・採用',
    category: 'business',
    icon: '💼',
    description: '採用面接や人事面談用',
    sections: [
      { key: 'candidate_name', label: '候補者名', type: 'text' },
      { key: 'position', label: '募集ポジション', type: 'text' },
      { key: 'date', label: '面接日時', type: 'datetime' },
      { key: 'interviewers', label: '面接官', type: 'list' },
      { key: 'questions_asked', label: '質問内容', type: 'list' },
      { key: 'candidate_responses', label: '候補者の回答', type: 'list' },
      { key: 'technical_skills', label: '技術スキル評価', type: 'list' },
      { key: 'soft_skills', label: 'ソフトスキル評価', type: 'list' },
      { key: 'overall_impression', label: '総合評価', type: 'text' },
      { key: 'recommendation', label: '推薦判定', type: 'text' },
      { key: 'next_steps', label: '次のステップ', type: 'text' },
    ],
  },
  
  presentation: {
    title: 'プレゼンテーション企画',
    category: 'business',
    icon: '📊',
    description: 'プレゼンテーションや発表の企画用',
    sections: [
      { key: 'presentation_title', label: 'プレゼンタイトル', type: 'text' },
      { key: 'presenter', label: '発表者', type: 'text' },
      { key: 'date', label: '発表日時', type: 'datetime' },
      { key: 'audience', label: '対象者', type: 'text' },
      { key: 'duration', label: '発表時間', type: 'text' },
      { key: 'objectives', label: '発表目的', type: 'list' },
      { key: 'key_messages', label: 'キーメッセージ', type: 'list' },
      { key: 'slide_outline', label: 'スライド構成', type: 'list' },
      { key: 'demo_content', label: 'デモ内容', type: 'list' },
      { key: 'qa_preparation', label: 'Q&A想定質問', type: 'list' },
      { key: 'success_metrics', label: '成功指標', type: 'list' },
    ],
  },
  
  // === イベント系テンプレート ===
  event: {
    title: 'イベント企画',
    category: 'event',
    icon: '🎉',
    description: '一般的なイベントやセミナーの企画用',
    sections: [
      { key: 'event_name', label: 'イベント名', type: 'text' },
      { key: 'date', label: '開催日時', type: 'datetime' },
      { key: 'venue', label: '会場', type: 'text' },
      { key: 'target_audience', label: '対象者', type: 'text' },
      { key: 'capacity', label: '定員', type: 'number' },
      { key: 'agenda', label: 'プログラム', type: 'list' },
      { key: 'equipment', label: '必要機材', type: 'list' },
      { key: 'budget', label: '予算', type: 'number' },
      { key: 'tasks', label: '準備タスク', type: 'list' },
    ],
  },
  
  workshop: {
    title: 'ワークショップ',
    category: 'event',
    icon: '🔨',
    description: '参加型ワークショップやハンズオンセミナー用',
    sections: [
      { key: 'workshop_title', label: 'ワークショップ名', type: 'text' },
      { key: 'facilitator', label: 'ファシリテーター', type: 'text' },
      { key: 'date', label: '開催日時', type: 'datetime' },
      { key: 'participants', label: '参加者', type: 'list' },
      { key: 'learning_goals', label: '学習目標', type: 'list' },
      { key: 'activities', label: 'アクティビティ', type: 'list' },
      { key: 'materials_needed', label: '必要材料', type: 'list' },
      { key: 'group_exercises', label: 'グループワーク', type: 'list' },
      { key: 'deliverables', label: '成果物', type: 'list' },
      { key: 'feedback_method', label: 'フィードバック方法', type: 'text' },
    ],
  },
  
  seminar: {
    title: 'セミナー・講演会',
    category: 'event',
    icon: '🎤',
    description: '学術的セミナーや講演会用',
    sections: [
      { key: 'seminar_title', label: 'セミナータイトル', type: 'text' },
      { key: 'speaker', label: '講演者', type: 'text' },
      { key: 'date', label: '開催日時', type: 'datetime' },
      { key: 'venue', label: '会場', type: 'text' },
      { key: 'target_audience', label: '対象者', type: 'text' },
      { key: 'abstract', label: '概要', type: 'text' },
      { key: 'key_topics', label: '主要トピック', type: 'list' },
      { key: 'references', label: '参考文献', type: 'list' },
      { key: 'qa_time', label: 'Q&A時間', type: 'text' },
      { key: 'networking', label: '交流会', type: 'text' },
    ],
  },
  
  conference: {
    title: 'カンファレンス',
    category: 'event',
    icon: '🏢',
    description: '大規模カンファレンスや学会用',
    sections: [
      { key: 'conference_name', label: 'カンファレンス名', type: 'text' },
      { key: 'dates', label: '開催期間', type: 'text' },
      { key: 'venue', label: '会場', type: 'text' },
      { key: 'organizers', label: '主催者', type: 'list' },
      { key: 'keynote_speakers', label: '基調講演者', type: 'list' },
      { key: 'session_tracks', label: 'セッショントラック', type: 'list' },
      { key: 'sponsors', label: 'スポンサー', type: 'list' },
      { key: 'expected_attendees', label: '予想参加者数', type: 'number' },
      { key: 'logistics', label: '運営事項', type: 'list' },
      { key: 'marketing_plan', label: '宣伝計画', type: 'list' },
    ],
  },
  
  networking: {
    title: 'ネットワーキングイベント',
    category: 'event',
    icon: '🌐',
    description: 'ビジネスネットワーキングや交流会用',
    sections: [
      { key: 'event_name', label: 'イベント名', type: 'text' },
      { key: 'date', label: '日時', type: 'datetime' },
      { key: 'venue', label: '会場', type: 'text' },
      { key: 'target_industry', label: '対象業界', type: 'text' },
      { key: 'icebreakers', label: 'アイスブレイカー', type: 'list' },
      { key: 'networking_format', label: '交流形式', type: 'text' },
      { key: 'refreshments', label: '飲食提供', type: 'list' },
      { key: 'name_tags', label: '名札デザイン', type: 'text' },
      { key: 'follow_up_plan', label: 'フォローアップ計画', type: 'text' },
      { key: 'success_metrics', label: '成功指標', type: 'list' },
    ],
  },
  
  // === 社内活動系テンプレート ===
  party_planning: {
    title: 'パーティー企画',
    category: 'social',
    icon: '🎉',
    description: '一般的なパーティーや懇親会用',
    sections: [
      { key: 'occasion', label: '目的・お祝い事', type: 'text' },
      { key: 'date', label: '開催日時', type: 'datetime' },
      { key: 'venue', label: '会場', type: 'text' },
      { key: 'guest_count', label: '参加予定人数', type: 'number' },
      { key: 'invitees', label: '招待者リスト', type: 'list' },
      { key: 'menu', label: '料理・飲み物', type: 'list' },
      { key: 'entertainment', label: '演出・ゲーム', type: 'list' },
      { key: 'decorations', label: '装飾・備品', type: 'list' },
      { key: 'budget', label: '予算', type: 'number' },
      { key: 'tasks', label: '準備分担', type: 'list' },
    ],
  },
  
  welcome_party: {
    title: '歓迎会',
    category: 'social',
    icon: '👋',
    description: '新メンバーや新入社員の歓迎会用',
    sections: [
      { key: 'new_members', label: '新メンバー', type: 'list' },
      { key: 'date', label: '日時', type: 'datetime' },
      { key: 'venue', label: '会場', type: 'text' },
      { key: 'existing_members', label: '既存メンバー', type: 'list' },
      { key: 'introduction_format', label: '自己紹介形式', type: 'text' },
      { key: 'team_introduction', label: 'チーム紹介', type: 'list' },
      { key: 'ice_breaker_games', label: 'アイスブレイカー', type: 'list' },
      { key: 'refreshments', label: '飲食メニュー', type: 'list' },
      { key: 'welcome_gifts', label: '歓迎ギフト', type: 'list' },
      { key: 'photo_session', label: '記念撮影', type: 'text' },
    ],
  },
  
  farewell_party: {
    title: '送別会',
    category: 'social',
    icon: '👋',
    description: '退職者や転勤者の送別会用',
    sections: [
      { key: 'departing_members', label: '送別対象者', type: 'list' },
      { key: 'date', label: '日時', type: 'datetime' },
      { key: 'venue', label: '会場', type: 'text' },
      { key: 'attendees', label: '参加者', type: 'list' },
      { key: 'speech_speakers', label: 'スピーチ担当', type: 'list' },
      { key: 'memories_sharing', label: '思い出シェア', type: 'list' },
      { key: 'farewell_gifts', label: '送別ギフト', type: 'list' },
      { key: 'contact_exchange', label: '連絡先交換', type: 'text' },
      { key: 'photo_memories', label: '写真アルバム', type: 'text' },
      { key: 'refreshments', label: '飲食メニュー', type: 'list' },
    ],
  },
  
  year_end_party: {
    title: '年末パーティー',
    category: 'social',
    icon: '🎆',
    description: '忘年会や年末イベント用',
    sections: [
      { key: 'theme', label: 'パーティーテーマ', type: 'text' },
      { key: 'date', label: '日時', type: 'datetime' },
      { key: 'venue', label: '会場', type: 'text' },
      { key: 'attendees', label: '参加者', type: 'list' },
      { key: 'year_highlights', label: '今年のハイライト', type: 'list' },
      { key: 'awards_recognition', label: '表彰・表面', type: 'list' },
      { key: 'entertainment_program', label: 'エンターテイメント', type: 'list' },
      { key: 'gift_exchange', label: 'プレゼント交換', type: 'text' },
      { key: 'food_drinks', label: '料理・飲み物', type: 'list' },
      { key: 'next_year_goals', label: '来年の抱負', type: 'list' },
    ],
  },
  
  team_building: {
    title: 'チームビルディング',
    category: 'social',
    icon: '🤝',
    description: 'チームの結束を深めるアクティビティ用',
    sections: [
      { key: 'objectives', label: '目的・ゴール', type: 'list' },
      { key: 'date', label: '日時', type: 'datetime' },
      { key: 'location', label: '場所', type: 'text' },
      { key: 'participants', label: '参加者', type: 'list' },
      { key: 'activities', label: 'アクティビティ内容', type: 'list' },
      { key: 'team_challenges', label: 'チームチャレンジ', type: 'list' },
      { key: 'reflection_time', label: '振り返りタイム', type: 'text' },
      { key: 'bonding_meals', label: '親睦会食事', type: 'text' },
      { key: 'success_metrics', label: '成果指標', type: 'list' },
      { key: 'follow_up_actions', label: 'フォローアップ', type: 'list' },
    ],
  },
  
  company_outing: {
    title: '社員旅行・社外活動',
    category: 'social',
    icon: '🚌',
    description: '社員旅行や大規模社外イベント用',
    sections: [
      { key: 'destination', label: '目的地', type: 'text' },
      { key: 'dates', label: '日程', type: 'text' },
      { key: 'participants', label: '参加者', type: 'list' },
      { key: 'transportation', label: '交通手段', type: 'text' },
      { key: 'accommodation', label: '宿泊先', type: 'text' },
      { key: 'itinerary', label: '旅程表', type: 'list' },
      { key: 'group_activities', label: 'グループアクティビティ', type: 'list' },
      { key: 'free_time', label: '自由時間', type: 'text' },
      { key: 'emergency_contacts', label: '緊急連絡先', type: 'list' },
      { key: 'budget_per_person', label: '一人当たり費用', type: 'number' },
    ],
  },
  
  sports_event: {
    title: 'スポーツイベント',
    category: 'social',
    icon: '⚽',
    description: '運動会やスポーツ大会用',
    sections: [
      { key: 'event_name', label: 'イベント名', type: 'text' },
      { key: 'date', label: '日時', type: 'datetime' },
      { key: 'venue', label: '会場', type: 'text' },
      { key: 'sports_activities', label: '競技種目', type: 'list' },
      { key: 'teams', label: 'チーム編成', type: 'list' },
      { key: 'tournament_format', label: '大会形式', type: 'text' },
      { key: 'equipment_needed', label: '必要用具', type: 'list' },
      { key: 'prizes_awards', label: '賞品・表彰', type: 'list' },
      { key: 'safety_measures', label: '安全対策', type: 'list' },
      { key: 'refreshments', label: '飲み物・軽食', type: 'list' },
    ],
  },
  
  // === 学習系テンプレート ===
  study_group: {
    title: '勉強会',
    category: 'learning',
    icon: '📚',
    description: '一般的な勉強会や学習グループ用',
    sections: [
      { key: 'topic', label: 'テーマ', type: 'text' },
      { key: 'date', label: '日時', type: 'datetime' },
      { key: 'facilitator', label: 'ファシリテーター', type: 'text' },
      { key: 'participants', label: '参加者', type: 'list' },
      { key: 'materials', label: '教材・資料', type: 'list' },
      { key: 'learning_objectives', label: '学習目標', type: 'list' },
      { key: 'schedule', label: 'タイムテーブル', type: 'list' },
      { key: 'homework', label: '課題・宿題', type: 'list' },
      { key: 'next_session', label: '次回予定', type: 'text' },
    ],
  },
  
  book_club: {
    title: '読書会',
    category: 'learning',
    icon: '📖',
    description: '読書会や文学サークル用',
    sections: [
      { key: 'book_title', label: '書籍名', type: 'text' },
      { key: 'author', label: '著者', type: 'text' },
      { key: 'date', label: '開催日', type: 'datetime' },
      { key: 'participants', label: '参加者', type: 'list' },
      { key: 'reading_schedule', label: '読書スケジュール', type: 'list' },
      { key: 'discussion_points', label: '議論ポイント', type: 'list' },
      { key: 'favorite_quotes', label: '印象的なセリフ', type: 'list' },
      { key: 'character_analysis', label: 'キャラクター分析', type: 'list' },
      { key: 'themes', label: 'テーマ・メッセージ', type: 'list' },
      { key: 'next_book', label: '次回の書籍', type: 'text' },
    ],
  },
  
  language_exchange: {
    title: '語学交流会',
    category: 'learning',
    icon: '🌍',
    description: '外国語学習や語学交流用',
    sections: [
      { key: 'target_languages', label: '対象言語', type: 'list' },
      { key: 'date', label: '日時', type: 'datetime' },
      { key: 'participants', label: '参加者', type: 'list' },
      { key: 'native_speakers', label: 'ネイティブスピーカー', type: 'list' },
      { key: 'conversation_topics', label: '会話トピック', type: 'list' },
      { key: 'language_games', label: '語学ゲーム', type: 'list' },
      { key: 'cultural_exchange', label: '文化交流', type: 'list' },
      { key: 'practice_methods', label: '練習方法', type: 'list' },
      { key: 'resources_shared', label: '共有リソース', type: 'list' },
      { key: 'follow_up_practice', label: 'フォローアップ練習', type: 'text' },
    ],
  },
  
  skill_sharing: {
    title: 'スキルシェア会',
    category: 'learning',
    icon: '🛠️',
    description: 'スキルや知識の共有セッション用',
    sections: [
      { key: 'skill_topic', label: 'スキルテーマ', type: 'text' },
      { key: 'presenter', label: '発表者', type: 'text' },
      { key: 'date', label: '日時', type: 'datetime' },
      { key: 'participants', label: '参加者', type: 'list' },
      { key: 'skill_level', label: 'スキルレベル', type: 'text' },
      { key: 'demo_content', label: 'デモ内容', type: 'list' },
      { key: 'hands_on_activities', label: 'ハンズオンアクティビティ', type: 'list' },
      { key: 'tools_software', label: '使用ツール・ソフト', type: 'list' },
      { key: 'resources', label: '参考リソース', type: 'list' },
      { key: 'next_steps', label: '学習継続のステップ', type: 'list' },
    ],
  },
  
  // === プライベート系テンプレート ===
  trip_planning: {
    title: '旅行計画（グループ）',
    category: 'private',
    icon: '✈️',
    description: '友人や家族との旅行計画用',
    sections: [
      { key: 'destination', label: '目的地', type: 'text' },
      { key: 'dates', label: '日程', type: 'text' },
      { key: 'members', label: 'メンバー', type: 'list' },
      { key: 'budget_per_person', label: '一人当たり予算', type: 'number' },
      { key: 'accommodation', label: '宿泊先候補', type: 'list' },
      { key: 'transportation', label: '交通手段', type: 'text' },
      { key: 'activities', label: '観光・アクティビティ', type: 'list' },
      { key: 'restaurants', label: '食事場所候補', type: 'list' },
      { key: 'packing_list', label: '持ち物リスト', type: 'list' },
      { key: 'emergency_contacts', label: '緊急連絡先', type: 'list' },
    ],
  },
  
  outing: {
    title: 'お出かけメモ',
    category: 'private',
    icon: '🌳',
    description: '日帰りのお出かけやアクティビティ用',
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
  
  dining: {
    title: '食事会・グルメ会',
    category: 'private',
    icon: '🍽️',
    description: 'グループでの食事会やグルメツアー用',
    sections: [
      { key: 'occasion', label: '目的・キッカケ', type: 'text' },
      { key: 'date', label: '日時', type: 'datetime' },
      { key: 'restaurant', label: 'レストラン', type: 'text' },
      { key: 'participants', label: '参加者', type: 'list' },
      { key: 'cuisine_type', label: '料理ジャンル', type: 'text' },
      { key: 'budget_per_person', label: '一人当たり予算', type: 'number' },
      { key: 'dietary_restrictions', label: '食事制限・アレルギー', type: 'list' },
      { key: 'reservation_details', label: '予約詳細', type: 'text' },
      { key: 'must_try_dishes', label: 'おすすめ料理', type: 'list' },
      { key: 'payment_method', label: '支払い方法', type: 'text' },
    ],
  },
  
  hobby_meetup: {
    title: '趣味会',
    category: 'private',
    icon: '🎨',
    description: '共通の趣味を持つ人たちの集まり用',
    sections: [
      { key: 'hobby_theme', label: '趣味テーマ', type: 'text' },
      { key: 'date', label: '日時', type: 'datetime' },
      { key: 'location', label: '場所', type: 'text' },
      { key: 'participants', label: '参加者', type: 'list' },
      { key: 'activities_planned', label: '予定アティビティ', type: 'list' },
      { key: 'materials_needed', label: '必要な材料・道具', type: 'list' },
      { key: 'skill_levels', label: '参加者スキルレベル', type: 'list' },
      { key: 'sharing_session', label: '作品シェアタイム', type: 'text' },
      { key: 'tips_exchange', label: 'コツ・テクニック交換', type: 'list' },
      { key: 'next_meetup', label: '次回予定', type: 'text' },
    ],
  },
  
  sports_club: {
    title: 'スポーツクラブ',
    category: 'private',
    icon: '🏀',
    description: 'スポーツサークルや運動グループ用',
    sections: [
      { key: 'sport_type', label: 'スポーツ種目', type: 'text' },
      { key: 'date', label: '日時', type: 'datetime' },
      { key: 'venue', label: '会場', type: 'text' },
      { key: 'participants', label: '参加者', type: 'list' },
      { key: 'skill_levels', label: 'スキルレベル分け', type: 'list' },
      { key: 'equipment_needed', label: '必要用具', type: 'list' },
      { key: 'game_format', label: 'ゲーム形式', type: 'text' },
      { key: 'warm_up_routine', label: 'ウォーミングアップ', type: 'list' },
      { key: 'safety_precautions', label: '安全対策', type: 'list' },
      { key: 'post_activity', label: '活動後の予定', type: 'text' },
    ],
  },
  
  volunteer: {
    title: 'ボランティア活動',
    category: 'private',
    icon: '🤲',
    description: 'ボランティアや社会貢献活動用',
    sections: [
      { key: 'activity_type', label: 'ボランティア内容', type: 'text' },
      { key: 'organization', label: '受入れ団体', type: 'text' },
      { key: 'date', label: '活動日時', type: 'datetime' },
      { key: 'location', label: '活動場所', type: 'text' },
      { key: 'volunteers', label: 'ボランティア参加者', type: 'list' },
      { key: 'objectives', label: '活動目的', type: 'list' },
      { key: 'tasks_assigned', label: '担当作業', type: 'list' },
      { key: 'materials_provided', label: '提供される材料', type: 'list' },
      { key: 'impact_expected', label: '期待される成果', type: 'list' },
      { key: 'follow_up_actions', label: 'フォローアップ', type: 'text' },
    ],
  },
  
  family_event: {
    title: '家族イベント',
    category: 'private',
    icon: '👨‍👩‍👧‍👦',
    description: '家族や親族の集まり用',
    sections: [
      { key: 'occasion', label: 'イベント内容', type: 'text' },
      { key: 'date', label: '日時', type: 'datetime' },
      { key: 'location', label: '場所', type: 'text' },
      { key: 'family_members', label: '参加家族', type: 'list' },
      { key: 'age_groups', label: '年齢層', type: 'list' },
      { key: 'activities_kids', label: '子ども向けアクティビティ', type: 'list' },
      { key: 'activities_adults', label: '大人向けアクティビティ', type: 'list' },
      { key: 'food_arrangements', label: '食事の手配', type: 'list' },
      { key: 'special_considerations', label: '特別な配慮', type: 'list' },
      { key: 'memories_capture', label: '思い出作り', type: 'text' },
    ],
  },
  
  birthday_party: {
    title: '誕生日パーティー',
    category: 'private',
    icon: '🎂',
    description: '誕生日のお祝いパーティー用',
    sections: [
      { key: 'birthday_person', label: '主役', type: 'text' },
      { key: 'age_celebrating', label: 'お祝いする年齢', type: 'number' },
      { key: 'date', label: '日時', type: 'datetime' },
      { key: 'venue', label: '会場', type: 'text' },
      { key: 'guests', label: 'ゲスト', type: 'list' },
      { key: 'theme', label: 'パーティーテーマ', type: 'text' },
      { key: 'decorations', label: '装飾', type: 'list' },
      { key: 'cake_order', label: 'ケーキ注文', type: 'text' },
      { key: 'gift_ideas', label: 'プレゼントアイデア', type: 'list' },
      { key: 'entertainment', label: 'エンターテイメント', type: 'list' },
    ],
  },
  
  wedding_planning: {
    title: '結婚式企画',
    category: 'private',
    icon: '💒',
    description: '結婚式や披露宴の企画用',
    sections: [
      { key: 'couple_names', label: '新郎新婦', type: 'text' },
      { key: 'wedding_date', label: '結婚式日', type: 'date' },
      { key: 'venue', label: '会場', type: 'text' },
      { key: 'guest_count', label: '招待人数', type: 'number' },
      { key: 'ceremony_style', label: '挙式スタイル', type: 'text' },
      { key: 'color_theme', label: 'カラーテーマ', type: 'text' },
      { key: 'vendors', label: '業者リスト', type: 'list' },
      { key: 'timeline', label: '当日タイムライン', type: 'list' },
      { key: 'budget_breakdown', label: '予算内訳', type: 'list' },
      { key: 'special_requests', label: '特別なリクエスト', type: 'list' },
    ],
  },
  
  // === 特殊系テンプレート ===
  emergency_response: {
    title: '緊急対応',
    category: 'emergency',
    icon: '🆘',
    description: '緊急時の対応や危機管理用',
    sections: [
      { key: 'incident_type', label: '事案種別', type: 'text' },
      { key: 'date_time', label: '発生日時', type: 'datetime' },
      { key: 'location', label: '発生場所', type: 'text' },
      { key: 'affected_people', label: '影響を受けた人', type: 'list' },
      { key: 'immediate_actions', label: '即座対応', type: 'list' },
      { key: 'emergency_contacts', label: '緊急連絡先', type: 'list' },
      { key: 'response_team', label: '対応チーム', type: 'list' },
      { key: 'status_updates', label: '状況アップデート', type: 'list' },
      { key: 'follow_up_actions', label: 'フォローアップアクション', type: 'list' },
      { key: 'lessons_learned', label: '教訓・改善点', type: 'list' },
    ],
  },
  
  maintenance: {
    title: 'メンテナンス作業',
    category: 'maintenance',
    icon: '🔧',
    description: '設備メンテナンスや保守作業用',
    sections: [
      { key: 'equipment_system', label: '対象設備・システム', type: 'text' },
      { key: 'maintenance_type', label: 'メンテナンス種別', type: 'text' },
      { key: 'scheduled_date', label: '予定日時', type: 'datetime' },
      { key: 'responsible_team', label: '担当チーム', type: 'list' },
      { key: 'work_procedures', label: '作業手順', type: 'list' },
      { key: 'tools_required', label: '必要工具', type: 'list' },
      { key: 'safety_measures', label: '安全対策', type: 'list' },
      { key: 'downtime_impact', label: '停止影響', type: 'text' },
      { key: 'completion_criteria', label: '完了基準', type: 'list' },
      { key: 'post_maintenance_check', label: '作業後確認', type: 'list' },
    ],
  },
  
  health_safety: {
    title: '健康安全管理',
    category: 'safety',
    icon: '🏥',
    description: '健康管理や安全対策の企画用',
    sections: [
      { key: 'health_topic', label: '健康テーマ', type: 'text' },
      { key: 'target_group', label: '対象者', type: 'text' },
      { key: 'date', label: '実施日', type: 'datetime' },
      { key: 'health_guidelines', label: '健康ガイドライン', type: 'list' },
      { key: 'safety_protocols', label: '安全プロトコル', type: 'list' },
      { key: 'risk_assessment', label: 'リスク評価', type: 'list' },
      { key: 'preventive_measures', label: '予防策', type: 'list' },
      { key: 'emergency_procedures', label: '緊急時手順', type: 'list' },
      { key: 'monitoring_plan', label: 'モニタリング計画', type: 'text' },
      { key: 'review_schedule', label: '見直しスケジュール', type: 'text' },
    ],
  },
  
  budget_planning: {
    title: '予算計画',
    category: 'financial',
    icon: '💰',
    description: 'グループの予算管理や費用計画用',
    sections: [
      { key: 'budget_purpose', label: '予算目的', type: 'text' },
      { key: 'planning_period', label: '計画期間', type: 'text' },
      { key: 'total_budget', label: '総予算', type: 'number' },
      { key: 'income_sources', label: '収入源', type: 'list' },
      { key: 'expense_categories', label: '支出カテゴリ', type: 'list' },
      { key: 'major_expenses', label: '主要支出項目', type: 'list' },
      { key: 'contingency_fund', label: '予備費', type: 'number' },
      { key: 'approval_process', label: '承認プロセス', type: 'text' },
      { key: 'monitoring_method', label: '進捗管理方法', type: 'text' },
      { key: 'review_checkpoints', label: '見直しポイント', type: 'list' },
    ],
  },
} as const;

// For backward compatibility
export const MEMO_TEMPLATES = SHARED_MEMO_TEMPLATES;