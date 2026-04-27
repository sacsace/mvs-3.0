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
          {t('accountingBasicInfo.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
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

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Button variant="outlined" onClick={() => setData(emptyState)} disabled={!canEdit || loading}>
          {t('common.reset')}
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!canEdit || saving || loading}
        >
          {saving ? t('accountingBasicInfo.saving') : t('common.save')}
        </Button>
      </Box>
    </Box>
  );
};

export default AccountingBasicInfo;
