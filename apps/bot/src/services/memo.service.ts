import { PersonalMemoRepository, SharedMemoRepository } from '@ai-secretary-task/database';
import { PersonalMemo, SharedMemo, PERSONAL_MEMO_TEMPLATES, SNSPost } from '@ai-secretary-task/shared/types';
import { commandParser } from './command-parser';
import { aiService } from './ai.service';
import { snsScraperService } from './sns-scraper.service';
import { imageOCRService } from './image-ocr.service';

interface MemoContext {
  userId: string;
  groupId?: string;
  messageText: string;
  imageBuffers?: Buffer[];
}

/**
 * メモサービス
 * LINEメッセージから自動的にメモを作成する主要機能を提供
 * 公式LINEへのメッセージやグループトークをAIが解析してメモ化
 */
export class MemoService {
  private personalMemoRepo: PersonalMemoRepository;
  private sharedMemoRepo: SharedMemoRepository;

  constructor() {
    this.personalMemoRepo = new PersonalMemoRepository();
    this.sharedMemoRepo = new SharedMemoRepository();
  }

  async processMessage(context: MemoContext): Promise<string> {
    const { userId, groupId, messageText } = context;
    
    // コマンド解析
    const command = commandParser.parse(messageText);
    
    if (command.type !== 'memo') {
      return this.handleNaturalLanguageMemo(context);
    }

    // メモコマンドの処理
    switch (command.args[0]) {
      case '作成':
      case 'create':
        return this.handleCreateMemo(context);
      
      case '一覧':
      case 'list':
        return this.handleListMemos(context);
      
      case '検索':
      case 'search':
        return this.handleSearchMemos(context);
      
      default:
        return this.handleNaturalLanguageMemo(context);
    }
  }

  private async handleCreateMemo(context: MemoContext): Promise<string> {
    const { userId, groupId, messageText } = context;
    
    try {
      // メッセージからタイトルとコンテンツを抽出
      const { title, content, tags } = await this.extractMemoData(messageText);
      
      if (groupId) {
        // 共有メモとして作成
        const memo = await this.createSharedMemo({
          title,
          content,
          tags,
          userId,
          groupId
        });
        
        return `共有メモ「${memo.title}」を作成しました！\n\n詳細はLIFFアプリで確認できます。`;
      } else {
        // 個人メモとして作成
        const memo = await this.createPersonalMemo({
          title,
          content,
          tags,
          userId
        });
        
        return `個人メモ「${memo.title}」を作成しました！\n\n詳細はLIFFアプリで確認できます。`;
      }
    } catch (error) {
      console.error('Error creating memo:', error);
      return 'メモの作成に失敗しました。もう一度お試しください。';
    }
  }

  private async handleListMemos(context: MemoContext): Promise<string> {
    const { userId, groupId } = context;
    
    try {
      if (groupId) {
        // 共有メモ一覧
        const memos = await this.sharedMemoRepo.findByGroup(groupId, { limit: 5 });
        
        if (memos.length === 0) {
          return 'このグループにはまだ共有メモがありません。';
        }
        
        let response = '📝 最新の共有メモ（5件）:\n\n';
        memos.forEach((memo, index) => {
          response += `${index + 1}. ${memo.title}\n`;
          response += `   作成: ${memo.createdAt.toLocaleDateString()}\n`;
          response += `   作成者: ${memo.createdBy}\n\n`;
        });
        
        response += 'すべてのメモはLIFFアプリで確認できます。';
        return response;
      } else {
        // 個人メモ一覧
        const memos = await this.personalMemoRepo.findByUser(userId, false, { limit: 5 });
        
        if (memos.length === 0) {
          return 'まだ個人メモがありません。';
        }
        
        let response = '📝 最新の個人メモ（5件）:\n\n';
        memos.forEach((memo, index) => {
          response += `${index + 1}. ${memo.title}\n`;
          response += `   更新: ${memo.updatedAt.toLocaleDateString()}\n`;
          if (memo.tags.length > 0) {
            response += `   タグ: ${memo.tags.join(', ')}\n`;
          }
          response += '\n';
        });
        
        response += 'すべてのメモはLIFFアプリで確認できます。';
        return response;
      }
    } catch (error) {
      console.error('Error listing memos:', error);
      return 'メモの取得に失敗しました。';
    }
  }

  private async handleSearchMemos(context: MemoContext): Promise<string> {
    const { userId, groupId, messageText } = context;
    
    try {
      // 検索キーワードを抽出
      const searchTerm = this.extractSearchTerm(messageText);
      
      if (!searchTerm) {
        return '検索キーワードを指定してください。\n例: @メモ 検索 会議';
      }
      
      if (groupId) {
        // 共有メモから検索
        const memos = await this.sharedMemoRepo.searchByKeyword(groupId, searchTerm);
        
        if (memos.length === 0) {
          return `「${searchTerm}」に関連する共有メモが見つかりませんでした。`;
        }
        
        let response = `🔍 「${searchTerm}」の検索結果（共有メモ）:\n\n`;
        memos.slice(0, 3).forEach((memo, index) => {
          response += `${index + 1}. ${memo.title}\n`;
          response += `   更新: ${memo.updatedAt.toLocaleDateString()}\n\n`;
        });
        
        if (memos.length > 3) {
          response += `他 ${memos.length - 3} 件の結果があります。`;
        }
        
        return response;
      } else {
        // 個人メモから検索
        const memos = await this.personalMemoRepo.searchByKeyword(userId, searchTerm);
        
        if (memos.length === 0) {
          return `「${searchTerm}」に関連する個人メモが見つかりませんでした。`;
        }
        
        let response = `🔍 「${searchTerm}」の検索結果（個人メモ）:\n\n`;
        memos.slice(0, 3).forEach((memo, index) => {
          response += `${index + 1}. ${memo.title}\n`;
          response += `   更新: ${memo.updatedAt.toLocaleDateString()}\n\n`;
        });
        
        if (memos.length > 3) {
          response += `他 ${memos.length - 3} 件の結果があります。`;
        }
        
        return response;
      }
    } catch (error) {
      console.error('Error searching memos:', error);
      return 'メモの検索に失敗しました。';
    }
  }

  private async handleNaturalLanguageMemo(context: MemoContext): Promise<string> {
    const { userId, groupId, messageText, imageBuffers } = context;
    
    // 画像からOCRテキスト抽出（SNSスクリーンショット対応）
    if (imageBuffers && imageBuffers.length > 0) {
      return this.handleImageOCRMemo(context);
    }
    
    // SNSリンクを検出してメモ作成
    const snsUrls = this.extractSNSUrls(messageText);
    if (snsUrls.length > 0 && !groupId) { // 個人チャットのみでSNSメモ作成
      return this.handleSNSMemo(context, snsUrls);
    }
    
    // 自然言語でのメモ作成を判定
    if (this.isMemoCreationIntent(messageText)) {
      return this.handleCreateMemo(context);
    }
    
    // メモ検索の意図を判定
    if (this.isSearchIntent(messageText)) {
      return this.handleSearchMemos({
        ...context,
        messageText: `@メモ 検索 ${this.extractSearchKeywords(messageText)}`
      });
    }
    
    return 'メモに関するコマンドが認識できませんでした。\n\n利用可能なコマンド:\n- @メモ 作成\n- @メモ 一覧\n- @メモ 検索 [キーワード]';
  }

  private async createPersonalMemo(data: {
    title: string;
    content: string;
    tags: string[];
    userId: string;
  }): Promise<PersonalMemo> {
    const now = new Date();
    
    const memo: Omit<PersonalMemo, 'memoId'> = {
      userId: data.userId,
      title: data.title,
      content: data.content,
      tags: data.tags,
      isArchived: false,
      createdAt: now,
      updatedAt: now
    };

    // AI要約の生成（非同期）
    this.generateAISummary(memo.content).then(summary => {
      if (summary) {
        this.personalMemoRepo.update(memo.memoId, { aiSummary: summary });
      }
    }).catch(error => {
      console.error('AI summary generation failed:', error);
    });

    return this.personalMemoRepo.create(memo);
  }

