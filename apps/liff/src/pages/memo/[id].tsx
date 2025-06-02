import { useState } from 'react';
import { useRouter } from 'next/router';
import { 
  Container, 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  IconButton,
  Chip,
  Stack,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Menu,
  MenuItem,
  Divider,
} from '@mui/material';
import { 
  ArrowBack, 
  Edit,
  Delete,
  Archive,
  Unarchive,
  Share,
  LocalOffer,
  Folder,
  AccessTime,
  MoreVert,
  AutoAwesome,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Loading } from '@/components/common/Loading';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { useToast } from '@/components/common/Toast';
import { useLiff } from '@/hooks/useLiff';
import { dateUtils } from '@line-secretary/shared';

// Mock API calls
const fetchMemo = async (id: string) => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  return {
    memoId: id,
    userId: 'user1',
    title: 'プロジェクト計画',
    content: `## 新プロジェクトの概要

### 目的
- 業務効率化の推進
- コスト削減
- 顧客満足度の向上

### スケジュール
1. 要件定義: 12月
2. 設計: 1月
3. 開発: 2-3月
4. テスト: 4月
5. リリース: 5月

### 必要なリソース
- 開発者: 3名
- デザイナー: 1名
- PM: 1名

### 予算
- 開発費: 500万円
- インフラ: 100万円
- その他: 100万円

### リスク
- スケジュール遅延
- 技術的な課題
- 予算超過`,
    tags: ['仕事', 'プロジェクト', '計画'],
    isArchived: false,
    aiSummary: '新プロジェクトの立ち上げに関する計画書。5月リリースを目標に、総予算700万円で業務効率化システムを開発。',
    suggestedTags: ['マネジメント', '2024年'],
    parentPageId: '1',
    parentPageTitle: '仕事',
    createdAt: new Date('2023-12-10T10:00:00'),
    updatedAt: new Date('2023-12-12T15:30:00'),
  };
};

const archiveMemo = async (id: string) => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  return { success: true };
};

const deleteMemo = async (id: string) => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  return { success: true };
};

export default function MemoDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { liff } = useLiff();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const { data: memo, isLoading, error } = useQuery(
    ['memo', id],
    () => fetchMemo(id as string),
    { enabled: !!id }
  );

  const archiveMutation = useMutation(
    () => archiveMemo(id as string),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['memo', id]);
        showToast(memo?.isArchived ? 'アーカイブを解除しました' : 'アーカイブしました', 'success');
      },
      onError: () => {
        showToast('エラーが発生しました', 'error');
      },
    }
  );

  const deleteMutation = useMutation(
    () => deleteMemo(id as string),
    {
      onSuccess: () => {
        showToast('メモを削除しました', 'success');
        router.push('/memo');
      },
      onError: () => {
        showToast('エラーが発生しました', 'error');
      },
    }
  );

  if (isLoading) return <Loading message="メモを読み込み中..." />;
  if (error || !memo) return <ErrorMessage message="メモの読み込みに失敗しました" />;

  const handleShare = () => {
    if (liff?.isApiAvailable('shareTargetPicker')) {
      liff.shareTargetPicker([
        {
          type: 'text',
          text: `${memo.title}\n\n${memo.content.substring(0, 200)}...`,
        },
      ]);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ py: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton onClick={() => router.back()} sx={{ mr: 1 }}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h5" component="h1" sx={{ flexGrow: 1 }}>
            メモ詳細
          </Typography>
          <IconButton onClick={() => router.push(`/memo/${id}/edit`)}>
            <Edit />
          </IconButton>
          <IconButton onClick={handleMenuOpen}>
            <MoreVert />
          </IconButton>
        </Box>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h5" gutterBottom>
                {memo.title}
              </Typography>
              
              {memo.isArchived && (
                <Chip
                  icon={<Archive />}
                  label="アーカイブ済み"
                  size="small"
                  color="default"
                  sx={{ mb: 2 }}
                />
              )}

              <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
                {memo.parentPageId && (
                  <Chip
                    icon={<Folder />}
                    label={memo.parentPageTitle}
                    size="small"
                    variant="outlined"
                  />
                )}
                {memo.tags.map(tag => (
                  <Chip
                    key={tag}
                    icon={<LocalOffer />}
                    label={tag}
                    size="small"
                    onClick={() => router.push(`/memo?tag=${tag}`)}
                  />
                ))}
                {memo.suggestedTags?.map(tag => (
                  <Chip
                    key={tag}
                    icon={<AutoAwesome />}
                    label={tag}
                    size="small"
                    variant="outlined"
                    color="secondary"
                    sx={{ opacity: 0.7 }}
                  />
                ))}
              </Stack>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, color: 'text.secondary' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <AccessTime fontSize="small" />
                  <Typography variant="caption">
                    作成: {dateUtils.format(memo.createdAt, 'YYYY/MM/DD HH:mm')}
                  </Typography>
                </Box>
                {memo.createdAt.getTime() !== memo.updatedAt.getTime() && (
                  <Typography variant="caption">
                    更新: {dateUtils.format(memo.updatedAt, 'MM/DD HH:mm')}
                  </Typography>
                )}
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            {memo.aiSummary && (
              <Box sx={{ mb: 3, p: 2, bgcolor: 'primary.main', color: 'white', borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <AutoAwesome />
                  AI要約
                </Typography>
                <Typography variant="body2">
                  {memo.aiSummary}
                </Typography>
              </Box>
            )}

            <Box sx={{ 
              '& h2': { fontSize: '1.5rem', fontWeight: 'bold', mt: 3, mb: 1 },
              '& h3': { fontSize: '1.2rem', fontWeight: 'bold', mt: 2, mb: 1 },
              '& p': { mb: 1 },
              '& ul, & ol': { pl: 3 },
              '& li': { mb: 0.5 },
            }}>
              <Typography 
                component="div" 
                variant="body1"
                sx={{ whiteSpace: 'pre-wrap' }}
              >
                {memo.content}
              </Typography>
            </Box>
          </CardContent>
        </Card>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            fullWidth
            startIcon={memo.isArchived ? <Unarchive /> : <Archive />}
            onClick={() => archiveMutation.mutate()}
            disabled={archiveMutation.isLoading}
          >
            {memo.isArchived ? 'アーカイブ解除' : 'アーカイブ'}
          </Button>
          
          <Button
            variant="outlined"
            fullWidth
            startIcon={<Share />}
            onClick={handleShare}
          >
            共有
          </Button>
        </Box>
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          router.push(`/memo/${id}/edit`);
          handleMenuClose();
        }}>
          編集
        </MenuItem>
        <MenuItem onClick={() => {
          archiveMutation.mutate();
          handleMenuClose();
        }}>
          {memo.isArchived ? 'アーカイブ解除' : 'アーカイブ'}
        </MenuItem>
        <Divider />
        <MenuItem 
          onClick={() => {
            setDeleteDialogOpen(true);
            handleMenuClose();
          }}
          sx={{ color: 'error.main' }}
        >
          削除
        </MenuItem>
      </Menu>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>メモを削除しますか？</DialogTitle>
        <DialogContent>
          <Typography>
            「{memo.title}」を削除します。この操作は取り消せません。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            キャンセル
          </Button>
          <Button 
            onClick={() => deleteMutation.mutate()} 
            color="error"
            disabled={deleteMutation.isLoading}
          >
            削除
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}