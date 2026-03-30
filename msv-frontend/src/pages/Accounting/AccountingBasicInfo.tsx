import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  IconButton,
  Divider,
  Alert
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { accountingBasicInfoService } from '../../services/api';
import { useStore } from '../../store';

type BasicInfoState = {
  accountCategories: string[];
  expenseCategories: string[];
  taxCodes: string[];
  paymentMethods: string[];
};

const emptyState: BasicInfoState = {
  accountCategories: [],
  expenseCategories: [],
  taxCodes: [],
  paymentMethods: []
};

const AccountingBasicInfo: React.FC = () => {
  const { user } = useStore();
  const [data, setData] = useState<BasicInfoState>(emptyState);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [inputs, setInputs] = useState({
    accountCategories: '',
    expenseCategories: '',
    taxCodes: '',
    paymentMethods: ''
  });

  const canEdit = user?.role === 'admin' || user?.role === 'root';

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await accountingBasicInfoService.getBasicInfo();
        if (response.success) {
          setData(response.data || emptyState);
        } else {
          setError(response.message || '회계 기본정보를 불러올 수 없습니다.');
        }
      } catch (err: any) {
        setError(err?.response?.data?.message || '회계 기본정보를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const updateList = (key: keyof BasicInfoState, value: string) => {
    if (!value.trim()) return;
    setData(prev => ({
      ...prev,
      [key]: [...prev[key], value.trim()]
    }));
    setInputs(prev => ({ ...prev, [key]: '' }));
  };

  const removeItem = (key: keyof BasicInfoState, index: number) => {
    setData(prev => ({
      ...prev,
      [key]: prev[key].filter((_, idx) => idx !== index)
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await accountingBasicInfoService.updateBasicInfo(data);
      if (response.success) {
        setSuccess(response.message || '저장되었습니다.');
        setData(response.data || data);
      } else {
        setError(response.message || '저장에 실패했습니다.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || '저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const renderSection = (
    title: string,
    key: keyof BasicInfoState,
    placeholder: string
  ) => (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
          {title}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <TextField
            fullWidth
            placeholder={placeholder}
            value={inputs[key]}
            onChange={(event) => setInputs(prev => ({ ...prev, [key]: event.target.value }))}
            size="small"
            disabled={!canEdit}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                updateList(key, inputs[key]);
              }
            }}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => updateList(key, inputs[key])}
            disabled={!canEdit || !inputs[key].trim()}
          >
            추가
          </Button>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {data[key].length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              등록된 항목이 없습니다.
            </Typography>
          ) : (
            data[key].map((item, idx) => (
              <Box
                key={`${key}-${idx}`}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: '1px solid #e0e0e0',
                  borderRadius: 1,
                  px: 1.5,
                  py: 1
                }}
              >
                <Typography variant="body2">{item}</Typography>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => removeItem(key, idx)}
                  disabled={!canEdit}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            ))
          )}
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          회계 기본정보 관리
        </Typography>
        <Typography variant="body2" color="text.secondary">
          회사별로 자주 쓰는 회계 기본정보를 간단히 등록하세요.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {!canEdit && (
        <Alert severity="info" sx={{ mb: 2 }}>
          관리 권한이 있는 사용자만 수정할 수 있습니다.
        </Alert>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
        {renderSection('계정과목', 'accountCategories', '예: 매출, 매입, 인건비')}
        {renderSection('비용항목', 'expenseCategories', '예: 출장비, 교통비')}
        {renderSection('세금코드', 'taxCodes', '예: VAT 10%, 면세')}
        {renderSection('결제수단', 'paymentMethods', '예: 계좌이체, 카드')}
      </Box>

      <Divider sx={{ my: 3 }} />

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Button variant="outlined" onClick={() => setData(emptyState)} disabled={!canEdit || loading}>
          초기화
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!canEdit || saving || loading}
        >
          {saving ? '저장 중...' : '저장'}
        </Button>
      </Box>
    </Box>
  );
};

export default AccountingBasicInfo;