  private async createSharedMemo(data: {
    title: string;
    content: string;
    tags: string[];
    userId: string;
    groupId: string;
  }): Promise<SharedMemo> {
    const now = new Date();
    
    // 共有メモのテンプレートを自動判定
    const detectedTemplate = this.detectSharedMemoTemplate(data.content);
    
    const memo: Omit<SharedMemo, 'memoId'> = {
      groupId: data.groupId,
      title: data.title,
      content: data.content,
      type: detectedTemplate?.type || 'custom',
      template: detectedTemplate?.type,
      readableUserIds: [], // グループメンバーは別途設定
      editors: [{
        userId: data.userId,
        displayName: 'User', // 実際はLINEから取得
        addedAt: now,
        lastEditedAt: now
      }],
      status: 'active',
      aiStructuredContent: detectedTemplate?.data,
      lastEditedBy: data.userId,
      createdBy: data.userId,
      createdAt: now,
      updatedAt: now
    };

    return this.sharedMemoRepo.create(memo);
  }

  private async extractMemoData(messageText: string): Promise<{
    title: string;
    content: string;
    tags: string[];
    template?: string;
    templateData?: Record<string, any>;
  }> {
    // AI サービスを使用してメッセージからメモデータを抽出
    try {
      const result = await aiService.extractMemoData(messageText);
      
      // テンプレートの自動判定
      const detectedTemplate = this.detectPersonalMemoTemplate(messageText);
      if (detectedTemplate) {
        result.template = detectedTemplate.type;
        result.templateData = detectedTemplate.data;
      }
      
      return result;
    } catch (error) {
      // AI処理が失敗した場合のフォールバック
      const lines = messageText.replace(/@メモ\s*(作成)?/g, '').trim().split('\n');
      const title = lines[0] || 'untitled';
      const content = lines.join('\n');
      const tags = this.extractHashtags(messageText);
      
      // テンプレートの自動判定
      const detectedTemplate = this.detectPersonalMemoTemplate(messageText);
      
      return { 
        title, 
        content, 
        tags,
        template: detectedTemplate?.type,
        templateData: detectedTemplate?.data
      };
    }
  }

  private detectPersonalMemoTemplate(messageText: string): { 
    type: keyof typeof PERSONAL_MEMO_TEMPLATES; 
    data: Record<string, any> 
  } | null {
    const text = messageText.toLowerCase();
    
    // ビジネス用テンプレートの判定
    
    // 会議メモパターン（個人用）
    if (text.includes('会議') || text.includes('ミーティング') || text.includes('打ち合わせ')) {
      return {
        type: 'meeting_note',
        data: {
          date: new Date().toISOString(),
          participants: this.extractListItems(messageText, ['参加者', '出席者']),
          agenda: this.extractListItems(messageText, ['議題', 'アジェンダ']),
          my_notes: messageText,
          action_items: this.extractListItems(messageText, ['アクション', 'やること', 'TODO'])
        }
      };
    }
    
    // プロジェクト計画パターン
    if (text.includes('プロジェクト') || text.includes('計画') || text.includes('企画')) {
      return {
        type: 'project_plan',
        data: {
          objective: messageText,
          deliverables: this.extractListItems(messageText, ['成果物', '納品物']),
          timeline: this.extractListItems(messageText, ['スケジュール', '期限', '日程']),
          resources: this.extractListItems(messageText, ['リソース', '人員', '予算'])
        }
      };
    }
    
    // タスクリストパターン（業務）
    if (text.includes('タスク') || text.includes('業務') || text.includes('仕事') || text.includes('やること')) {
      return {
        type: 'task_list',
        data: {
          date: new Date().toISOString().split('T')[0],
          priority_high: this.extractListItems(messageText, ['緊急', '重要', '優先']),
          priority_medium: this.extractListItems(messageText, ['通常', '中程度']),
          deadlines: this.extractListItems(messageText, ['期限', '締切', 'まで'])
        }
      };
    }
    
    // ビジネスアイデアパターン
    if ((text.includes('アイデア') || text.includes('提案') || text.includes('案')) && 
        (text.includes('ビジネス') || text.includes('事業') || text.includes('サービス') || text.includes('改善'))) {
      return {
        type: 'idea_business',
        data: {
          background: messageText,
          benefits: this.extractListItems(messageText, ['メリット', '利点', '効果']),
          challenges: this.extractListItems(messageText, ['課題', '問題', 'リスク']),
          implementation: this.extractListItems(messageText, ['実装', '方法', 'やり方'])
        }
      };
    }
    
    // クライアントメモパターン
    if (text.includes('クライアント') || text.includes('顧客') || text.includes('お客様') || text.includes('取引先')) {
      return {
        type: 'client_memo',
        data: {
          contact_date: new Date().toISOString(),
          discussion_points: this.extractListItems(messageText, ['話し合い', '相談', '要望']),
          requirements: this.extractListItems(messageText, ['要件', '条件', '希望']),
          next_actions: this.extractListItems(messageText, ['次回', 'アクション', 'TODO'])
        }
      };
    }
    
    // レポート・報告書パターン
    if (text.includes('レポート') || text.includes('報告') || text.includes('まとめ') || text.includes('振り返り')) {
      return {
        type: 'report',
        data: {
          date: new Date().toISOString().split('T')[0],
          summary: messageText,
          achievements: this.extractListItems(messageText, ['成果', '実績', '達成']),
          issues: this.extractListItems(messageText, ['課題', '問題', '改善点'])
        }
      };
    }
    
    // プライベート用テンプレートの判定
    
    // 日記パターン
    if (text.includes('日記') || text.includes('今日') || text.includes('天気') || text.includes('気分')) {
      return {
        type: 'daily_diary',
        data: {
          date: new Date().toISOString().split('T')[0],
          events: this.extractListItems(messageText, ['今日', '出来事']),
          gratitude: this.extractListItems(messageText, ['感謝', 'ありがたい']),
          reflection: messageText
        }
      };
    }
    
    // 買い物リストパターン
    if (text.includes('買い物') || text.includes('購入') || text.includes('スーパー') || text.includes('リスト')) {
      return {
        type: 'shopping_list',
        data: {
          groceries: this.extractListItems(messageText, ['食材', '野菜', '肉', '魚', '牛乳', 'パン']),
          household: this.extractListItems(messageText, ['洗剤', 'ティッシュ', 'トイレ']),
          others: this.extractListItems(messageText, ['その他', 'あと'])
        }
      };
    }
    
    // 健康記録パターン
    if (text.includes('体重') || text.includes('運動') || text.includes('健康') || text.includes('ダイエット')) {
      return {
        type: 'health_record',
        data: {
          date: new Date().toISOString().split('T')[0],
          exercise: this.extractListItems(messageText, ['運動', 'ジョギング', 'ウォーキング', '筋トレ']),
          meals: this.extractListItems(messageText, ['朝食', '昼食', '夕食', '食事'])
        }
      };
    }
    
    // 学習記録パターン
    if (text.includes('勉強') || text.includes('学習') || text.includes('読書') || text.includes('研修')) {
      return {
        type: 'study_note',
        data: {
          date: new Date().toISOString().split('T')[0],
          goals: this.extractListItems(messageText, ['目標', 'ゴール']),
          key_points: this.extractListItems(messageText, ['重要', 'ポイント', 'まとめ']),
          questions: this.extractListItems(messageText, ['疑問', '質問', 'わからない'])
        }
      };
    }
    
    // 個人アイデアパターン
    if (text.includes('アイデア') || text.includes('ひらめき') || text.includes('思いつき')) {
      return {
        type: 'idea_personal',
        data: {
          description: messageText,
          benefits: this.extractListItems(messageText, ['良い', 'メリット', '効果']),
          steps: this.extractListItems(messageText, ['方法', 'やり方', 'ステップ'])
        }
      };
    }
    
    // 旅行計画パターン
    if (text.includes('旅行') || text.includes('旅') || text.includes('観光') || text.includes('お出かけ')) {
      return {
        type: 'travel_plan',
        data: {
          activities: this.extractListItems(messageText, ['やりたい', '行きたい', '見たい']),
          packing: this.extractListItems(messageText, ['持ち物', '荷物', '準備'])
        }
      };
    }
    
    return null;
  }

