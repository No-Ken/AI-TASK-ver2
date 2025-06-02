import { useState } from 'react';
import { useRouter } from 'next/router';
import { 
  Container, 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
} from '@mui/material';
import { 
  ArrowBack, 
  CheckCircle, 
  Cancel,
  Share,
  Edit,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Loading } from '@/components/common/Loading';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { useToast } from '@/components/common/Toast';
import { useLiff } from '@/hooks/useLiff';
import { formatUtils } from '@line-secretary/shared';

// Mock API calls (to be replaced with actual API)
const fetchWarikan = async (id: string) => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  return {
    warikanId: id,
    title: '忘年会',
    totalAmount: 15000,
    createdBy: 'user1',
    members: [
      { userId: 'user1', displayName: 'あなた', amount: 3000, isPaid: true, paidAt: new Date('2023-12-01T10:00:00') },
      { userId: 'user2', displayName: '田中さん', amount: 3000, isPaid: false },
      { userId: 'user3', displayName: '佐藤さん', amount: 3000, isPaid: true, paidAt: new Date('2023-12-02T15:30:00') },
      { userId: 'user4', displayName: '鈴木さん', amount: 3000, isPaid: false },
      { userId: 'user5', displayName: '高橋さん', amount: 3000, isPaid: false },
    ],
    status: 'active',
    description: '今年もお疲れさまでした！',
    createdAt: new Date('2023-12-01'),
    updatedAt: new Date('2023-12-02'),
  };
};

const markAsPaid = async (warikanId: string) => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  return { success: true };
};

const settleWarikan = async (warikanId: string) => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  return { success: true };
};

export default function WarikanDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { liff } = useLiff();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [settleDialogOpen, setSettleDialogOpen] = useState(false);

  const { data: warikan, isLoading, error } = useQuery(
    ['warikan', id],
    () => fetchWarikan(id as string),
    { enabled: !!id }
  );

  const markPaidMutation = useMutation(
    () => markAsPaid(id as string),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['warikan', id]);
        showToast('支払い完了しました', 'success');
      },
      onError: () => {
        showToast('エラーが発生しました', 'error');
      },
    }
  );

  const settleMutation = useMutation(
    () => settleWarikan(id as string),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['warikan', id]);
        setSettleDialogOpen(false);
        showToast('割り勘を終了しました', 'success');
        router.push('/warikan');
      },
      onError: () => {
        showToast('エラーが発生しました', 'error');
      },
    }
  );

  if (isLoading) return <Loading message="割り勘を読み込み中..." />;
  if (error || !warikan) return <ErrorMessage message="割り勘の読み込みに失敗しました" />;

  const paidCount = warikan.members.filter(m => m.isPaid).length;
  const paidAmount = warikan.members.filter(m => m.isPaid).reduce((sum, m) => sum + m.amount, 0);
  const progress = (paidCount / warikan.members.length) * 100;
  const isCreator = warikan.createdBy === 'user1'; // TODO: Get actual user ID
  const currentUserMember = warikan.members.find(m => m.userId === 'user1');
  const isSettled = warikan.status === 'settled';

  const handleShare = () => {
    if (liff?.isApiAvailable('shareTargetPicker')) {
      liff.shareTargetPicker([
        {
          type: 'text',
          text: `割り勘のお知らせ\n\n📝 ${warikan.title}\n💰 一人あたり: ${formatUtils.currency(warikan.members[0].amount)}\n\n詳細はこちら: https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID}/warikan/${warikan.warikanId}`,
        },
      ]);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ py: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton onClick={() => router.back()} sx={{ mr: 1 }}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h5" component="h1" sx={{ flexGrow: 1 }}>
            割り勘詳細
          </Typography>
          {isCreator && !isSettled && (
            <IconButton onClick={() => router.push(`/warikan/${id}/edit`)}>
              <Edit />
            </IconButton>
          )}
        </Box>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <div>
                <Typography variant="h6" gutterBottom>
                  {warikan.title}
                </Typography>
                {warikan.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {warikan.description}
                  </Typography>
                )}
              </div>
              <Chip 
                label={isSettled ? '完了' : '進行中'} 
                color={isSettled ? 'success' : 'primary'}
                size="small"
              />
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="h4" color="primary" gutterBottom>
                {formatUtils.currency(warikan.totalAmount)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                一人あたり: {formatUtils.currency(warikan.members[0].amount)}
              </Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">
                  支払い進捗
                </Typography>
                <Typography variant="body2">
                  {paidCount}/{warikan.members.length}人 ({formatUtils.currency(paidAmount)})
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={progress} 
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>

            <Typography variant="caption" color="text.secondary">
              作成日: {warikan.createdAt.toLocaleDateString('ja-JP')}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              メンバー
            </Typography>
            <List disablePadding>
              {warikan.members.map((member, index) => (
                <ListItem key={member.userId} divider={index < warikan.members.length - 1}>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {member.displayName}
                        {member.userId === warikan.createdBy && (
                          <Chip label="主催者" size="small" variant="outlined" />
                        )}
                      </Box>
                    }
                    secondary={
                      member.isPaid 
                        ? `支払い済み (${member.paidAt?.toLocaleDateString('ja-JP')})`
                        : formatUtils.currency(member.amount)
                    }
                  />
                  <ListItemSecondaryAction>
                    {member.isPaid ? (
                      <CheckCircle color="success" />
                    ) : (
                      <Cancel color="disabled" />
                    )}
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>

        {!isSettled && (
          <Box sx={{ display: 'flex', gap: 2 }}>
            {currentUserMember && !currentUserMember.isPaid && (
              <Button
                variant="contained"
                fullWidth
                onClick={() => markPaidMutation.mutate()}
                disabled={markPaidMutation.isLoading}
              >
                支払い完了
              </Button>
            )}
            
            <Button
              variant="outlined"
              fullWidth
              onClick={handleShare}
              startIcon={<Share />}
            >
              共有
            </Button>
            
            {isCreator && (
              <Button
                variant="outlined"
                color="error"
                onClick={() => setSettleDialogOpen(true)}
              >
                終了
              </Button>
            )}
          </Box>
        )}
      </Box>

      <Dialog open={settleDialogOpen} onClose={() => setSettleDialogOpen(false)}>
        <DialogTitle>割り勘を終了しますか？</DialogTitle>
        <DialogContent>
          <Typography>
            この操作は取り消せません。現在の支払い状況：
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            {paidCount}/{warikan.members.length}人が支払い済み
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettleDialogOpen(false)}>
            キャンセル
          </Button>
          <Button 
            onClick={() => settleMutation.mutate()} 
            color="error"
            disabled={settleMutation.isLoading}
          >
            終了する
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}