import { Router } from 'express';
import { memoController } from '../controllers/memo.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// 認証が必要なルート
router.use(authMiddleware);

// 個人メモ
router.get('/personal', memoController.getPersonalMemos);
router.post('/personal', memoController.createPersonalMemo);
router.get('/personal/:memoId', memoController.getPersonalMemo);
router.put('/personal/:memoId', memoController.updatePersonalMemo);
router.delete('/personal/:memoId', memoController.deletePersonalMemo);

// 共有メモ
router.get('/shared', memoController.getSharedMemos);
router.post('/shared', memoController.createSharedMemo);
router.get('/shared/:memoId', memoController.getSharedMemo);
router.put('/shared/:memoId', memoController.updateSharedMemo);
router.delete('/shared/:memoId', memoController.deleteSharedMemo);

// メモページ
router.get('/pages', memoController.getMemoPages);
router.post('/pages', memoController.createMemoPage);

export default router;