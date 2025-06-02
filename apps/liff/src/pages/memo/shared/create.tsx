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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
} from '@mui/material';
import { 
  ArrowBack, 
  People,
  Description,
  Assignment,
  DirectionsWalk,
  Notes,
  CheckCircle,
} from '@mui/icons-material';
import { useMutation } from 'react-query';
import { useToast } from '@/components/common/Toast';
import { MEMO_TEMPLATES } from '@line-secretary/shared';

const createSharedMemo = async (data: any) => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  return { memoId: 'new-shared-memo-id' };
};

// Mock groups
const mockGroups = [
  { groupId: 'group1', name: '営業チーム', memberCount: 8 },
  { groupId: 'group2', name: '大学同期', memberCount: 15 },
  { groupId: 'group3', name: '家族', memberCount: 4 },
];

type TemplateType = 'meeting' | 'outing' | 'custom';

export default function SharedMemoCreatePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [groupId, setGroupId] = useState('');
  const [templateType, setTemplateType] = useState<TemplateType>('meeting');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [templateData, setTemplateData] = useState<Record<string, any>>({});

  const createMutation = useMutation(createSharedMemo, {
    onSuccess: (data) => {
      showToast('共有メモを作成しました', 'success');
      router.push(`/memo/shared/${data.memoId}`);
    },
    onError: () => {
      showToast('作成に失敗しました', 'error');
    },
  });

  const handleSubmit = () => {
    if (!groupId || !title) {
      showToast('グループとタイトルを入力してください', 'error');
      return;
    }

    if (templateType !== 'custom' && Object.keys(templateData).length === 0) {
      showToast('テンプレート項目を入力してください', 'error');
      return;
    }

    createMutation.mutate({
      groupId,
      title,
      type: templateType,
      content: templateType === 'custom' ? content : undefined,
      templateData: templateType !== 'custom' ? templateData : undefined,
    });
  };

  const handleTemplateFieldChange = (key: string, value: any) => {
    setTemplateData(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const renderTemplateFields = () => {
    if (templateType === 'custom') {
      return (
        <TextField
          fullWidth
          label="内容"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          multiline
          rows={10}
          required
          placeholder="自由に記入してください..."
        />
      );
    }

    const template = MEMO_TEMPLATES[templateType];
    return (
      <Box>
        {template.sections.map(section => (
          <Box key={section.key} sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              {section.label}
            </Typography>
            {section.type === 'list' ? (
              <TextField
                fullWidth
                multiline
                rows={3}
                placeholder={`${section.label}を改行区切りで入力`}
                value={templateData[section.key]?.join('\n') || ''}
                onChange={(e) => {
                  const values = e.target.value.split('\n').filter(v => v.trim());
                  handleTemplateFieldChange(section.key, values);
                }}
              />
            ) : section.type === 'datetime' || section.type === 'date' ? (
              <TextField
                fullWidth
                type="datetime-local"
                value={templateData[section.key] || ''}
                onChange={(e) => handleTemplateFieldChange(section.key, e.target.value)}
              />
            ) : section.type === 'number' ? (
              <TextField
                fullWidth
                type="number"
                placeholder={section.label}
                value={templateData[section.key] || ''}
                onChange={(e) => handleTemplateFieldChange(section.key, e.target.value)}
              />
            ) : (
              <TextField
                fullWidth
                placeholder={section.label}
                value={templateData[section.key] || ''}
                onChange={(e) => handleTemplateFieldChange(section.key, e.target.value)}
              />
            )}
          </Box>
        ))}
      </Box>
    );
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ py: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton onClick={() => router.back()} sx={{ mr: 1 }}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h5" component="h1">
            共有メモ作成
          </Typography>
        </Box>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <FormControl fullWidth sx={{ mb: 3 }} required>
              <InputLabel>グループ</InputLabel>
              <Select
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                label="グループ"
              >
                {mockGroups.map(group => (
                  <MenuItem key={group.groupId} value={group.groupId}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                      <People fontSize="small" />
                      <Typography sx={{ flexGrow: 1 }}>{group.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {group.memberCount}人
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Typography variant="subtitle2" gutterBottom>
              テンプレート
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
              <Chip
                icon={<Assignment />}
                label="会議メモ"
                onClick={() => setTemplateType('meeting')}
                color={templateType === 'meeting' ? 'primary' : 'default'}
              />
              <Chip
                icon={<DirectionsWalk />}
                label="お出かけメモ"
                onClick={() => setTemplateType('outing')}
                color={templateType === 'outing' ? 'primary' : 'default'}
              />
              <Chip
                icon={<Notes />}
                label="自由形式"
                onClick={() => setTemplateType('custom')}
                color={templateType === 'custom' ? 'primary' : 'default'}
              />
            </Box>

            <TextField
              fullWidth
              label="タイトル"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              sx={{ mb: 3 }}
              placeholder={
                templateType === 'meeting' ? '例: 12月定例会議' :
                templateType === 'outing' ? '例: 忘年会企画' :
                '例: 共有事項'
              }
            />
          </CardContent>
        </Card>

        {templateType !== 'custom' && (
          <Paper sx={{ p: 2, mb: 3, bgcolor: 'primary.main', color: 'white' }}>
            <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircle />
              このテンプレートの特徴
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              {templateType === 'meeting' 
                ? '会議の議事録を構造化して記録できます。参加者、議題、決定事項、TODOを整理して管理。'
                : '旅行やイベントの計画を立てるのに最適。日程、参加者、予算、持ち物などを一元管理。'
              }
            </Typography>
          </Paper>
        )}

        <Card sx={{ mb: 3 }}>
          <CardContent>
            {renderTemplateFields()}
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
            onClick={handleSubmit}
            disabled={!groupId || !title || createMutation.isLoading}
          >
            作成
          </Button>
        </Box>
      </Box>
    </Container>
  );
}