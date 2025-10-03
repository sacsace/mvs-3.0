import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Divider,
  Stepper,
  Step,
  StepLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Send as SendIcon,
  Print as PrintIcon,
  Download as DownloadIcon,
  QrCode as QrCodeIcon,
  Receipt as ReceiptIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  AttachMoney as MoneyIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { useStore } from '../../store';

interface EInvoiceItem {
  id: number;
  itemName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  cessRate: number;
  cessAmount: number;
  hsnCode: string;
  taxableValue: number;
  discountAmount: number;
  discountPercentage: number;
  taxAmount: number;
  taxRate: number;
}

interface EInvoice {
  id: number;
  invoiceNumber: string;
  irn: string;
  qrCode: string;
  ackNo: string;
  ackDate: string;
  customerId: number;
  customerName: string;
  customerGstin: string;
  customerAddress: string;
  customerEmail: string;
  customerPhone: string;
  customerState: string;
  customerStateCode: string;
  companyGstin: string;
  companyName: string;
  companyAddress: string;
  companyState: string;
  companyStateCode: string;
  invoiceDate: string;
  dueDate: string;
  supplyType: 'interstate' | 'intrastate';
  reverseCharge: boolean;
  items: EInvoiceItem[];
  subtotal: number;
  taxableValue: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  cessTotal: number;
  totalTax: number;
  totalAmount: number;
  totalDiscount: number;
  roundOffAmount: number;
  status: 'draft' | 'generated' | 'sent' | 'cancelled' | 'acknowledged';
  createdAt: string;
  updatedAt: string;
}

