import { useState } from 'react';
import { useRouter } from 'next/router';
import { 
  Container, 
  Box, 
  Typography, 
  TextField,
  Button,
  IconButton,
  Card,
  CardContent,
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Stack,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { 
  ArrowBack, 
  Event,
  Assignment,
  Notifications,
  Add,
  Delete,
} from '@mui/icons-material';
import dayjs, { Dayjs } from 'dayjs';
import { useMutation } from 'react-query';
import { useToast } from '@/components/common/Toast';

const createSchedule = async (data: any) => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  return { scheduleId: 'new-schedule-id' };
};

interface Reminder {
  type: 'notification' | 'email';
  minutesBefore: number;
}

export default function ScheduleCreatePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [type, setType] = useState<'event' | 'task' | 'reminder'>('event');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [startTime, setStartTime] = useState<Dayjs | null>(dayjs().add(1, 'hour').startOf('hour'));
  const [endTime, setEndTime] = useState<Dayjs | null>(dayjs().add(2, 'hour').startOf('hour'));
  const [reminders, setReminders] = useState<Reminder[]>([
    { type: 'notification', minutesBefore: 30 }
  ]);

  const createMutation = useMutation(createSchedule, {
    onSuccess: (data) => {
      showToast('予定を作成しました', 'success');
      router.push(`/schedule/${data.scheduleId}`);
    },
    onError: () => {
      showToast('作成に失敗しました', 'error');
    },
  });

  const handleSubmit = () => {
    if (!title || !startTime) {
      showToast('必須項目を入力してください', 'error');
      return;
    }

    createMutation.mutate({
      type,
      title,
      description,
      location,
      allDay,
      startTime: startTime.toISOString(),
      endTime: endTime?.toISOString(),
      reminders,
    });
  };

  const addReminder = () => {
    if (reminders.length < 5) {
      setReminders([...reminders, { type: 'notification', minutesBefore: 10 }]);
    }
  };

  const removeReminder = (index: number) => {
    setReminders(reminders.filter((_, i) => i !== index));
  };

  const updateReminder = (index: number, minutes: number) => {
    const updated = [...reminders];
    updated[index].minutesBefore = minutes;
    setReminders(updated);
  };

  const getTypeIcon = () => {
    switch (type) {
      case 'event': return <Event />;
      case 'task': return <Assignment />;
      case 'reminder': return <Notifications />;
    }
  };

  const getTypeColor = () => {
    switch (type) {
      case 'event': return 'primary';
      case 'task': return 'secondary';
      case 'reminder': return 'warning';
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ja">
      <Container maxWidth="sm">
        <Box sx={{ py: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <IconButton onClick={() => router.back()} sx={{ mr: 1 }}>
              <ArrowBack />
            </IconButton>
            <Typography variant="h5" component="h1">
              予定作成
            </Typography>
          </Box>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                種類
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
                <Chip
                  icon={<Event />}
                  label="イベント"
                  color={type === 'event' ? 'primary' : 'default'}
                  onClick={() => setType('event')}
                />
                <Chip
                  icon={<Assignment />}
                  label="タスク"
                  color={type === 'task' ? 'secondary' : 'default'}
                  onClick={() => setType('task')}
                />
                <Chip
                  icon={<Notifications />}
                  label="リマインダー"
                  color={type === 'reminder' ? 'warning' : 'default'}
                  onClick={() => setType('reminder')}
                />
              </Stack>

              <TextField
                fullWidth
                label="タイトル"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                sx={{ mb: 2 }}
                placeholder={
                  type === 'event' ? '例: 会議、誕生日パーティー' :
                  type === 'task' ? '例: レポート作成、買い物' :
                  '例: 薬を飲む、支払い期限'
                }
              />
              
              <TextField
                fullWidth
                label="詳細（任意）"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                multiline
                rows={3}
                sx={{ mb: 2 }}
              />

              {type === 'event' && (
                <TextField
                  fullWidth
                  label="場所（任意）"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  sx={{ mb: 2 }}
                  placeholder="例: 会議室A、オンライン"
                />
              )}
            </CardContent>
          </Card>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                日時
              </Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={allDay}
                    onChange={(e) => setAllDay(e.target.checked)}
                  />
                }
                label="終日"
                sx={{ mb: 2 }}
              />

              {allDay ? (
                <DatePicker
                  label="日付"
                  value={startTime}
                  onChange={(newValue) => setStartTime(newValue)}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      required: true,
                    },
                  }}
                />
              ) : (
                <>
                  <DateTimePicker
                    label="開始日時"
                    value={startTime}
                    onChange={(newValue) => setStartTime(newValue)}
                    ampm={false}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        required: true,
                        sx: { mb: 2 },
                      },
                    }}
                  />
                  
                  {type === 'event' && (
                    <DateTimePicker
                      label="終了日時（任意）"
                      value={endTime}
                      onChange={(newValue) => setEndTime(newValue)}
                      ampm={false}
                      minDateTime={startTime || undefined}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                        },
                      }}
                    />
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  リマインダー
                </Typography>
                <IconButton 
                  size="small" 
                  onClick={addReminder}
                  disabled={reminders.length >= 5}
                >
                  <Add />
                </IconButton>
              </Box>

              {reminders.map((reminder, index) => (
                <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <Select
                      value={reminder.minutesBefore}
                      onChange={(e) => updateReminder(index, e.target.value as number)}
                    >
                      <MenuItem value={5}>5分前</MenuItem>
                      <MenuItem value={10}>10分前</MenuItem>
                      <MenuItem value={15}>15分前</MenuItem>
                      <MenuItem value={30}>30分前</MenuItem>
                      <MenuItem value={60}>1時間前</MenuItem>
                      <MenuItem value={1440}>1日前</MenuItem>
                    </Select>
                  </FormControl>
                  <IconButton
                    size="small"
                    onClick={() => removeReminder(index)}
                    disabled={reminders.length === 1}
                  >
                    <Delete />
                  </IconButton>
                </Box>
              ))}

              <Typography variant="caption" color="text.secondary">
                最大5個まで設定できます
              </Typography>
            </CardContent>
          </Card>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => router.back()}
            >
              キャンセル
            </Button>
            <Button
              variant="contained"
              fullWidth
              color={getTypeColor() as any}
              startIcon={getTypeIcon()}
              onClick={handleSubmit}
              disabled={!title || !startTime || createMutation.isLoading}
            >
              作成
            </Button>
          </Box>
        </Box>
      </Container>
    </LocalizationProvider>
  );
}