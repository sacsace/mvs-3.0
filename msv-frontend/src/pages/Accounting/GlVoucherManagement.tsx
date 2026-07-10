import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import MvsPageHeader from '../../components/Common/MvsPageHeader';
import VoucherLinesEditor, { VoucherLineRow } from '../../components/Accounting/VoucherLinesEditor';
import { mvsBodyCardSx, mvsPageRootSx } from '../../theme/mvsLayout';
import { accountingService } from '../../services/api';
import { useStore } from '../../store';

type GlVoucher = {
  id: number;
  voucher_no: string;
  voucher_type: string;
  voucher_date: string;
  narration?: string;
  status: 'draft' | 'posted' | 'cancelled';
  source_type?: string;
  total_debit: number;
  total_credit: number;
  lines?: Array<{
    id: number;
    line_no: number;
    account_name: string;
    debit: number;
    credit: number;
    narration?: string;
  }>;
};

const STATUS_LABEL: Record<string, string> = {
  draft: '임시',
  posted: '장부반영',
  cancelled: '취소',
};

const GlVoucherManagement: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useStore();
  const postAllowed = user?.role === 'root' || user?.role === 'admin';

  const [rows, setRows] = useState<GlVoucher[]>([]);
  const [selected, setSelected] = useState<GlVoucher | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    voucherDate: new Date().toISOString().slice(0, 10),
    voucherType: 'journal',
    narration: '',
    lines: [
      { lineNo: 1, accountName: '', debit: 0, credit: 0 },
      { lineNo: 2, accountName: '', debit: 0, credit: 0 },
    ] as VoucherLineRow[],
  });

  const loadList = useCallback(async () => {
    try {
      setLoading(true);
      const response = await accountingService.getGlVouchers();
      setRows(Array.isArray(response?.data) ? response.data : []);
    } catch (err: any) {
      setError(err?.response?.data?.message || '전표 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAccounts = useCallback(async () => {
    const response = await accountingService.getGlAccounts({ ledgerOnly: true });
    setAccounts(Array.isArray(response?.data) ? response.data : []);
  }, []);

  const loadDetail = useCallback(async (id: number) => {
    const response = await accountingService.getGlVoucher(id);
    setSelected(response?.data || null);
  }, []);

  useEffect(() => {
    loadList();
    loadAccounts();
  }, [loadList, loadAccounts]);

  const handleCreate = async (postImmediately: boolean) => {
    try {
      await accountingService.createGlVoucher({
        voucherDate: form.voucherDate,
        voucherType: form.voucherType,
        narration: form.narration,
        lines: form.lines,
        postImmediately,
      });
      setSuccess(postImmediately ? '전표가 장부에 반영되었습니다.' : '전표가 저장되었습니다.');
      setDialogOpen(false);
      await loadList();
    } catch (err: any) {
      setError(err?.response?.data?.message || '전표 저장에 실패했습니다.');
    }
  };

  const handlePost = async () => {
    if (!selected) return;
    try {
      await accountingService.postGlVoucher(selected.id);
      setSuccess('장부에 반영되었습니다.');
      await loadDetail(selected.id);
      await loadList();
    } catch (err: any) {
      setError(err?.response?.data?.message || '장부 반영에 실패했습니다.');
    }
  };

  return (
    <Box sx={mvsPageRootSx}>
      <MvsPageHeader
        title="전표관리"
        description="분개 전표를 등록·검토하고 차변·대변을 확인한 뒤 장부에 반영합니다."
      />

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.1fr 1fr' }, gap: 2 }}>
        <Card elevation={0} sx={mvsBodyCardSx}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>전표 목록</Typography>
              <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
                전표 입력
              </Button>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>전표번호</TableCell>
                    <TableCell>일자</TableCell>
                    <TableCell>상태</TableCell>
                    <TableCell align="right">차변</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow
                      key={row.id}
                      hover
                      selected={selected?.id === row.id}
                      onClick={() => loadDetail(row.id)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>{row.voucher_no}</TableCell>
                      <TableCell>{row.voucher_date}</TableCell>
                      <TableCell>
                        <Chip size="small" label={STATUS_LABEL[row.status] || row.status} color={row.status === 'posted' ? 'success' : 'default'} />
                      </TableCell>
                      <TableCell align="right">{Number(row.total_debit || 0).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  {!loading && rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center">전표가 없습니다.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        <Card elevation={0} sx={mvsBodyCardSx}>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>전표 검토</Typography>
            {!selected ? (
              <Typography color="text.secondary">좌측에서 전표를 선택해 주세요.</Typography>
            ) : (
              <Box sx={{ display: 'grid', gap: 1.25 }}>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip label={selected.voucher_no} size="small" />
                  <Chip label={STATUS_LABEL[selected.status]} size="small" color={selected.status === 'posted' ? 'success' : 'default'} />
                  <Chip label={selected.voucher_date} size="small" variant="outlined" />
                </Box>
                <Typography variant="body2" color="text.secondary">{selected.narration || '-'}</Typography>
                <VoucherLinesEditor
                  lines={(selected.lines || []).map((line) => ({
                    lineNo: line.line_no,
                    accountName: line.account_name,
                    debit: Number(line.debit || 0),
                    credit: Number(line.credit || 0),
                    narration: line.narration,
                  }))}
                  accounts={accounts}
                  onChange={() => undefined}
                  readOnly
                />
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {postAllowed && selected.status === 'draft' && (
                    <Button variant="contained" onClick={handlePost}>장부 반영</Button>
                  )}
                  {selected.status === 'posted' && (
                    <Button variant="outlined" onClick={() => navigate('/accounting/ledger')}>
                      장부에서 보기
                    </Button>
                  )}
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>분개 전표 입력</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 1.5, pt: 1 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
            <TextField
              label="전표일자"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={form.voucherDate}
              onChange={(e) => setForm((p) => ({ ...p, voucherDate: e.target.value }))}
            />
            <FormControl>
              <InputLabel>전표유형</InputLabel>
              <Select label="전표유형" value={form.voucherType} onChange={(e) => setForm((p) => ({ ...p, voucherType: e.target.value }))}>
                <MenuItem value="journal">분개</MenuItem>
                <MenuItem value="payment">출금</MenuItem>
                <MenuItem value="receipt">입금</MenuItem>
                <MenuItem value="contra">대체</MenuItem>
                <MenuItem value="sales">매출</MenuItem>
                <MenuItem value="purchase">매입</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <TextField label="적요" value={form.narration} onChange={(e) => setForm((p) => ({ ...p, narration: e.target.value }))} />
          <VoucherLinesEditor lines={form.lines} accounts={accounts} onChange={(lines) => setForm((p) => ({ ...p, lines }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>취소</Button>
          <Button variant="outlined" onClick={() => handleCreate(false)}>임시저장</Button>
          <Button variant="contained" onClick={() => handleCreate(true)}>저장 후 장부반영</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(error)} autoHideDuration={5000} onClose={() => setError('')}>
        <Alert severity="error">{error}</Alert>
      </Snackbar>
      <Snackbar open={Boolean(success)} autoHideDuration={3000} onClose={() => setSuccess('')}>
        <Alert severity="success">{success}</Alert>
      </Snackbar>
    </Box>
  );
};

export default GlVoucherManagement;
