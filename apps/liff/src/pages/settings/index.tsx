import { useState } from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  Card, 
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  Avatar,
  Button,
  Divider,
  Chip,
  IconButton,
} from '@mui/material';
import { 
  Person,
  Notifications,
  Language,
  AccessTime,
  CreditCard,
  Security,
  Info,
  ChevronRight,
  Edit,
  NotificationsActive,
  NotificationsOff,
  WbSunny,
  Brightness2,
} from '@mui/icons-material';
import { useRouter } from 'next/router';
import { useQuery } from 'react-query';
import { useLiff } from '@/hooks/useLiff';
import { Loading } from '@/components/common/Loading';
import { ErrorMessage } from '@/components/common/ErrorMessage';

// Mock user data
const mockUserData = {
  userId: 'user1',
  displayName: '山田太郎',
  pictureUrl: null,
  plan: 'free',
  planExpiresAt: null,
  settings: {
    language: 'ja',
    timezone: 'Asia/Tokyo',
    notifications: {
      reminder: true,
      daily: true,
      weekly: false,
    },
  },
  usage: {
    apiCalls: 234,
    monthlyApiCalls: 500,
  },
};

export default function SettingsPage() {
  const router = useRouter();
  const { profile } = useLiff();
  const [notifications, setNotifications] = useState(mockUserData.settings.notifications);

  const { data: userData, isLoading, error } = useQuery('userData', async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return mockUserData;
  });

  if (isLoading) return <Loading message="設定を読み込み中..." />;
  if (error) return <ErrorMessage message="設定の読み込みに失敗しました" />;

  const handleNotificationChange = (type: keyof typeof notifications) => {
    setNotifications(prev => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  const getPlanDisplay = () => {
    const planNames = {
      free: '無料プラン',
      minimum: 'ミニマムプラン',
      businessman: 'ビジネスマンプラン',
      pro: 'プロプラン',
      enterprise: 'エンタープライズプラン',
    };
    return planNames[userData?.plan as keyof typeof planNames] || '無料プラン';
  };

  const getPlanColor = () => {
    const colors = {
      free: 'default',
      minimum: 'primary',
      businessman: 'secondary',
      pro: 'success',
      enterprise: 'error',
    };
    return colors[userData?.plan as keyof typeof colors] || 'default';
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ py: 2 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          設定
        </Typography>

        {/* Profile Section */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Avatar
                src={profile?.pictureUrl || userData?.pictureUrl || undefined}
                sx={{ width: 64, height: 64, mr: 2 }}
              >
                {(profile?.displayName || userData?.displayName || '?')[0]}
              </Avatar>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h6">
                  {profile?.displayName || userData?.displayName}
                </Typography>
                <Chip 
                  label={getPlanDisplay()} 
                  size="small" 
                  color={getPlanColor() as any}
                />
              </Box>
              <IconButton onClick={() => router.push('/settings/profile')}>
                <Edit />
              </IconButton>
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  今月のAPI使用量
                </Typography>
                <Typography variant="h6">
                  {userData?.usage.apiCalls} / {userData?.usage.monthlyApiCalls}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="caption" color="text.secondary">
                  残り
                </Typography>
                <Typography variant="h6" color="primary">
                  {(userData?.usage.monthlyApiCalls || 0) - (userData?.usage.apiCalls || 0)}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Notifications Section */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              通知設定
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <NotificationsActive />
                </ListItemIcon>
                <ListItemText 
                  primary="リマインダー通知"
                  secondary="予定の30分前に通知"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={notifications.reminder}
                    onChange={() => handleNotificationChange('reminder')}
                  />
                </ListItemSecondaryAction>
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <WbSunny />
                </ListItemIcon>
                <ListItemText 
                  primary="デイリー通知"
                  secondary="毎朝8時に今日の予定を通知"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={notifications.daily}
                    onChange={() => handleNotificationChange('daily')}
                  />
                </ListItemSecondaryAction>
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Brightness2 />
                </ListItemIcon>
                <ListItemText 
                  primary="週次サマリー"
                  secondary="毎週月曜日に週間サマリーを通知"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={notifications.weekly}
                    onChange={() => handleNotificationChange('weekly')}
                  />
                </ListItemSecondaryAction>
              </ListItem>
            </List>
          </CardContent>
        </Card>

        {/* Other Settings */}
        <Card>
          <List>
            <ListItem button onClick={() => router.push('/settings/language')}>
              <ListItemIcon>
                <Language />
              </ListItemIcon>
              <ListItemText 
                primary="言語"
                secondary="日本語"
              />
              <ChevronRight />
            </ListItem>
            <Divider />
            <ListItem button onClick={() => router.push('/settings/timezone')}>
              <ListItemIcon>
                <AccessTime />
              </ListItemIcon>
              <ListItemText 
                primary="タイムゾーン"
                secondary="Asia/Tokyo (JST)"
              />
              <ChevronRight />
            </ListItem>
            <Divider />
            <ListItem button onClick={() => router.push('/settings/plan')}>
              <ListItemIcon>
                <CreditCard />
              </ListItemIcon>
              <ListItemText 
                primary="プラン・支払い"
                secondary={getPlanDisplay()}
              />
              <ChevronRight />
            </ListItem>
            <Divider />
            <ListItem button onClick={() => router.push('/settings/privacy')}>
              <ListItemIcon>
                <Security />
              </ListItemIcon>
              <ListItemText 
                primary="プライバシー・セキュリティ"
                secondary="データ管理とセキュリティ設定"
              />
              <ChevronRight />
            </ListItem>
            <Divider />
            <ListItem button onClick={() => router.push('/settings/about')}>
              <ListItemIcon>
                <Info />
              </ListItemIcon>
              <ListItemText 
                primary="アプリについて"
                secondary="バージョン 1.0.0"
              />
              <ChevronRight />
            </ListItem>
          </List>
        </Card>

        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Button color="error" variant="text">
            アカウントを削除
          </Button>
        </Box>
      </Box>
    </Container>
  );
}