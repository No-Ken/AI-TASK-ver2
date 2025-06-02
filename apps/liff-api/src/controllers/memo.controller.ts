import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { z } from 'zod';
import { FirestoreService } from '@ai-secretary-task/database';
import { 
  PersonalMemoSchema, 
  SharedMemoSchema, 
  MemoPageSchema,
  PersonalMemo,
  SharedMemo,
  MemoPage
} from '@ai-secretary-task/shared/types';

// バリデーションスキーマ
const CreatePersonalMemoSchema = z.object({
  title: z.string().min(1).max(100),
  content: z.string().min(1).max(10000),
  tags: z.array(z.string()).optional(),
  parentPageId: z.string().optional()
});

const CreateSharedMemoSchema = z.object({
  title: z.string().min(1).max(100),
  content: z.string().min(1).max(10000),
  type: z.enum(['meeting', 'outing', 'custom']).optional(),
  groupId: z.string(),
  editorUserIds: z.array(z.string()).optional(),
  aiStructuredContent: z.record(z.any()).optional()
});

const UpdatePersonalMemoSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  content: z.string().min(1).max(10000).optional(),
  tags: z.array(z.string()).optional(),
  isArchived: z.boolean().optional()
});

const UpdateSharedMemoSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  content: z.string().min(1).max(10000).optional(),
  aiStructuredContent: z.record(z.any()).optional()
});

