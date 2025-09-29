import React, { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem, IconButton, Chip, Avatar,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, InputAdornment, Divider
} from '@mui/material';
import {
  ReceiptLong as ReceiptIcon, Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  Search as SearchIcon, Download as DownloadIcon, Print as PrintIcon, Send as SendIcon,
  Business as BusinessIcon, Person as PersonIcon, AttachMoney as MoneyIcon,
  CalendarToday as CalendarIcon, Description as DescriptionIcon
} from '@mui/icons-material';

interface Invoice {
  id: number;
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  tax: number;
  totalAmount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  description: string;
  items: InvoiceItem[];
}

interface InvoiceItem {
  id: number;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

const InvoiceManagement: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([
    {
      id: 1,
      invoiceNumber: 'INV-2024-001',
      customerName: 'ABC 회사',
      customerEmail: 'billing@abc.com',
      issueDate: '2024-01-15',
      dueDate: '2024-02-15',
      amount: 1000000,
      tax: 100000,
      totalAmount: 1100000,
      status: 'sent',
      description: '소프트웨어 개발 서비스',
      items: [
        { id: 1, description: '웹 개발', quantity: 1, unitPrice: 1000000, amount: 1000000 }
      ]
    },
    {
      id: 2,
      invoiceNumber: 'INV-2024-002',
      customerName: 'XYZ 기업',
      customerEmail: 'accounting@xyz.com',
      issueDate: '2024-01-20',
      dueDate: '2024-02-20',
      amount: 500000,
      tax: 50000,
      totalAmount: 550000,
      status: 'paid',
      description: '컨설팅 서비스',
      items: [
        { id: 1, description: '비즈니스 컨설팅', quantity: 1, unitPrice: 500000, amount: 500000 }
      ]
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [formData, setFormData] = useState<Omit<Invoice, 'id'>>({
    invoiceNumber: '',
    customerName: '',
    customerEmail: '',
    issueDate: '',
    dueDate: '',
    amount: 0,
    tax: 0,
    totalAmount: 0,
    status: 'draft',
    description: '',
    items: []
  });

  const handleAdd = () => {
    setSelectedInvoice(null);
    setFormData({
      invoiceNumber: `INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(3, '0')}`,
      customerName: '',
      customerEmail: '',
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      amount: 0,
      tax: 0,
      totalAmount: 0,
      status: 'draft',
      description: '',
      items: []
    });
    setOpenDialog(true);
  };

  const handleEdit = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setFormData(invoice);
    setOpenDialog(true);
  };

  const handleSave = () => {
    if (selectedInvoice) {
      setInvoices(invoices.map(invoice =>
        invoice.id === selectedInvoice.id ? { ...invoice, ...formData } : invoice
      ));
    } else {
      const newInvoice: Invoice = {
        id: invoices.length > 0 ? Math.max(...invoices.map(i => i.id)) + 1 : 1,
        ...formData
      };
      setInvoices([...invoices, newInvoice]);
    }
    setOpenDialog(false);
  };

  const handleDelete = (id: number) => {
    setInvoices(invoices.filter(invoice => invoice.id !== id));
  };

  const getStatusChip = (status: string) => {
    const statusConfig = {
      draft: { label: '초안', color: 'default' as const },
      sent: { label: '발송', color: 'info' as const },
      paid: { label: '결제완료', color: 'success' as const },
      overdue: { label: '연체', color: 'error' as const },
      cancelled: { label: '취소', color: 'warning' as const }
    };
    const config = statusConfig[status as keyof typeof statusConfig];
    return <Chip label={config.label} color={config.color} size="small" />;
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          invoice.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          invoice.customerEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <Box sx={{ width: '100%' }}>
      {/* 헤더 */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <ReceiptIcon sx={{ mr: 2, fontSize: '2rem', color: 'primary.main' }} />
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          일반 인보이스 관리
        </Typography>
      </Box>

      {/* 검색 및 필터 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              placeholder="인보이스 번호, 고객명, 이메일로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 300 }}
            />
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>상태</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">전체 상태</MenuItem>
                <MenuItem value="draft">초안</MenuItem>
                <MenuItem value="sent">발송</MenuItem>
                <MenuItem value="paid">결제완료</MenuItem>
                <MenuItem value="overdue">연체</MenuItem>
                <MenuItem value="cancelled">취소</MenuItem>
              </Select>
            </FormControl>
            <Box sx={{ flexGrow: 1 }} />
            <Button variant="outlined" startIcon={<DownloadIcon />} sx={{ mr: 1 }}>
              내보내기
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd}>
              인보이스 추가
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* 인보이스 목록 테이블 */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>인보이스 번호</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>고객 정보</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>발행일</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>만료일</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>금액</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>상태</TableCell>
                <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>작업</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredInvoices.map((invoice) => (
                <TableRow key={invoice.id} hover>
                  <TableCell>
                    <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                      {invoice.invoiceNumber}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                        <BusinessIcon sx={{ mr: 1, fontSize: '1rem', color: 'text.secondary' }} />
                        <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                          {invoice.customerName}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <PersonIcon sx={{ mr: 1, fontSize: '1rem', color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {invoice.customerEmail}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <CalendarIcon sx={{ mr: 1, fontSize: '1rem', color: 'text.secondary' }} />
                      {invoice.issueDate}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <CalendarIcon sx={{ mr: 1, fontSize: '1rem', color: 'text.secondary' }} />
                      {invoice.dueDate}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                        {invoice.totalAmount.toLocaleString()}원
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        (세금: {invoice.tax.toLocaleString()}원)
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {getStatusChip(invoice.status)}
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                      <IconButton size="small" onClick={() => handleEdit(invoice)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton size="small" color="primary">
                        <PrintIcon />
                      </IconButton>
                      <IconButton size="small" color="success">
                        <SendIcon />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDelete(invoice.id)} color="error">
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* 인보이스 추가/수정 다이얼로그 */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedInvoice ? '인보이스 수정' : '새 인보이스 추가'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="인보이스 번호"
                value={formData.invoiceNumber}
                onChange={(e) => setFormData({...formData, invoiceNumber: e.target.value})}
                required
              />
              <FormControl fullWidth>
                <InputLabel>상태</InputLabel>
                <Select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                >
                  <MenuItem value="draft">초안</MenuItem>
                  <MenuItem value="sent">발송</MenuItem>
                  <MenuItem value="paid">결제완료</MenuItem>
                  <MenuItem value="overdue">연체</MenuItem>
                  <MenuItem value="cancelled">취소</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="고객명"
                value={formData.customerName}
                onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                required
              />
              <TextField
                fullWidth
                label="고객 이메일"
                value={formData.customerEmail}
                onChange={(e) => setFormData({...formData, customerEmail: e.target.value})}
                required
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="발행일"
                type="date"
                value={formData.issueDate}
                onChange={(e) => setFormData({...formData, issueDate: e.target.value})}
                InputLabelProps={{ shrink: true }}
                required
              />
              <TextField
                fullWidth
                label="만료일"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="금액 (원)"
                type="number"
                value={formData.amount}
                onChange={(e) => {
                  const amount = parseInt(e.target.value) || 0;
                  const tax = Math.round(amount * 0.1);
                  setFormData({...formData, amount, tax, totalAmount: amount + tax});
                }}
                required
              />
              <TextField
                fullWidth
                label="세금 (원)"
                type="number"
                value={formData.tax}
                onChange={(e) => {
                  const tax = parseInt(e.target.value) || 0;
                  setFormData({...formData, tax, totalAmount: formData.amount + tax});
                }}
                required
              />
              <TextField
                fullWidth
                label="총 금액 (원)"
                type="number"
                value={formData.totalAmount}
                onChange={(e) => setFormData({...formData, totalAmount: parseInt(e.target.value) || 0})}
                required
              />
            </Box>
            <TextField
              fullWidth
              label="설명"
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
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

export default InvoiceManagement;
