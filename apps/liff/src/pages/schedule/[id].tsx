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
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
} from '@mui/material';
import { 
  ArrowBack, 
  Event,
  Assignment,
  Notifications,
  AccessTime,
  LocationOn,
  Description,
  Edit,
  Delete,
  CheckCircle,
  Cancel,
  Share,
  NotificationAdd,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Loading } from '@/components/common/Loading';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { useToast } from '@/components/common/Toast';
import { useLiff } from '@/hooks/useLiff';
import { dateUtils } from '@line-secretary/shared';

// Mock API calls
const fetchSchedule = async (id: string) => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  return {
    scheduleId: id,
    title: 'チームミーティング',
    type: 'event',
    description: '月次の進捗確認と今後の計画について話し合います。',
    startTime: new Date('2023-12-15T10:00:00'),
    endTime: new Date('2023-12-15T11:00:00'),
    allDay: false,
    location: '会議室A / Zoom: https://zoom.us/j/123456789',
    status: 'confirmed',
    reminders: [
      { type: 'notification', minutesBefore: 30 },
      { type: 'notification', minutesBefore: 10 },
    ],
    participants: [
      { userId: 'user1', displayName: 'あなた', status: 'accepted' },
      { userId: 'user2', displayName: '田中さん', status: 'accepted' },
      { userId: 'user3', displayName: '佐藤さん', status: 'pending' },
    ],
    createdAt: new Date('2023-12-01'),
    updatedAt: new Date('2023-12-10'),
  };
};

const updateScheduleStatus = async (id: string, status: string) => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  return { success: true };
};

const deleteSchedule = async (id: string) => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  return { success: true };
};

