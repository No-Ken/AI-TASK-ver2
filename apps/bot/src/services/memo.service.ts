import { PersonalMemoRepository, SharedMemoRepository } from '@ai-secretary-task/database';
import { PersonalMemo, SharedMemo } from '@ai-secretary-task/shared/types';
import { commandParser } from './command-parser';
import { aiService } from './ai.service';

interface MemoContext {
  userId: string;
  groupId?: string;
  messageText: string;
}

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
    const { userId, groupId, messageText } = context;
    
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
    
    const memo: Omit<SharedMemo, 'memoId'> = {
      groupId: data.groupId,
      title: data.title,
      content: data.content,
      type: 'custom',
      createdBy: data.userId,
      editorUserIds: [data.userId],
      viewerUserIds: [], // グループメンバーは別途設定
      lastEditedBy: data.userId,
      lastEditedAt: now,
      createdAt: now,
      updatedAt: now
    };

    return this.sharedMemoRepo.create(memo);
  }

  private async extractMemoData(messageText: string): Promise<{
    title: string;
    content: string;
    tags: string[];
  }> {
    // AI サービスを使用してメッセージからメモデータを抽出
    try {
      const result = await aiService.extractMemoData(messageText);
      return result;
    } catch (error) {
      // AI処理が失敗した場合のフォールバック
      const lines = messageText.replace(/@メモ\s*(作成)?/g, '').trim().split('\n');
      const title = lines[0] || 'untitled';
      const content = lines.join('\n');
      const tags = this.extractHashtags(messageText);
      
      return { title, content, tags };
    }
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
}

export const memoService = new MemoService();