const EInvoiceCreate: React.FC = () => {
  const { user } = useStore();
  const [activeStep, setActiveStep] = useState(0);
  const [invoice, setInvoice] = useState<Partial<EInvoice>>({
    invoiceNumber: '',
    customerName: '',
    customerGstin: '',
    customerAddress: '',
    customerEmail: '',
    customerPhone: '',
    companyGstin: '29ABCDE1234F1Z5',
    companyName: 'MVS 3.0 Solutions',
    companyAddress: '123 Business Park, Bangalore, Karnataka 560001',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    items: [],
    subtotal: 0,
    totalTax: 0,
    totalAmount: 0,
    status: 'draft'
  });
  const [items, setItems] = useState<EInvoiceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openItemDialog, setOpenItemDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<EInvoiceItem | null>(null);

  const steps = [
    '고객 정보',
    '상품/서비스',
    '세금 계산',
    '검토 및 생성'
  ];

  useEffect(() => {
    calculateTotals();
  }, [items]);

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const totalTax = items.reduce((sum, item) => sum + item.taxAmount, 0);
    const totalAmount = subtotal + totalTax;

    setInvoice(prev => ({
      ...prev,
      subtotal,
      totalTax,
      totalAmount
    }));
  };

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleAddItem = () => {
    setSelectedItem(null);
    setOpenItemDialog(true);
  };

  const handleEditItem = (item: EInvoiceItem) => {
    setSelectedItem(item);
    setOpenItemDialog(true);
  };

  const handleDeleteItem = (id: number) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleSaveItem = (itemData: Omit<EInvoiceItem, 'id'>) => {
    if (selectedItem) {
      setItems(prev => prev.map(item => 
        item.id === selectedItem.id 
          ? { ...itemData, id: selectedItem.id }
          : item
      ));
    } else {
      const newItem: EInvoiceItem = {
        ...itemData,
        id: Date.now()
      };
      setItems(prev => [...prev, newItem]);
    }
    setOpenItemDialog(false);
  };

  const handleGenerateInvoice = async () => {
    setLoading(true);
    try {
      // IRN 생성 시뮬레이션
      const irn = `IRN${Date.now()}`;
      const qrCode = `QR${Date.now()}`;
      
      const newInvoice: EInvoice = {
        ...invoice as EInvoice,
        id: Date.now(),
        invoiceNumber: `EINV-${Date.now()}`,
        irn,
        qrCode,
        items,
        status: 'generated',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      console.log('E-Invoice 생성:', newInvoice);
      setSuccess('E-Invoice가 성공적으로 생성되었습니다.');
    } catch (error) {
      console.error('E-Invoice 생성 오류:', error);
      setError('E-Invoice 생성 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const renderCustomerInfo = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>고객 정보</Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="고객명"
              value={invoice.customerName || ''}
              onChange={(e) => setInvoice(prev => ({ ...prev, customerName: e.target.value }))}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="고객 GSTIN"
              value={invoice.customerGstin || ''}
              onChange={(e) => setInvoice(prev => ({ ...prev, customerGstin: e.target.value }))}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label="고객 주소"
              multiline
              rows={3}
              value={invoice.customerAddress || ''}
              onChange={(e) => setInvoice(prev => ({ ...prev, customerAddress: e.target.value }))}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="이메일"
              type="email"
              value={invoice.customerEmail || ''}
              onChange={(e) => setInvoice(prev => ({ ...prev, customerEmail: e.target.value }))}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="전화번호"
              value={invoice.customerPhone || ''}
              onChange={(e) => setInvoice(prev => ({ ...prev, customerPhone: e.target.value }))}
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const renderItems = () => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">상품/서비스</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddItem}
          >
            항목 추가
          </Button>
        </Box>
        
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>상품명</TableCell>
                <TableCell>수량</TableCell>
                <TableCell>단가</TableCell>
                <TableCell>금액</TableCell>
                <TableCell>세율</TableCell>
                <TableCell>세금</TableCell>
                <TableCell>작업</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.itemName}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>₩{item.unitPrice.toLocaleString()}</TableCell>
                  <TableCell>₩{item.totalPrice.toLocaleString()}</TableCell>
                  <TableCell>{item.taxRate}%</TableCell>
                  <TableCell>₩{item.taxAmount.toLocaleString()}</TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => handleEditItem(item)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDeleteItem(item.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );

  const renderTaxCalculation = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>세금 계산</Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body1" gutterBottom>
                공급가액: ₩{invoice.subtotal?.toLocaleString() || 0}
              </Typography>
              <Typography variant="body1" gutterBottom>
                총 세금: ₩{invoice.totalTax?.toLocaleString() || 0}
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Typography variant="h6" color="primary.main">
                총 금액: ₩{invoice.totalAmount?.toLocaleString() || 0}
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="body2" color="text.secondary">
              GST 규정에 따라 자동으로 세금이 계산됩니다.
            </Typography>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const renderReview = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>E-Invoice 검토</Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="subtitle1" gutterBottom>회사 정보</Typography>
            <Typography variant="body2">{invoice.companyName}</Typography>
            <Typography variant="body2">GSTIN: {invoice.companyGstin}</Typography>
            <Typography variant="body2">{invoice.companyAddress}</Typography>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="subtitle1" gutterBottom>고객 정보</Typography>
            <Typography variant="body2">{invoice.customerName}</Typography>
            <Typography variant="body2">GSTIN: {invoice.customerGstin}</Typography>
            <Typography variant="body2">{invoice.customerAddress}</Typography>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Typography variant="subtitle1" gutterBottom>인보이스 요약</Typography>
            <Typography variant="body2">인보이스 번호: {invoice.invoiceNumber}</Typography>
            <Typography variant="body2">인보이스 날짜: {invoice.invoiceDate}</Typography>
            <Typography variant="body2">총 금액: ₩{invoice.totalAmount?.toLocaleString() || 0}</Typography>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ 
      p: 3, 
      backgroundColor: 'workArea.main',
      borderRadius: 2,
      minHeight: '100%'
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ReceiptIcon />
          E-Invoice 생성
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            disabled={activeStep < 3}
          >
            미리보기
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            disabled={activeStep < 3}
          >
            PDF 다운로드
          </Button>
        </Box>
      </Box>

      <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Box sx={{ mb: 3 }}>
        {activeStep === 0 && renderCustomerInfo()}
        {activeStep === 1 && renderItems()}
        {activeStep === 2 && renderTaxCalculation()}
        {activeStep === 3 && renderReview()}
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button
          disabled={activeStep === 0}
          onClick={handleBack}
        >
          이전
        </Button>
        <Box>
          {activeStep === steps.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleGenerateInvoice}
              disabled={loading}
              startIcon={<SendIcon />}
            >
              E-Invoice 생성
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleNext}
            >
              다음
            </Button>
          )}
        </Box>
      </Box>

      {/* 항목 추가/수정 다이얼로그 */}
      <ItemDialog
        open={openItemDialog}
        onClose={() => setOpenItemDialog(false)}
        onSave={handleSaveItem}
        item={selectedItem}
      />

      {/* 스낵바 */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError('')}
      >
        <Alert onClose={() => setError('')} severity="error">
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccess('')}
      >
        <Alert onClose={() => setSuccess('')} severity="success">
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
};