export default function ScheduleDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { liff } = useLiff();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: schedule, isLoading, error } = useQuery(
    ['schedule', id],
    () => fetchSchedule(id as string),
    { enabled: !!id }
  );

  const updateStatusMutation = useMutation(
    (status: string) => updateScheduleStatus(id as string, status),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['schedule', id]);
        showToast('ステータスを更新しました', 'success');
      },
      onError: () => {
        showToast('エラーが発生しました', 'error');
      },
    }
  );

  const deleteMutation = useMutation(
    () => deleteSchedule(id as string),
    {
      onSuccess: () => {
        showToast('予定を削除しました', 'success');
        router.push('/schedule');
      },
      onError: () => {
        showToast('エラーが発生しました', 'error');
      },
    }
  );

  if (isLoading) return <Loading message="予定を読み込み中..." />;
  if (error || !schedule) return <ErrorMessage message="予定の読み込みに失敗しました" />;

  const getScheduleIcon = () => {
    switch (schedule.type) {
      case 'event': return <Event fontSize="large" color="primary" />;
      case 'task': return <Assignment fontSize="large" color="secondary" />;
      case 'reminder': return <Notifications fontSize="large" color="warning" />;
      default: return <Event fontSize="large" />;
    }
  };

  const getStatusColor = () => {
    switch (schedule.status) {
      case 'confirmed': return 'success';
      case 'completed': return 'default';
      case 'cancelled': return 'error';
      default: return 'primary';
    }
  };

  const formatDateTime = () => {
    if (schedule.allDay) {
      return dateUtils.format(schedule.startTime, 'YYYY年MM月DD日(ddd) 終日');
    }
    const start = dateUtils.format(schedule.startTime, 'YYYY年MM月DD日(ddd) HH:mm');
    const end = schedule.endTime ? dateUtils.format(schedule.endTime, 'HH:mm') : '';
    return `${start}${end ? ` - ${end}` : ''}`;
  };

  const handleShare = () => {
    if (liff?.isApiAvailable('shareTargetPicker')) {
      const message = `📅 ${schedule.title}\n\n${formatDateTime()}\n${schedule.location ? `📍 ${schedule.location}` : ''}\n\n${schedule.description || ''}`;
      
      liff.shareTargetPicker([
        {
          type: 'text',
          text: message,
        },
      ]);
    }
  };

  const canEdit = schedule.status !== 'completed' && schedule.status !== 'cancelled';

  return (
    <Container maxWidth="sm">
      <Box sx={{ py: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton onClick={() => router.back()} sx={{ mr: 1 }}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h5" component="h1" sx={{ flexGrow: 1 }}>
            予定詳細
          </Typography>
          {canEdit && (
            <IconButton onClick={() => router.push(`/schedule/${id}/edit`)}>
              <Edit />
            </IconButton>
          )}
        </Box>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
              {getScheduleIcon()}
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h6" gutterBottom>
                  {schedule.title}
                </Typography>
                <Chip 
                  label={schedule.status} 
                  color={getStatusColor() as any}
                  size="small"
                />
              </Box>
            </Box>

            <List>
              <ListItem>
                <ListItemIcon>
                  <AccessTime />
                </ListItemIcon>
                <ListItemText 
                  primary="日時"
                  secondary={formatDateTime()}
                />
              </ListItem>

              {schedule.location && (
                <ListItem>
                  <ListItemIcon>
                    <LocationOn />
                  </ListItemIcon>
                  <ListItemText 
                    primary="場所"
                    secondary={schedule.location}
                  />
                </ListItem>
              )}

              {schedule.description && (
                <ListItem>
                  <ListItemIcon>
                    <Description />
                  </ListItemIcon>
                  <ListItemText 
                    primary="詳細"
                    secondary={schedule.description}
                  />
                </ListItem>
              )}

              {schedule.reminders && schedule.reminders.length > 0 && (
                <ListItem>
                  <ListItemIcon>
                    <NotificationAdd />
                  </ListItemIcon>
                  <ListItemText 
                    primary="リマインダー"
                    secondary={
                      schedule.reminders.map(r => `${r.minutesBefore}分前`).join(', ')
                    }
                  />
                </ListItem>
              )}
            </List>

            {schedule.participants && schedule.participants.length > 0 && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" gutterBottom>
                  参加者
                </Typography>
                <List dense>
                  {schedule.participants.map((participant) => (
                    <ListItem key={participant.userId}>
                      <ListItemText 
                        primary={participant.displayName}
                      />
                      {participant.status === 'accepted' && (
                        <CheckCircle color="success" fontSize="small" />
                      )}
                      {participant.status === 'declined' && (
                        <Cancel color="error" fontSize="small" />
                      )}
                      {participant.status === 'pending' && (
                        <Chip label="未回答" size="small" />
                      )}
                    </ListItem>
                  ))}
                </List>
              </>
            )}

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
              作成日: {schedule.createdAt.toLocaleDateString('ja-JP')}
            </Typography>
          </CardContent>
        </Card>

        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          {schedule.status === 'pending' && (
            <Button
              variant="contained"
              fullWidth
              color="success"
              startIcon={<CheckCircle />}
              onClick={() => updateStatusMutation.mutate('completed')}
              disabled={updateStatusMutation.isLoading}
            >
              完了
            </Button>
          )}
          
          {schedule.status === 'pending' && (
            <Button
              variant="outlined"
              fullWidth
              color="error"
              startIcon={<Cancel />}
              onClick={() => updateStatusMutation.mutate('cancelled')}
              disabled={updateStatusMutation.isLoading}
            >
              キャンセル
            </Button>
          )}
          
          <Button
            variant="outlined"
            fullWidth
            startIcon={<Share />}
            onClick={handleShare}
          >
            共有
          </Button>
        </Box>

        {canEdit && (
          <Button
            variant="text"
            color="error"
            fullWidth
            startIcon={<Delete />}
            onClick={() => setDeleteDialogOpen(true)}
          >
            削除
          </Button>
        )}
      </Box>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>予定を削除しますか？</DialogTitle>
        <DialogContent>
          <Typography>
            「{schedule.title}」を削除します。この操作は取り消せません。
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