  private detectSharedMemoTemplate(messageText: string): { 
    type: keyof typeof import('@ai-secretary-task/shared/types').SHARED_MEMO_TEMPLATES; 
    data: Record<string, any> 
  } | null {
    const text = messageText.toLowerCase();
    
    // === ビジネス系テンプレート ===
    
    // 会議メモパターン
    if (text.includes('会議') || text.includes('ミーティング') || text.includes('打ち合わせ') || text.includes('議題')) {
      return {
        type: 'meeting',
        data: {
          date: new Date().toISOString(),
          attendees: this.extractListItems(messageText, ['参加者', '出席者', 'メンバー']),
          agenda: this.extractListItems(messageText, ['議題', 'アジェンダ', '話し合い']),
          decisions: this.extractListItems(messageText, ['決定', '決まった', '合意']),
          todos: this.extractListItems(messageText, ['TODO', 'やること', 'アクション', 'タスク']),
          nextMeeting: this.extractNextMeeting(messageText)
        }
      };
    }
    
    // クライアント打ち合わせパターン
    if ((text.includes('クライアント') || text.includes('顧客') || text.includes('取引先')) && 
        (text.includes('打ち合わせ') || text.includes('面談') || text.includes('商談'))) {
      return {
        type: 'client_meeting',
        data: {
          client_name: this.extractClientName(messageText),
          date: new Date().toISOString(),
          location: this.extractLocation(messageText),
          our_attendees: this.extractListItems(messageText, ['当社', '弊社', '我々']),
          client_attendees: this.extractListItems(messageText, ['先方', 'クライアント']),
          objectives: this.extractListItems(messageText, ['目的', '目標', 'ゴール']),
          discussion_points: this.extractListItems(messageText, ['話し合い', '議論', '相談']),
          client_requirements: this.extractListItems(messageText, ['要望', '要件', '希望']),
          our_proposals: this.extractListItems(messageText, ['提案', '案', 'プラン']),
          next_actions: this.extractListItems(messageText, ['次回', 'アクション', 'TODO'])
        }
      };
    }
    
    // デイリースタンドアップパターン
    if (text.includes('デイリー') || text.includes('朝会') || text.includes('スタンドアップ') || 
        (text.includes('昨日') && text.includes('今日') && text.includes('やること'))) {
      return {
        type: 'daily_standup',
        data: {
          date: new Date().toISOString().split('T')[0],
          sprint: this.extractSprint(messageText),
          attendees: this.extractListItems(messageText, ['参加者', 'メンバー', 'チーム']),
          yesterday_completed: this.extractListItems(messageText, ['昨日', '完了', '終わった']),
          today_plan: this.extractListItems(messageText, ['今日', '予定', 'やる']),
          blockers: this.extractListItems(messageText, ['障害', '困って', 'ブロック', '問題']),
          help_needed: this.extractListItems(messageText, ['ヘルプ', '手伝い', 'サポート']),
          sprint_progress: messageText
        }
      };
    }
    
    // スプリントプランニングパターン
    if (text.includes('スプリント') && (text.includes('計画') || text.includes('プランニング'))) {
      return {
        type: 'sprint_planning',
        data: {
          sprint_number: this.extractSprintNumber(messageText),
          start_date: new Date().toISOString().split('T')[0],
          end_date: this.extractEndDate(messageText),
          team_members: this.extractListItems(messageText, ['メンバー', 'チーム', '担当']),
          sprint_goal: this.extractSprintGoal(messageText),
          user_stories: this.extractListItems(messageText, ['ストーリー', 'タスク', '機能']),
          story_points: this.extractStoryPoints(messageText),
          capacity: this.extractCapacity(messageText),
          risks: this.extractListItems(messageText, ['リスク', '課題', '懸念']),
          dependencies: this.extractListItems(messageText, ['依存', '前提', '待ち'])
        }
      };
    }
    
    // 振り返りパターン
    if (text.includes('振り返り') || text.includes('レトロスペクティブ') || text.includes('KPT') || 
        (text.includes('良かった') && text.includes('改善'))) {
      return {
        type: 'retrospective',
        data: {
          sprint_period: this.extractPeriod(messageText),
          attendees: this.extractListItems(messageText, ['参加者', 'メンバー']),
          what_went_well: this.extractListItems(messageText, ['良かった', 'うまく', '成功']),
          what_could_improve: this.extractListItems(messageText, ['改善', '問題', '課題']),
          action_items: this.extractListItems(messageText, ['アクション', 'やること', '改善策']),
          keep_doing: this.extractListItems(messageText, ['継続', 'Keep', 'このまま']),
          start_doing: this.extractListItems(messageText, ['開始', 'Start', '新しく']),
          stop_doing: this.extractListItems(messageText, ['停止', 'Stop', 'やめる']),
          team_happiness: this.extractHappiness(messageText)
        }
      };
    }
    
    // プロジェクト管理パターン
    if (text.includes('プロジェクト') || text.includes('計画') || text.includes('企画') || text.includes('目標')) {
      return {
        type: 'project',
        data: {
          project_name: this.extractProjectName(messageText),
          start_date: new Date().toISOString().split('T')[0],
          end_date: this.extractEndDate(messageText),
          team_members: this.extractListItems(messageText, ['メンバー', 'チーム', '担当']),
          objectives: this.extractListItems(messageText, ['目標', '目的', 'ゴール']),
          milestones: this.extractListItems(messageText, ['マイルストーン', '区切り', 'フェーズ']),
          risks: this.extractListItems(messageText, ['リスク', '課題', '問題']),
          progress: messageText
        }
      };
    }
    
    // ブレインストーミングパターン
    if (text.includes('ブレインストーミング') || text.includes('アイデア出し') || text.includes('発想') || 
        text.includes('ブレスト') || (text.includes('アイデア') && text.includes('みんなで'))) {
      return {
        type: 'brainstorming',
        data: {
          theme: this.extractTheme(messageText),
          date: new Date().toISOString(),
          facilitator: this.extractFacilitator(messageText),
          participants: this.extractListItems(messageText, ['参加者', 'メンバー']),
          ground_rules: this.extractListItems(messageText, ['ルール', '前提', '約束']),
          ideas: this.extractListItems(messageText, ['アイデア', '案', '提案']),
          categories: this.extractListItems(messageText, ['カテゴリ', '分類', 'グループ']),
          top_ideas: this.extractListItems(messageText, ['有望', '良い', '採用']),
          next_steps: this.extractListItems(messageText, ['次', 'アクション', 'ステップ'])
        }
      };
    }
    
    // 研修・トレーニングパターン
    if (text.includes('研修') || text.includes('トレーニング') || text.includes('勉強会') || 
        text.includes('教育') || text.includes('スキルアップ')) {
      return {
        type: 'training',
        data: {
          training_title: this.extractTrainingTitle(messageText),
          date: new Date().toISOString(),
          instructor: this.extractInstructor(messageText),
          participants: this.extractListItems(messageText, ['参加者', '受講者']),
          objectives: this.extractListItems(messageText, ['目標', 'ゴール', '習得']),
          curriculum: this.extractListItems(messageText, ['カリキュラム', '内容', 'プログラム']),
          materials: this.extractListItems(messageText, ['教材', '資料', 'テキスト']),
          exercises: this.extractListItems(messageText, ['演習', '実習', 'ワーク']),
          feedback: this.extractListItems(messageText, ['感想', 'フィードバック', '評価']),
          follow_up: this.extractFollowUp(messageText)
        }
      };
    }
    
    // 面接パターン
    if (text.includes('面接') || text.includes('採用') || text.includes('候補者') || text.includes('選考')) {
      return {
        type: 'interview',
        data: {
          candidate_name: this.extractCandidateName(messageText),
          position: this.extractPosition(messageText),
          date: new Date().toISOString(),
          interviewers: this.extractListItems(messageText, ['面接官', '担当者']),
          questions_asked: this.extractListItems(messageText, ['質問', '聞いた']),
          candidate_responses: this.extractListItems(messageText, ['回答', '答え']),
          technical_skills: this.extractListItems(messageText, ['技術', 'スキル', '経験']),
          soft_skills: this.extractListItems(messageText, ['コミュニケーション', '人柄', '性格']),
          overall_impression: this.extractOverallImpression(messageText),
          recommendation: this.extractRecommendation(messageText),
          next_steps: this.extractListItems(messageText, ['次回', 'ステップ'])
        }
      };
    }
    
    // プレゼンテーション企画パターン
    if (text.includes('プレゼン') || text.includes('発表') || text.includes('プレゼンテーション') || 
        (text.includes('スライド') && text.includes('準備'))) {
      return {
        type: 'presentation',
        data: {
          presentation_title: this.extractPresentationTitle(messageText),
          presenter: this.extractPresenter(messageText),
          date: new Date().toISOString(),
          audience: this.extractAudience(messageText),
          duration: this.extractDuration(messageText),
          objectives: this.extractListItems(messageText, ['目的', 'ゴール']),
          key_messages: this.extractListItems(messageText, ['メッセージ', 'ポイント']),
          slide_outline: this.extractListItems(messageText, ['構成', 'アウトライン']),
          demo_content: this.extractListItems(messageText, ['デモ', '実演']),
          qa_preparation: this.extractListItems(messageText, ['Q&A', '質問', '想定']),
          success_metrics: this.extractListItems(messageText, ['成功指標', '評価'])
        }
      };
    }
    
    // === イベント系テンプレート ===
    
    // イベント企画パターン
    if (text.includes('イベント') || text.includes('企画') || text.includes('催し') || text.includes('開催')) {
      return {
        type: 'event',
        data: {
          event_name: this.extractEventName(messageText),
          date: new Date().toISOString(),
          venue: this.extractVenue(messageText),
          target_audience: this.extractTargetAudience(messageText),
          capacity: this.extractCapacity(messageText),
          agenda: this.extractListItems(messageText, ['プログラム', '内容', '予定']),
          equipment: this.extractListItems(messageText, ['機材', '設備', '必要']),
          budget: this.extractBudget(messageText),
          tasks: this.extractListItems(messageText, ['準備', 'タスク', 'やること'])
        }
      };
    }
    
    // ワークショップパターン
    if (text.includes('ワークショップ') || text.includes('ハンズオン') || 
        (text.includes('参加型') && text.includes('セミナー'))) {
      return {
        type: 'workshop',
        data: {
          workshop_title: this.extractWorkshopTitle(messageText),
          facilitator: this.extractFacilitator(messageText),
          date: new Date().toISOString(),
          participants: this.extractListItems(messageText, ['参加者', 'メンバー']),
          learning_goals: this.extractListItems(messageText, ['目標', 'ゴール', '習得']),
          activities: this.extractListItems(messageText, ['アクティビティ', '活動']),
          materials_needed: this.extractListItems(messageText, ['材料', '道具', '必要']),
          group_exercises: this.extractListItems(messageText, ['グループワーク', '演習']),
          deliverables: this.extractListItems(messageText, ['成果物', '作品']),
          feedback_method: this.extractFeedbackMethod(messageText)
        }
      };
    }
    
    // セミナー・講演会パターン
    if (text.includes('セミナー') || text.includes('講演') || text.includes('講座') || 
        (text.includes('講師') && text.includes('話'))) {
      return {
        type: 'seminar',
        data: {
          seminar_title: this.extractSeminarTitle(messageText),
          speaker: this.extractSpeaker(messageText),
          date: new Date().toISOString(),
          venue: this.extractVenue(messageText),
          target_audience: this.extractTargetAudience(messageText),
          abstract: this.extractAbstract(messageText),
          key_topics: this.extractListItems(messageText, ['トピック', '話題', '内容']),
          references: this.extractListItems(messageText, ['参考', '文献', '資料']),
          qa_time: this.extractQATime(messageText),
          networking: this.extractNetworking(messageText)
        }
      };
    }
    
    // === 社内活動系テンプレート ===
    
    // パーティー企画パターン
    if (text.includes('パーティー') || text.includes('懇親会') || text.includes('歓迎会') || text.includes('送別会')) {
      return {
        type: 'party_planning',
        data: {
          occasion: this.extractOccasion(messageText),
          date: new Date().toISOString(),
          venue: this.extractVenue(messageText),
          guest_count: this.extractGuestCount(messageText),
          invitees: this.extractListItems(messageText, ['招待', 'ゲスト', '参加者']),
          menu: this.extractListItems(messageText, ['料理', 'メニュー', '飲み物']),
          entertainment: this.extractListItems(messageText, ['演出', 'ゲーム', '余興']),
          decorations: this.extractListItems(messageText, ['装飾', '飾り', '備品']),
          budget: this.extractBudget(messageText),
          tasks: this.extractListItems(messageText, ['準備', '分担', 'やること'])
        }
      };
    }
    
    // === プライベート系テンプレート ===
    
    // お出かけメモパターン
    if (text.includes('お出かけ') || text.includes('外出') || text.includes('行く') || text.includes('遊び')) {
      return {
        type: 'outing',
        data: {
          destination: this.extractDestination(messageText),
          date: new Date().toISOString().split('T')[0],
          participants: this.extractListItems(messageText, ['参加者', 'メンバー', '一緒に']),
          transportation: this.extractTransportation(messageText),
          budget: this.extractBudget(messageText),
          items: this.extractListItems(messageText, ['持ち物', '持参', '必要']),
          schedule: this.extractListItems(messageText, ['予定', 'スケジュール', '時間']),
          notes: messageText
        }
      };
    }
    
    // 旅行計画パターン（グループ）
    if (text.includes('旅行') || text.includes('旅') || text.includes('観光') || text.includes('泊まり')) {
      return {
        type: 'trip_planning',
        data: {
          destination: this.extractDestination(messageText),
          dates: this.extractDates(messageText),
          members: this.extractListItems(messageText, ['メンバー', '参加者', '一緒に']),
          budget_per_person: this.extractBudgetPerPerson(messageText),
          accommodation: this.extractListItems(messageText, ['宿泊', 'ホテル', '旅館']),
          transportation: this.extractTransportation(messageText),
          activities: this.extractListItems(messageText, ['観光', 'アクティビティ', 'やりたい']),
          restaurants: this.extractListItems(messageText, ['レストラン', '食事', 'グルメ']),
          packing_list: this.extractListItems(messageText, ['持ち物', '荷物']),
          emergency_contacts: this.extractListItems(messageText, ['緊急', '連絡先'])
        }
      };
    }
    
    // 食事会パターン
    if (text.includes('食事会') || text.includes('グルメ') || text.includes('レストラン') || 
        (text.includes('食事') && text.includes('みんなで'))) {
      return {
        type: 'dining',
        data: {
          occasion: this.extractOccasion(messageText),
          date: new Date().toISOString(),
          restaurant: this.extractRestaurant(messageText),
          participants: this.extractListItems(messageText, ['参加者', 'メンバー']),
          cuisine_type: this.extractCuisineType(messageText),
          budget_per_person: this.extractBudgetPerPerson(messageText),
          dietary_restrictions: this.extractListItems(messageText, ['アレルギー', '制限']),
          reservation_details: this.extractReservationDetails(messageText),
          must_try_dishes: this.extractListItems(messageText, ['おすすめ', '名物']),
          payment_method: this.extractPaymentMethod(messageText)
        }
      };
    }
    
    return null;
  }

