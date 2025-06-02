import { useState } from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Fab,
  Tabs,
  Tab,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Grid,
  Paper,
} from '@mui/material';
import { 
  Add, 
  CalendarToday,
  AccessTime,
  Event,
  Assignment,
  Notifications,
  ChevronLeft,
  ChevronRight,
  Today,
} from '@mui/icons-material';
import { useRouter } from 'next/router';
import { useQuery } from 'react-query';
import { Loading } from '@/components/common/Loading';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { dateUtils } from '@line-secretary/shared';

// Mock data
const mockSchedules = [
  {
    scheduleId: '1',
    title: 'チームミーティング',
    type: 'event',
    startTime: new Date('2023-12-15T10:00:00'),
    endTime: new Date('2023-12-15T11:00:00'),
    allDay: false,
    status: 'confirmed',
    location: '会議室A',
  },
  {
    scheduleId: '2',
    title: 'プレゼン資料作成',
    type: 'task',
    startTime: new Date('2023-12-15T14:00:00'),
    allDay: false,
    status: 'pending',
  },
  {
    scheduleId: '3',
    title: '誕生日',
    type: 'event',
    startTime: new Date('2023-12-16T00:00:00'),
    allDay: true,
    status: 'confirmed',
  },
  {
    scheduleId: '4',
    title: '報告書提出期限',
    type: 'reminder',
    startTime: new Date('2023-12-17T17:00:00'),
    allDay: false,
    status: 'pending',
  },
];

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div hidden={value !== index} {...other}>
      {value === index && children}
    </div>
  );
}

export default function SchedulePage() {
  const router = useRouter();
  const [tabValue, setTabValue] = useState(0);
  const [currentDate, setCurrentDate] = useState(new Date());

  const { data: schedules, isLoading, error } = useQuery('schedules', async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return mockSchedules;
  });

  if (isLoading) return <Loading message="スケジュールを読み込み中..." />;
  if (error) return <ErrorMessage message="スケジュールの読み込みに失敗しました" />;

  const todaySchedules = schedules?.filter(s => 
    dateUtils.isSameDay(s.startTime, currentDate)
  ) || [];

  const upcomingSchedules = schedules?.filter(s => 
    dateUtils.isAfter(s.startTime, currentDate)
  ) || [];

  const getScheduleIcon = (type: string) => {
    switch (type) {
      case 'event': return <Event color="primary" />;
      case 'task': return <Assignment color="secondary" />;
      case 'reminder': return <Notifications color="warning" />;
      default: return <CalendarToday />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'success';
      case 'completed': return 'default';
      case 'cancelled': return 'error';
      default: return 'primary';
    }
  };

  const formatScheduleTime = (schedule: any) => {
    if (schedule.allDay) {
      return '終日';
    }
    return dateUtils.format(schedule.startTime, 'HH:mm');
  };

  const handlePreviousDay = () => {
    setCurrentDate(dateUtils.addDays(currentDate, -1).toDate());
  };

  const handleNextDay = () => {
    setCurrentDate(dateUtils.addDays(currentDate, 1).toDate());
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ py: 2 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          スケジュール
        </Typography>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
            <Tab label="日表示" />
            <Tab label="リスト表示" />
            <Tab label="カレンダー" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <IconButton onClick={handlePreviousDay}>
                  <ChevronLeft />
                </IconButton>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6">
                    {dateUtils.format(currentDate, 'MM月DD日(ddd)')}
                  </Typography>
                  <Chip
                    label="今日"
                    size="small"
                    icon={<Today />}
                    onClick={handleToday}
                    sx={{ mt: 1 }}
                  />
                </Box>
                <IconButton onClick={handleNextDay}>
                  <ChevronRight />
                </IconButton>
              </Box>

              {todaySchedules.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography color="text.secondary">
                    予定はありません
                  </Typography>
                </Box>
              ) : (
                <List>
                  {todaySchedules.map((schedule, index) => (
                    <ListItem
                      key={schedule.scheduleId}
                      button
                      onClick={() => router.push(`/schedule/${schedule.scheduleId}`)}
                      divider={index < todaySchedules.length - 1}
                    >
                      <ListItemIcon>
                        {getScheduleIcon(schedule.type)}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body1">
                              {formatScheduleTime(schedule)}
                            </Typography>
                            <Typography variant="body1" sx={{ flexGrow: 1 }}>
                              {schedule.title}
                            </Typography>
                            <Chip 
                              label={schedule.status} 
                              size="small"
                              color={getStatusColor(schedule.status) as any}
                            />
                          </Box>
                        }
                        secondary={schedule.location}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                今後の予定
              </Typography>
              <List>
                {upcomingSchedules.slice(0, 5).map((schedule, index) => (
                  <ListItem
                    key={schedule.scheduleId}
                    button
                    onClick={() => router.push(`/schedule/${schedule.scheduleId}`)}
                    divider={index < Math.min(5, upcomingSchedules.length) - 1}
                  >
                    <ListItemIcon>
                      {getScheduleIcon(schedule.type)}
                    </ListItemIcon>
                    <ListItemText
                      primary={schedule.title}
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <AccessTime fontSize="small" />
                          <Typography variant="caption">
                            {dateUtils.format(schedule.startTime, 'MM/DD(ddd) HH:mm')}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={2}>
            {schedules?.map((schedule) => (
              <Grid item xs={12} key={schedule.scheduleId}>
                <Card 
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': { transform: 'translateY(-2px)' },
                    transition: 'transform 0.2s',
                  }}
                  onClick={() => router.push(`/schedule/${schedule.scheduleId}`)}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                      {getScheduleIcon(schedule.type)}
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6">
                          {schedule.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {schedule.allDay 
                            ? dateUtils.format(schedule.startTime, 'MM/DD(ddd) 終日')
                            : dateUtils.format(schedule.startTime, 'MM/DD(ddd) HH:mm')
                          }
                        </Typography>
                        {schedule.location && (
                          <Typography variant="body2" color="text.secondary">
                            📍 {schedule.location}
                          </Typography>
                        )}
                      </Box>
                      <Chip 
                        label={schedule.status} 
                        size="small"
                        color={getStatusColor(schedule.status) as any}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Card>
            <CardContent>
              <Typography variant="h6" align="center" sx={{ mb: 2 }}>
                カレンダー表示（準備中）
              </Typography>
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <CalendarToday sx={{ fontSize: 64, color: 'text.disabled' }} />
                <Typography color="text.secondary" sx={{ mt: 2 }}>
                  カレンダー表示は現在開発中です
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </TabPanel>
      </Box>

      <Fab
        color="primary"
        aria-label="add"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
        }}
        onClick={() => router.push('/schedule/create')}
      >
        <Add />
      </Fab>
    </Container>
  );
}