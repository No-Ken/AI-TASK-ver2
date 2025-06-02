import { useState, useMemo, useCallback } from 'react';
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
  TextField,
  InputAdornment,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  ListItemIcon,
  Menu,
  MenuItem,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  Button,
  Alert,
  Skeleton,
  Tooltip,
  Badge,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
} from '@mui/material';
import { 
  Add, 
  Search,
  Tag,
  Archive,
  Unarchive,
  MoreVert,
  ViewList,
  AccountTree,
  BubbleChart,
  Folder,
  Description,
  LocalOffer,
  People,
  Assignment,
  DirectionsWalk,
  AccessTime,
  Refresh,
  FilterList,
  Clear,
  Edit,
  Delete,
  AutoAwesome,
} from '@mui/icons-material';
import { useRouter } from 'next/router';
import { useSnackbar } from 'notistack';
import { Loading } from '@/components/common/Loading';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { usePersonalMemos, useSharedMemos, useUpdatePersonalMemo, useDeletePersonalMemo } from '@/hooks/useMemo';
import { PersonalMemo, SharedMemo } from '@ai-secretary-task/shared/types';

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

// 改善されたローディングスケルトン
function MemoSkeleton() {
  return (
    <Card sx={{ mb: 2 }}>
      <ListItem>
        <ListItemIcon>
          <Skeleton variant="circular" width={24} height={24} />
        </ListItemIcon>
        <ListItemText
          primary={<Skeleton variant="text" width="60%" />}
          secondary={
            <Box>
              <Skeleton variant="text" width="80%" />
              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                <Skeleton variant="rounded" width={60} height={24} />
                <Skeleton variant="rounded" width={80} height={24} />
              </Box>
              <Skeleton variant="text" width="40%" sx={{ mt: 1 }} />
            </Box>
          }
        />
      </ListItem>
    </Card>
  );
}

// 改善されたエラー表示
function MemoError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <Alert 
      severity="error" 
      action={
        <Button color="inherit" size="small" onClick={onRetry}>
          再試行
        </Button>
      }
      sx={{ mb: 2 }}
    >
      メモの読み込みに失敗しました: {error.message}
    </Alert>
  );
}

// 共有メモリスト改善版
function SharedMemoList() {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedMemoId, setSelectedMemoId] = useState<string | null>(null);

  // 実際のAPIを使用
  const { data: sharedMemos, isLoading, error, refetch } = useSharedMemos('default-group');

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'meeting': return <Assignment color="primary" />;
      case 'outing': return <DirectionsWalk color="secondary" />;
      default: return <Description />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'meeting': return '会議';
      case 'outing': return 'お出かけ';
      default: return '自由形式';
    }
  };

  const handleMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>, memoId: string) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedMemoId(memoId);
  }, []);

  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
    setSelectedMemoId(null);
  }, []);

  if (isLoading) {
    return (
      <Stack spacing={2}>
        {[...Array(3)].map((_, i) => (
          <MemoSkeleton key={i} />
        ))}
      </Stack>
    );
  }

  if (error) {
    return <MemoError error={error as Error} onRetry={refetch} />;
  }

  if (!sharedMemos?.data.length) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <People sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              共有メモがありません
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              グループで共有メモを作成してみましょう
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => router.push('/memo/shared/create')}
            >
              共有メモを作成
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <List>
        {sharedMemos.data.map((memo) => (
          <Card key={memo.memoId} sx={{ mb: 2, '&:hover': { elevation: 2 } }}>
            <ListItem
              button
              onClick={() => router.push(`/memo/shared/${memo.memoId}`)}
              sx={{ py: 2 }}
            >
              <ListItemIcon>
                {getTypeIcon(memo.type)}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                      {memo.title}
                    </Typography>
                    <Chip
                      label={getTypeLabel(memo.type)}
                      size="small"
                      variant="outlined"
                      color="primary"
                    />
                  </Box>
                }
                secondary={
                  <Box>
                    <Typography 
                      variant="body2" 
                      color="text.secondary" 
                      sx={{ 
                        mb: 1,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {memo.content.substring(0, 100)}...
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <People fontSize="small" />
                        <Typography variant="caption">
                          {memo.groupId}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <AccessTime fontSize="small" />
                        <Typography variant="caption">
                          {memo.lastEditedBy}が{new Date(memo.lastEditedAt).toLocaleDateString()}に更新
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                }
              />
              <ListItemSecondaryAction>
                <IconButton
                  edge="end"
                  onClick={(e) => handleMenuOpen(e, memo.memoId)}
                >
                  <MoreVert />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          </Card>
        ))}
      </List>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => {
          router.push(`/memo/shared/${selectedMemoId}`);
          handleMenuClose();
        }}>
          <Edit sx={{ mr: 1 }} fontSize="small" />
          開く
        </MenuItem>
        <MenuItem onClick={() => {
          // Handle duplicate
          enqueueSnackbar('機能開発中です', { variant: 'info' });
          handleMenuClose();
        }}>
          <Description sx={{ mr: 1 }} fontSize="small" />
          複製
        </MenuItem>
      </Menu>
    </>
  );
}

