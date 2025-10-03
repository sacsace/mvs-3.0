import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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
  Tooltip,
  Alert,
  Snackbar,
  Pagination,
  InputAdornment,
  Divider,
  Avatar
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  LocalShipping as LocalShippingIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Cancel as CancelIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Send as SendIcon,
  Print as PrintIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  AttachMoney as MoneyIcon,
  Business as BusinessIcon,
  LocationOn as LocationIcon
} from '@mui/icons-material';
import { useStore } from '../../store';

interface EWayBillItem {
  id: number;
  itemName: string;
  hsnCode: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  totalTaxAmount: number;
  totalAmount: number;
}

interface EWayBill {
  id: number;
  ewayBillNumber: string;
  invoiceNumber: string;
  invoiceDate: string;
  supplyType: 'outward' | 'inward';
  subSupplyType: string;
  documentType: 'invoice' | 'credit_note' | 'debit_note' | 'bill_of_supply';
  documentNumber: string;
  documentDate: string;
  fromGstin: string;
  fromName: string;
  fromAddress: string;
  fromPincode: string;
  fromState: string;
  toGstin: string;
  toName: string;
  toAddress: string;
  toPincode: string;
  toState: string;
  transportMode: 'road' | 'rail' | 'air' | 'ship';
  vehicleNumber?: string;
  vehicleType?: string;
  transporterId?: string;
  transporterName?: string;
  transporterDocNumber?: string;
  transporterDocDate?: string;
  distance: number;
  items: EWayBillItem[];
  totalValue: number;
  totalTaxAmount: number;
  totalAmount: number;
  status: 'draft' | 'generated' | 'active' | 'expired' | 'cancelled' | 'rejected';
  generatedAt?: string;
  validUntil?: string;
  generatedBy: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

const EWayBill: React.FC = () => {
  const { user } = useStore();
  const [ewayBills, setEwayBills] = useState<EWayBill[]>([]);
  const [filteredEwayBills, setFilteredEwayBills] = useState<EWayBill[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedEwayBill, setSelectedEwayBill] = useState<EWayBill | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'view'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [supplyTypeFilter, setSupplyTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // 샘플 데이터
  const sampleData: EWayBill[] = [
    {
      id: 1,
      ewayBillNumber: 'EWB-2024-001',
      invoiceNumber: 'INV-2024-001',
      invoiceDate: '2024-01-20',
      supplyType: 'outward',
      subSupplyType: 'supply',
      documentType: 'invoice',
      documentNumber: 'INV-2024-001',
      documentDate: '2024-01-20',
      fromGstin: '29ABCDE1234F1Z5',
      fromName: 'MVS 3.0 Solutions',
      fromAddress: '서울시 서초구 서초대로 456',
      fromPincode: '06592',
      fromState: '서울특별시',
      toGstin: '29FGHIJ5678K9L0',
      toName: 'ABC 회사',
      toAddress: '서울시 강남구 테헤란로 123',
      toPincode: '06141',
      toState: '서울특별시',
      transportMode: 'road',
      vehicleNumber: '서울12가3456',
      vehicleType: 'truck',
      transporterId: 'TRP001',
      transporterName: '한국물류',
      transporterDocNumber: 'TRP-2024-001',
      transporterDocDate: '2024-01-20',
      distance: 15,
      items: [
        {
          id: 1,
          itemName: '소프트웨어 라이선스',
          hsnCode: '998314',
          quantity: 1,
          unitPrice: 1000000,
          totalValue: 1000000,
          cgstRate: 9,
          cgstAmount: 90000,
          sgstRate: 9,
          sgstAmount: 90000,
          igstRate: 0,
          igstAmount: 0,
          totalTaxAmount: 180000,
          totalAmount: 1180000
        }
      ],
      totalValue: 1000000,
      totalTaxAmount: 180000,
      totalAmount: 1180000,
      status: 'active',
      generatedAt: '2024-01-20 10:30:00',
      validUntil: '2024-01-27 10:30:00',
      generatedBy: '김개발',
      createdAt: '2024-01-20 10:00:00',
      updatedAt: '2024-01-20 10:30:00',
      notes: '정기 라이선스 배송'
    },
    {
      id: 2,
      ewayBillNumber: 'EWB-2024-002',
      invoiceNumber: 'INV-2024-002',
      invoiceDate: '2024-01-22',
      supplyType: 'outward',
      subSupplyType: 'supply',
      documentType: 'invoice',
      documentNumber: 'INV-2024-002',
      documentDate: '2024-01-22',
      fromGstin: '29ABCDE1234F1Z5',
      fromName: 'MVS 3.0 Solutions',
      fromAddress: '서울시 서초구 서초대로 456',
      fromPincode: '06592',
      fromState: '서울특별시',
      toGstin: '29MNOPQ9012R3S4',
      toName: 'XYZ 기업',
      toAddress: '경기도 성남시 분당구 판교로 789',
      toPincode: '13494',
      toState: '경기도',
      transportMode: 'road',
      vehicleNumber: '경기34나7890',
      vehicleType: 'van',
      transporterId: 'TRP002',
      transporterName: '빠른배송',
      transporterDocNumber: 'TRP-2024-002',
      transporterDocDate: '2024-01-22',
      distance: 45,
      items: [
        {
          id: 2,
          itemName: 'IT 장비',
          hsnCode: '8471',
          quantity: 2,
          unitPrice: 500000,
          totalValue: 1000000,
          cgstRate: 0,
          cgstAmount: 0,
          sgstRate: 0,
          sgstAmount: 0,
          igstRate: 18,
          igstAmount: 180000,
          totalTaxAmount: 180000,
          totalAmount: 1180000
        }
      ],
      totalValue: 1000000,
      totalTaxAmount: 180000,
      totalAmount: 1180000,
      status: 'generated',
      generatedAt: '2024-01-22 14:15:00',
      validUntil: '2024-01-29 14:15:00',
      generatedBy: '이프론트',
      createdAt: '2024-01-22 14:00:00',
      updatedAt: '2024-01-22 14:15:00',
      notes: 'IT 장비 배송'
    }
  ];

  useEffect(() => {
    loadEwayBillData();
  }, []);

  useEffect(() => {
    filterEwayBills();
  }, [ewayBills, searchTerm, statusFilter, supplyTypeFilter]);

  const loadEwayBillData = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setEwayBills(sampleData);
    } catch (error) {
      console.error('E-Way Bill 데이터 로드 오류:', error);
      setError('E-Way Bill 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const filterEwayBills = () => {
    let filtered = ewayBills;

    if (searchTerm) {
      filtered = filtered.filter(ewayBill =>
        ewayBill.ewayBillNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ewayBill.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ewayBill.fromName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ewayBill.toName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ewayBill.vehicleNumber?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(ewayBill => ewayBill.status === statusFilter);
    }

    if (supplyTypeFilter) {
      filtered = filtered.filter(ewayBill => ewayBill.supplyType === supplyTypeFilter);
    }

    setFilteredEwayBills(filtered);
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'draft':
        return <Chip label="초안" color="default" size="small" />;
      case 'generated':
        return <Chip label="생성됨" color="info" size="small" />;
      case 'active':
        return <Chip label="활성" color="success" size="small" />;
      case 'expired':
        return <Chip label="만료됨" color="warning" size="small" />;
      case 'cancelled':
        return <Chip label="취소됨" color="error" size="small" />;
      case 'rejected':
        return <Chip label="거부됨" color="error" size="small" />;
      default:
        return <Chip label="알 수 없음" color="default" size="small" />;
    }
  };

  const getSupplyTypeLabel = (type: string) => {
    switch (type) {
      case 'outward':
        return '송장';
      case 'inward':
        return '입장';
      default:
        return '알 수 없음';
    }
  };

  const getTransportModeLabel = (mode: string) => {
    switch (mode) {
      case 'road':
        return '도로';
      case 'rail':
        return '철도';
      case 'air':
        return '항공';
      case 'ship':
        return '선박';
      default:
        return '알 수 없음';
    }
  };

  const handleViewEwayBill = (ewayBill: EWayBill) => {
    setSelectedEwayBill(ewayBill);
    setViewMode('view');
  };

  const handleEditEwayBill = (ewayBill: EWayBill) => {
    setSelectedEwayBill(ewayBill);
    setOpenDialog(true);
  };

  const handleDeleteEwayBill = async (id: number) => {
    if (window.confirm('정말로 이 E-Way Bill을 삭제하시겠습니까?')) {
      try {
        setEwayBills(prev => prev.filter(ewayBill => ewayBill.id !== id));
        setSuccess('E-Way Bill이 성공적으로 삭제되었습니다.');
      } catch (error) {
        console.error('삭제 오류:', error);
        setError('삭제 중 오류가 발생했습니다.');
      }
    }
  };

  const handleGenerateEwayBill = (id: number) => {
    setEwayBills(prev =>
      prev.map(ewayBill =>
        ewayBill.id === id 
          ? { 
              ...ewayBill, 
              status: 'generated' as const,
              generatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
              validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19),
              updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
            } 
          : ewayBill
      )
    );
    setSuccess('E-Way Bill이 성공적으로 생성되었습니다.');
  };

  const handleCancelEwayBill = (id: number) => {
    setEwayBills(prev =>
      prev.map(ewayBill =>
        ewayBill.id === id 
          ? { 
              ...ewayBill, 
              status: 'cancelled' as const,
              updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
            } 
          : ewayBill
      )
    );
    setSuccess('E-Way Bill이 취소되었습니다.');
  };

  const totalBills = ewayBills.length;
  const activeBills = ewayBills.filter(ewayBill => ewayBill.status === 'active').length;
  const expiredBills = ewayBills.filter(ewayBill => ewayBill.status === 'expired').length;
  const totalValue = ewayBills.reduce((sum, ewayBill) => sum + ewayBill.totalValue, 0);

  const paginatedEwayBills = filteredEwayBills.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  if (viewMode === 'view' && selectedEwayBill) {
    return (
      <Box sx={{ 
        p: 3, 
        backgroundColor: 'workArea.main',
        borderRadius: 2,
        minHeight: '100%'
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocalShippingIcon />
            E-Way Bill 상세
          </Typography>
          <Button
            variant="outlined"
            onClick={() => setViewMode('list')}
          >
            목록으로
          </Button>
        </Box>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
              <Box>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                  E-Way Bill #{selectedEwayBill.ewayBillNumber}
                </Typography>
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  인보이스: {selectedEwayBill.invoiceNumber} | 날짜: {selectedEwayBill.invoiceDate}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  {getStatusChip(selectedEwayBill.status)}
                  <Chip label={getSupplyTypeLabel(selectedEwayBill.supplyType)} color="primary" size="small" />
                </Box>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="h4" color="primary.main">
                  ₩{selectedEwayBill.totalAmount.toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  총 금액
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* 송장/입장 정보 */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>송장/입장 정보</Typography>
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
                gap: 2 
              }}>
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    발송처
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    {selectedEwayBill.fromName}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    GSTIN: {selectedEwayBill.fromGstin}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    {selectedEwayBill.fromAddress}
                  </Typography>
                  <Typography variant="body2">
                    {selectedEwayBill.fromPincode} {selectedEwayBill.fromState}
                  </Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    수신처
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    {selectedEwayBill.toName}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    GSTIN: {selectedEwayBill.toGstin}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    {selectedEwayBill.toAddress}
                  </Typography>
                  <Typography variant="body2">
                    {selectedEwayBill.toPincode} {selectedEwayBill.toState}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* 운송 정보 */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>운송 정보</Typography>
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
                gap: 2 
              }}>
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="body2" gutterBottom>
                    <strong>운송 수단:</strong> {getTransportModeLabel(selectedEwayBill.transportMode)}
                  </Typography>
                  {selectedEwayBill.vehicleNumber && (
                    <Typography variant="body2" gutterBottom>
                      <strong>차량 번호:</strong> {selectedEwayBill.vehicleNumber}
                    </Typography>
                  )}
                  {selectedEwayBill.vehicleType && (
                    <Typography variant="body2" gutterBottom>
                      <strong>차량 유형:</strong> {selectedEwayBill.vehicleType}
                    </Typography>
                  )}
                  <Typography variant="body2" gutterBottom>
                    <strong>거리:</strong> {selectedEwayBill.distance} km
                  </Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  {selectedEwayBill.transporterName && (
                    <Typography variant="body2" gutterBottom>
                      <strong>운송업체:</strong> {selectedEwayBill.transporterName}
                    </Typography>
                  )}
                  {selectedEwayBill.transporterId && (
                    <Typography variant="body2" gutterBottom>
                      <strong>운송업체 ID:</strong> {selectedEwayBill.transporterId}
                    </Typography>
                  )}
                  {selectedEwayBill.transporterDocNumber && (
                    <Typography variant="body2" gutterBottom>
                      <strong>운송 문서:</strong> {selectedEwayBill.transporterDocNumber}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>

            {/* 상품 정보 */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>상품 정보</Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>상품명</TableCell>
                      <TableCell>HSN 코드</TableCell>
                      <TableCell>수량</TableCell>
                      <TableCell>단가</TableCell>
                      <TableCell>금액</TableCell>
                      <TableCell>세금</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedEwayBill.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.itemName}</TableCell>
                        <TableCell>{item.hsnCode}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>₩{item.unitPrice.toLocaleString()}</TableCell>
                        <TableCell>₩{item.totalValue.toLocaleString()}</TableCell>
                        <TableCell>₩{item.totalTaxAmount.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>

            {/* 상태 정보 */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>상태 정보</Typography>
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
                gap: 2 
              }}>
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="body2" gutterBottom>
                    <strong>생성일:</strong> {selectedEwayBill.generatedAt || '-'}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>유효기간:</strong> {selectedEwayBill.validUntil || '-'}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>생성자:</strong> {selectedEwayBill.generatedBy}
                  </Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="body2" gutterBottom>
                    <strong>총 상품가액:</strong> ₩{selectedEwayBill.totalValue.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>총 세금:</strong> ₩{selectedEwayBill.totalTaxAmount.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>총 금액:</strong> ₩{selectedEwayBill.totalAmount.toLocaleString()}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* 메모 */}
            {selectedEwayBill.notes && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom>메모</Typography>
                <Card sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="body1">
                    {selectedEwayBill.notes}
                  </Typography>
                </Card>
              </Box>
            )}

            <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => handleEditEwayBill(selectedEwayBill)}
              >
                수정
              </Button>
              <Button
                variant="outlined"
                startIcon={<PrintIcon />}
              >
                인쇄
              </Button>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
              >
                PDF 다운로드
              </Button>
              {selectedEwayBill.status === 'draft' && (
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<CheckCircleIcon />}
                  onClick={() => handleGenerateEwayBill(selectedEwayBill.id)}
                >
                  생성
                </Button>
              )}
              {selectedEwayBill.status === 'active' && (
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<CancelIcon />}
                  onClick={() => handleCancelEwayBill(selectedEwayBill.id)}
                >
                  취소
                </Button>
              )}
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      p: 3, 
      backgroundColor: 'workArea.main',
      borderRadius: 2,
      minHeight: '100%'
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LocalShippingIcon />
          E-Way Bill
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
          sx={{ borderRadius: 2 }}
        >
          E-Way Bill 생성
        </Button>
      </Box>

      {/* 통계 카드 */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 2, 
        mb: 3 
      }}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              총 E-Way Bill
            </Typography>
            <Typography variant="h4">
              {totalBills}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              활성 E-Way Bill
            </Typography>
            <Typography variant="h4" color="success.main">
              {activeBills}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              만료된 E-Way Bill
            </Typography>
            <Typography variant="h4" color="warning.main">
              {expiredBills}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              총 상품가액
            </Typography>
            <Typography variant="h4">
              ₩{totalValue.toLocaleString()}
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
              placeholder="E-Way Bill 번호, 인보이스 번호, 고객명, 차량번호 검색"
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
                <MenuItem value="generated">생성됨</MenuItem>
                <MenuItem value="active">활성</MenuItem>
                <MenuItem value="expired">만료됨</MenuItem>
                <MenuItem value="cancelled">취소됨</MenuItem>
                <MenuItem value="rejected">거부됨</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>송장/입장</InputLabel>
              <Select
                value={supplyTypeFilter}
                onChange={(e) => setSupplyTypeFilter(e.target.value)}
              >
                <MenuItem value="">전체</MenuItem>
                <MenuItem value="outward">송장</MenuItem>
                <MenuItem value="inward">입장</MenuItem>
              </Select>
            </FormControl>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<FilterIcon />}
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('');
                setSupplyTypeFilter('');
              }}
            >
              초기화
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* E-Way Bill 목록 테이블 */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>E-Way Bill 정보</TableCell>
                <TableCell>송장/입장</TableCell>
                <TableCell>발송처</TableCell>
                <TableCell>수신처</TableCell>
                <TableCell>운송 수단</TableCell>
                <TableCell>금액</TableCell>
                <TableCell>상태</TableCell>
                <TableCell>작업</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedEwayBills.map((ewayBill) => (
                <TableRow key={ewayBill.id} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {ewayBill.ewayBillNumber}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {ewayBill.invoiceNumber}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={getSupplyTypeLabel(ewayBill.supplyType)} color="primary" size="small" />
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {ewayBill.fromName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {ewayBill.fromState}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {ewayBill.toName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {ewayBill.toState}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2">
                        {getTransportModeLabel(ewayBill.transportMode)}
                      </Typography>
                      {ewayBill.vehicleNumber && (
                        <Typography variant="caption" color="text.secondary">
                          {ewayBill.vehicleNumber}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      ₩{ewayBill.totalAmount.toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell>{getStatusChip(ewayBill.status)}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="보기">
                        <IconButton size="small" onClick={() => handleViewEwayBill(ewayBill)}>
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="수정">
                        <IconButton size="small" onClick={() => handleEditEwayBill(ewayBill)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      {ewayBill.status === 'draft' && (
                        <Tooltip title="생성">
                          <IconButton 
                            size="small" 
                            onClick={() => handleGenerateEwayBill(ewayBill.id)}
                            color="success"
                          >
                            <CheckCircleIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      {ewayBill.status === 'active' && (
                        <Tooltip title="취소">
                          <IconButton 
                            size="small" 
                            onClick={() => handleCancelEwayBill(ewayBill.id)}
                            color="error"
                          >
                            <CancelIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="삭제">
                        <IconButton size="small" onClick={() => handleDeleteEwayBill(ewayBill.id)}>
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
            count={Math.ceil(filteredEwayBills.length / itemsPerPage)}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
          />
        </Box>
      </Card>

      {/* E-Way Bill 생성/수정 다이얼로그 */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedEwayBill ? 'E-Way Bill 수정' : 'E-Way Bill 생성'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              E-Way Bill 정보를 입력해주세요.
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              E-Way Bill 생성 기능은 개발 중입니다.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>취소</Button>
          <Button variant="contained">
            {selectedEwayBill ? '수정' : '생성'}
          </Button>
        </DialogActions>
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

export default EWayBill;