export class MemoController {
  // 個人メモ一覧取得
  async getPersonalMemos(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.uid;
      const { 
        viewMode = 'timeline', 
        tags, 
        limit = 50, 
        cursor,
        includeArchived = false 
      } = req.query;

      const memoRepo = FirestoreService.getInstance().collection('personalMemos');
      let query = memoRepo
        .where('userId', '==', userId);

      // アーカイブフィルタ
      if (!includeArchived) {
        query = query.where('isArchived', '==', false);
      }

      // タグフィルタ
      if (tags && Array.isArray(tags) && tags.length > 0) {
        query = query.where('tags', 'array-contains-any', tags);
      }

      // ソート（viewModeに応じて変更可能）
      query = query.orderBy('updatedAt', 'desc');

      // ページネーション
      const limitNum = Math.min(Number(limit), 100);
      query = query.limit(limitNum + 1);

      if (cursor) {
        const cursorDoc = await memoRepo.doc(cursor as string).get();
        if (cursorDoc.exists) {
          query = query.startAfter(cursorDoc);
        }
      }

      const snapshot = await query.get();
      const memos = snapshot.docs.slice(0, limitNum).map(doc => ({
        memoId: doc.id,
        ...doc.data()
      }));

      const hasNext = snapshot.docs.length > limitNum;
      const nextCursor = hasNext ? memos[memos.length - 1]?.memoId : null;

      res.json({
        memos,
        nextCursor,
        viewMode
      });
    } catch (error) {
      next(error);
    }
  }

  // 個人メモ作成
  async createPersonalMemo(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.uid;
      const validation = CreatePersonalMemoSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: validation.error.flatten()
          }
        });
      }

      const { title, content, tags = [], parentPageId } = validation.data;

      // ページの存在確認（parentPageIdが指定された場合）
      if (parentPageId) {
        const pageRepo = FirestoreService.getInstance().collection('memoPages');
        const page = await pageRepo.doc(parentPageId).get();
        if (!page.exists || page.data()?.userId !== userId) {
          return res.status(404).json({
            error: {
              code: 'NOT_FOUND',
              message: 'Parent page not found'
            }
          });
        }
      }

      const memoRepo = FirestoreService.getInstance().collection('personalMemos');
      const now = new Date();

      const memoData: Omit<PersonalMemo, 'memoId'> = {
        userId,
        title,
        content,
        tags,
        isArchived: false,
        parentPageId,
        createdAt: now,
        updatedAt: now
      };

      const docRef = await memoRepo.add(memoData);
      const memo = {
        memoId: docRef.id,
        ...memoData
      };

      res.status(201).json({
        memoId: docRef.id,
        memo
      });
    } catch (error) {
      next(error);
    }
  }

  // 個人メモ詳細取得
  async getPersonalMemo(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.uid;
      const { memoId } = req.params;

      const memoRepo = FirestoreService.getInstance().collection('personalMemos');
      const doc = await memoRepo.doc(memoId).get();

      if (!doc.exists) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Memo not found'
          }
        });
      }

      const memo = doc.data();
      if (memo?.userId !== userId) {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied'
          }
        });
      }

      res.json({
        memo: {
          memoId: doc.id,
          ...memo
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // 個人メモ更新
  async updatePersonalMemo(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.uid;
      const { memoId } = req.params;
      const validation = UpdatePersonalMemoSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: validation.error.flatten()
          }
        });
      }

      const memoRepo = FirestoreService.getInstance().collection('personalMemos');
      const doc = await memoRepo.doc(memoId).get();

      if (!doc.exists) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Memo not found'
          }
        });
      }

      const memo = doc.data();
      if (memo?.userId !== userId) {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied'
          }
        });
      }

      const updateData = {
        ...validation.data,
        updatedAt: new Date()
      };

      await memoRepo.doc(memoId).update(updateData);

      res.json({
        memo: {
          memoId: doc.id,
          ...memo,
          ...updateData
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // 個人メモ削除
  async deletePersonalMemo(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.uid;
      const { memoId } = req.params;

      const memoRepo = FirestoreService.getInstance().collection('personalMemos');
      const doc = await memoRepo.doc(memoId).get();

      if (!doc.exists) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Memo not found'
          }
        });
      }

      const memo = doc.data();
      if (memo?.userId !== userId) {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied'
          }
        });
      }

      await memoRepo.doc(memoId).delete();

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  // 共有メモ一覧取得
  async getSharedMemos(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.uid;
      const { groupId, limit = 50, cursor } = req.query;

      if (!groupId) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'groupId is required'
          }
        });
      }

      // グループメンバーシップ確認
      const groupRepo = FirestoreService.getInstance().collection('groups');
      const groupDoc = await groupRepo.doc(groupId as string).get();
      
      if (!groupDoc.exists) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Group not found'
          }
        });
      }

      const group = groupDoc.data();
      if (!group?.memberUserIds.includes(userId)) {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Not a member of this group'
          }
        });
      }

      const memoRepo = FirestoreService.getInstance().collection('sharedMemos');
      let query = memoRepo
        .where('groupId', '==', groupId)
        .orderBy('updatedAt', 'desc');

      // ページネーション
      const limitNum = Math.min(Number(limit), 100);
      query = query.limit(limitNum + 1);

      if (cursor) {
        const cursorDoc = await memoRepo.doc(cursor as string).get();
        if (cursorDoc.exists) {
          query = query.startAfter(cursorDoc);
        }
      }

      const snapshot = await query.get();
      const memos = snapshot.docs.slice(0, limitNum).map(doc => ({
        memoId: doc.id,
        ...doc.data()
      }));

      const hasNext = snapshot.docs.length > limitNum;
      const nextCursor = hasNext ? memos[memos.length - 1]?.memoId : null;

      res.json({
        memos,
        nextCursor
      });
    } catch (error) {
      next(error);
    }
  }

  // 共有メモ作成
  async createSharedMemo(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.uid;
      const validation = CreateSharedMemoSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: validation.error.flatten()
          }
        });
      }

      const { 
        title, 
        content, 
        type = 'custom', 
        groupId, 
        editorUserIds = [],
        aiStructuredContent 
      } = validation.data;

      // グループメンバーシップ確認
      const groupRepo = FirestoreService.getInstance().collection('groups');
      const groupDoc = await groupRepo.doc(groupId).get();
      
      if (!groupDoc.exists) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Group not found'
          }
        });
      }

      const group = groupDoc.data();
      if (!group?.memberUserIds.includes(userId)) {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Not a member of this group'
          }
        });
      }

      // エディター権限の検証
      const validEditors = editorUserIds.filter(id => 
        group.memberUserIds.includes(id)
      );

      const memoRepo = FirestoreService.getInstance().collection('sharedMemos');
      const now = new Date();

      const memoData: Omit<SharedMemo, 'memoId'> = {
        groupId,
        title,
        content,
        type,
        createdBy: userId,
        editorUserIds: [userId, ...validEditors],
        viewerUserIds: group.memberUserIds,
        aiStructuredContent,
        lastEditedBy: userId,
        lastEditedAt: now,
        createdAt: now,
        updatedAt: now
      };

      const docRef = await memoRepo.add(memoData);
      const memo = {
        memoId: docRef.id,
        ...memoData
      };

      res.status(201).json({
        memoId: docRef.id,
        memo
      });
    } catch (error) {
      next(error);
    }
  }

  // 共有メモ詳細取得
  async getSharedMemo(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.uid;
      const { memoId } = req.params;

      const memoRepo = FirestoreService.getInstance().collection('sharedMemos');
      const doc = await memoRepo.doc(memoId).get();

      if (!doc.exists) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Memo not found'
          }
        });
      }

      const memo = doc.data();
      if (!memo?.viewerUserIds.includes(userId)) {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied'
          }
        });
      }

      res.json({
        memo: {
          memoId: doc.id,
          ...memo
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // 共有メモ更新
  async updateSharedMemo(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.uid;
      const { memoId } = req.params;
      const validation = UpdateSharedMemoSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: validation.error.flatten()
          }
        });
      }

      const memoRepo = FirestoreService.getInstance().collection('sharedMemos');
      const doc = await memoRepo.doc(memoId).get();

      if (!doc.exists) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Memo not found'
          }
        });
      }

      const memo = doc.data();
      if (!memo?.editorUserIds.includes(userId)) {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'No edit permission'
          }
        });
      }

      const now = new Date();
      const updateData = {
        ...validation.data,
        lastEditedBy: userId,
        lastEditedAt: now,
        updatedAt: now
      };

      await memoRepo.doc(memoId).update(updateData);

      res.json({
        memo: {
          memoId: doc.id,
          ...memo,
          ...updateData
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // 共有メモ削除
  async deleteSharedMemo(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.uid;
      const { memoId } = req.params;

      const memoRepo = FirestoreService.getInstance().collection('sharedMemos');
      const doc = await memoRepo.doc(memoId).get();

      if (!doc.exists) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Memo not found'
          }
        });
      }

      const memo = doc.data();
      if (memo?.createdBy !== userId) {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Only creator can delete'
          }
        });
      }

      await memoRepo.doc(memoId).delete();

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  // メモページ作成
  async createMemoPage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.uid;
      const { title, description, parentPageId } = req.body;

      if (!title || title.length < 1 || title.length > 100) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid title'
          }
        });
      }

      // 親ページの存在確認
      if (parentPageId) {
        const pageRepo = FirestoreService.getInstance().collection('memoPages');
        const parent = await pageRepo.doc(parentPageId).get();
        if (!parent.exists || parent.data()?.userId !== userId) {
          return res.status(404).json({
            error: {
              code: 'NOT_FOUND',
              message: 'Parent page not found'
            }
          });
        }
      }

      const pageRepo = FirestoreService.getInstance().collection('memoPages');
      const now = new Date();

      const pageData: Omit<MemoPage, 'pageId'> = {
        userId,
        title,
        description: description || '',
        parentPageId,
        childPageIds: [],
        memoIds: [],
        createdAt: now,
        updatedAt: now
      };

      const docRef = await pageRepo.add(pageData);

      // 親ページの childPageIds を更新
      if (parentPageId) {
        const parentRef = pageRepo.doc(parentPageId);
        await parentRef.update({
          childPageIds: FirestoreService.getInstance().FieldValue.arrayUnion(docRef.id),
          updatedAt: now
        });
      }

      res.status(201).json({
        pageId: docRef.id,
        page: {
          pageId: docRef.id,
          ...pageData
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // メモページ一覧取得
  async getMemoPages(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.uid;
      const { parentPageId } = req.query;

      const pageRepo = FirestoreService.getInstance().collection('memoPages');
      let query = pageRepo.where('userId', '==', userId);

      if (parentPageId) {
        query = query.where('parentPageId', '==', parentPageId);
      } else {
        query = query.where('parentPageId', '==', null);
      }

      query = query.orderBy('updatedAt', 'desc');

      const snapshot = await query.get();
      const pages = snapshot.docs.map(doc => ({
        pageId: doc.id,
        ...doc.data()
      }));

      res.json({ pages });
    } catch (error) {
      next(error);
    }
  }
}

export const memoController = new MemoController();