  private extractListItems(text: string, keywords: string[]): string[] {
    const items: string[] = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      // リスト形式（-、・、数字.）の行を抽出
      if (line.match(/^[\s]*[-・•]\s*(.+)$/) || line.match(/^\s*\d+\.\s*(.+)$/)) {
        const match = line.match(/^[\s]*[-・•]\s*(.+)$/) || line.match(/^\s*\d+\.\s*(.+)$/);
        if (match) {
          items.push(match[1].trim());
        }
      }
      
      // キーワードを含む行も抽出
      for (const keyword of keywords) {
        if (line.includes(keyword) && !items.includes(line.trim())) {
          items.push(line.trim());
        }
      }
    }
    
    return items;
  }

  private extractSearchTerm(messageText: string): string {
    const match = messageText.match(/@メモ\s+検索\s+(.+)/);
    return match ? match[1].trim() : '';
  }

  private extractSearchKeywords(messageText: string): string {
    // 簡単なキーワード抽出
    return messageText.replace(/[?？!！。、,，\s]+/g, ' ').trim();
  }

  private extractHashtags(text: string): string[] {
    const hashtags = text.match(/#[^\s#]+/g) || [];
    return hashtags.map(tag => tag.substring(1));
  }

  private isMemoCreationIntent(messageText: string): boolean {
    const patterns = [
      /メモ.*作成/,
      /記録.*し/,
      /覚え.*おき/,
      /メモ.*残/
    ];
    
    return patterns.some(pattern => pattern.test(messageText));
  }

  private isSearchIntent(messageText: string): boolean {
    const patterns = [
      /探し/,
      /検索/,
      /見つけ/,
      /.*について.*教え/
    ];
    
    return patterns.some(pattern => pattern.test(messageText));
  }

  private async generateAISummary(content: string): Promise<string | null> {
    try {
      return await aiService.generateSummary(content);
    } catch (error) {
      console.error('AI summary generation failed:', error);
      return null;
    }
  }

  // === 既存の抽出メソッド ===
  private extractNextMeeting(text: string): string {
    const matches = text.match(/(次回|来週|来月).+?([0-9]+月[0-9]+日|[0-9]+\/[0-9]+)/g);
    return matches ? matches[0] : '';
  }

  private extractDestination(text: string): string {
    const patterns = [
      /(.*?)に行く/,
      /(.*?)へ行く/,
      /目的地[：:](.*)/,
      /場所[：:](.*)/
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    return '';
  }

  private extractTransportation(text: string): string {
    const transports = ['電車', '車', 'バス', '飛行機', '新幹線', '徒歩', '自転車'];
    for (const transport of transports) {
      if (text.includes(transport)) return transport;
    }
    return '';
  }

  private extractBudget(text: string): number | null {
    const match = text.match(/([0-9,]+)円/);
    return match ? parseInt(match[1].replace(',', '')) : null;
  }

  private extractProjectName(text: string): string {
    const patterns = [
      /プロジェクト名[：:](.+)/,
      /「(.+?)」プロジェクト/,
      /(.+?)プロジェクト/
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    return '';
  }

  private extractEndDate(text: string): string {
    const match = text.match(/(終了|完了|納期)[：:]?(.+?)([0-9]+月[0-9]+日|[0-9]+\/[0-9]+)/);
    return match ? match[3] : '';
  }

  private extractEventName(text: string): string {
    const patterns = [
      /イベント名[：:](.+)/,
      /「(.+?)」イベント/,
      /(.+?)イベント/
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    return '';
  }

  private extractVenue(text: string): string {
    const patterns = [
      /会場[：:](.+)/,
      /場所[：:](.+)/,
      /で開催/,
      /にて/
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    return '';
  }

  private extractTargetAudience(text: string): string {
    const patterns = [
      /対象[：:](.+)/,
      /参加対象[：:](.+)/,
      /(.+?)向け/
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    return '';
  }

  private extractCapacity(text: string): number | null {
    const match = text.match(/定員[：:]?([0-9]+)人?/);
    return match ? parseInt(match[1]) : null;
  }

  private extractFacilitator(text: string): string {
    const patterns = [
      /講師[：:](.+)/,
      /ファシリテーター[：:](.+)/,
      /進行[：:](.+)/,
      /(.+?)さんが/
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    return '';
  }

  private extractDates(text: string): string {
    const patterns = [
      /([0-9]+月[0-9]+日)から([0-9]+月[0-9]+日)/,
      /([0-9]+\/[0-9]+)から([0-9]+\/[0-9]+)/,
      /([0-9]+月[0-9]+日)/,
      /([0-9]+\/[0-9]+)/
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[0];
    }
    return '';
  }

  private extractBudgetPerPerson(text: string): number | null {
    const match = text.match(/(一人当たり|一人)[：:]?([0-9,]+)円/);
    return match ? parseInt(match[2].replace(',', '')) : null;
  }

  private extractOccasion(text: string): string {
    const occasions = ['歓迎会', '送別会', '懇親会', 'パーティー', '誕生日', '記念'];
    for (const occasion of occasions) {
      if (text.includes(occasion)) return occasion;
    }
    return '';
  }

  private extractGuestCount(text: string): number | null {
    const match = text.match(/([0-9]+)人/);
    return match ? parseInt(match[1]) : null;
  }

  private extractTheme(text: string): string {
    const patterns = [
      /テーマ[：:](.+)/,
      /課題[：:](.+)/,
      /(.+?)について/
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    return '';
  }

  // === 新しい抽出メソッド ===
  private extractClientName(text: string): string {
    const patterns = [
      /クライアント[：:](.+)/,
      /顧客[：:](.+)/,
      /(.+?)社/,
      /(.+?)様/
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    return '';
  }

  private extractLocation(text: string): string {
    const patterns = [
      /場所[：:](.+)/,
      /会場[：:](.+)/,
      /(.+?)で開催/,
      /(.+?)にて/
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    return '';
  }

  private extractSprint(text: string): string {
    const match = text.match(/スプリント[：:]?([0-9]+|[A-Z]+)/);
    return match ? match[1] : '';
  }

  private extractSprintNumber(text: string): string {
    const match = text.match(/スプリント[：:]?([0-9]+)/);
    return match ? `Sprint ${match[1]}` : '';
  }

  private extractSprintGoal(text: string): string {
    const patterns = [
      /ゴール[：:](.+)/,
      /目標[：:](.+)/,
      /目的[：:](.+)/
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    return '';
  }

  private extractStoryPoints(text: string): number | null {
    const match = text.match(/([0-9]+)ポイント/);
    return match ? parseInt(match[1]) : null;
  }

  private extractPeriod(text: string): string {
    const patterns = [
      /([0-9]+月[0-9]+日)\s*[〜～-]\s*([0-9]+月[0-9]+日)/,
      /スプリント[：:]?([0-9]+)/
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[0];
    }
    return '';
  }

  private extractHappiness(text: string): number | null {
    const match = text.match(/満足度[：:]?([0-9]+)/);
    return match ? parseInt(match[1]) : null;
  }

  private extractTrainingTitle(text: string): string {
    const patterns = [
      /研修[：:](.+)/,
      /トレーニング[：:](.+)/,
      /「(.+?)」研修/
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    return '';
  }

  private extractInstructor(text: string): string {
    const patterns = [
      /講師[：:](.+)/,
      /インストラクター[：:](.+)/,
      /(.+?)先生/
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    return '';
  }

  private extractFollowUp(text: string): string {
    const patterns = [
      /フォローアップ[：:](.+)/,
      /次回[：:](.+)/,
      /継続[：:](.+)/
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    return '';
  }

  private extractCandidateName(text: string): string {
    const patterns = [
      /候補者[：:](.+)/,
      /面接者[：:](.+)/,
      /(.+?)さんの面接/
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    return '';
  }

  private extractPosition(text: string): string {
    const patterns = [
      /ポジション[：:](.+)/,
      /職種[：:](.+)/,
      /(.+?)エンジニア/,
      /(.+?)の募集/
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    return '';
  }

  private extractOverallImpression(text: string): string {
    const patterns = [
      /印象[：:](.+)/,
      /評価[：:](.+)/,
      /総合的に(.+)/
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    return '';
  }

  private extractRecommendation(text: string): string {
    const patterns = [
      /推薦[：:](.+)/,
      /判定[：:](.+)/,
      /(合格|不合格|保留)/
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    return '';
  }

  private extractPresentationTitle(text: string): string {
    const patterns = [
      /プレゼン[：:](.+)/,
      /発表[：:](.+)/,
      /「(.+?)」について/
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    return '';
  }

  private extractPresenter(text: string): string {
    const patterns = [
      /発表者[：:](.+)/,
      /プレゼンター[：:](.+)/,
      /(.+?)が発表/
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    return '';
  }

  private extractAudience(text: string): string {
    const patterns = [
      /対象[：:](.+)/,
      /聴衆[：:](.+)/,
      /(.+?)向け/
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    return '';
  }

  private extractDuration(text: string): string {
    const match = text.match(/([0-9]+)分/);
    return match ? `${match[1]}分` : '';
  }

  private extractWorkshopTitle(text: string): string {
    const patterns = [
      /ワークショップ[：:](.+)/,
      /「(.+?)」ワークショップ/
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    return '';
  }

  private extractFeedbackMethod(text: string): string {
    const patterns = [
      /フィードバック[：:](.+)/,
      /評価方法[：:](.+)/
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    return '';
  }

  private extractSeminarTitle(text: string): string {
    const patterns = [
      /セミナー[：:](.+)/,
      /講演[：:](.+)/,
      /「(.+?)」セミナー/
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    return '';
  }

  private extractSpeaker(text: string): string {
    const patterns = [
      /講師[：:](.+)/,
      /講演者[：:](.+)/,
      /(.+?)先生/
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    return '';
  }

  private extractAbstract(text: string): string {
    const patterns = [
      /概要[：:](.+)/,
      /内容[：:](.+)/,
      /について(.+)/
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    return '';
  }

  private extractQATime(text: string): string {
    const match = text.match(/Q&A[：:]?([0-9]+)分/);
    return match ? `${match[1]}分` : '';
  }

  private extractNetworking(text: string): string {
    const patterns = [
      /交流会[：:](.+)/,
      /懇親会[：:](.+)/,
      /ネットワーキング[：:](.+)/
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    return '';
  }

  private extractRestaurant(text: string): string {
    const patterns = [
      /レストラン[：:](.+)/,
      /お店[：:](.+)/,
      /(.+?)で食事/
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    return '';
  }

  private extractCuisineType(text: string): string {
    const cuisines = ['和食', '洋食', '中華', 'イタリアン', 'フレンチ', '韓国料理', 'タイ料理'];
    for (const cuisine of cuisines) {
      if (text.includes(cuisine)) return cuisine;
    }
    return '';
  }

  private extractReservationDetails(text: string): string {
    const patterns = [
      /予約[：:](.+)/,
      /([0-9]+)名で予約/,
      /([0-9]+:[0-9]+)に予約/
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    return '';
  }

  private extractPaymentMethod(text: string): string {
    const methods = ['割り勘', '個別会計', 'おごり', '会社負担'];
    for (const method of methods) {
      if (text.includes(method)) return method;
    }
    return '';
  }

  // === SNS関連メソッド ===

  /**
   * SNSリンクを抽出
   */
  private extractSNSUrls(text: string): string[] {
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    const urls = text.match(urlPattern) || [];
    
    return urls.filter(url => {
      const platform = snsScraperService.detectPlatform(url);
      return platform === 'instagram' || platform === 'tiktok';
    });
  }

  /**
   * SNSメモを処理
   */
  private async handleSNSMemo(context: MemoContext, snsUrls: string[]): Promise<string> {
    const { userId, messageText } = context;
    
    try {
      // 複数URLがある場合は最初のURLを処理
      const firstUrl = snsUrls[0];
      const snsPost = await snsScraperService.scrapePost(firstUrl);
      
      if (!snsPost) {
        return 'SNS投稿の取得に失敗しました。URLが正しいかご確認ください。';
      }

      // AIでカテゴリを判定
      const category = await this.categorizeSNSPost(snsPost, messageText);
      const templateType = this.getSNSTemplateType(snsPost.platform, category);
      
      // SNSメモを作成
      const memo = await this.createSNSMemo({
        userId,
        snsPost,
        templateType,
        userMessage: messageText,
        category
      });

      return `📱 ${snsPost.platform === 'instagram' ? 'Instagram' : 'TikTok'}投稿から「${memo.title}」メモを作成しました！\n\n投稿者: @${snsPost.author.username}\n${snsPost.location ? `📍 ${snsPost.location.name}\n` : ''}詳細はLIFFアプリで確認できます。`;

    } catch (error) {
      console.error('SNS memo creation error:', error);
      return 'SNS投稿の解析中にエラーが発生しました。しばらく後に再度お試しください。';
    }
  }

  /**
   * SNS投稿をカテゴライズ
   */
  private async categorizeSNSPost(snsPost: SNSPost, userMessage: string): Promise<'place' | 'food' | 'inspiration'> {
    const caption = snsPost.content.caption || snsPost.content.description || '';
    const hashtags = snsPost.content.hashtags.join(' ');
    const location = snsPost.location?.name || '';
    
    // キーワードベースの分類
    const text = `${caption} ${hashtags} ${location} ${userMessage}`.toLowerCase();
    
    // 食べ物関連キーワード
    const foodKeywords = ['食事', '料理', 'グルメ', 'レストラン', 'カフェ', '美味しい', 'おいしい', 
                         'ランチ', 'ディナー', 'スイーツ', 'デザート', 'パン', 'ケーキ', '食べたい',
                         'restaurant', 'cafe', 'food', 'delicious', 'yummy', 'lunch', 'dinner'];
    
    // 場所関連キーワード  
    const placeKeywords = ['場所', '観光', '旅行', 'スポット', '行きたい', '訪れたい', 'おでかけ',
                          '景色', '絶景', '写真', 'インスタ映え', '撮影', 'デート', 'travel', 'place', 'spot'];

    if (foodKeywords.some(keyword => text.includes(keyword))) {
      return 'food';
    } else if (placeKeywords.some(keyword => text.includes(keyword)) || location) {
      return 'place';
    } else {
      return 'inspiration';
    }
  }

  /**
   * SNSテンプレートタイプを取得
   */
  private getSNSTemplateType(platform: 'instagram' | 'tiktok', category: 'place' | 'food' | 'inspiration'): keyof typeof PERSONAL_MEMO_TEMPLATES {
    if (category === 'inspiration') {
      return 'sns_inspiration';
    }
    
    return `${platform}_${category}` as keyof typeof PERSONAL_MEMO_TEMPLATES;
  }

  /**
   * SNSメモを作成
   */
  private async createSNSMemo(data: {
    userId: string;
    snsPost: SNSPost;
    templateType: keyof typeof PERSONAL_MEMO_TEMPLATES;
    userMessage: string;
    category: 'place' | 'food' | 'inspiration';
  }): Promise<PersonalMemo> {
    const { userId, snsPost, templateType, userMessage, category } = data;
    const now = new Date();
    
    // タイトルを生成
    const title = this.generateSNSMemoTitle(snsPost, category);
    
    // コンテンツを生成
    const content = this.generateSNSMemoContent(snsPost, userMessage);
    
    // テンプレートデータを生成
    const templateData = this.generateSNSTemplateData(snsPost, category, userMessage);
    
    // タグを生成
    const tags = this.generateSNSTags(snsPost, category);

    const memo: Omit<PersonalMemo, 'memoId'> = {
      userId,
      title,
      content,
      tags,
      template: templateType,
      templateData,
      snsPostData: snsPost,
      isArchived: false,
      createdAt: now,
      updatedAt: now
    };

    return this.personalMemoRepo.create(memo);
  }

  /**
   * SNSメモのタイトルを生成
   */
  private generateSNSMemoTitle(snsPost: SNSPost, category: 'place' | 'food' | 'inspiration'): string {
    const platform = snsPost.platform === 'instagram' ? 'Instagram' : 'TikTok';
    
    if (category === 'place' && snsPost.location?.name) {
      return `${platform}: ${snsPost.location.name}`;
    } else if (category === 'food' && snsPost.location?.name) {
      return `${platform} グルメ: ${snsPost.location.name}`;
    } else if (snsPost.content.caption || snsPost.content.description) {
      const caption = snsPost.content.caption || snsPost.content.description || '';
      const shortCaption = caption.length > 30 ? caption.substring(0, 30) + '...' : caption;
      return `${platform}: ${shortCaption}`;
    } else {
      return `${platform} 投稿 by @${snsPost.author.username}`;
    }
  }

  /**
   * SNSメモのコンテンツを生成
   */
  private generateSNSMemoContent(snsPost: SNSPost, userMessage: string): string {
    const platform = snsPost.platform === 'instagram' ? 'Instagram' : 'TikTok';
    const caption = snsPost.content.caption || snsPost.content.description || '';
    
    let content = `【${platform}投稿から自動作成】\n\n`;
    content += `📱 投稿者: @${snsPost.author.username}\n`;
    
    if (snsPost.author.displayName && snsPost.author.displayName !== snsPost.author.username) {
      content += `👤 表示名: ${snsPost.author.displayName}\n`;
    }
    
    if (snsPost.location?.name) {
      content += `📍 場所: ${snsPost.location.name}\n`;
    }
    
    if (caption) {
      content += `\n💬 投稿内容:\n${caption}\n`;
    }
    
    if (snsPost.content.hashtags.length > 0) {
      content += `\n🏷️ ハッシュタグ: ${snsPost.content.hashtags.map(tag => `#${tag}`).join(' ')}\n`;
    }
    
    if (userMessage && !userMessage.includes('http')) {
      content += `\n📝 メモ: ${userMessage}\n`;
    }
    
    content += `\n🔗 元の投稿: ${snsPost.url}`;
    
    return content;
  }

  /**
   * SNSテンプレートデータを生成
   */
  private generateSNSTemplateData(snsPost: SNSPost, category: 'place' | 'food' | 'inspiration', userMessage: string): Record<string, any> {
    const data: Record<string, any> = {
      sns_url: snsPost.url,
      author_info: `@${snsPost.author.username}${snsPost.author.displayName ? ` (${snsPost.author.displayName})` : ''}`,
      saved_date: new Date().toISOString().split('T')[0],
    };

    if (category === 'place') {
      data.place_name = snsPost.location?.name || this.extractPlaceNameFromContent(snsPost);
      data.location = snsPost.location?.address || snsPost.location?.name || '';
      data.place_type = this.inferPlaceType(snsPost);
      data.what_to_do = this.extractActivitiesFromContent(snsPost);
      data.notes = userMessage;
    } else if (category === 'food') {
      data.restaurant_name = snsPost.location?.name || this.extractRestaurantNameFromContent(snsPost);
      data.location = snsPost.location?.address || snsPost.location?.name || '';
      data.cuisine_type = this.inferCuisineType(snsPost);
      data.recommended_dishes = this.extractDishesFromContent(snsPost);
      data.notes = userMessage;
    } else if (category === 'inspiration') {
      data.inspiration_type = this.inferInspirationType(snsPost);
      data.main_idea = snsPost.content.caption || snsPost.content.description || '';
      data.why_inspiring = userMessage;
      data.notes = userMessage;
    }

    return data;
  }

  /**
   * SNSタグを生成
   */
  private generateSNSTags(snsPost: SNSPost, category: 'place' | 'food' | 'inspiration'): string[] {
    const tags = [snsPost.platform];
    
    // カテゴリベースのタグ
    switch (category) {
      case 'place':
        tags.push('行きたい場所', 'おでかけ');
        break;
      case 'food':
        tags.push('グルメ', '食べたい');
        break;
      case 'inspiration':
        tags.push('インスピレーション', 'アイデア');
        break;
    }
    
    // ハッシュタグから有用なものを抽出
    const relevantHashtags = snsPost.content.hashtags
      .filter(tag => tag.length > 1 && tag.length < 20)
      .slice(0, 3); // 最大3つまで
    
    tags.push(...relevantHashtags);
    
    return tags;
  }

  // === SNSコンテンツ解析ヘルパーメソッド ===

  private extractPlaceNameFromContent(snsPost: SNSPost): string {
    const content = snsPost.content.caption || snsPost.content.description || '';
    // 場所名抽出ロジック（シンプルな実装）
    const placePatterns = [
      /(?:で|@|at|in)\s*([^\s\n]+)/,
      /([^\s\n]+)(?:に行った|を訪れた|にて)/
    ];
    
    for (const pattern of placePatterns) {
      const match = content.match(pattern);
      if (match) return match[1];
    }
    
    return '';
  }

  private extractRestaurantNameFromContent(snsPost: SNSPost): string {
    const content = snsPost.content.caption || snsPost.content.description || '';
    // レストラン名抽出ロジック
    const restaurantPatterns = [
      /([^\s\n]+)(?:で食事|でランチ|でディナー)/,
      /(?:@|at)\s*([^\s\n]+)/
    ];
    
    for (const pattern of restaurantPatterns) {
      const match = content.match(pattern);
      if (match) return match[1];
    }
    
    return '';
  }

  private inferPlaceType(snsPost: SNSPost): string {
    const content = (snsPost.content.caption || snsPost.content.description || '').toLowerCase();
    const hashtags = snsPost.content.hashtags.join(' ').toLowerCase();
    const text = `${content} ${hashtags}`;
    
    const typeMap = {
      'カフェ': ['cafe', 'カフェ', 'coffee'],
      '公園': ['park', '公園', 'パーク'],
      '美術館': ['museum', '美術館', 'ミュージアム'],
      '神社・寺': ['shrine', '神社', '寺', 'temple'],
      'ショッピング': ['shop', 'shopping', 'ショッピング', '買い物'],
      '自然': ['nature', '自然', '山', '海', 'beach', 'mountain'],
    };
    
    for (const [type, keywords] of Object.entries(typeMap)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return type;
      }
    }
    
    return 'その他';
  }

  private inferCuisineType(snsPost: SNSPost): string {
    const content = (snsPost.content.caption || snsPost.content.description || '').toLowerCase();
    const hashtags = snsPost.content.hashtags.join(' ').toLowerCase();
    const text = `${content} ${hashtags}`;
    
    const cuisineMap = {
      '和食': ['和食', '寿司', 'sushi', '天ぷら', 'ramen', 'ラーメン'],
      'イタリアン': ['italian', 'pizza', 'pasta', 'ピザ', 'パスタ'],
      'フレンチ': ['french', 'フレンチ'],
      '中華': ['chinese', '中華', '餃子'],
      'カフェ': ['cafe', 'coffee', 'カフェ', 'コーヒー'],
      'スイーツ': ['dessert', 'cake', 'sweets', 'スイーツ', 'ケーキ'],
    };
    
    for (const [cuisine, keywords] of Object.entries(cuisineMap)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return cuisine;
      }
    }
    
    return 'その他';
  }

  private inferInspirationType(snsPost: SNSPost): string {
    const content = (snsPost.content.caption || snsPost.content.description || '').toLowerCase();
    const hashtags = snsPost.content.hashtags.join(' ').toLowerCase();
    const text = `${content} ${hashtags}`;
    
    const typeMap = {
      'ファッション': ['fashion', 'outfit', 'ファッション', 'コーデ'],
      'インテリア': ['interior', 'home', 'room', 'インテリア', '部屋'],
      'ライフスタイル': ['lifestyle', 'life', 'daily', 'ライフスタイル'],
      '料理・レシピ': ['recipe', 'cooking', 'レシピ', '料理'],
      '美容': ['beauty', 'makeup', 'skincare', '美容', 'メイク'],
      'フィットネス': ['fitness', 'workout', 'gym', 'フィットネス', 'ワークアウト'],
    };
    
    for (const [type, keywords] of Object.entries(typeMap)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return type;
      }
    }
    
    return 'その他';
  }

  private extractActivitiesFromContent(snsPost: SNSPost): string[] {
    const content = snsPost.content.caption || snsPost.content.description || '';
    const activities: string[] = [];
    
    // 活動を示すパターンを抽出
    const activityPatterns = [
      /([^。\n]+)したい/g,
      /([^。\n]+)を見る/g,
      /([^。\n]+)を楽しむ/g,
    ];
    
    for (const pattern of activityPatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        activities.push(match[1].trim());
      }
    }
    
    return activities.slice(0, 5); // 最大5つまで
  }

  private extractDishesFromContent(snsPost: SNSPost): string[] {
    const content = snsPost.content.caption || snsPost.content.description || '';
    const dishes: string[] = [];
    
    // 料理名を示すパターンを抽出
    const dishPatterns = [
      /([^。\n]+)が美味しい/g,
      /([^。\n]+)がおすすめ/g,
      /([^。\n]+)を食べた/g,
    ];
    
    for (const pattern of dishPatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        dishes.push(match[1].trim());
      }
    }
    
    return dishes.slice(0, 5); // 最大5つまで
  }

  /**
   * 画像OCRメモを処理（SNSスクリーンショット対応）
   */
  private async handleImageOCRMemo(context: MemoContext): Promise<string> {
    const { userId, groupId, messageText, imageBuffers } = context;
    
    if (!imageBuffers || imageBuffers.length === 0) {
      return '画像が添付されていません。';
    }

    try {
      let allExtractedText = '';
      let totalCost = 0;
      const ocrResults = [];

      // 複数画像の処理（最大3枚まで）
      const imagesToProcess = imageBuffers.slice(0, 3);
      
      for (let i = 0; i < imagesToProcess.length; i++) {
        const imageBuffer = imagesToProcess[i];
        
        // コスト最適化されたOCR実行
        const ocrResult = await imageOCRService.extractTextFromImage(imageBuffer, {
          maxCost: 2.0, // 1枚あたり最大2ドル
          contextHint: messageText.includes('インスタ') || messageText.includes('TikTok') ? 'sns_screenshot' : 'general'
        });

        ocrResults.push(ocrResult);
        allExtractedText += `\n\n【画像${i + 1}】\n${ocrResult.text}`;
        totalCost += ocrResult.metadata.estimatedCost || 0;
      }

      if (!allExtractedText.trim()) {
        return 'テキストを抽出できませんでした。画像が不鮮明である可能性があります。';
      }

      // 抽出されたテキストとユーザーメッセージを組み合わせてメモ作成
      const combinedText = `${messageText}\n\n【画像から抽出されたテキスト】${allExtractedText}`;
      
      // SNS投稿っぽい内容かどうかを判定
      const isSNSContent = this.detectSNSContent(allExtractedText);
      
      if (isSNSContent && !groupId) {
        // SNSっぽい内容の場合はSNSメモとして作成
        return this.createOCRBasedSNSMemo({
          userId,
          extractedText: allExtractedText,
          userMessage: messageText,
          ocrResults,
          totalCost
        });
      } else {
        // 一般的なメモとして作成
        return this.createOCRBasedGeneralMemo({
          userId,
          groupId,
          extractedText: allExtractedText,
          userMessage: messageText,
          ocrResults,
          totalCost
        });
      }

    } catch (error) {
      console.error('Image OCR processing error:', error);
      return '画像の解析中にエラーが発生しました。しばらく後に再度お試しください。';
    }
  }

  /**
   * SNSコンテンツを検出
   */
  private detectSNSContent(extractedText: string): boolean {
    const snsIndicators = [
      'いいね', 'likes', 'フォロー', 'follow', 'コメント', 'comment',
      'シェア', 'share', 'リツイート', 'retweet', '投稿', 'post',
      '#', '@', 'Instagram', 'TikTok', 'Twitter', 'Facebook',
      '再生', 'views', 'ストーリー', 'story'
    ];

    const text = extractedText.toLowerCase();
    return snsIndicators.some(indicator => text.includes(indicator.toLowerCase()));
  }

  /**
   * OCRベースのSNSメモを作成
   */
  private async createOCRBasedSNSMemo(data: {
    userId: string;
    extractedText: string;
    userMessage: string;
    ocrResults: any[];
    totalCost: number;
  }): Promise<string> {
    const { userId, extractedText, userMessage, ocrResults, totalCost } = data;
    
    // AIでSNSコンテンツを解析
    const analysisResult = await aiService.analyzeSNSScreenshot(extractedText, userMessage);
    
    const title = analysisResult.title || 'SNSスクリーンショット';
    const content = this.generateOCRMemoContent(extractedText, userMessage, analysisResult);
    const tags = [
      ...analysisResult.tags || [],
      'スクリーンショット',
      'OCR作成',
      ...(analysisResult.platform ? [analysisResult.platform] : [])
    ];

    const memo: Omit<PersonalMemo, 'memoId'> = {
      userId,
      title,
      content,
      tags,
      template: analysisResult.templateType || 'sns_inspiration',
      templateData: analysisResult.templateData,
      ocrData: {
        originalText: extractedText,
        processingCost: totalCost,
        confidence: this.calculateAverageConfidence(ocrResults),
        imageCount: ocrResults.length
      },
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const createdMemo = await this.personalMemoRepo.create(memo);
    
    return `📱 スクリーンショットから「${createdMemo.title}」メモを作成しました！\n\n` +
           `✨ OCR処理結果: ${ocrResults.length}枚の画像から${extractedText.length}文字を抽出\n` +
           `💰 処理コスト: $${totalCost.toFixed(4)}\n\n` +
           '詳細はLIFFアプリで確認できます。';
  }

  /**
   * OCRベースの一般メモを作成
   */
  private async createOCRBasedGeneralMemo(data: {
    userId: string;
    groupId?: string;
    extractedText: string;
    userMessage: string;
    ocrResults: any[];
    totalCost: number;
  }): Promise<string> {
    const { userId, groupId, extractedText, userMessage, ocrResults, totalCost } = data;
    
    // AIでコンテンツを解析
    const analysisResult = await aiService.analyzeOCRContent(extractedText, userMessage);
    
    const title = analysisResult.title || 'テキスト抽出メモ';
    const content = this.generateOCRMemoContent(extractedText, userMessage, analysisResult);
    const tags = [
      ...analysisResult.tags || [],
      'OCR作成',
      'テキスト抽出'
    ];

    if (groupId) {
      // 共有メモとして作成
      const memo: Omit<SharedMemo, 'memoId'> = {
        groupId,
        title,
        content,
        tags,
        createdBy: userId,
        isArchived: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const createdMemo = await this.sharedMemoRepo.create(memo);
      return `📄 画像から共有メモ「${createdMemo.title}」を作成しました！\n\n` +
             `✨ ${ocrResults.length}枚の画像から${extractedText.length}文字を抽出\n` +
             `💰 OCR処理コスト: $${totalCost.toFixed(4)}\n\n` +
             '詳細はLIFFアプリで確認できます。';
    } else {
      // 個人メモとして作成
      const memo: Omit<PersonalMemo, 'memoId'> = {
        userId,
        title,
        content,
        tags,
        template: analysisResult.templateType || 'custom',
        templateData: analysisResult.templateData,
        ocrData: {
          originalText: extractedText,
          processingCost: totalCost,
          confidence: this.calculateAverageConfidence(ocrResults),
          imageCount: ocrResults.length
        },
        isArchived: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const createdMemo = await this.personalMemoRepo.create(memo);
      return `📄 画像から「${createdMemo.title}」メモを作成しました！\n\n` +
             `✨ ${ocrResults.length}枚の画像から${extractedText.length}文字を抽出\n` +
             `💰 OCR処理コスト: $${totalCost.toFixed(4)}\n\n` +
             '詳細はLIFFアプリで確認できます。';
    }
  }

  /**
   * OCRメモのコンテンツを生成
   */
  private generateOCRMemoContent(extractedText: string, userMessage: string, analysisResult: any): string {
    let content = '';
    
    if (userMessage && userMessage.trim() !== '') {
      content += `【メッセージ】\n${userMessage}\n\n`;
    }
    
    if (analysisResult.summary) {
      content += `【AI要約】\n${analysisResult.summary}\n\n`;
    }
    
    content += `【抽出されたテキスト】\n${extractedText}`;
    
    if (analysisResult.keyPoints && analysisResult.keyPoints.length > 0) {
      content += '\n\n【重要なポイント】\n';
      analysisResult.keyPoints.forEach((point: string, index: number) => {
        content += `${index + 1}. ${point}\n`;
      });
    }
    
    return content;
  }

  /**
   * OCR結果の平均信頼度を計算
   */
  private calculateAverageConfidence(ocrResults: any[]): number {
    if (ocrResults.length === 0) return 0;
    
    const totalConfidence = ocrResults.reduce((sum, result) => sum + (result.confidence || 0), 0);
    return Math.round((totalConfidence / ocrResults.length) * 100) / 100;
  }
}

export const memoService = new MemoService();