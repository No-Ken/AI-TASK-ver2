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
  InputAdornment,
  Slider,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  FormControlLabel,
  Switch,
} from '@mui/material';
import { 
  ArrowBack, 
  Person,
  Add,
  Remove,
  Receipt,
  CameraAlt,
} from '@mui/icons-material';
import { useMutation } from 'react-query';
import { useToast } from '@/components/common/Toast';
import { formatUtils } from '@line-secretary/shared';

const createWarikan = async (data: any) => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  return { warikanId: 'new-warikan-id' };
};

export default function WarikanCreatePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [memberCount, setMemberCount] = useState(2);
  const [isEqualSplit, setIsEqualSplit] = useState(true);
  const [memberAmounts, setMemberAmounts] = useState<number[]>([]);

  const createMutation = useMutation(createWarikan, {
    onSuccess: (data) => {
      showToast('割り勘を作成しました', 'success');
      router.push(`/warikan/${data.warikanId}`);
    },
    onError: () => {
      showToast('作成に失敗しました', 'error');
    },
  });

  const handleTotalAmountChange = (value: string) => {
    const numValue = value.replace(/[^0-9]/g, '');
    setTotalAmount(numValue);
    
    if (isEqualSplit && numValue) {
      const amount = Math.ceil(parseInt(numValue) / memberCount);
      setMemberAmounts(Array(memberCount).fill(amount));
    }
  };

  const handleMemberCountChange = (newCount: number) => {
    setMemberCount(newCount);
    
    if (isEqualSplit && totalAmount) {
      const amount = Math.ceil(parseInt(totalAmount) / newCount);
      setMemberAmounts(Array(newCount).fill(amount));
    } else {
      const currentAmounts = [...memberAmounts];
      if (newCount > currentAmounts.length) {
        const diff = newCount - currentAmounts.length;
        setMemberAmounts([...currentAmounts, ...Array(diff).fill(0)]);
      } else {
        setMemberAmounts(currentAmounts.slice(0, newCount));
      }
    }
  };

  const handleEqualSplitToggle = (checked: boolean) => {
    setIsEqualSplit(checked);
    
    if (checked && totalAmount) {
      const amount = Math.ceil(parseInt(totalAmount) / memberCount);
      setMemberAmounts(Array(memberCount).fill(amount));
    }
  };

  const handleMemberAmountChange = (index: number, value: string) => {
    const numValue = parseInt(value.replace(/[^0-9]/g, '') || '0');
    const newAmounts = [...memberAmounts];
    newAmounts[index] = numValue;
    setMemberAmounts(newAmounts);
    
    // Update total amount
    const newTotal = newAmounts.reduce((sum, amount) => sum + amount, 0);
    setTotalAmount(newTotal.toString());
  };

  const handleSubmit = () => {
    if (!title || !totalAmount || parseInt(totalAmount) === 0) {
      showToast('必須項目を入力してください', 'error');
      return;
    }

    createMutation.mutate({
      title,
      description,
      totalAmount: parseInt(totalAmount),
      memberCount,
      isEqualSplit,
      memberAmounts: isEqualSplit ? undefined : memberAmounts,
    });
  };

  const amountPerPerson = totalAmount && isEqualSplit 
    ? Math.ceil(parseInt(totalAmount) / memberCount)
    : 0;

  return (
    <Container maxWidth="sm">
      <Box sx={{ py: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton onClick={() => router.back()} sx={{ mr: 1 }}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h5" component="h1">
            割り勘作成
          </Typography>
        </Box>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              基本情報
            </Typography>
            
            <TextField
              fullWidth
              label="タイトル"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              sx={{ mb: 2 }}
              placeholder="例: 忘年会、ランチ代"
            />
            
            <TextField
              fullWidth
              label="説明（任意）"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              multiline
              rows={2}
              sx={{ mb: 3 }}
              placeholder="例: 12月の忘年会費用"
            />

            <TextField
              fullWidth
              label="合計金額"
              value={totalAmount}
              onChange={(e) => handleTotalAmountChange(e.target.value)}
              required
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: <InputAdornment position="start">¥</InputAdornment>,
              }}
              inputProps={{
                inputMode: 'numeric',
                pattern: '[0-9]*',
              }}
            />

            <Button
              variant="outlined"
              startIcon={<Receipt />}
              fullWidth
              sx={{ mb: 2 }}
              disabled
            >
              レシートをスキャン（準備中）
            </Button>
          </CardContent>
        </Card>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              人数・金額設定
            </Typography>

            <Box sx={{ mb: 3 }}>
              <Typography gutterBottom>
                人数: {memberCount}人
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <IconButton 
                  onClick={() => handleMemberCountChange(Math.max(2, memberCount - 1))}
                  disabled={memberCount <= 2}
                >
                  <Remove />
                </IconButton>
                <Slider
                  value={memberCount}
                  onChange={(_, value) => handleMemberCountChange(value as number)}
                  min={2}
                  max={20}
                  sx={{ flexGrow: 1 }}
                />
                <IconButton 
                  onClick={() => handleMemberCountChange(Math.min(20, memberCount + 1))}
                  disabled={memberCount >= 20}
                >
                  <Add />
                </IconButton>
              </Box>
            </Box>

            <FormControlLabel
              control={
                <Switch
                  checked={isEqualSplit}
                  onChange={(e) => handleEqualSplitToggle(e.target.checked)}
                />
              }
              label="均等に割る"
              sx={{ mb: 2 }}
            />

            {isEqualSplit && totalAmount && (
              <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white', borderRadius: 2, mb: 2 }}>
                <Typography variant="h6" align="center">
                  一人あたり
                </Typography>
                <Typography variant="h4" align="center">
                  {formatUtils.currency(amountPerPerson)}
                </Typography>
              </Box>
            )}

            {!isEqualSplit && (
              <List>
                {Array.from({ length: memberCount }).map((_, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <Person />
                    </ListItemIcon>
                    <ListItemText 
                      primary={index === 0 ? 'あなた' : `メンバー${index + 1}`}
                    />
                    <ListItemSecondaryAction>
                      <TextField
                        size="small"
                        value={memberAmounts[index] || ''}
                        onChange={(e) => handleMemberAmountChange(index, e.target.value)}
                        InputProps={{
                          startAdornment: <InputAdornment position="start">¥</InputAdornment>,
                        }}
                        inputProps={{
                          inputMode: 'numeric',
                          pattern: '[0-9]*',
                        }}
                        sx={{ width: 120 }}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
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
            disabled={!title || !totalAmount || createMutation.isLoading}
          >
            作成
          </Button>
        </Box>
      </Box>
    </Container>
  );
}