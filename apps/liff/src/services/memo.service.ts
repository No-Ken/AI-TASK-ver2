import { PersonalMemo, SharedMemo, MemoPage } from '@ai-secretary-task/shared/types';

export interface MemoFilters {
  tags?: string[];
  viewMode?: 'timeline' | 'structure' | 'graph';
  includeArchived?: boolean;
  limit?: number;
  cursor?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  nextCursor?: string | null;
}

class MemoService {
  private baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getAuthToken();
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  private async getAuthToken(): Promise<string> {
    // LIFF環境では Firebase ID Token を取得
    if (typeof window !== 'undefined' && window.firebase) {
      const user = window.firebase.auth().currentUser;
      if (user) {
        return await user.getIdToken();
      }
    }
    
    // 開発環境用のダミートークン
    return 'DUMMY_TOKEN';
  }

  // 個人メモ関連
  async getPersonalMemos(filters: MemoFilters = {}): Promise<PaginatedResult<PersonalMemo>> {
    const params = new URLSearchParams();
    
    if (filters.viewMode) params.append('viewMode', filters.viewMode);
    if (filters.tags?.length) filters.tags.forEach(tag => params.append('tags', tag));
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.cursor) params.append('cursor', filters.cursor);
    if (filters.includeArchived) params.append('includeArchived', 'true');

    const result = await this.request<{
      memos: PersonalMemo[];
      nextCursor?: string | null;
      viewMode: string;
    }>(`/api/memos/personal?${params.toString()}`);

    return {
      data: result.memos,
      nextCursor: result.nextCursor
    };
  }

  async createPersonalMemo(data: {
    title: string;
    content: string;
    tags?: string[];
    parentPageId?: string;
  }): Promise<PersonalMemo> {
    const result = await this.request<{
      memoId: string;
      memo: PersonalMemo;
    }>('/api/memos/personal', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    return result.memo;
  }

  async getPersonalMemo(memoId: string): Promise<PersonalMemo> {
    const result = await this.request<{
      memo: PersonalMemo;
    }>(`/api/memos/personal/${memoId}`);

    return result.memo;
  }

  async updatePersonalMemo(
    memoId: string,
    data: {
      title?: string;
      content?: string;
      tags?: string[];
      isArchived?: boolean;
    }
  ): Promise<PersonalMemo> {
    const result = await this.request<{
      memo: PersonalMemo;
    }>(`/api/memos/personal/${memoId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });

    return result.memo;
  }

  async deletePersonalMemo(memoId: string): Promise<void> {
    await this.request(`/api/memos/personal/${memoId}`, {
      method: 'DELETE',
    });
  }

  // 共有メモ関連
  async getSharedMemos(groupId: string, filters: Pick<MemoFilters, 'limit' | 'cursor'> = {}): Promise<PaginatedResult<SharedMemo>> {
    const params = new URLSearchParams();
    params.append('groupId', groupId);
    
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.cursor) params.append('cursor', filters.cursor);

    const result = await this.request<{
      memos: SharedMemo[];
      nextCursor?: string | null;
    }>(`/api/memos/shared?${params.toString()}`);

    return {
      data: result.memos,
      nextCursor: result.nextCursor
    };
  }

  async createSharedMemo(data: {
    title: string;
    content: string;
    type?: 'meeting' | 'outing' | 'custom';
    groupId: string;
    editorUserIds?: string[];
    aiStructuredContent?: Record<string, any>;
  }): Promise<SharedMemo> {
    const result = await this.request<{
      memoId: string;
      memo: SharedMemo;
    }>('/api/memos/shared', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    return result.memo;
  }

  async getSharedMemo(memoId: string): Promise<SharedMemo> {
    const result = await this.request<{
      memo: SharedMemo;
    }>(`/api/memos/shared/${memoId}`);

    return result.memo;
  }

  async updateSharedMemo(
    memoId: string,
    data: {
      title?: string;
      content?: string;
      aiStructuredContent?: Record<string, any>;
    }
  ): Promise<SharedMemo> {
    const result = await this.request<{
      memo: SharedMemo;
    }>(`/api/memos/shared/${memoId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });

    return result.memo;
  }

  async deleteSharedMemo(memoId: string): Promise<void> {
    await this.request(`/api/memos/shared/${memoId}`, {
      method: 'DELETE',
    });
  }

  // メモページ関連
  async getMemoPages(parentPageId?: string): Promise<MemoPage[]> {
    const params = new URLSearchParams();
    if (parentPageId) params.append('parentPageId', parentPageId);

    const result = await this.request<{
      pages: MemoPage[];
    }>(`/api/memos/pages?${params.toString()}`);

    return result.pages;
  }

  async createMemoPage(data: {
    title: string;
    description?: string;
    parentPageId?: string;
  }): Promise<MemoPage> {
    const result = await this.request<{
      pageId: string;
      page: MemoPage;
    }>('/api/memos/pages', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    return result.page;
  }
}

export const memoService = new MemoService();