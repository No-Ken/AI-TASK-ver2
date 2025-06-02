import { useQuery, useMutation, useQueryClient } from 'react-query';
import { memoService, MemoFilters, PaginatedResult } from '../services/memo.service';
import { PersonalMemo, SharedMemo, MemoPage } from '@ai-secretary-task/shared/types';

// 個人メモ関連フック
export function usePersonalMemos(filters: MemoFilters = {}) {
  return useQuery(
    ['personalMemos', filters],
    () => memoService.getPersonalMemos(filters),
    {
      staleTime: 5 * 60 * 1000, // 5分
      keepPreviousData: true,
    }
  );
}

export function usePersonalMemo(memoId: string | undefined) {
  return useQuery(
    ['personalMemo', memoId],
    () => memoService.getPersonalMemo(memoId!),
    {
      enabled: !!memoId,
      staleTime: 5 * 60 * 1000,
    }
  );
}

export function useCreatePersonalMemo() {
  const queryClient = useQueryClient();

  return useMutation(
    (data: {
      title: string;
      content: string;
      tags?: string[];
      parentPageId?: string;
    }) => memoService.createPersonalMemo(data),
    {
      onSuccess: () => {
        // 個人メモ一覧のキャッシュを無効化
        queryClient.invalidateQueries(['personalMemos']);
      },
    }
  );
}

export function useUpdatePersonalMemo() {
  const queryClient = useQueryClient();

  return useMutation(
    ({ memoId, data }: {
      memoId: string;
      data: {
        title?: string;
        content?: string;
        tags?: string[];
        isArchived?: boolean;
      };
    }) => memoService.updatePersonalMemo(memoId, data),
    {
      onSuccess: (updatedMemo) => {
        // 特定のメモのキャッシュを更新
        queryClient.setQueryData(['personalMemo', updatedMemo.memoId], updatedMemo);
        // 一覧のキャッシュを無効化
        queryClient.invalidateQueries(['personalMemos']);
      },
    }
  );
}

export function useDeletePersonalMemo() {
  const queryClient = useQueryClient();

  return useMutation(
    (memoId: string) => memoService.deletePersonalMemo(memoId),
    {
      onSuccess: () => {
        // 個人メモ関連のキャッシュを無効化
        queryClient.invalidateQueries(['personalMemos']);
        queryClient.invalidateQueries(['personalMemo']);
      },
    }
  );
}

// 共有メモ関連フック
export function useSharedMemos(groupId: string, filters: Pick<MemoFilters, 'limit' | 'cursor'> = {}) {
  return useQuery(
    ['sharedMemos', groupId, filters],
    () => memoService.getSharedMemos(groupId, filters),
    {
      enabled: !!groupId,
      staleTime: 5 * 60 * 1000,
      keepPreviousData: true,
    }
  );
}

export function useSharedMemo(memoId: string | undefined) {
  return useQuery(
    ['sharedMemo', memoId],
    () => memoService.getSharedMemo(memoId!),
    {
      enabled: !!memoId,
      staleTime: 5 * 60 * 1000,
    }
  );
}

export function useCreateSharedMemo() {
  const queryClient = useQueryClient();

  return useMutation(
    (data: {
      title: string;
      content: string;
      type?: 'meeting' | 'outing' | 'custom';
      groupId: string;
      editorUserIds?: string[];
      aiStructuredContent?: Record<string, any>;
    }) => memoService.createSharedMemo(data),
    {
      onSuccess: (newMemo) => {
        // 該当グループの共有メモ一覧のキャッシュを無効化
        queryClient.invalidateQueries(['sharedMemos', newMemo.groupId]);
      },
    }
  );
}

export function useUpdateSharedMemo() {
  const queryClient = useQueryClient();

  return useMutation(
    ({ memoId, data }: {
      memoId: string;
      data: {
        title?: string;
        content?: string;
        aiStructuredContent?: Record<string, any>;
      };
    }) => memoService.updateSharedMemo(memoId, data),
    {
      onSuccess: (updatedMemo) => {
        // 特定のメモのキャッシュを更新
        queryClient.setQueryData(['sharedMemo', updatedMemo.memoId], updatedMemo);
        // 該当グループの共有メモ一覧のキャッシュを無効化
        queryClient.invalidateQueries(['sharedMemos', updatedMemo.groupId]);
      },
    }
  );
}

export function useDeleteSharedMemo() {
  const queryClient = useQueryClient();

  return useMutation(
    (memoId: string) => memoService.deleteSharedMemo(memoId),
    {
      onSuccess: () => {
        // 共有メモ関連のキャッシュを無効化
        queryClient.invalidateQueries(['sharedMemos']);
        queryClient.invalidateQueries(['sharedMemo']);
      },
    }
  );
}

// メモページ関連フック
export function useMemoPages(parentPageId?: string) {
  return useQuery(
    ['memoPages', parentPageId],
    () => memoService.getMemoPages(parentPageId),
    {
      staleTime: 10 * 60 * 1000, // 10分
    }
  );
}

export function useCreateMemoPage() {
  const queryClient = useQueryClient();

  return useMutation(
    (data: {
      title: string;
      description?: string;
      parentPageId?: string;
    }) => memoService.createMemoPage(data),
    {
      onSuccess: (newPage) => {
        // メモページ一覧のキャッシュを無効化
        queryClient.invalidateQueries(['memoPages']);
        // 親ページがある場合、その子ページリストも無効化
        if (newPage.parentPageId) {
          queryClient.invalidateQueries(['memoPages', newPage.parentPageId]);
        }
      },
    }
  );
}

// 無限スクロール対応フック
export function useInfinitePersonalMemos(filters: Omit<MemoFilters, 'cursor'> = {}) {
  return useQuery(
    ['infinitePersonalMemos', filters],
    async () => {
      const result = await memoService.getPersonalMemos(filters);
      return {
        pages: [result],
        pageParams: [undefined],
      };
    },
    {
      staleTime: 5 * 60 * 1000,
      select: (data) => ({
        pages: data.pages || [],
        pageParams: data.pageParams || [],
      }),
    }
  );
}

export function useInfiniteSharedMemos(groupId: string, filters: Pick<MemoFilters, 'limit'> = {}) {
  return useQuery(
    ['infiniteSharedMemos', groupId, filters],
    async () => {
      const result = await memoService.getSharedMemos(groupId, filters);
      return {
        pages: [result],
        pageParams: [undefined],
      };
    },
    {
      enabled: !!groupId,
      staleTime: 5 * 60 * 1000,
      select: (data) => ({
        pages: data.pages || [],
        pageParams: data.pageParams || [],
      }),
    }
  );
}