import { useState, useEffect } from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  Button, 
  Grid, 
  Card, 
  CardContent,
  CardActions,
  Avatar,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Paper,
  LinearProgress,
  Badge,
  Skeleton,
  Alert,
  Fab,
  Stack,
} from '@mui/material';
import { 
  CalendarToday, 
  AccountBalanceWallet, 
  People, 
  Description,
  TrendingUp,
  Notifications,
  Add,
  Check,
  Schedule,
  Assignment,
  ArrowForward,
  Timeline,
} from '@mui/icons-material';
import { useRouter } from 'next/router';
import { useQuery } from 'react-query';
import { Loading } from '@/components/common/Loading';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { useLiff } from '@/hooks/useLiff';

// ダッシュボード用のモックデータ
interface DashboardData {
  user: {
    displayName: string;
    profileImage?: string;
    plan: string;
  };
  stats: {
    totalMemos: number;
    activeWarikan: number;
    upcomingSchedules: number;
    sharedMemos: number;
  };
  recentActivity: Array<{
    id: string;
    type: 'memo' | 'warikan' | 'schedule';
    title: string;
    description: string;
    timestamp: Date;
  }>;
  notifications: Array<{
    id: string;
    type: 'reminder' | 'invitation' | 'update';
    title: string;
    description: string;
    isRead: boolean;
    timestamp: Date;
  }>;
  quickActions: Array<{
    id: string;
    icon: React.ReactNode;
    title: string;
    description: string;
    path: string;
    color: string;
  }>;
}

// ダッシュボードデータ取得のモック
const fetchDashboardData = async (): Promise<DashboardData> => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return {
    user: {
      displayName: '山田太郎',
      plan: 'free'
    },
    stats: {
      totalMemos: 23,
      activeWarikan: 2,
      upcomingSchedules: 5,
      sharedMemos: 8
    },
    recentActivity: [
      {
        id: '1',
        type: 'memo',
        title: '会議メモを作成',
        description: '12月定例会議のメモを作成しました',
        timestamp: new Date(Date.now() - 30 * 60 * 1000) // 30分前
      },
      {
        id: '2',
        type: 'warikan',
        title: '忘年会の割り勘を更新',
        description: '参加者を追加しました',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2時間前
      },
      {
        id: '3',
        type: 'schedule',
        title: '来週の会議予定',
        description: '候補日を3つ追加しました',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1日前
      }
    ],
    notifications: [
      {
        id: '1',
        type: 'reminder',
        title: '会議のリマインダー',
        description: '明日の10:00から定例会議があります',
        isRead: false,
        timestamp: new Date(Date.now() - 10 * 60 * 1000)
      },
      {
        id: '2',
        type: 'invitation',
        title: '共有メモに招待されました',
        description: '田中さんがあなたを編集メンバーに追加しました',
        isRead: false,
        timestamp: new Date(Date.now() - 60 * 60 * 1000)
      }
    ],
    quickActions: [
      {
        id: '1',
        icon: <Description />,
        title: 'メモ作成',
        description: '新しいメモを作成',
        path: '/memo/create',
        color: '#2196F3'
      },
      {
        id: '2',
        icon: <AccountBalanceWallet />,
        title: '割り勘',
        description: '割り勘を作成・管理',
        path: '/warikan',
        color: '#4CAF50'
      },
      {
        id: '3',
        icon: <CalendarToday />,
        title: '日程調整',
        description: '予定の確認・追加',
        path: '/schedule',
        color: '#FF9800'
      },
      {
        id: '4',
        icon: <People />,
        title: '共有メモ',
        description: 'グループでメモ共有',
        path: '/memo/shared/create',
        color: '#9C27B0'
      }
    ]
  };
};

