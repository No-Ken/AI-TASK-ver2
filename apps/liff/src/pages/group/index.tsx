import { useState } from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Fab,
  Avatar,
  AvatarGroup,
  Chip,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import { 
  Add, 
  Groups,
  MoreVert,
  Settings,
  PersonAdd,
  ExitToApp,
} from '@mui/icons-material';
import { useRouter } from 'next/router';
import { useQuery } from 'react-query';
import { Loading } from '@/components/common/Loading';
import { ErrorMessage } from '@/components/common/ErrorMessage';

// Mock data
const mockGroups = [
  {
    groupId: '1',
    name: '営業チーム',
    type: 'work',
    description: '営業部門のメンバー',
    pictureUrl: null,
    members: [
      { userId: 'user1', displayName: 'あなた', role: 'admin' },
      { userId: 'user2', displayName: '田中太郎', role: 'member' },
      { userId: 'user3', displayName: '佐藤花子', role: 'member' },
      { userId: 'user4', displayName: '鈴木一郎', role: 'member' },
    ],
    settings: {
      allowGuestWarikan: true,
      autoReminder: true,
    },
    updatedAt: new Date('2023-12-10'),
  },
  {
    groupId: '2',
    name: '大学同期',
    type: 'friends',
    description: '〇〇大学2020年卒業生',
    pictureUrl: null,
    members: [
      { userId: 'user1', displayName: 'あなた', role: 'member' },
      { userId: 'user5', displayName: '山田太郎', role: 'owner' },
      { userId: 'user6', displayName: '伊藤美咲', role: 'member' },
      { userId: 'user7', displayName: '渡辺健', role: 'member' },
      { userId: 'user8', displayName: '中村さくら', role: 'member' },
      { userId: 'user9', displayName: '小林大輔', role: 'member' },
    ],
    settings: {
      allowGuestWarikan: true,
      autoReminder: false,
    },
    updatedAt: new Date('2023-12-05'),
  },
  {
    groupId: '3',
    name: '家族',
    type: 'family',
    description: null,
    pictureUrl: null,
    members: [
      { userId: 'user1', displayName: 'あなた', role: 'owner' },
      { userId: 'user10', displayName: '妻', role: 'admin' },
      { userId: 'user11', displayName: '長男', role: 'member' },
      { userId: 'user12', displayName: '長女', role: 'member' },
    ],
    settings: {
      allowGuestWarikan: false,
      autoReminder: true,
    },
    updatedAt: new Date('2023-12-12'),
  },
];

export default function GroupPage() {
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  const { data: groups, isLoading, error } = useQuery('groups', async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return mockGroups;
  });

  if (isLoading) return <Loading message="グループを読み込み中..." />;
  if (error) return <ErrorMessage message="グループの読み込みに失敗しました" />;

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, groupId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedGroup(groupId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedGroup(null);
  };

  const getGroupTypeIcon = (type: string) => {
    switch (type) {
      case 'work': return '💼';
      case 'friends': return '👥';
      case 'family': return '👨‍👩‍👧‍👦';
      default: return '👥';
    }
  };

  const getGroupTypeLabel = (type: string) => {
    switch (type) {
      case 'work': return '仕事';
      case 'friends': return '友達';
      case 'family': return '家族';
      default: return 'その他';
    }
  };

  const getUserRole = (groupId: string) => {
    const group = groups?.find(g => g.groupId === groupId);
    const member = group?.members.find(m => m.userId === 'user1');
    return member?.role || 'member';
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ py: 2 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          グループ
        </Typography>

        {groups?.length === 0 ? (
          <Card>
            <CardContent>
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Groups sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  グループがありません
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  新しいグループを作成してメンバーを招待しましょう
                </Typography>
              </Box>
            </CardContent>
          </Card>
        ) : (
          <List>
            {groups?.map((group) => (
              <Card key={group.groupId} sx={{ mb: 2 }}>
                <ListItem
                  button
                  onClick={() => router.push(`/group/${group.groupId}`)}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      {group.pictureUrl ? (
                        <img src={group.pictureUrl} alt={group.name} />
                      ) : (
                        getGroupTypeIcon(group.type)
                      )}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1">
                          {group.name}
                        </Typography>
                        <Chip 
                          label={getGroupTypeLabel(group.type)} 
                          size="small" 
                          variant="outlined"
                        />
                        {getUserRole(group.groupId) !== 'member' && (
                          <Chip 
                            label={getUserRole(group.groupId) === 'owner' ? 'オーナー' : '管理者'} 
                            size="small" 
                            color="primary"
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 1 }}>
                        {group.description && (
                          <Typography variant="body2" color="text.secondary">
                            {group.description}
                          </Typography>
                        )}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                          <AvatarGroup max={4} sx={{ '& .MuiAvatar-root': { width: 24, height: 24, fontSize: 12 } }}>
                            {group.members.map((member) => (
                              <Avatar key={member.userId} sx={{ bgcolor: 'secondary.main' }}>
                                {member.displayName[0]}
                              </Avatar>
                            ))}
                          </AvatarGroup>
                          <Typography variant="caption" color="text.secondary">
                            {group.members.length}人のメンバー
                          </Typography>
                        </Box>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMenuOpen(e, group.groupId);
                      }}
                    >
                      <MoreVert />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              </Card>
            ))}
          </List>
        )}
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem
          onClick={() => {
            router.push(`/group/${selectedGroup}/settings`);
            handleMenuClose();
          }}
        >
          <Settings sx={{ mr: 1 }} />
          設定
        </MenuItem>
        <MenuItem
          onClick={() => {
            router.push(`/group/${selectedGroup}/invite`);
            handleMenuClose();
          }}
        >
          <PersonAdd sx={{ mr: 1 }} />
          メンバー招待
        </MenuItem>
        {getUserRole(selectedGroup || '') === 'member' && (
          <MenuItem
            onClick={() => {
              // Handle leave group
              handleMenuClose();
            }}
            sx={{ color: 'error.main' }}
          >
            <ExitToApp sx={{ mr: 1 }} />
            グループを退出
          </MenuItem>
        )}
      </Menu>

      <Fab
        color="primary"
        aria-label="add"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
        }}
        onClick={() => router.push('/group/create')}
      >
        <Add />
      </Fab>
    </Container>
  );
}