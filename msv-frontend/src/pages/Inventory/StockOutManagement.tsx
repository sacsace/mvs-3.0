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
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Inventory as InventoryIcon,
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
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <InventoryIcon sx={{ mr: 2, fontSize: '2rem', color: 'primary.main' }} />
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          출고 관리
        </Typography>
      </Box>

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
              {stockOuts.reduce((sum, item) => sum + item.totalPrice, 0).toLocaleString()}원
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
                        <TableCell align="right">{stockOut.unitPrice.toLocaleString()}원</TableCell>
                        <TableCell align="right">{stockOut.totalPrice.toLocaleString()}원</TableCell>
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
            <TextField
              fullWidth
              label="상품명"
              value={formData.productName}
              onChange={(e) => setFormData({...formData, productName: e.target.value})}
            />
            <TextField
              fullWidth
              label="SKU"
              value={formData.sku}
              onChange={(e) => setFormData({...formData, sku: e.target.value})}
            />
            <TextField
              fullWidth
              label="수량"
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData({...formData, quantity: e.target.value})}
            />
            <TextField
              fullWidth
              label="단가"
              type="number"
              value={formData.unitPrice}
              onChange={(e) => setFormData({...formData, unitPrice: e.target.value})}
            />
            <TextField
              fullWidth
              label="고객사"
              value={formData.customer}
              onChange={(e) => setFormData({...formData, customer: e.target.value})}
            />
            <TextField
              fullWidth
              label="운송장번호"
              value={formData.trackingNumber}
              onChange={(e) => setFormData({...formData, trackingNumber: e.target.value})}
            />
            <Box sx={{ gridColumn: { xs: '1', md: '1 / -1' } }}>
              <TextField
                fullWidth
                label="비고"
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