// アクティビティアイテムコンポーネント
function ActivityItem({ activity }: { activity: DashboardData['recentActivity'][0] }) {
  const getIcon = () => {
    switch (activity.type) {
      case 'memo': return <Description color="primary" />;
      case 'warikan': return <AccountBalanceWallet color="success" />;
      case 'schedule': return <CalendarToday color="warning" />;
      default: return <Assignment />;
    }
  };

  const getTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}分前`;
    } else if (diffInMinutes < 24 * 60) {
      return `${Math.floor(diffInMinutes / 60)}時間前`;
    } else {
      return `${Math.floor(diffInMinutes / (24 * 60))}日前`;
    }
  };

  return (
    <ListItem sx={{ px: 0 }}>
      <ListItemIcon>
        {getIcon()}
      </ListItemIcon>
      <ListItemText
        primary={activity.title}
        secondary={`${activity.description} • ${getTimeAgo(activity.timestamp)}`}
      />
    </ListItem>
  );
}

// 統計カードコンポーネント
function StatCard({ title, value, icon, trend }: { 
  title: string; 
  value: number; 
  icon: React.ReactNode; 
  trend?: { value: number; isPositive: boolean };
}) {
  return (
    <Paper elevation={1} sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
            {value}
          </Typography>
          {trend && (
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              <TrendingUp 
                fontSize="small" 
                color={trend.isPositive ? 'success' : 'error'}
                sx={{ 
                  transform: trend.isPositive ? 'none' : 'rotate(180deg)',
                  mr: 0.5 
                }}
              />
              <Typography 
                variant="caption" 
                color={trend.isPositive ? 'success.main' : 'error.main'}
              >
                {trend.isPositive ? '+' : ''}{trend.value}%
              </Typography>
            </Box>
          )}
        </Box>
        <Box sx={{ color: 'primary.main' }}>
          {icon}
        </Box>
      </Box>
    </Paper>
  );
}

export default function HomePage() {
  const { liff, isLoading: liffLoading, error: liffError } = useLiff();
  const router = useRouter();
  const [showWelcome, setShowWelcome] = useState(false);

  const { 
    data: dashboardData, 
    isLoading: dashboardLoading, 
    error: dashboardError 
  } = useQuery('dashboard', fetchDashboardData);

  // 初回訪問チェック
  useEffect(() => {
    const hasVisited = localStorage.getItem('hasVisited');
    if (!hasVisited) {
      setShowWelcome(true);
      localStorage.setItem('hasVisited', 'true');
    }
  }, []);

  const handleCloseWelcome = () => {
    setShowWelcome(false);
  };

  if (liffLoading || dashboardLoading) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ py: 3 }}>
          <Skeleton variant="text" width="60%" height={40} sx={{ mb: 2 }} />
          <Skeleton variant="text" width="80%" height={20} sx={{ mb: 4 }} />
          
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {[...Array(4)].map((_, i) => (
              <Grid item xs={6} key={i}>
                <Skeleton variant="rectangular" height={100} />
              </Grid>
            ))}
          </Grid>
          
          <Skeleton variant="rectangular" height={200} />
        </Box>
      </Container>
    );
  }

  if (liffError || dashboardError) {
    return <ErrorMessage message="データの読み込みに失敗しました" />;
  }

  if (!dashboardData) return null;

  const unreadNotifications = dashboardData.notifications.filter(n => !n.isRead).length;

  return (
    <Container maxWidth="sm">
      <Box sx={{ py: 3 }}>
        {/* ウェルカムアラート */}
        {showWelcome && (
          <Alert 
            severity="info" 
            onClose={handleCloseWelcome}
            sx={{ mb: 3 }}
          >
            <Typography variant="body2">
              <strong>LINE秘書 TASKへようこそ！</strong><br />
              割り勘、スケジュール、メモ機能で日常をサポートします。
            </Typography>
          </Alert>
        )}

        {/* ヘッダー */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              おかえりなさい
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {dashboardData.user.displayName}さん
            </Typography>
          </Box>
          
          <Badge badgeContent={unreadNotifications} color="error">
            <Avatar 
              sx={{ width: 48, height: 48, bgcolor: 'primary.main' }}
              src={dashboardData.user.profileImage}
            >
              {dashboardData.user.displayName[0]}
            </Avatar>
          </Badge>
        </Box>

        {/* 統計情報 */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6}>
            <StatCard 
              title="個人メモ" 
              value={dashboardData.stats.totalMemos}
              icon={<Description fontSize="large" />}
              trend={{ value: 12, isPositive: true }}
            />
          </Grid>
          <Grid item xs={6}>
            <StatCard 
              title="割り勘" 
              value={dashboardData.stats.activeWarikan}
              icon={<AccountBalanceWallet fontSize="large" />}
            />
          </Grid>
          <Grid item xs={6}>
            <StatCard 
              title="予定" 
              value={dashboardData.stats.upcomingSchedules}
              icon={<CalendarToday fontSize="large" />}
            />
          </Grid>
          <Grid item xs={6}>
            <StatCard 
              title="共有メモ" 
              value={dashboardData.stats.sharedMemos}
              icon={<People fontSize="large" />}
              trend={{ value: 25, isPositive: true }}
            />
          </Grid>
        </Grid>

        {/* クイックアクション */}
        <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            クイックアクション
          </Typography>
          <Grid container spacing={2}>
            {dashboardData.quickActions.map((action) => (
              <Grid item xs={6} key={action.id}>
                <Card 
                  sx={{ 
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                    },
                  }}
                  onClick={() => router.push(action.path)}
                >
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <Box 
                      sx={{ 
                        display: 'inline-flex',
                        p: 1,
                        borderRadius: '50%',
                        bgcolor: `${action.color}20`,
                        color: action.color,
                        mb: 1
                      }}
                    >
                      {action.icon}
                    </Box>
                    <Typography variant="subtitle2" gutterBottom>
                      {action.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {action.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>

        {/* 最近のアクティビティ */}
        <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">
              最近のアクティビティ
            </Typography>
            <Button 
              size="small" 
              endIcon={<ArrowForward />}
              onClick={() => router.push('/activity')}
            >
              すべて見る
            </Button>
          </Box>
          
          {dashboardData.recentActivity.length > 0 ? (
            <List dense>
              {dashboardData.recentActivity.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))}
            </List>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Timeline sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
              <Typography color="text.secondary">
                まだアクティビティがありません
              </Typography>
            </Box>
          )}
        </Paper>

        {/* 通知 */}
        {dashboardData.notifications.length > 0 && (
          <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">
                通知
              </Typography>
              <Badge badgeContent={unreadNotifications} color="error">
                <Notifications />
              </Badge>
            </Box>
            
            <List dense>
              {dashboardData.notifications.slice(0, 3).map((notification) => (
                <ListItem 
                  key={notification.id} 
                  sx={{ 
                    px: 0,
                    bgcolor: notification.isRead ? 'transparent' : 'action.hover',
                    borderRadius: 1,
                    mb: 1
                  }}
                >
                  <ListItemIcon>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: notification.isRead ? 'transparent' : 'primary.main',
                        mr: 1
                      }}
                    />
                    <Notifications 
                      fontSize="small" 
                      color={notification.isRead ? 'disabled' : 'primary'}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={notification.title}
                    secondary={notification.description}
                    primaryTypographyProps={{
                      fontWeight: notification.isRead ? 'normal' : 'medium'
                    }}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        )}

        {/* 使い方ヒント */}
        <Paper elevation={1} sx={{ p: 2, bgcolor: 'primary.50' }}>
          <Typography variant="subtitle2" gutterBottom sx={{ color: 'primary.main' }}>
            💡 使い方のヒント
          </Typography>
          <Typography variant="body2" color="text.secondary">
            LINEでメッセージを送ると、AIが自動的にメモや割り勘、予定を作成できます。
            <br />
            例: 「@メモ 明日の会議の準備をする」
          </Typography>
        </Paper>
      </Box>

      {/* フローティングアクションボタン */}
      <Fab
        color="primary"
        aria-label="add"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
        }}
        onClick={() => router.push('/memo/create')}
      >
        <Add />
      </Fab>
    </Container>
  );
}