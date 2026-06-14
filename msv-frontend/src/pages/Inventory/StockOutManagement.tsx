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
  Divider
} from '@mui/material';
import MvsPageHeader from '../../components/Common/MvsPageHeader';
import { mvsPageRootSx } from '../../theme/mvsLayout';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  LocalShipping as ShippingIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon
} from '@mui/icons-material';

const StockOutManagement: React.FC = () => {
  const [stockOuts, setStockOuts] = useState([
    {
      id: 1,
      productName: '삼성 갤럭시 S24',
      sku: 'SSG-S24-256',
      quantity: 10,
      unitPrice: 1200000,
      totalPrice: 12000000,
      customer: 'ABC 전자',
      status: 'completed',
      shippedDate: '2024-01-15',
      shippedBy: '김출고',
      trackingNumber: 'TRK001234567',
      notes: '정상 출고 완료'
    },
    {
      id: 2,
      productName: '아이폰 15 Pro',
      sku: 'APL-15P-128',
      quantity: 5,
      unitPrice: 1500000,
      totalPrice: 7500000,
      customer: 'XYZ 스토어',
      status: 'pending',
      shippedDate: '2024-01-16',
      shippedBy: '이출고',
      trackingNumber: 'TRK001234568',
      notes: '출고 준비 중'
    },
    {
      id: 3,
      productName: 'LG 그램 17',
      sku: 'LGG-17-512',
      quantity: 3,
      unitPrice: 1800000,
      totalPrice: 5400000,
      customer: 'DEF 컴퓨터',
      status: 'completed',
      shippedDate: '2024-01-14',
      shippedBy: '박출고',
      trackingNumber: 'TRK001234569',
      notes: '정상 출고 완료'
    }
  ]);

  const [openDialog, setOpenDialog] = useState(false);
  const [selectedStockOut, setSelectedStockOut] = useState<any>(null);
  const [formData, setFormData] = useState({
    productName: '',
    sku: '',
    quantity: '',
    unitPrice: '',
    customer: '',
    trackingNumber: '',
    notes: ''
  });

  const handleAdd = () => {
    setSelectedStockOut(null);
    setFormData({
      productName: '',
      sku: '',
      quantity: '',
      unitPrice: '',
      customer: '',
      trackingNumber: '',
      notes: ''
    });
    setOpenDialog(true);
  };

  const handleEdit = (stockOut: any) => {
    setSelectedStockOut(stockOut);
    setFormData({
      productName: stockOut.productName,
      sku: stockOut.sku,
      quantity: stockOut.quantity.toString(),
      unitPrice: stockOut.unitPrice.toString(),
      customer: stockOut.customer,
      trackingNumber: stockOut.trackingNumber,
      notes: stockOut.notes
    });
    setOpenDialog(true);
  };

  const handleSave = () => {
    if (selectedStockOut) {
      // 수정
      setStockOuts(stockOuts.map(item => 
        item.id === selectedStockOut.id 
          ? { 
              ...item, 
              ...formData, 
              quantity: parseInt(formData.quantity),
              unitPrice: parseInt(formData.unitPrice),
              totalPrice: parseInt(formData.quantity) * parseInt(formData.unitPrice)
            } 
          : item
      ));
    } else {
      // 추가
      const newStockOut = {
        id: stockOuts.length + 1,
        ...formData,
        quantity: parseInt(formData.quantity),
        unitPrice: parseInt(formData.unitPrice),
        totalPrice: parseInt(formData.quantity) * parseInt(formData.unitPrice),
        status: 'pending',
        shippedDate: new Date().toISOString().split('T')[0],
        shippedBy: '현재 사용자'
      };
      setStockOuts([...stockOuts, newStockOut]);
    }
    setOpenDialog(false);
  };

  const handleDelete = (id: number) => {
    setStockOuts(stockOuts.filter(item => item.id !== id));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'pending': return 'warning';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return '완료';
      case 'pending': return '대기';
      case 'cancelled': return '취소';
      default: return status;
    }
  };

  return (
    <Box sx={{ 
      width: '100%',
      px: 2,
      py: 3
    }}>
      <MvsPageHeader
        title="재고 이동 및 조정"
        description="재고 이동 및 조정을 관리하는 페이지입니다."
      />

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 3, mb: 3 }}>
        {/* 통계 카드 */}
        <Card>
          <CardContent>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              총 출고 건수
            </Typography>
            <Typography variant="h4" color="primary.main">
              {stockOuts.length}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              완료된 출고
            </Typography>
            <Typography variant="h4" color="success.main">
              {stockOuts.filter(item => item.status === 'completed').length}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              대기 중인 출고
            </Typography>
            <Typography variant="h4" color="warning.main">
              {stockOuts.filter(item => item.status === 'pending').length}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              총 출고 금액
            </Typography>
            <Typography variant="h4" color="info.main">
              Rs. {stockOuts.reduce((sum, item) => sum + item.totalPrice, 0).toLocaleString()}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* 출고 목록 */}
      <Box>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">출고 목록</Typography>
                <Box>
                  <Button
                    variant="outlined"
                    startIcon={<ShippingIcon />}
                    sx={{ mr: 1 }}
                  >
                    배송 추적
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleAdd}
                  >
                    출고 등록
                  </Button>
                </Box>
              </Box>
              
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>상품명</TableCell>
                      <TableCell>SKU</TableCell>
                      <TableCell align="right">수량</TableCell>
                      <TableCell align="right">단가</TableCell>
                      <TableCell align="right">총액</TableCell>
                      <TableCell>고객사</TableCell>
                      <TableCell>상태</TableCell>
                      <TableCell>출고일</TableCell>
                      <TableCell>담당자</TableCell>
                      <TableCell>운송장번호</TableCell>
                      <TableCell>작업</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stockOuts.map((stockOut) => (
                      <TableRow key={stockOut.id}>
                        <TableCell>{stockOut.productName}</TableCell>
                        <TableCell>{stockOut.sku}</TableCell>
                        <TableCell align="right">{stockOut.quantity.toLocaleString()}</TableCell>
                        <TableCell align="right">Rs. {stockOut.unitPrice.toLocaleString()}</TableCell>
                        <TableCell align="right">Rs. {stockOut.totalPrice.toLocaleString()}</TableCell>
                        <TableCell>{stockOut.customer}</TableCell>
                        <TableCell>
                          <Chip
                            label={getStatusLabel(stockOut.status)}
                            color={getStatusColor(stockOut.status) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{stockOut.shippedDate}</TableCell>
                        <TableCell>{stockOut.shippedBy}</TableCell>
                        <TableCell>{stockOut.trackingNumber}</TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => handleEdit(stockOut)}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(stockOut.id)}
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

      {/* 출고 등록/수정 다이얼로그 */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedStockOut ? '출고 정보 수정' : '새 출고 등록'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2, mt: 1 }}>
            <Box>
              <Typography variant="body2" sx={{ mb: 0.3, color: 'text.secondary', fontSize: '0.875rem' }}>
                상품명
              </Typography>
              <TextField
                fullWidth
                value={formData.productName}
                onChange={(e) => setFormData({...formData, productName: e.target.value})}
              />
            </Box>
            <Box>
              <Typography variant="body2" sx={{ mb: 0.3, color: 'text.secondary', fontSize: '0.875rem' }}>
                SKU
              </Typography>
              <TextField
                fullWidth
                value={formData.sku}
                onChange={(e) => setFormData({...formData, sku: e.target.value})}
              />
            </Box>
            <Box>
              <Typography variant="body2" sx={{ mb: 0.3, color: 'text.secondary', fontSize: '0.875rem' }}>
                수량
              </Typography>
              <TextField
                fullWidth
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({...formData, quantity: e.target.value})}
              />
            </Box>
            <Box>
              <Typography variant="body2" sx={{ mb: 0.3, color: 'text.secondary', fontSize: '0.875rem' }}>
                단가
              </Typography>
              <TextField
                fullWidth
                type="number"
                value={formData.unitPrice}
                onChange={(e) => setFormData({...formData, unitPrice: e.target.value})}
              />
            </Box>
            <Box>
              <Typography variant="body2" sx={{ mb: 0.3, color: 'text.secondary', fontSize: '0.875rem' }}>
                고객사
              </Typography>
              <TextField
                fullWidth
                value={formData.customer}
                onChange={(e) => setFormData({...formData, customer: e.target.value})}
              />
            </Box>
            <Box>
              <Typography variant="body2" sx={{ mb: 0.3, color: 'text.secondary', fontSize: '0.875rem' }}>
                운송장번호
              </Typography>
              <TextField
                fullWidth
                value={formData.trackingNumber}
                onChange={(e) => setFormData({...formData, trackingNumber: e.target.value})}
              />
            </Box>
            <Box sx={{ gridColumn: { xs: '1', md: '1 / -1' } }}>
              <Typography variant="body2" sx={{ mb: 0.3, color: 'text.secondary', fontSize: '0.875rem' }}>
                비고
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>취소</Button>
          <Button onClick={handleSave} variant="contained">저장</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StockOutManagement;