export default function MemoPage() {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const [tabValue, setTabValue] = useState(0);
  const [viewMode, setViewMode] = useState<'timeline' | 'structure' | 'graph'>('timeline');
  const [searchText, setSearchText] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedMemo, setSelectedMemo] = useState<PersonalMemo | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // 実際のAPIを使用
  const memoFilters = useMemo(() => ({
    viewMode,
    tags: selectedTags.length > 0 ? selectedTags : undefined,
    includeArchived: showArchived,
    limit: 50,
  }), [viewMode, selectedTags, showArchived]);

  const { 
    data: memosData, 
    isLoading, 
    error, 
    refetch 
  } = usePersonalMemos(memoFilters);

  const updateMemoMutation = useUpdatePersonalMemo();
  const deleteMemoMutation = useDeletePersonalMemo();

  // フィルタリングされたメモ
  const filteredMemos = useMemo(() => {
    if (!memosData?.data) return [];
    
    return memosData.data.filter(memo => {
      if (searchText) {
        const searchLower = searchText.toLowerCase();
        return memo.title.toLowerCase().includes(searchLower) || 
               memo.content.toLowerCase().includes(searchLower);
      }
      return true;
    });
  }, [memosData?.data, searchText]);

  // 全てのタグを取得
  const allTags = useMemo(() => {
    if (!memosData?.data) return [];
    return Array.from(new Set(memosData.data.flatMap(m => m.tags)));
  }, [memosData?.data]);

  const handleMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>, memo: PersonalMemo) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedMemo(memo);
  }, []);

  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
    setSelectedMemo(null);
  }, []);

  const handleTagToggle = useCallback((tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  }, []);

  const handleArchiveToggle = useCallback(async () => {
    if (!selectedMemo) return;
    
    try {
      await updateMemoMutation.mutateAsync({
        memoId: selectedMemo.memoId,
        data: { isArchived: !selectedMemo.isArchived }
      });
      
      enqueueSnackbar(
        selectedMemo.isArchived ? 'アーカイブを解除しました' : 'アーカイブしました',
        { variant: 'success' }
      );
    } catch (error) {
      enqueueSnackbar('操作に失敗しました', { variant: 'error' });
    }
    
    handleMenuClose();
  }, [selectedMemo, updateMemoMutation, enqueueSnackbar, handleMenuClose]);

  const handleDelete = useCallback(async () => {
    if (!selectedMemo) return;
    
    try {
      await deleteMemoMutation.mutateAsync(selectedMemo.memoId);
      enqueueSnackbar('メモを削除しました', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('削除に失敗しました', { variant: 'error' });
    }
    
    setDeleteDialogOpen(false);
    handleMenuClose();
  }, [selectedMemo, deleteMemoMutation, enqueueSnackbar, handleMenuClose]);

  const renderTimelineView = () => {
    if (isLoading) {
      return (
        <Stack spacing={2}>
          {[...Array(5)].map((_, i) => (
            <MemoSkeleton key={i} />
          ))}
        </Stack>
      );
    }

    if (error) {
      return <MemoError error={error as Error} onRetry={refetch} />;
    }

    if (filteredMemos.length === 0) {
      return (
        <Card>
          <CardContent>
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Description sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                {searchText || selectedTags.length > 0 ? 'メモが見つかりません' : 'メモがありません'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {searchText || selectedTags.length > 0 
                  ? '検索条件を変更してお試しください' 
                  : '最初のメモを作成してみましょう'
                }
              </Typography>
              {(!searchText && selectedTags.length === 0) && (
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => router.push('/memo/create')}
                >
                  メモを作成
                </Button>
              )}
            </Box>
          </CardContent>
        </Card>
      );
    }

    return (
      <List>
        {filteredMemos.map((memo) => (
          <Card key={memo.memoId} sx={{ mb: 2, '&:hover': { elevation: 2 } }}>
            <ListItem
              button
              onClick={() => router.push(`/memo/${memo.memoId}`)}
              sx={{ py: 2 }}
            >
              <ListItemIcon>
                <Description color={memo.isArchived ? 'disabled' : 'action'} />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography 
                      variant="subtitle1" 
                      sx={{ 
                        fontWeight: 'medium',
                        color: memo.isArchived ? 'text.disabled' : 'text.primary'
                      }}
                    >
                      {memo.title}
                    </Typography>
                    {memo.isArchived && (
                      <Chip 
                        icon={<Archive />} 
                        label="アーカイブ済み" 
                        size="small" 
                        variant="outlined"
                        color="default"
                      />
                    )}
                    {memo.aiSummary && (
                      <Tooltip title="AI要約あり">
                        <AutoAwesome fontSize="small" color="secondary" />
                      </Tooltip>
                    )}
                  </Box>
                }
                secondary={
                  <Box>
                    <Typography 
                      variant="body2" 
                      color="text.secondary" 
                      sx={{ 
                        mb: 1,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {memo.aiSummary || memo.content.substring(0, 100) + '...'}
                    </Typography>
                    
                    {memo.tags.length > 0 && (
                      <Box sx={{ display: 'flex', gap: 0.5, mb: 1, flexWrap: 'wrap' }}>
                        {memo.tags.map(tag => (
                          <Chip
                            key={tag}
                            label={tag}
                            size="small"
                            icon={<LocalOffer />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTagToggle(tag);
                            }}
                            color={selectedTags.includes(tag) ? 'primary' : 'default'}
                            variant={selectedTags.includes(tag) ? 'filled' : 'outlined'}
                          />
                        ))}
                      </Box>
                    )}
                    
                    <Typography variant="caption" color="text.secondary">
                      {new Date(memo.updatedAt).toLocaleDateString()} {new Date(memo.updatedAt).toLocaleTimeString()}
                      {memo.createdAt !== memo.updatedAt && ' (編集済み)'}
                    </Typography>
                  </Box>
                }
              />
              <ListItemSecondaryAction>
                <IconButton
                  edge="end"
                  onClick={(e) => handleMenuOpen(e, memo)}
                >
                  <MoreVert />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          </Card>
        ))}
      </List>
    );
  };

  const renderStructureView = () => (
    <Card>
      <CardContent>
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <AccountTree sx={{ fontSize: 64, color: 'text.disabled' }} />
          <Typography color="text.secondary" sx={{ mt: 2 }}>
            構造ビューは開発中です
          </Typography>
          <Typography variant="body2" color="text.secondary">
            メモをページ単位で整理します
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );

  const renderGraphView = () => (
    <Card>
      <CardContent>
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <BubbleChart sx={{ fontSize: 64, color: 'text.disabled' }} />
          <Typography color="text.secondary" sx={{ mt: 2 }}>
            グラフビューは開発中です
          </Typography>
          <Typography variant="body2" color="text.secondary">
            メモ間の関連性を視覚化します
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Container maxWidth="sm">
      <Box sx={{ py: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h5" component="h1">
            メモ
          </Typography>
          <IconButton onClick={refetch} disabled={isLoading}>
            <Refresh />
          </IconButton>
        </Box>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
            <Tab 
              label={
                <Badge badgeContent={memosData?.data.length || 0} color="primary">
                  個人メモ
                </Badge>
              } 
            />
            <Tab label="共有メモ" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          {/* 検索とフィルター */}
          <Stack spacing={2} sx={{ mb: 2 }}>
            <TextField
              fullWidth
              placeholder="メモを検索..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
                endAdornment: searchText && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchText('')}>
                      <Clear />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', flex: 1 }}>
                {allTags.slice(0, 5).map(tag => (
                  <Chip
                    key={tag}
                    label={tag}
                    size="small"
                    onClick={() => handleTagToggle(tag)}
                    color={selectedTags.includes(tag) ? 'primary' : 'default'}
                    icon={<Tag />}
                    variant={selectedTags.includes(tag) ? 'filled' : 'outlined'}
                  />
                ))}
                {allTags.length > 5 && (
                  <Chip
                    label={`+${allTags.length - 5}個`}
                    size="small"
                    variant="outlined"
                    onClick={() => {/* タグ選択ダイアログを開く */}}
                  />
                )}
              </Box>
              
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={(_, value) => value && setViewMode(value)}
                size="small"
              >
                <ToggleButton value="timeline">
                  <Tooltip title="タイムライン">
                    <ViewList />
                  </Tooltip>
                </ToggleButton>
                <ToggleButton value="structure">
                  <Tooltip title="構造">
                    <AccountTree />
                  </Tooltip>
                </ToggleButton>
                <ToggleButton value="graph">
                  <Tooltip title="グラフ">
                    <BubbleChart />
                  </Tooltip>
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Stack>

          {viewMode === 'timeline' && renderTimelineView()}
          {viewMode === 'structure' && renderStructureView()}
          {viewMode === 'graph' && renderGraphView()}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <SharedMemoList />
        </TabPanel>
      </Box>

      {/* メニュー */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => {
          router.push(`/memo/${selectedMemo?.memoId}/edit`);
          handleMenuClose();
        }}>
          <Edit sx={{ mr: 1 }} fontSize="small" />
          編集
        </MenuItem>
        <MenuItem onClick={handleArchiveToggle}>
          {selectedMemo?.isArchived ? (
            <>
              <Unarchive sx={{ mr: 1 }} fontSize="small" />
              アーカイブ解除
            </>
          ) : (
            <>
              <Archive sx={{ mr: 1 }} fontSize="small" />
              アーカイブ
            </>
          )}
        </MenuItem>
        <Divider />
        <MenuItem 
          onClick={() => {
            setDeleteDialogOpen(true);
            handleMenuClose();
          }}
          sx={{ color: 'error.main' }}
        >
          <Delete sx={{ mr: 1 }} fontSize="small" />
          削除
        </MenuItem>
      </Menu>

      {/* 削除確認ダイアログ */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>メモを削除</DialogTitle>
        <DialogContent>
          <DialogContentText>
            「{selectedMemo?.title}」を削除しますか？
            この操作は取り消せません。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            キャンセル
          </Button>
          <Button 
            onClick={handleDelete} 
            color="error" 
            variant="contained"
            disabled={deleteMemoMutation.isLoading}
          >
            削除
          </Button>
        </DialogActions>
      </Dialog>

      {/* FAB */}
      <Fab
        color="primary"
        aria-label="add"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
        }}
        onClick={() => router.push(tabValue === 0 ? '/memo/create' : '/memo/shared/create')}
      >
        <Add />
      </Fab>
    </Container>
  );
}