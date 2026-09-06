import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import HistoryIcon from '@mui/icons-material/History';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import { useTranslation } from 'react-i18next';
import MvsPageHeader from '../../components/Common/MvsPageHeader';
import {
  mvsBodyCardSx,
  mvsBodyOutlinedBtnSx,
  mvsBodyPrimaryBtnSx,
  mvsPageRootSx,
} from '../../theme/mvsLayout';
import {
  COMPANY_POLICY_TAB_ORDER,
  companyPolicyService,
  type CompanyPolicyItem,
  type CompanyPolicyKey,
  type CompanyPolicyRevisionDetail,
  type CompanyPolicyRevisionSummary,
} from '../../services/api';
import { showErrorPopup, showSuccessPopup } from '../../utils/errorHandler';

const TAB_LABEL: Record<CompanyPolicyKey, string> = {
  employment: 'companyPolicies.tabs.employment',
  attendance: 'companyPolicies.tabs.attendance',
  leave: 'companyPolicies.tabs.leave',
  salary_payroll: 'companyPolicies.tabs.salaryPayroll',
  confidentiality_data: 'companyPolicies.tabs.confidentialityData',
  posh: 'companyPolicies.tabs.posh',
  separation: 'companyPolicies.tabs.separation',
};

const MyCompanyPolicies: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isEn = Boolean(i18n.language?.startsWith('en'));

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [editing, setEditing] = useState(false);
  const [policies, setPolicies] = useState<CompanyPolicyItem[]>([]);
  const [tab, setTab] = useState<CompanyPolicyKey>('employment');
  const [draft, setDraft] = useState({
    title_ko: '',
    title_en: '',
    content_ko: '',
    content_en: '',
    change_summary: '',
  });
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRows, setHistoryRows] = useState<CompanyPolicyRevisionSummary[]>([]);
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [revision, setRevision] = useState<CompanyPolicyRevisionDetail | null>(null);

  const current = useMemo(
    () => policies.find((row) => row.policy_key === tab) || null,
    [policies, tab]
  );

  const titleText = isEn
    ? current?.title_en || current?.title_ko || ''
    : current?.title_ko || current?.title_en || '';
  const bodyText = isEn
    ? current?.content_en || current?.content_ko || ''
    : current?.content_ko || current?.content_en || '';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await companyPolicyService.list();
      setPolicies((res?.data || []) as CompanyPolicyItem[]);
      setCanEdit(Boolean(res?.meta?.can_edit));
    } catch (error: any) {
      showErrorPopup(error, t('companyPolicies.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setEditing(false);
    setDraft({
      title_ko: current?.title_ko || '',
      title_en: current?.title_en || '',
      content_ko: current?.content_ko || '',
      content_en: current?.content_en || '',
      change_summary: '',
    });
  }, [current]);

  const handleSave = async () => {
    if (!current || !canEdit) return;
    setSaving(true);
    try {
      const res = await companyPolicyService.update(String(current.policy_key), {
        title_ko: draft.title_ko.trim(),
        title_en: draft.title_en.trim(),
        content_ko: draft.content_ko,
        content_en: draft.content_en,
        change_summary: draft.change_summary.trim(),
      });
      if (!res?.success) {
        throw new Error(res?.message || t('companyPolicies.errors.saveFailed'));
      }
      showSuccessPopup(t('companyPolicies.success.saved'));
      setEditing(false);
      await load();
    } catch (error: any) {
      showErrorPopup(error, t('companyPolicies.errors.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleOpenHistory = async () => {
    if (!current) return;
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const res = await companyPolicyService.history(String(current.policy_key));
      setHistoryRows((res?.data || []) as CompanyPolicyRevisionSummary[]);
    } catch (error: any) {
      showErrorPopup(error, t('companyPolicies.errors.historyFailed'));
      setHistoryRows([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleOpenRevision = async (version: number) => {
    if (!current) return;
    try {
      const res = await companyPolicyService.revision(String(current.policy_key), version);
      setRevision((res?.data || null) as CompanyPolicyRevisionDetail | null);
      setRevisionOpen(true);
    } catch (error: any) {
      showErrorPopup(error, t('companyPolicies.errors.historyFailed'));
    }
  };

  return (
    <Box sx={mvsPageRootSx}>
      <MvsPageHeader
        title={t('companyPolicies.title')}
        description={t('companyPolicies.subtitle')}
      />

      <Card sx={mvsBodyCardSx}>
        <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
          <Tabs
            value={tab}
            onChange={(_, next: CompanyPolicyKey) => setTab(next)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 40,
              borderBottom: '1px solid',
              borderColor: 'divider',
              mb: 2,
              '& .MuiTab-root': {
                minHeight: 40,
                textTransform: 'none',
                fontSize: '0.8125rem',
                fontWeight: 600,
                px: 1.25,
              },
            }}
          >
            {COMPANY_POLICY_TAB_ORDER.map((key) => (
              <Tab key={key} value={key} label={t(TAB_LABEL[key])} />
            ))}
          </Tabs>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress size={28} />
            </Box>
          ) : !current ? (
            <Alert severity="info">{t('companyPolicies.empty')}</Alert>
          ) : (
            <Stack spacing={1.5}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                alignItems={{ sm: 'center' }}
                justifyContent="space-between"
              >
                <Box>
                  <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 700 }}>
                    {editing
                      ? isEn
                        ? draft.title_en || draft.title_ko
                        : draft.title_ko || draft.title_en
                      : titleText}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t('companyPolicies.version', { version: current.version })}
                    {current.updated_by_name
                      ? ` · ${t('companyPolicies.updatedBy', { name: current.updated_by_name })}`
                      : ''}
                    {current.updated_at
                      ? ` · ${new Date(current.updated_at).toLocaleString()}`
                      : ''}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Button
                    size="small"
                    startIcon={<HistoryIcon />}
                    onClick={() => void handleOpenHistory()}
                    sx={mvsBodyOutlinedBtnSx}
                  >
                    {t('companyPolicies.actions.history')}
                  </Button>
                  {canEdit && !editing ? (
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<EditOutlinedIcon />}
                      onClick={() => setEditing(true)}
                      sx={mvsBodyPrimaryBtnSx}
                    >
                      {t('companyPolicies.actions.edit')}
                    </Button>
                  ) : null}
                  {canEdit && editing ? (
                    <>
                      <Button
                        size="small"
                        onClick={() => setEditing(false)}
                        disabled={saving}
                        sx={mvsBodyOutlinedBtnSx}
                      >
                        {t('common.cancel')}
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<SaveOutlinedIcon />}
                        onClick={() => void handleSave()}
                        disabled={saving}
                        sx={mvsBodyPrimaryBtnSx}
                      >
                        {t('companyPolicies.actions.save')}
                      </Button>
                    </>
                  ) : null}
                </Stack>
              </Stack>

              {!canEdit ? (
                <Alert severity="info" sx={{ py: 0.5 }}>
                  {t('companyPolicies.readOnlyHint')}
                </Alert>
              ) : null}

              {editing ? (
                <Stack spacing={1.5}>
                  <TextField
                    label={t('companyPolicies.fields.titleKo')}
                    size="small"
                    fullWidth
                    value={draft.title_ko}
                    onChange={(e) => setDraft((prev) => ({ ...prev, title_ko: e.target.value }))}
                  />
                  <TextField
                    label={t('companyPolicies.fields.titleEn')}
                    size="small"
                    fullWidth
                    value={draft.title_en}
                    onChange={(e) => setDraft((prev) => ({ ...prev, title_en: e.target.value }))}
                  />
                  <TextField
                    label={t('companyPolicies.fields.contentKo')}
                    size="small"
                    fullWidth
                    multiline
                    minRows={10}
                    value={draft.content_ko}
                    onChange={(e) => setDraft((prev) => ({ ...prev, content_ko: e.target.value }))}
                  />
                  <TextField
                    label={t('companyPolicies.fields.contentEn')}
                    size="small"
                    fullWidth
                    multiline
                    minRows={10}
                    value={draft.content_en}
                    onChange={(e) => setDraft((prev) => ({ ...prev, content_en: e.target.value }))}
                  />
                  <TextField
                    label={t('companyPolicies.fields.changeSummary')}
                    size="small"
                    fullWidth
                    value={draft.change_summary}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, change_summary: e.target.value }))
                    }
                    placeholder={t('companyPolicies.fields.changeSummaryPlaceholder')}
                  />
                </Stack>
              ) : (
                <Box
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: '#FAFAFA',
                    p: 1.5,
                    minHeight: 280,
                    whiteSpace: 'pre-wrap',
                    fontSize: '0.875rem',
                    lineHeight: 1.6,
                  }}
                >
                  {bodyText || t('companyPolicies.emptyContent')}
                </Box>
              )}
            </Stack>
          )}
        </CardContent>
      </Card>

      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{t('companyPolicies.historyTitle')}</DialogTitle>
        <DialogContent dividers>
          {historyLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : historyRows.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t('companyPolicies.historyEmpty')}
            </Typography>
          ) : (
            <Stack spacing={1} divider={<Divider flexItem />}>
              {historyRows.map((row) => (
                <Box
                  key={row.id}
                  sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, py: 0.5 }}
                >
                  <Box>
                    <Typography variant="body2" fontWeight={700}>
                      v{row.version}
                      {row.change_summary ? ` — ${row.change_summary}` : ''}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {row.changed_by_name || '-'}
                      {row.created_at ? ` · ${new Date(row.created_at).toLocaleString()}` : ''}
                    </Typography>
                  </Box>
                  <Button size="small" onClick={() => void handleOpenRevision(row.version)}>
                    {t('companyPolicies.actions.viewRevision')}
                  </Button>
                </Box>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryOpen(false)}>{t('common.close')}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={revisionOpen} onClose={() => setRevisionOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>
          {t('companyPolicies.revisionTitle', { version: revision?.version || '-' })}
        </DialogTitle>
        <DialogContent dividers>
          {revision ? (
            <Stack spacing={1.5}>
              <Typography variant="subtitle1" fontWeight={700}>
                {isEn
                  ? revision.title_en || revision.title_ko
                  : revision.title_ko || revision.title_en}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {revision.changed_by_name || '-'}
                {revision.created_at ? ` · ${new Date(revision.created_at).toLocaleString()}` : ''}
                {revision.change_summary ? ` · ${revision.change_summary}` : ''}
              </Typography>
              <Box
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  p: 1.5,
                  whiteSpace: 'pre-wrap',
                  fontSize: '0.875rem',
                  bgcolor: '#FAFAFA',
                }}
              >
                {isEn
                  ? revision.content_en || revision.content_ko
                  : revision.content_ko || revision.content_en}
              </Box>
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRevisionOpen(false)}>{t('common.close')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MyCompanyPolicies;
