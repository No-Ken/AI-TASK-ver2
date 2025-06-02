import { useState } from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Fab,
  Chip,
  Grid,
  IconButton,
} from '@mui/material';
import { Add, ArrowBack, People, Paid } from '@mui/icons-material';
import { useRouter } from 'next/router';
import { useQuery } from 'react-query';
import { Loading } from '@/components/common/Loading';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { formatUtils } from '@line-secretary/shared';

// Mock data for development
const mockWarikans = [
  {
    warikanId: '1',
    title: '忘年会',
    totalAmount: 15000,
    members: [
      { userId: '1', displayName: 'あなた', amount: 3000, isPaid: true },
      { userId: '2', displayName: '田中さん', amount: 3000, isPaid: false },
      { userId: '3', displayName: '佐藤さん', amount: 3000, isPaid: true },
      { userId: '4', displayName: '鈴木さん', amount: 3000, isPaid: false },
      { userId: '5', displayName: '高橋さん', amount: 3000, isPaid: false },
    ],
    status: 'active',
    createdAt: new Date('2023-12-01'),
  },
  {
    warikanId: '2',
    title: 'ランチ',
    totalAmount: 4800,
    members: [
      { userId: '1', displayName: 'あなた', amount: 1200, isPaid: true },
      { userId: '2', displayName: '田中さん', amount: 1200, isPaid: true },
      { userId: '3', displayName: '佐藤さん', amount: 1200, isPaid: true },
      { userId: '4', displayName: '鈴木さん', amount: 1200, isPaid: true },
    ],
    status: 'settled',
    createdAt: new Date('2023-11-28'),
  },
];

export default function WarikanPage() {
  const router = useRouter();
  
  // TODO: Replace with actual API call
  const { data: warikans, isLoading, error } = useQuery('warikans', async () => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    return mockWarikans;
  });

  if (isLoading) return <Loading message="割り勘を読み込み中..." />;
  if (error) return <ErrorMessage message="割り勘の読み込みに失敗しました" />;

  const activeWarikans = warikans?.filter(w => w.status === 'active') || [];
  const settledWarikans = warikans?.filter(w => w.status === 'settled') || [];

  return (
    <Container maxWidth="sm">
      <Box sx={{ py: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton onClick={() => router.back()} sx={{ mr: 1 }}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h5" component="h1">
            割り勘
          </Typography>
        </Box>

        {activeWarikans.length > 0 && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <People /> 進行中
            </Typography>
            <Grid container spacing={2}>
              {activeWarikans.map((warikan) => {
                const paidCount = warikan.members.filter(m => m.isPaid).length;
                const amountPerPerson = Math.ceil(warikan.totalAmount / warikan.members.length);
                
                return (
                  <Grid item xs={12} key={warikan.warikanId}>
                    <Card 
                      sx={{ 
                        cursor: 'pointer',
                        '&:hover': { transform: 'translateY(-2px)' },
                        transition: 'transform 0.2s',
                      }}
                      onClick={() => router.push(`/warikan/${warikan.warikanId}`)}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Typography variant="h6" component="h3">
                            {warikan.title}
                          </Typography>
                          <Chip 
                            label="進行中" 
                            color="primary" 
                            size="small"
                          />
                        </Box>
                        
                        <Typography variant="body1" sx={{ mb: 1 }}>
                          💰 {formatUtils.currency(warikan.totalAmount)} 
                          <Typography component="span" variant="body2" color="text.secondary">
                            {' '}({formatUtils.currency(amountPerPerson)}/人)
                          </Typography>
                        </Typography>
                        
                        <Typography variant="body2" color="text.secondary">
                          👥 {paidCount}/{warikan.members.length}人支払い済み
                        </Typography>
                        
                        <Typography variant="caption" color="text.secondary">
                          {warikan.createdAt.toLocaleDateString('ja-JP')}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        )}

        {settledWarikans.length > 0 && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Paid /> 完了済み
            </Typography>
            <Grid container spacing={2}>
              {settledWarikans.map((warikan) => {
                const paidCount = warikan.members.filter(m => m.isPaid).length;
                const amountPerPerson = Math.ceil(warikan.totalAmount / warikan.members.length);
                
                return (
                  <Grid item xs={12} key={warikan.warikanId}>
                    <Card 
                      sx={{ 
                        cursor: 'pointer',
                        opacity: 0.8,
                        '&:hover': { opacity: 1 },
                        transition: 'opacity 0.2s',
                      }}
                      onClick={() => router.push(`/warikan/${warikan.warikanId}`)}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Typography variant="h6" component="h3">
                            {warikan.title}
                          </Typography>
                          <Chip 
                            label="完了" 
                            color="success" 
                            size="small"
                          />
                        </Box>
                        
                        <Typography variant="body1" sx={{ mb: 1 }}>
                          💰 {formatUtils.currency(warikan.totalAmount)} 
                          <Typography component="span" variant="body2" color="text.secondary">
                            {' '}({formatUtils.currency(amountPerPerson)}/人)
                          </Typography>
                        </Typography>
                        
                        <Typography variant="body2" color="text.secondary">
                          👥 {paidCount}/{warikan.members.length}人支払い済み
                        </Typography>
                        
                        <Typography variant="caption" color="text.secondary">
                          {warikan.createdAt.toLocaleDateString('ja-JP')}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        )}

        {warikans?.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              割り勘がありません
            </Typography>
            <Typography variant="body2" color="text.secondary">
              新しい割り勘を作成してみましょう
            </Typography>
          </Box>
        )}
      </Box>

      <Fab
        color="primary"
        aria-label="add"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
        }}
        onClick={() => router.push('/warikan/create')}
      >
        <Add />
      </Fab>
    </Container>
  );
}