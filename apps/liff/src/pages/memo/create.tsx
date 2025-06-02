import { useState, useEffect, useCallback } from 'react';
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
  Chip,
  Stack,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Alert,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  Paper,
  Divider,
} from '@mui/material';
import { 
  ArrowBack, 
  LocalOffer,
  Add,
  Folder,
  AutoAwesome,
  Save,
  Preview,
  Schedule,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useCreatePersonalMemo } from '@/hooks/useMemo';
import { PersonalMemo } from '@ai-secretary-task/shared/types';

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

// 自動保存機能
function useAutoSave(data: any, onSave: (data: any) => void, delay = 30000) {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    setHasUnsavedChanges(true);
    
    const timer = setTimeout(() => {
      if (data.title || data.content) {
        onSave(data);
        setLastSaved(new Date());
        setHasUnsavedChanges(false);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [data, onSave, delay]);

  return { lastSaved, hasUnsavedChanges };
}

// プレビューコンポーネント
function MemoPreview({ title, content, tags }: { title: string; content: string; tags: string[] }) {
  return (
    <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.50' }}>
      <Typography variant="h6" gutterBottom>
        {title || 'タイトルなし'}
      </Typography>
      <Typography variant="body1" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
        {content || '内容がありません'}
      </Typography>
      {tags.length > 0 && (
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {tags.map(tag => (
            <Chip
              key={tag}
              label={tag}
              size="small"
              icon={<LocalOffer />}
              variant="outlined"
            />
          ))}
        </Box>
      )}
    </Paper>
  );
}

export default function MemoCreatePage() {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const [tabValue, setTabValue] = useState(0);
  
  // フォーム状態
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    tags: [] as string[],
    parentPageId: '',
  });
  
  // UI状態
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [isDraft, setIsDraft] = useState(false);

  // API hooks
  const createMemoMutation = useCreatePersonalMemo();

  // 人気タグ（実際の実装では API から取得）
  const popularTags = [
    '仕事', 'プライベート', 'アイデア', 'TODO', '買い物', 
    '会議', 'プロジェクト', '日記', 'レシピ', '勉強'
  ];

  // 自動保存
  const handleAutoSave = useCallback((data: any) => {
    if (!autoSaveEnabled || !data.title) return;
    
    // 下書きとして保存
    localStorage.setItem('memo-draft', JSON.stringify({
      ...data,
      savedAt: new Date().toISOString()
    }));
    setIsDraft(true);
  }, [autoSaveEnabled]);

  const { lastSaved, hasUnsavedChanges } = useAutoSave(formData, handleAutoSave);

  // 下書きの復元
  useEffect(() => {
    const draft = localStorage.getItem('memo-draft');
    if (draft) {
      try {
        const parsedDraft = JSON.parse(draft);
        setFormData({
          title: parsedDraft.title || '',
          content: parsedDraft.content || '',
          tags: parsedDraft.tags || [],
          parentPageId: parsedDraft.parentPageId || '',
        });
        setIsDraft(true);
        enqueueSnackbar('下書きを復元しました', { variant: 'info' });
      } catch (error) {
        console.error('Failed to restore draft:', error);
      }
    }
  }, [enqueueSnackbar]);

  // フォーム更新ハンドラー
  const updateFormData = useCallback((updates: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  // バリデーション
  const isValid = formData.title.trim() && formData.content.trim();

  // AI タグ提案
  const handleGenerateSuggestions = async () => {
    if (!formData.content) {
      enqueueSnackbar('内容を入力してください', { variant: 'error' });
      return;
    }

    setIsGeneratingSuggestions(true);
    try {
      // Mock AI suggestion - 実際の実装では AI service を呼び出し
      await new Promise(resolve => setTimeout(resolve, 1500));
      const suggestions = ['アイデア', '仕事', 'TODO'];
      setSuggestedTags(suggestions);
      enqueueSnackbar('タグを提案しました', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('タグの提案に失敗しました', { variant: 'error' });
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  const handleAddSuggestedTag = (tag: string) => {
    if (!formData.tags.includes(tag)) {
      updateFormData({ tags: [...formData.tags, tag] });
    }
    setSuggestedTags(suggestedTags.filter(t => t !== tag));
  };

  // 送信処理
  const handleSubmit = async (asDraft = false) => {
    if (!isValid && !asDraft) {
      enqueueSnackbar('タイトルと内容を入力してください', { variant: 'error' });
      return;
    }

    try {
      await createMemoMutation.mutateAsync({
        title: formData.title || '無題のメモ',
        content: formData.content,
        tags: formData.tags,
        parentPageId: formData.parentPageId || undefined,
      });
      
      // 下書きを削除
      localStorage.removeItem('memo-draft');
      
      enqueueSnackbar(
        asDraft ? '下書きを保存しました' : 'メモを作成しました', 
        { variant: 'success' }
      );
      
      router.push('/memo');
    } catch (error) {
      enqueueSnackbar('保存に失敗しました', { variant: 'error' });
    }
  };

  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 's') {
          e.preventDefault();
          handleSubmit(true); // 下書き保存
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <Container maxWidth="sm">
      <Box sx={{ py: 2 }}>
        {/* ヘッダー */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton onClick={() => router.back()} sx={{ mr: 1 }}>
              <ArrowBack />
            </IconButton>
            <Typography variant="h5" component="h1">
              メモ作成
            </Typography>
          </Box>
          
          <FormControlLabel
            control={
              <Switch
                checked={autoSaveEnabled}
                onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                size="small"
              />
            }
            label="自動保存"
            sx={{ m: 0 }}
          />
        </Box>

        {/* 保存状態表示 */}
        {(hasUnsavedChanges || lastSaved || isDraft) && (
          <Alert 
            severity={hasUnsavedChanges ? 'warning' : 'info'} 
            sx={{ mb: 2 }}
            action={
              autoSaveEnabled && hasUnsavedChanges ? (
                <Button size="small" onClick={() => handleSubmit(true)}>
                  今すぐ保存
                </Button>
              ) : undefined
            }
          >
            {hasUnsavedChanges 
              ? '未保存の変更があります' 
              : isDraft 
                ? '下書きが保存されています'
                : `最後の保存: ${lastSaved?.toLocaleTimeString()}`
            }
          </Alert>
        )}

        {/* 編集・プレビュータブ */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
            <Tab 
              label="編集" 
              icon={<Visibility />}
              iconPosition="start"
            />
            <Tab 
              label="プレビュー" 
              icon={<Preview />}
              iconPosition="start"
            />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          {/* 編集フォーム */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <TextField
                fullWidth
                label="タイトル"
                value={formData.title}
                onChange={(e) => updateFormData({ title: e.target.value })}
                required
                sx={{ mb: 2 }}
                placeholder="例: アイデアメモ、買い物リスト"
                error={!formData.title && formData.content.length > 0}
                helperText={!formData.title && formData.content.length > 0 ? 'タイトルを入力してください' : ''}
              />
              
              <TextField
                fullWidth
                label="内容"
                value={formData.content}
                onChange={(e) => updateFormData({ content: e.target.value })}
                required
                multiline
                rows={8}
                sx={{ mb: 3 }}
                placeholder="メモの内容を入力してください..."
                helperText={`${formData.content.length}/10000文字 | Ctrl+S で下書き保存`}
              />

              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>ページ（任意）</InputLabel>
                <Select
                  value={formData.parentPageId}
                  onChange={(e) => updateFormData({ parentPageId: e.target.value })}
                  label="ページ（任意）"
                >
                  <MenuItem value="">
                    <em>なし</em>
                  </MenuItem>
                  {/* 実際の実装では useMemoPages() でページ一覧を取得 */}
                  <MenuItem value="work">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Folder fontSize="small" />
                      仕事
                    </Box>
                  </MenuItem>
                  <MenuItem value="private">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Folder fontSize="small" />
                      プライベート
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>

              {/* タグセクション */}
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="subtitle2">
                    タグ
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<AutoAwesome />}
                    onClick={handleGenerateSuggestions}
                    disabled={!formData.content || isGeneratingSuggestions}
                  >
                    {isGeneratingSuggestions ? 'AI分析中...' : 'AIで提案'}
                  </Button>
                </Box>
                
                {isGeneratingSuggestions && (
                  <LinearProgress sx={{ mb: 2 }} />
                )}
                
                <Autocomplete
                  multiple
                  freeSolo
                  value={formData.tags}
                  onChange={(_, newValue) => updateFormData({ tags: newValue })}
                  options={popularTags}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        variant="outlined"
                        label={option}
                        size="small"
                        icon={<LocalOffer />}
                        {...getTagProps({ index })}
                      />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      variant="outlined"
                      placeholder="タグを追加... (Enterで確定)"
                      helperText={`${formData.tags.length}/10個のタグ`}
                    />
                  )}
                />
              </Box>

              {/* AI提案タグ */}
              {suggestedTags.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    AIが提案したタグ
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {suggestedTags.map(tag => (
                      <Chip
                        key={tag}
                        label={tag}
                        size="small"
                        color="secondary"
                        variant="outlined"
                        icon={<Add />}
                        onClick={() => handleAddSuggestedTag(tag)}
                        sx={{ mb: 0.5 }}
                      />
                    ))}
                  </Stack>
                </Box>
              )}
            </CardContent>
          </Card>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {/* プレビュー */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                プレビュー
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <MemoPreview 
                title={formData.title}
                content={formData.content}
                tags={formData.tags}
              />
            </CardContent>
          </Card>
        </TabPanel>

        {/* アクションボタン */}
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            fullWidth
            onClick={() => router.back()}
            disabled={createMemoMutation.isLoading}
          >
            キャンセル
          </Button>
          
          <Button
            variant="outlined"
            fullWidth
            startIcon={<Schedule />}
            onClick={() => handleSubmit(true)}
            disabled={createMemoMutation.isLoading}
          >
            下書き保存
          </Button>
          
          <Button
            variant="contained"
            fullWidth
            startIcon={<Save />}
            onClick={() => handleSubmit()}
            disabled={!isValid || createMemoMutation.isLoading}
          >
            {createMemoMutation.isLoading ? '保存中...' : '作成'}
          </Button>
        </Stack>
      </Box>
    </Container>
  );
}