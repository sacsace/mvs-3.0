import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { alpha, useTheme } from '@mui/material/styles';
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
  const theme = useTheme();
  const { t } = useTranslation();
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
          setError(response.message || t('accountingBasicInfo.errors.loadFailed'));
        }
      } catch (err: any) {
        setError(err?.response?.data?.message || t('accountingBasicInfo.errors.loadError'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [t]);

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
        setSuccess(response.message || t('accountingBasicInfo.successSaved'));
        setData(response.data || data);
      } else {
        setError(response.message || t('accountingBasicInfo.errors.saveFailed'));
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || t('accountingBasicInfo.errors.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const renderSection = (
    title: string,
    key: keyof BasicInfoState,
    placeholder: string
  ) => (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        borderRadius: '16px',
        border: '1px solid',
        borderColor: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.08)' : 'divider',
        boxShadow: theme.palette.mode === 'light' ? '0 2px 10px rgba(15, 23, 42, 0.04)' : '0 2px 12px rgba(0,0,0,0.25)',
      }}
    >
      <CardContent sx={{ py: 2.25, px: 2.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, letterSpacing: '-0.01em' }}>
          {title}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
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
            sx={{
              flex: 1,
              minWidth: 160,
              '& .MuiOutlinedInput-root': { borderRadius: '12px' },
            }}
          />
          <Button
            variant="contained"
            disableElevation
            startIcon={<AddIcon fontSize="small" />}
            onClick={() => updateList(key, inputs[key])}
            disabled={!canEdit || !inputs[key].trim()}
            sx={{ textTransform: 'none', borderRadius: '12px', px: 2 }}
          >
            {t('accountingBasicInfo.add')}
          </Button>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {data[key].length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t('accountingBasicInfo.emptyList')}
            </Typography>
          ) : (
            data[key].map((item, idx) => (
              <Box
                key={`${key}-${idx}`}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: '1px solid',
                  borderColor: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.08)' : 'divider',
                  borderRadius: '12px',
                  px: 1.5,
                  py: 1,
                  bgcolor: theme.palette.mode === 'light' ? 'rgba(0,0,0,0.02)' : alpha(theme.palette.common.white, 0.04),
                }}
              >
                <Typography variant="body2">{item}</Typography>
                <IconButton
                  size="small"
                  onClick={() => removeItem(key, idx)}
                  disabled={!canEdit}
                  sx={{
                    color: 'text.secondary',
                    borderRadius: '10px',
                    '&:hover': { color: 'error.main', bgcolor: alpha(theme.palette.error.main, 0.08) },
                  }}
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
    <Box sx={{ p: 0 }}>
      <Box sx={{ mb: 3 }}>
        <Typography
          component="h1"
          variant="pageTitle"
          sx={{ fontWeight: 600, letterSpacing: '-0.022em', fontSize: { xs: '1.125rem', sm: '1.3125rem' }, mb: 0.75 }}
        >
          {t('accountingBasicInfo.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5, maxWidth: 720 }}>
          {t('accountingBasicInfo.description')}
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
          {t('accountingBasicInfo.readOnlyHint')}
        </Alert>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
        {renderSection(
          t('accountingBasicInfo.sections.accountCategories'),
          'accountCategories',
          t('accountingBasicInfo.placeholders.accountCategories')
        )}
        {renderSection(
          t('accountingBasicInfo.sections.expenseCategories'),
          'expenseCategories',
          t('accountingBasicInfo.placeholders.expenseCategories')
        )}
        {renderSection(
          t('accountingBasicInfo.sections.taxCodes'),
          'taxCodes',
          t('accountingBasicInfo.placeholders.taxCodes')
        )}
        {renderSection(
          t('accountingBasicInfo.sections.paymentMethods'),
          'paymentMethods',
          t('accountingBasicInfo.placeholders.paymentMethods')
        )}
      </Box>

      <Divider sx={{ my: 3 }} />

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, flexWrap: 'wrap' }}>
        <Button
          variant="outlined"
          onClick={() => setData(emptyState)}
          disabled={!canEdit || loading}
          sx={{
            textTransform: 'none',
            borderRadius: '12px',
            borderColor: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.14)' : 'divider',
          }}
        >
          {t('common.reset')}
        </Button>
        <Button
          variant="contained"
          disableElevation
          onClick={handleSave}
          disabled={!canEdit || saving || loading}
          sx={{ textTransform: 'none', borderRadius: '12px', px: 2.5 }}
        >
          {saving ? t('accountingBasicInfo.saving') : t('common.save')}
        </Button>
      </Box>
    </Box>
  );
};

export default AccountingBasicInfo;
