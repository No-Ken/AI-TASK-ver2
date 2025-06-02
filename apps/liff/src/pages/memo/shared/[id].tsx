import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { 
  Container, 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  IconButton,
  Chip,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  AvatarGroup,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Divider,
  Menu,
  MenuItem,
  Badge,
  Tooltip,
  Alert,
  AlertTitle,
  Collapse,
  LinearProgress,
  Stack,
  Checkbox,
  FormControlLabel,
  ListItemIcon,
} from '@mui/material';
import { 
  ArrowBack, 
  Edit,
  People,
  PersonAdd,
  Lock,
  LockOpen,
  Share,
  Archive,
  MoreVert,
  AssignmentTurnedIn,
  Description,
  EditNote,
  Visibility,
  Warning,
  CheckCircle,
  RadioButtonUnchecked,
  Sync,
  SyncDisabled,
  PersonOff,
  ContentCopy,
  Download,
  History,
  Comment,
  NotificationImportant,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { Loading } from '@/components/common/Loading';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { useSharedMemo, useUpdateSharedMemo } from '@/hooks/useMemo';
import { SharedMemo } from '@ai-secretary-task/shared/types';

// リアルタイム編集状態のモック
interface EditingUser {
  userId: string;
  displayName: string;
  lastSeen: Date;
  isActive: boolean;
}

// 権限レベル
enum PermissionLevel {
  READ = 'read',
  EDIT = 'edit',
  ADMIN = 'admin'
}

// Mock template
const MEMO_TEMPLATES = {
  meeting: {
    title: '会議',
    sections: [
      { key: 'date', label: '日時', type: 'text' },
      { key: 'attendees', label: '参加者', type: 'list' },
      { key: 'agenda', label: 'アジェンダ', type: 'list' },
      { key: 'decisions', label: '決定事項', type: 'list' },
      { key: 'todos', label: 'TODO', type: 'list' },
      { key: 'nextMeeting', label: '次回会議', type: 'text' },
    ]
  },
  outing: {
    title: 'お出かけ',
    sections: [
      { key: 'date', label: '日時', type: 'text' },
      { key: 'destination', label: '行き先', type: 'text' },
      { key: 'participants', label: '参加者', type: 'list' },
      { key: 'schedule', label: 'スケジュール', type: 'list' },
      { key: 'cost', label: '費用', type: 'text' },
      { key: 'notes', label: '備考', type: 'text' },
    ]
  },
  custom: {
    title: '自由形式',
    sections: []
  }
};

export default function SharedMemoDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { enqueueSnackbar } = useSnackbar();
  
  // 状態管理
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [showCollaborationAlert, setShowCollaborationAlert] = useState(true);
  const [realTimeUsers, setRealTimeUsers] = useState<EditingUser[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(true);
  const [hasUnsyncedChanges, setHasUnsyncedChanges] = useState(false);

  // API hooks
  const { data: memo, isLoading, error, refetch } = useSharedMemo(id as string);
  const updateMemoMutation = useUpdateSharedMemo();

  // Mock data for available group members
  const groupMembers = [
    { userId: 'user4', displayName: '佐々木一郎', isOnline: true },
    { userId: 'user5', displayName: '渡辺美咲', isOnline: false },
    { userId: 'user6', displayName: '高橋慎太郎', isOnline: true },
  ];

  // リアルタイム編集のモック
  useEffect(() => {
    if (!memo) return;
    
    const mockUsers: EditingUser[] = [
      {
        userId: 'user2',
        displayName: '田中太郎',
        lastSeen: new Date(),
        isActive: true
      },
      {
        userId: 'user3',
        displayName: '佐藤花子',
        lastSeen: new Date(Date.now() - 30000), // 30秒前
        isActive: false
      }
    ];
    
    setRealTimeUsers(mockUsers);
    
    // 定期的にユーザーのアクティビティを更新
    const interval = setInterval(() => {
      setRealTimeUsers(prev => prev.map(user => ({
        ...user,
        isActive: Math.random() > 0.5,
        lastSeen: user.isActive ? new Date() : user.lastSeen
      })));
    }, 5000);

    return () => clearInterval(interval);
  }, [memo]);

  if (isLoading) return <Loading message="共有メモを読み込み中..." />;
  if (error || !memo) return <ErrorMessage message="共有メモの読み込みに失敗しました" />;

  const currentUserId = 'user1'; // TODO: Get from auth
  const isCreator = memo.createdBy === currentUserId;
  const isEditor = memo.editorUserIds?.includes(currentUserId) || false;
  const canEdit = isCreator || isEditor;
  const template = MEMO_TEMPLATES[memo.type as keyof typeof MEMO_TEMPLATES];
  
  // アクティブユーザー数
  const activeUsers = realTimeUsers.filter(u => u.isActive);

  const handleAddMembers = async () => {
    if (selectedMembers.length === 0) {
      enqueueSnackbar('メンバーを選択してください', { variant: 'warning' });
      return;
    }

    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      enqueueSnackbar(`${selectedMembers.length}人のメンバーを追加しました`, { variant: 'success' });
      setInviteDialogOpen(false);
      setSelectedMembers([]);
      refetch();
    } catch (error) {
      enqueueSnackbar('メンバーの追加に失敗しました', { variant: 'error' });
    }
  };

  const handleShare = () => {
    // LIFFでの共有機能
    if (typeof window !== 'undefined' && window.liff?.isApiAvailable('shareTargetPicker')) {
      const content = template.sections
        .map(section => {
          const value = memo.aiStructuredContent?.[section.key];
          if (!value) return '';
          
          if (Array.isArray(value)) {
            return `【${section.label}】\n${value.map(v => `・${v}`).join('\n')}`;
          }
          return `【${section.label}】${value}`;
        })
        .filter(Boolean)
        .join('\n\n');

      window.liff.shareTargetPicker([
        {
          type: 'text',
          text: `${memo.title}\n\n${content}`,
        },
      ]);
    } else {
      // フォールバック: クリップボードにコピー
      navigator.clipboard.writeText(`${memo.title}\n\n${memo.content}`);
      enqueueSnackbar('メモをクリップボードにコピーしました', { variant: 'success' });
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/memo/shared/${memo.memoId}`;
    navigator.clipboard.writeText(url);
    enqueueSnackbar('リンクをコピーしました', { variant: 'success' });
  };

  const renderTemplateContent = () => {
    if (!memo.aiStructuredContent) return null;

    return template.sections.map(section => {
      const value = memo.aiStructuredContent?.[section.key];
      if (!value) return null;

      return (
        <Box key={section.key} sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            {section.label}
          </Typography>
          {section.type === 'list' && Array.isArray(value) ? (
            <List dense disablePadding>
              {value.map((item, index) => (
                <ListItem key={index} sx={{ pl: 2 }}>
                  <ListItemIcon sx={{ minWidth: 20 }}>
                    <CheckCircle fontSize="small" color="success" />
                  </ListItemIcon>
                  <ListItemText 
                    primary={item}
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography variant="body2" sx={{ pl: 2, bgcolor: 'grey.50', p: 1, borderRadius: 1 }}>
              {value}
            </Typography>
          )}
        </Box>
      );
    });
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ py: 2 }}>
        {/* ヘッダー */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton onClick={() => router.back()} sx={{ mr: 1 }}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h5" component="h1" sx={{ flexGrow: 1 }}>
            共有メモ
          </Typography>
          
          {/* リアルタイム編集インジケーター */}
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
            {activeUsers.length > 0 && (
              <Tooltip 
                title={`${activeUsers.map(u => u.displayName).join(', ')}が編集中`}
                arrow
              >
                <Badge badgeContent={activeUsers.length} color="success">
                  <EditNote color={isConnected ? 'primary' : 'disabled'} />
                </Badge>
              </Tooltip>
            )}
            
            {!isConnected && (
              <Tooltip title="オフライン" arrow>
                <SyncDisabled color="error" sx={{ ml: 1 }} />
              </Tooltip>
            )}
          </Box>
          
          {canEdit && (
            <IconButton onClick={() => router.push(`/memo/shared/${id}/edit`)}>
              <Edit />
            </IconButton>
          )}
          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
            <MoreVert />
          </IconButton>
        </Box>

        {/* コラボレーション状態アラート */}
        <Collapse in={showCollaborationAlert && (activeUsers.length > 0 || hasUnsyncedChanges)}>
          <Alert 
            severity={hasUnsyncedChanges ? 'warning' : 'info'}
            onClose={() => setShowCollaborationAlert(false)}
            sx={{ mb: 2 }}
            action={
              hasUnsyncedChanges ? (
                <Button size="small" onClick={refetch}>
                  同期
                </Button>
              ) : undefined
            }
          >
            <AlertTitle>
              {hasUnsyncedChanges ? '未同期の変更があります' : 'リアルタイム編集中'}
            </AlertTitle>
            {hasUnsyncedChanges 
              ? '他のユーザーが編集した内容があります。同期ボタンで最新の状態を取得してください。'
              : `${activeUsers.map(u => u.displayName).join('、')}が同時に編集しています。`
            }
          </Alert>
        </Collapse>

        {/* メイン内容 */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h5" gutterBottom>
                {memo.title}
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                <Chip
                  icon={<People />}
                  label={memo.groupId}
                  size="small"
                  color="primary"
                />
                <Chip
                  icon={<Description />}
                  label={template.title}
                  size="small"
                  variant="outlined"
                />
                {canEdit ? (
                  <Chip
                    icon={<LockOpen />}
                    label="編集可能"
                    size="small"
                    color="success"
                  />
                ) : (
                  <Chip
                    icon={<Lock />}
                    label="閲覧のみ"
                    size="small"
                    color="default"
                  />
                )}
                
                {/* 同期状態 */}
                <Chip
                  icon={isConnected ? <Sync /> : <SyncDisabled />}
                  label={isConnected ? '同期済み' : 'オフライン'}
                  size="small"
                  color={isConnected ? 'success' : 'error'}
                  variant="outlined"
                />
              </Box>

              <Typography variant="body2" color="text.secondary">
                作成者: {memo.createdBy} • {new Date(memo.createdAt).toLocaleString()}
              </Typography>
              {memo.lastEditedBy && (
                <Typography variant="body2" color="text.secondary">
                  最終更新: {memo.lastEditedBy} • {new Date(memo.lastEditedAt).toLocaleString()}
                </Typography>
              )}
            </Box>

            <Divider sx={{ my: 2 }} />

            {memo.type !== 'custom' && memo.aiStructuredContent ? (
              renderTemplateContent()
            ) : (
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                {memo.content || '内容がありません'}
              </Typography>
            )}
          </CardContent>
        </Card>

        {/* メンバー管理 */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">
                編集メンバー
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {/* アクティブユーザーのアバター */}
                {activeUsers.length > 0 && (
                  <AvatarGroup max={3} sx={{ mr: 1 }}>
                    {activeUsers.map(user => (
                      <Tooltip key={user.userId} title={`${user.displayName}が編集中`} arrow>
                        <Avatar 
                          sx={{ 
                            width: 24, 
                            height: 24,
                            border: '2px solid',
                            borderColor: 'success.main'
                          }}
                        >
                          {user.displayName[0]}
                        </Avatar>
                      </Tooltip>
                    ))}
                  </AvatarGroup>
                )}
                
                {isCreator && (
                  <Button
                    size="small"
                    startIcon={<PersonAdd />}
                    onClick={() => setInviteDialogOpen(true)}
                  >
                    追加
                  </Button>
                )}
              </Box>
            </Box>

            <List>
              {memo.editorUserIds?.map((userId) => {
                const isActive = activeUsers.some(u => u.userId === userId);
                return (
                  <ListItem key={userId} sx={{ px: 0 }}>
                    <ListItemAvatar>
                      <Badge
                        overlap="circular"
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        badgeContent={
                          isActive ? (
                            <Box
                              sx={{
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                bgcolor: 'success.main',
                                border: '2px solid white',
                              }}
                            />
                          ) : undefined
                        }
                      >
                        <Avatar sx={{ width: 32, height: 32 }}>
                          {userId[0]}
                        </Avatar>
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2">
                            {userId}
                          </Typography>
                          {isActive && (
                            <Chip label="編集中" size="small" color="success" />
                          )}
                        </Box>
                      }
                      secondary={
                        isActive 
                          ? '現在編集中'
                          : `最終編集: ${new Date().toLocaleString()}`
                      }
                    />
                    {userId === memo.createdBy && (
                      <Chip label="作成者" size="small" />
                    )}
                  </ListItem>
                );
              })}
            </List>

            <Typography variant="caption" color="text.secondary">
              {memo.viewerUserIds?.length || 0}人が閲覧可能 • {activeUsers.length}人が編集中
            </Typography>
          </CardContent>
        </Card>

        {/* アクションボタン */}
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            fullWidth
            startIcon={<Share />}
            onClick={handleShare}
          >
            LINEで共有
          </Button>
          <Button
            variant="outlined"
            fullWidth
            startIcon={<ContentCopy />}
            onClick={handleCopyLink}
          >
            リンクコピー
          </Button>
        </Stack>
      </Box>

      {/* メニュー */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {canEdit && (
          <MenuItem onClick={() => {
            router.push(`/memo/shared/${id}/edit`);
            setAnchorEl(null);
          }}>
            <Edit sx={{ mr: 1 }} fontSize="small" />
            編集
          </MenuItem>
        )}
        <MenuItem onClick={() => {
          handleCopyLink();
          setAnchorEl(null);
        }}>
          <ContentCopy sx={{ mr: 1 }} fontSize="small" />
          リンクをコピー
        </MenuItem>
        <MenuItem onClick={() => {
          // Handle export
          setAnchorEl(null);
        }}>
          <Download sx={{ mr: 1 }} fontSize="small" />
          エクスポート
        </MenuItem>
        <MenuItem onClick={() => {
          // Handle version history
          setAnchorEl(null);
        }}>
          <History sx={{ mr: 1 }} fontSize="small" />
          履歴
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => {
          // Handle archive
          setAnchorEl(null);
        }}>
          <Archive sx={{ mr: 1 }} fontSize="small" />
          アーカイブ
        </MenuItem>
        {isCreator && (
          <MenuItem onClick={() => {
            setInviteDialogOpen(true);
            setAnchorEl(null);
          }}>
            <People sx={{ mr: 1 }} fontSize="small" />
            メンバー管理
          </MenuItem>
        )}
      </Menu>

      {/* メンバー招待ダイアログ */}
      <Dialog 
        open={inviteDialogOpen} 
        onClose={() => setInviteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>編集メンバーを追加</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            グループメンバーから編集権限を付与する人を選択してください。
          </Typography>
          
          <List>
            {groupMembers.map((member) => (
              <ListItem key={member.userId} dense>
                <ListItemIcon>
                  <Checkbox
                    checked={selectedMembers.includes(member.userId)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedMembers([...selectedMembers, member.userId]);
                      } else {
                        setSelectedMembers(selectedMembers.filter(id => id !== member.userId));
                      }
                    }}
                  />
                </ListItemIcon>
                <ListItemAvatar>
                  <Badge
                    overlap="circular"
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    badgeContent={
                      member.isOnline ? (
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            bgcolor: 'success.main',
                            border: '2px solid white',
                          }}
                        />
                      ) : undefined
                    }
                  >
                    <Avatar sx={{ width: 32, height: 32 }}>
                      {member.displayName[0]}
                    </Avatar>
                  </Badge>
                </ListItemAvatar>
                <ListItemText
                  primary={member.displayName}
                  secondary={member.isOnline ? 'オンライン' : 'オフライン'}
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setInviteDialogOpen(false);
            setSelectedMembers([]);
          }}>
            キャンセル
          </Button>
          <Button 
            variant="contained" 
            onClick={handleAddMembers}
            disabled={selectedMembers.length === 0}
          >
            {selectedMembers.length}人を追加
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}