// 항목 추가/수정 다이얼로그 컴포넌트
interface ItemDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (item: Omit<EInvoiceItem, 'id'>) => void;
  item: EInvoiceItem | null;
}

const ItemDialog: React.FC<ItemDialogProps> = ({ open, onClose, onSave, item }) => {
  const [formData, setFormData] = useState({
    itemName: '',
    description: '',
    quantity: 1,
    unitPrice: 0,
    taxRate: 18,
    hsnCode: ''
  });

  useEffect(() => {
    if (item) {
      setFormData({
        itemName: item.itemName,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate,
        hsnCode: item.hsnCode
      });
    } else {
      setFormData({
        itemName: '',
        description: '',
        quantity: 1,
        unitPrice: 0,
        taxRate: 18,
        hsnCode: ''
      });
    }
  }, [item]);

  const handleSave = () => {
    const totalPrice = formData.quantity * formData.unitPrice;
    const taxAmount = (totalPrice * formData.taxRate) / 100;
    const taxableValue = totalPrice;
    const cgstRate = formData.taxRate / 2; // 기본적으로 CGST/SGST로 설정
    const sgstRate = formData.taxRate / 2;
    const igstRate = 0; // IGST는 별도 설정 필요
    const cessRate = 0;
    const cgstAmount = (taxableValue * cgstRate) / 100;
    const sgstAmount = (taxableValue * sgstRate) / 100;
    const igstAmount = (taxableValue * igstRate) / 100;
    const cessAmount = (taxableValue * cessRate) / 100;
    const discountAmount = 0;
    const discountPercentage = 0;

    onSave({
      itemName: formData.itemName,
      description: formData.description,
      quantity: formData.quantity,
      unitPrice: formData.unitPrice,
      totalPrice,
      taxRate: formData.taxRate,
      taxAmount,
      hsnCode: formData.hsnCode,
      taxableValue,
      cgstRate,
      cgstAmount,
      sgstRate,
      sgstAmount,
      igstRate,
      igstAmount,
      cessRate,
      cessAmount,
      discountAmount,
      discountPercentage
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {item ? '항목 수정' : '항목 추가'}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label="상품명"
              value={formData.itemName}
              onChange={(e) => setFormData(prev => ({ ...prev, itemName: e.target.value }))}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label="설명"
              multiline
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField
              fullWidth
              label="수량"
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
            />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField
              fullWidth
              label="단가"
              type="number"
              value={formData.unitPrice}
              onChange={(e) => setFormData(prev => ({ ...prev, unitPrice: parseFloat(e.target.value) || 0 }))}
            />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField
              fullWidth
              label="세율 (%)"
              type="number"
              value={formData.taxRate}
              onChange={(e) => setFormData(prev => ({ ...prev, taxRate: parseFloat(e.target.value) || 0 }))}
            />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField
              fullWidth
              label="HSN 코드"
              value={formData.hsnCode}
              onChange={(e) => setFormData(prev => ({ ...prev, hsnCode: e.target.value }))}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>취소</Button>
        <Button variant="contained" onClick={handleSave}>
          {item ? '수정' : '추가'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EInvoiceCreate;
