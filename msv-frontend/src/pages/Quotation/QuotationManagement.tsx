import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Fab,
  Tooltip,
  Alert,
  Snackbar,
  Pagination,
  InputAdornment,
  Divider,
  Stepper,
  Step,
  StepLabel,
  StepContent
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Description as QuotationIcon,
  Print as PrintIcon,
  Email as EmailIcon,
  Download as DownloadIcon,
  CheckCircle as ApprovedIcon,
  Pending as PendingIcon,
  Cancel as RejectedIcon,
  AttachMoney as MoneyIcon
} from '@mui/icons-material';
import { useStore } from '../../store';

interface QuotationItem {
  id: number;
  productName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  discount: number;
  finalPrice: number;
}

interface Quotation {
  id: number;
  quotationNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  issueDate: string;
  validUntil: string;
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'expired';
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discount: number;
  totalAmount: number;
  notes: string;
  items: QuotationItem[];
  createdBy: string;
  lastModified: string;
}

const QuotationManagement: React.FC = () => {
  const { user } = useStore();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [filteredQuotations, setFilteredQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [page, setPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [activeStep, setActiveStep] = useState(0);

  // 샘플 데이터
  const sampleData: Quotation[] = [
    {
      id: 1,
      quotationNumber: 'QUO-2024-001',
      customerName: '삼성전자',
      customerEmail: 'contact@samsung.com',
      customerPhone: '02-1234-5678',
      customerAddress: '서울시 강남구 테헤란로 123',
      issueDate: '2024-01-15',
      validUntil: '2024-02-15',
      status: 'sent',
      subtotal: 5000000,
      taxRate: 10,
      taxAmount: 500000,
      discount: 100000,
      totalAmount: 5400000,
      notes: '긴급 견적 요청',
      items: [
        {
          id: 1,
          productName: '노트북 컴퓨터',
          description: '고성능 비즈니스 노트북',
          quantity: 10,
          unitPrice: 500000,
          totalPrice: 5000000,
          discount: 100000,
          finalPrice: 4900000
        }
      ],
      createdBy: '김영희',
      lastModified: '2024-01-15 14:30:00'
    },
    {
      id: 2,
      quotationNumber: 'QUO-2024-002',
      customerName: 'LG전자',
      customerEmail: 'contact@lg.com',
      customerPhone: '02-2345-6789',
      customerAddress: '서울시 서초구 서초대로 456',
      issueDate: '2024-01-16',
      validUntil: '2024-02-16',
      status: 'approved',
      subtotal: 3000000,
      taxRate: 10,
      taxAmount: 300000,
      discount: 0,
      totalAmount: 3300000,
      notes: '정기 구매 견적',
      items: [
        {
          id: 1,
          productName: '모니터',
          description: '27인치 4K 모니터',
          quantity: 20,
          unitPrice: 150000,
          totalPrice: 3000000,
          discount: 0,
          finalPrice: 3000000
        }
      ],
      createdBy: '박민수',
      lastModified: '2024-01-16 09:15:00'
    },
    {
      id: 3,
      quotationNumber: 'QUO-2024-003',
      customerName: '현대자동차',
      customerEmail: 'contact@hyundai.com',
      customerPhone: '02-3456-7890',
      customerAddress: '서울시 영등포구 여의대로 789',
      issueDate: '2024-01-17',
      validUntil: '2024-02-17',
      status: 'draft',
      subtotal: 15000000,
      taxRate: 10,
      taxAmount: 1500000,
      discount: 500000,
      totalAmount: 16000000,
      notes: '대량 구매 견적',
      items: [
        {
          id: 1,
          productName: '서버 장비',
          description: '고성능 웹서버',
          quantity: 5,
          unitPrice: 3000000,
          totalPrice: 15000000,
          discount: 500000,
          finalPrice: 14500000
        }
      ],
      createdBy: '이지은',
      lastModified: '2024-01-17 16:45:00'
    }
  ];

  useEffect(() => {
    loadQuotationData();
  }, []);

  useEffect(() => {
    filterQuotations();
  }, [quotations, searchTerm, statusFilter, customerFilter]);

  const loadQuotationData = async () => {
    setLoading(true);
    try {
      // 실제 API 호출 대신 샘플 데이터 사용
      await new Promise(resolve => setTimeout(resolve, 1000));
      setQuotations(sampleData);
    } catch (error) {
      console.error('견적서 데이터 로드 오류:', error);
      setError('견적서 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const filterQuotations = () => {
    let filtered = quotations;

    if (searchTerm) {
      filtered = filtered.filter(quotation =>
        quotation.quotationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quotation.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quotation.customerEmail.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(quotation => quotation.status === statusFilter);
    }

    if (customerFilter) {
      filtered = filtered.filter(quotation =>
        quotation.customerName.toLowerCase().includes(customerFilter.toLowerCase())
      );
    }

    setFilteredQuotations(filtered);
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'draft':
        return <Chip label="초안" color="default" size="small" />;
      case 'sent':
        return <Chip label="발송됨" color="info" size="small" />;
      case 'approved':
        return <Chip label="승인됨" color="success" size="small" />;
      case 'rejected':
        return <Chip label="거절됨" color="error" size="small" />;
      case 'expired':
        return <Chip label="만료됨" color="warning" size="small" />;
      default:
        return <Chip label="알 수 없음" color="default" size="small" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <PendingIcon color="action" />;
      case 'sent':
        return <EmailIcon color="info" />;
      case 'approved':
        return <ApprovedIcon color="success" />;
      case 'rejected':
        return <RejectedIcon color="error" />;
      case 'expired':
        return <PendingIcon color="warning" />;
      default:
        return <QuotationIcon />;
    }
  };

  const handleAddQuotation = () => {
    setSelectedQuotation(null);
    setOpenDialog(true);
    setActiveStep(0);
  };

  const handleEditQuotation = (quotation: Quotation) => {
    setSelectedQuotation(quotation);
    setOpenDialog(true);
    setActiveStep(0);
  };

  const handleDeleteQuotation = async (id: number) => {
    if (window.confirm('정말로 이 견적서를 삭제하시겠습니까?')) {
      try {
        setQuotations(prev => prev.filter(quotation => quotation.id !== id));
        setSuccess('견적서가 성공적으로 삭제되었습니다.');
      } catch (error) {
        console.error('삭제 오류:', error);
        setError('삭제 중 오류가 발생했습니다.');
      }
    }
  };

  const handleSaveQuotation = async (quotationData: Partial<Quotation>) => {
    try {
      if (selectedQuotation) {
        // 수정
        setQuotations(prev =>
          prev.map(quotation => quotation.id === selectedQuotation.id ? { ...quotation, ...quotationData } : quotation)
        );
        setSuccess('견적서가 성공적으로 수정되었습니다.');
      } else {
        // 추가
        const newQuotation: Quotation = {
          id: Math.max(...quotations.map(q => q.id)) + 1,
          quotationNumber: `QUO-2024-${String(Math.max(...quotations.map(q => q.id)) + 1).padStart(3, '0')}`,
          ...quotationData,
          lastModified: new Date().toISOString().replace('T', ' ').substring(0, 19)
        } as Quotation;
        setQuotations(prev => [...prev, newQuotation]);
        setSuccess('견적서가 성공적으로 추가되었습니다.');
      }
      setOpenDialog(false);
    } catch (error) {
      console.error('저장 오류:', error);
      setError('저장 중 오류가 발생했습니다.');
    }
  };

  const handlePrintQuotation = (quotation: Quotation) => {
    // 실제 구현에서는 PDF 생성 로직
    console.log('견적서 인쇄:', quotation);
    setSuccess('견적서가 인쇄되었습니다.');
  };

  const handleEmailQuotation = (quotation: Quotation) => {
    // 실제 구현에서는 이메일 발송 로직
    console.log('견적서 이메일 발송:', quotation);
    setSuccess('견적서가 이메일로 발송되었습니다.');
  };

  const totalAmount = quotations.reduce((sum, quotation) => sum + quotation.totalAmount, 0);
  const approvedQuotations = quotations.filter(quotation => quotation.status === 'approved').length;
  const pendingQuotations = quotations.filter(quotation => quotation.status === 'sent').length;
  const draftQuotations = quotations.filter(quotation => quotation.status === 'draft').length;

  const paginatedQuotations = filteredQuotations.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
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
          <QuotationIcon />
          견적서 관리
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddQuotation}
          sx={{ borderRadius: 2 }}
        >
          견적서 작성
        </Button>
      </Box>

      {/* 통계 카드 */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 3, 
        mb: 3 
      }}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              총 견적서
            </Typography>
            <Typography variant="h4">
              {quotations.length}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              총 견적 금액
            </Typography>
            <Typography variant="h4">
              ₩{totalAmount.toLocaleString()}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              승인된 견적서
            </Typography>
            <Typography variant="h4" color="success.main">
              {approvedQuotations}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              대기 중인 견적서
            </Typography>
            <Typography variant="h4" color="warning.main">
              {pendingQuotations}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* 필터 및 검색 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr 1fr 1fr' },
            gap: 2, 
            alignItems: 'center' 
          }}>
            <TextField
              fullWidth
              placeholder="견적서 번호, 고객명, 이메일 검색"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            <FormControl fullWidth>
              <InputLabel>상태</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="">전체</MenuItem>
                <MenuItem value="draft">초안</MenuItem>
                <MenuItem value="sent">발송됨</MenuItem>
                <MenuItem value="approved">승인됨</MenuItem>
                <MenuItem value="rejected">거절됨</MenuItem>
                <MenuItem value="expired">만료됨</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              placeholder="고객명 검색"
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
            />
            <Button
              fullWidth
              variant="outlined"
              startIcon={<FilterIcon />}
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('');
                setCustomerFilter('');
              }}
            >
              초기화
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* 견적서 목록 테이블 */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>상태</TableCell>
                <TableCell>견적서 번호</TableCell>
                <TableCell>고객명</TableCell>
                <TableCell>발행일</TableCell>
                <TableCell>유효기간</TableCell>
                <TableCell>총 금액</TableCell>
                <TableCell>작성자</TableCell>
                <TableCell>작업</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedQuotations.map((quotation) => (
                <TableRow key={quotation.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getStatusIcon(quotation.status)}
                      {getStatusChip(quotation.status)}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {quotation.quotationNumber}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {quotation.customerName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {quotation.customerEmail}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{quotation.issueDate}</TableCell>
                  <TableCell>{quotation.validUntil}</TableCell>
                  <TableCell>
                    <Typography variant="subtitle2" fontWeight="bold">
                      ₩{quotation.totalAmount.toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell>{quotation.createdBy}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="보기">
                        <IconButton size="small" onClick={() => handleEditQuotation(quotation)}>
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="수정">
                        <IconButton size="small" onClick={() => handleEditQuotation(quotation)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="인쇄">
                        <IconButton size="small" onClick={() => handlePrintQuotation(quotation)}>
                          <PrintIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="이메일 발송">
                        <IconButton size="small" onClick={() => handleEmailQuotation(quotation)}>
                          <EmailIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="삭제">
                        <IconButton size="small" onClick={() => handleDeleteQuotation(quotation.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* 페이지네이션 */}
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <Pagination
            count={Math.ceil(filteredQuotations.length / itemsPerPage)}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
          />
        </Box>
      </Card>

      {/* 견적서 작성/수정 다이얼로그 */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          {selectedQuotation ? '견적서 수정' : '견적서 작성'}
        </DialogTitle>
        <DialogContent>
          <QuotationForm
            quotation={selectedQuotation}
            onSave={handleSaveQuotation}
            onCancel={() => setOpenDialog(false)}
            activeStep={activeStep}
            setActiveStep={setActiveStep}
          />
        </DialogContent>
      </Dialog>

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

// 견적서 폼 컴포넌트
interface QuotationFormProps {
  quotation: Quotation | null;
  onSave: (data: Partial<Quotation>) => void;
  onCancel: () => void;
  activeStep: number;
  setActiveStep: (step: number) => void;
}

const QuotationForm: React.FC<QuotationFormProps> = ({ 
  quotation, 
  onSave, 
  onCancel, 
  activeStep, 
  setActiveStep 
}) => {
  const [formData, setFormData] = useState({
    customerName: quotation?.customerName || '',
    customerEmail: quotation?.customerEmail || '',
    customerPhone: quotation?.customerPhone || '',
    customerAddress: quotation?.customerAddress || '',
    validUntil: quotation?.validUntil || '',
    notes: quotation?.notes || '',
    taxRate: quotation?.taxRate || 10,
    discount: quotation?.discount || 0
  });

  const [items, setItems] = useState<QuotationItem[]>(
    quotation?.items || [
      {
        id: 1,
        productName: '',
        description: '',
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
        discount: 0,
        finalPrice: 0
      }
    ]
  );

  const steps = ['고객 정보', '상품 정보', '견적 요약'];

  const handleNext = () => {
    setActiveStep(activeStep + 1);
  };

  const handleBack = () => {
    setActiveStep(activeStep - 1);
  };

  const handleItemChange = (index: number, field: keyof QuotationItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // 가격 자동 계산
    if (field === 'quantity' || field === 'unitPrice' || field === 'discount') {
      const quantity = field === 'quantity' ? value : newItems[index].quantity;
      const unitPrice = field === 'unitPrice' ? value : newItems[index].unitPrice;
      const discount = field === 'discount' ? value : newItems[index].discount;
      
      const totalPrice = quantity * unitPrice;
      const finalPrice = totalPrice - discount;
      
      newItems[index].totalPrice = totalPrice;
      newItems[index].finalPrice = finalPrice;
    }
    
    setItems(newItems);
  };

  const addItem = () => {
    const newItem: QuotationItem = {
      id: Math.max(...items.map(i => i.id)) + 1,
      productName: '',
      description: '',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      discount: 0,
      finalPrice: 0
    };
    setItems([...items, newItem]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.finalPrice, 0);
    const taxAmount = (subtotal * formData.taxRate) / 100;
    const totalAmount = subtotal + taxAmount - formData.discount;
    
    return { subtotal, taxAmount, totalAmount };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { subtotal, taxAmount, totalAmount } = calculateTotals();
    
    onSave({
      ...formData,
      subtotal,
      taxAmount,
      totalAmount,
      items,
      issueDate: new Date().toISOString().split('T')[0],
      status: 'draft',
      createdBy: '현재 사용자'
    });
  };

  const { subtotal, taxAmount, totalAmount } = calculateTotals();

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
      <Stepper activeStep={activeStep} orientation="vertical">
        <Step>
          <StepLabel>고객 정보</StepLabel>
          <StepContent>
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
              gap: 2 
            }}>
              <TextField
                fullWidth
                label="고객명"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                required
              />
              <TextField
                fullWidth
                label="이메일"
                type="email"
                value={formData.customerEmail}
                onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                required
              />
              <TextField
                fullWidth
                label="전화번호"
                value={formData.customerPhone}
                onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
              />
              <TextField
                fullWidth
                label="유효기간"
                type="date"
                value={formData.validUntil}
                onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
              <TextField
                fullWidth
                label="주소"
                value={formData.customerAddress}
                onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}
              />
            </Box>
            <Box sx={{ mt: 2 }}>
              <Button onClick={handleNext} variant="contained">
                다음
              </Button>
            </Box>
          </StepContent>
        </Step>

        <Step>
          <StepLabel>상품 정보</StepLabel>
          <StepContent>
            <Box sx={{ mb: 2 }}>
              <Button startIcon={<AddIcon />} onClick={addItem} variant="outlined">
                상품 추가
              </Button>
            </Box>
            
            {items.map((item, index) => (
              <Card key={item.id} sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">상품 {index + 1}</Typography>
                    {items.length > 1 && (
                      <IconButton onClick={() => removeItem(index)} color="error">
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </Box>
                  
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                    gap: 2 
                  }}>
                    <TextField
                      fullWidth
                      label="상품명"
                      value={item.productName}
                      onChange={(e) => handleItemChange(index, 'productName', e.target.value)}
                      required
                    />
                    <TextField
                      fullWidth
                      label="수량"
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                      required
                    />
                    <TextField
                      fullWidth
                      label="단가"
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => handleItemChange(index, 'unitPrice', parseInt(e.target.value) || 0)}
                      required
                    />
                    <TextField
                      fullWidth
                      label="할인"
                      type="number"
                      value={item.discount}
                      onChange={(e) => handleItemChange(index, 'discount', parseInt(e.target.value) || 0)}
                    />
                    <TextField
                      fullWidth
                      label="상품 설명"
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      multiline
                      rows={2}
                      sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}
                    />
                    <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
                      <Typography variant="body2" color="text.secondary">
                        소계: ₩{item.finalPrice.toLocaleString()}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
            
            <Box sx={{ mt: 2 }}>
              <Button onClick={handleBack} sx={{ mr: 1 }}>
                이전
              </Button>
              <Button onClick={handleNext} variant="contained">
                다음
              </Button>
            </Box>
          </StepContent>
        </Step>

        <Step>
          <StepLabel>견적 요약</StepLabel>
          <StepContent>
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
              gap: 2 
            }}>
              <TextField
                fullWidth
                label="세율 (%)"
                type="number"
                value={formData.taxRate}
                onChange={(e) => setFormData({ ...formData, taxRate: parseInt(e.target.value) || 0 })}
              />
              <TextField
                fullWidth
                label="전체 할인"
                type="number"
                value={formData.discount}
                onChange={(e) => setFormData({ ...formData, discount: parseInt(e.target.value) || 0 })}
              />
              <TextField
                fullWidth
                label="메모"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                multiline
                rows={3}
                sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}
              />
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography>소계:</Typography>
              <Typography>₩{subtotal.toLocaleString()}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography>세금 ({formData.taxRate}%):</Typography>
              <Typography>₩{taxAmount.toLocaleString()}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography>할인:</Typography>
              <Typography>-₩{formData.discount.toLocaleString()}</Typography>
            </Box>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6" fontWeight="bold">총 금액:</Typography>
              <Typography variant="h6" fontWeight="bold">₩{totalAmount.toLocaleString()}</Typography>
            </Box>

            <Box sx={{ mt: 2 }}>
              <Button onClick={handleBack} sx={{ mr: 1 }}>
                이전
              </Button>
              <Button type="submit" variant="contained">
                {quotation ? '수정' : '저장'}
              </Button>
            </Box>
          </StepContent>
        </Step>
      </Stepper>
    </Box>
  );
};

export default QuotationManagement;