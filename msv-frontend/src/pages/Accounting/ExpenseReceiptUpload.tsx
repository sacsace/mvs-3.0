import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
  Stack,
  FormControlLabel,
  Radio,
  RadioGroup,
} from '@mui/material';
import { Upload as UploadIcon } from '@mui/icons-material';
import { accountingService } from '../../services/api';

const ExpenseReceiptUpload: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);
  const [file, setFile] = useState<File | null>(null);
  const [invoiceType, setInvoiceType] = useState<'tax' | 'proforma'>('tax');
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleUpload = async () => {
    if (!token) {
      setError('유효한 토큰이 없습니다. QR 코드를 다시 스캔해주세요.');
      return;
    }
    if (!file) {
      setError('영수증 파일을 선택해주세요.');
      return;
    }
    setUploading(true);
    setError('');
    setSuccess('');
    try {
      const response = await accountingService.uploadExpenseReceipt(token, file, invoiceType);
      if (!response?.success) {
        throw new Error(response?.message || '업로드 실패');
      }
      setSuccess(
        invoiceType === 'proforma'
          ? 'Proforma Invoice 업로드가 완료되었습니다.'
          : 'Tax Invoice 업로드가 완료되었습니다.'
      );
      setFile(null);
    } catch (uploadError: any) {
      setError(uploadError?.message || '업로드 중 오류가 발생했습니다.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box sx={{ p: 3, minHeight: '100vh', backgroundColor: 'background.default' }}>
      <Card sx={{ maxWidth: 520, mx: 'auto', mt: 6 }}>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h5" fontWeight="bold">
              영수증 업로드
            </Typography>
            <Typography variant="body2" color="text.secondary">
              QR 코드로 연결된 지출결의서에 영수증을 업로드합니다. Tax / Proforma를 선택하세요.
            </Typography>

            {!token && (
              <Alert severity="warning">
                유효한 토큰이 없습니다. QR 코드를 다시 스캔해주세요.
              </Alert>
            )}

            <RadioGroup
              row
              value={invoiceType}
              onChange={(e) => setInvoiceType(e.target.value as 'tax' | 'proforma')}
            >
              <FormControlLabel value="tax" control={<Radio size="small" />} label="Tax Invoice" />
              <FormControlLabel
                value="proforma"
                control={<Radio size="small" />}
                label="Proforma Invoice"
              />
            </RadioGroup>

            <Button variant="outlined" component="label" disabled={!token}>
              영수증 사진 선택
              <input
                hidden
                type="file"
                accept="image/*,application/pdf"
                capture="environment"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </Button>

            {file && (
              <Typography variant="body2">
                선택된 파일: {file.name}
              </Typography>
            )}

            <Button
              variant="contained"
              startIcon={<UploadIcon />}
              onClick={handleUpload}
              disabled={!token || !file || uploading}
            >
              {uploading ? '업로드 중...' : '업로드'}
            </Button>

            {success && <Alert severity="success">{success}</Alert>}
            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ExpenseReceiptUpload;
