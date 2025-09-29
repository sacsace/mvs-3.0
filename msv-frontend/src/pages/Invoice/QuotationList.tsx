import React, { useState } from 'react';
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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Description as DescriptionIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon,
  Send as SendIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';

const QuotationList: React.FC = () => {
  const [quotations, setQuotations] = useState([
    {
      id: 1,
      quotationNumber: 'QUO-2024-001',
      customerName: 'ABC 전자',
      customerEmail: 'contact@abc.com',
      totalAmount: 15000000,
      status: 'sent',
      createdDate: '2024-01-15',
      validUntil: '2024-02-15',
      createdBy: '김견적',
      notes: '삼성 갤럭시 S24 견적 요청'
    },
    {
      id: 2,
      quotationNumber: 'QUO-2024-002',
      customerName: 'XYZ 스토어',
      customerEmail: 'info@xyz.com',
      totalAmount: 8500000,
      status: 'draft',
      createdDate: '2024-01-16',
      validUntil: '2024-02-16',
      createdBy: '이견적',
      notes: '아이폰 15 Pro 견적 요청'
    },
    {
      id: 3,
      quotationNumber: 'QUO-2024-003',
      customerName: 'DEF 컴퓨터',
      customerEmail: 'sales@def.com',
      totalAmount: 12000000,
      status: 'accepted',
      createdDate: '2024-01-14',
      validUntil: '2024-02-14',
      createdBy: '박견적',
      notes: 'LG 그램 17 견적 요청'
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<any>(null);

  const handleAdd = () => {
    setSelectedQuotation(null);
    setOpenDialog(true);
  };

  const handleEdit = (quotation: any) => {
    setSelectedQuotation(quotation);
    setOpenDialog(true);
  };

  const handleDelete = (id: number) => {
    setQuotations(quotations.filter(item => item.id !== id));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'default';
      case 'sent': return 'info';
      case 'accepted': return 'success';
      case 'rejected': return 'error';
      case 'expired': return 'warning';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return '초안';
      case 'sent': return '발송됨';
      case 'accepted': return '승인됨';
      case 'rejected': return '거절됨';
      case 'expired': return '만료됨';
      default: return status;
    }
  };

  const filteredQuotations = quotations.filter(quotation => {
    const matchesSearch = quotation.quotationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quotation.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || quotation.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <Box sx={{ 
      width: '100%',
      px: 2,
      py: 3
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <DescriptionIcon sx={{ mr: 2, fontSize: '2rem', color: 'primary.main' }} />
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          견적서 목록
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 3, mb: 3 }}>
        {/* 통계 카드 */}
        <Card>
          <CardContent>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              총 견적서 수
            </Typography>
            <Typography variant="h4" color="primary.main">
              {quotations.length}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              승인된 견적서
            </Typography>
            <Typography variant="h4" color="success.main">
              {quotations.filter(item => item.status === 'accepted').length}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              발송된 견적서
            </Typography>
            <Typography variant="h4" color="info.main">
              {quotations.filter(item => item.status === 'sent').length}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              총 견적 금액
            </Typography>
            <Typography variant="h4" color="warning.main">
              {quotations.reduce((sum, item) => sum + item.totalAmount, 0).toLocaleString()}원
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* 검색 및 필터 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '4fr 3fr 5fr' }, gap: 2, alignItems: 'center' }}>
            <TextField
              fullWidth
              placeholder="견적서 번호 또는 고객명으로 검색"
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
              <InputLabel>상태 필터</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">전체</MenuItem>
                <MenuItem value="draft">초안</MenuItem>
                <MenuItem value="sent">발송됨</MenuItem>
                <MenuItem value="accepted">승인됨</MenuItem>
                <MenuItem value="rejected">거절됨</MenuItem>
                <MenuItem value="expired">만료됨</MenuItem>
              </Select>
            </FormControl>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                startIcon={<FilterIcon />}
              >
                필터
              </Button>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
              >
                내보내기
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAdd}
              >
                견적서 작성
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* 견적서 목록 */}
      <Box>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                견적서 목록 ({filteredQuotations.length}건)
              </Typography>
              
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>견적서 번호</TableCell>
                      <TableCell>고객명</TableCell>
                      <TableCell>고객 이메일</TableCell>
                      <TableCell align="right">총 금액</TableCell>
                      <TableCell>상태</TableCell>
                      <TableCell>작성일</TableCell>
                      <TableCell>유효기간</TableCell>
                      <TableCell>작성자</TableCell>
                      <TableCell>작업</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredQuotations.map((quotation) => (
                      <TableRow key={quotation.id}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {quotation.quotationNumber}
                          </Typography>
                        </TableCell>
                        <TableCell>{quotation.customerName}</TableCell>
                        <TableCell>{quotation.customerEmail}</TableCell>
                        <TableCell align="right">
                          {quotation.totalAmount.toLocaleString()}원
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getStatusLabel(quotation.status)}
                            color={getStatusColor(quotation.status) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{quotation.createdDate}</TableCell>
                        <TableCell>{quotation.validUntil}</TableCell>
                        <TableCell>{quotation.createdBy}</TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => handleEdit(quotation)}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(quotation.id)}
                            color="error"
                          >
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
      </Box>

      {/* 견적서 상세 다이얼로그 */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedQuotation ? '견적서 상세 정보' : '새 견적서 작성'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            견적서 상세 정보를 표시하거나 새 견적서를 작성하는 폼이 여기에 표시됩니다.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>닫기</Button>
          {selectedQuotation && (
            <Button variant="contained">수정</Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default QuotationList;
