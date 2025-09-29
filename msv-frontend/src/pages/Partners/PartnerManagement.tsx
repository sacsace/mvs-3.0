import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Avatar,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Tooltip
} from '@mui/material';
import {
  Handshake as HandshakeIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Search as SearchIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  AccountBalance as BankIcon,
  Description as DescriptionIcon,
  Download as DownloadIcon,
  Upload as UploadIcon
} from '@mui/icons-material';

interface Partner {
  id: number;
  companyName: string;
  businessNumber: string;
  representative: string;
  businessType: 'supplier' | 'distributor' | 'customer' | 'vendor';
  industry: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  bankName: string;
  accountNumber: string;
  contractStartDate: string;
  contractEndDate: string;
  status: 'active' | 'inactive' | 'suspended';
  notes: string;
  avatar?: string;
}

const PartnerManagement: React.FC = () => {
  const [partners, setPartners] = useState<Partner[]>([
    {
      id: 1,
      companyName: 'ABC 공급업체',
      businessNumber: '123-45-67890',
      representative: '김공급',
      businessType: 'supplier',
      industry: '제조업',
      address: '서울특별시 강남구 테헤란로 123',
      phone: '02-1111-2222',
      email: 'contact@abc.com',
      website: 'www.abc.com',
      bankName: '국민은행',
      accountNumber: '123456-78-901234',
      contractStartDate: '2023-01-01',
      contractEndDate: '2024-12-31',
      status: 'active',
      notes: '주요 부품 공급업체'
    },
    {
      id: 2,
      companyName: 'XYZ 유통업체',
      businessNumber: '987-65-43210',
      representative: '박유통',
      businessType: 'distributor',
      industry: '유통업',
      address: '부산광역시 해운대구 센텀동로 456',
      phone: '051-3333-4444',
      email: 'info@xyz.com',
      website: 'www.xyz.com',
      bankName: '신한은행',
      accountNumber: '987654-32-109876',
      contractStartDate: '2023-03-01',
      contractEndDate: '2025-02-28',
      status: 'active',
      notes: '전국 유통망 보유'
    },
    {
      id: 3,
      companyName: 'DEF 고객사',
      businessNumber: '456-78-90123',
      representative: '이고객',
      businessType: 'customer',
      industry: '서비스업',
      address: '대구광역시 수성구 동대구로 789',
      phone: '053-5555-6666',
      email: 'sales@def.com',
      website: 'www.def.com',
      bankName: '우리은행',
      accountNumber: '456789-01-234567',
      contractStartDate: '2023-06-01',
      contractEndDate: '2024-05-31',
      status: 'inactive',
      notes: '계약 만료 예정'
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [formData, setFormData] = useState<Omit<Partner, 'id'>>({
    companyName: '',
    businessNumber: '',
    representative: '',
    businessType: 'supplier',
    industry: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    bankName: '',
    accountNumber: '',
    contractStartDate: '',
    contractEndDate: '',
    status: 'active',
    notes: ''
  });

  const handleAdd = () => {
    setSelectedPartner(null);
    setFormData({
      companyName: '',
      businessNumber: '',
      representative: '',
      businessType: 'supplier',
      industry: '',
      address: '',
      phone: '',
      email: '',
      website: '',
      bankName: '',
      accountNumber: '',
      contractStartDate: '',
      contractEndDate: '',
      status: 'active',
      notes: ''
    });
    setOpenDialog(true);
  };

  const handleEdit = (partner: Partner) => {
    setSelectedPartner(partner);
    setFormData({
      companyName: partner.companyName,
      businessNumber: partner.businessNumber,
      representative: partner.representative,
      businessType: partner.businessType,
      industry: partner.industry,
      address: partner.address,
      phone: partner.phone,
      email: partner.email,
      website: partner.website,
      bankName: partner.bankName,
      accountNumber: partner.accountNumber,
      contractStartDate: partner.contractStartDate,
      contractEndDate: partner.contractEndDate,
      status: partner.status,
      notes: partner.notes
    });
    setOpenDialog(true);
  };

  const handleSave = () => {
    if (selectedPartner) {
      setPartners(partners.map(partner =>
        partner.id === selectedPartner.id
          ? { ...partner, ...formData }
          : partner
      ));
    } else {
      const newPartner: Partner = {
        id: partners.length > 0 ? Math.max(...partners.map(p => p.id)) + 1 : 1,
        ...formData
      };
      setPartners([...partners, newPartner]);
    }
    setOpenDialog(false);
  };

  const handleDelete = (id: number) => {
    setPartners(partners.filter(partner => partner.id !== id));
  };

  const getTypeLabel = (type: string) => {
    const typeConfig = {
      supplier: '공급업체',
      distributor: '유통업체',
      customer: '고객사',
      vendor: '벤더'
    };
    return typeConfig[type as keyof typeof typeConfig] || type;
  };

  const getTypeColor = (type: string) => {
    const colorConfig = {
      supplier: 'primary',
      distributor: 'secondary',
      customer: 'success',
      vendor: 'warning'
    };
    return colorConfig[type as keyof typeof colorConfig] || 'default';
  };

  const getStatusChip = (status: string) => {
    const statusConfig = {
      active: { label: '활성', color: 'success' as const },
      inactive: { label: '비활성', color: 'default' as const },
      suspended: { label: '중단', color: 'error' as const }
    };
    const config = statusConfig[status as keyof typeof statusConfig];
    return <Chip label={config.label} color={config.color} size="small" />;
  };

  const filteredPartners = partners.filter(partner => {
    const matchesSearch = partner.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          partner.representative.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          partner.industry.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          partner.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || partner.status === statusFilter;
    const matchesType = typeFilter === 'all' || partner.businessType === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <Box sx={{ 
      width: '100%'
    }}>
      {/* 헤더 */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <HandshakeIcon sx={{ mr: 2, fontSize: '2rem', color: 'primary.main' }} />
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          파트너 업체 관리
        </Typography>
      </Box>

      {/* 검색 및 필터 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              placeholder="회사명, 대표자, 업종, 주소로 검색..."
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
                <MenuItem value="active">활성</MenuItem>
                <MenuItem value="inactive">비활성</MenuItem>
                <MenuItem value="suspended">중단</MenuItem>
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>업체 유형</InputLabel>
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <MenuItem value="all">전체 유형</MenuItem>
                <MenuItem value="supplier">공급업체</MenuItem>
                <MenuItem value="distributor">유통업체</MenuItem>
                <MenuItem value="customer">고객사</MenuItem>
                <MenuItem value="vendor">벤더</MenuItem>
              </Select>
            </FormControl>
            <Box sx={{ flexGrow: 1 }} />
            <Button
              variant="outlined"
              startIcon={<UploadIcon />}
              sx={{ mr: 1 }}
            >
              가져오기
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              sx={{ mr: 1 }}
            >
              내보내기
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAdd}
            >
              파트너 추가
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* 파트너 목록 테이블 */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>회사 정보</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>대표자</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>업체 유형</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>업종</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>연락처</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>계약 기간</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>상태</TableCell>
                <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>작업</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredPartners.map((partner) => (
                <TableRow key={partner.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar sx={{ mr: 2, bgcolor: 'primary.main', width: 32, height: 32 }}>
                        {partner.companyName.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                          {partner.companyName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          사업자번호: {partner.businessNumber}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <PersonIcon sx={{ mr: 1, fontSize: '1rem', color: 'text.secondary' }} />
                      {partner.representative}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getTypeLabel(partner.businessType)}
                      color={getTypeColor(partner.businessType) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {partner.industry}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <PhoneIcon sx={{ mr: 1, fontSize: '1rem', color: 'text.secondary' }} />
                        <Typography variant="body2">{partner.phone}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <EmailIcon sx={{ mr: 1, fontSize: '1rem', color: 'text.secondary' }} />
                        <Typography variant="body2">{partner.email}</Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {partner.contractStartDate} ~ {partner.contractEndDate}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {getStatusChip(partner.status)}
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                      <Tooltip title="수정">
                        <IconButton size="small" onClick={() => handleEdit(partner)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="삭제">
                        <IconButton size="small" onClick={() => handleDelete(partner.id)} color="error">
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
      </Card>

      {/* 파트너 추가/수정 다이얼로그 */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedPartner ? '파트너 정보 수정' : '새 파트너 추가'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="회사명"
                value={formData.companyName}
                onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                required
              />
              <TextField
                fullWidth
                label="사업자번호"
                value={formData.businessNumber}
                onChange={(e) => setFormData({...formData, businessNumber: e.target.value})}
                required
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="대표자명"
                value={formData.representative}
                onChange={(e) => setFormData({...formData, representative: e.target.value})}
                required
              />
              <FormControl fullWidth>
                <InputLabel>업체 유형</InputLabel>
                <Select
                  value={formData.businessType}
                  onChange={(e) => setFormData({...formData, businessType: e.target.value as any})}
                >
                  <MenuItem value="supplier">공급업체</MenuItem>
                  <MenuItem value="distributor">유통업체</MenuItem>
                  <MenuItem value="customer">고객사</MenuItem>
                  <MenuItem value="vendor">벤더</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="업종"
                value={formData.industry}
                onChange={(e) => setFormData({...formData, industry: e.target.value})}
              />
              <TextField
                fullWidth
                label="웹사이트"
                value={formData.website}
                onChange={(e) => setFormData({...formData, website: e.target.value})}
              />
            </Box>
            <TextField
              fullWidth
              label="주소"
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="전화번호"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                required
              />
              <TextField
                fullWidth
                label="이메일"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="은행명"
                value={formData.bankName}
                onChange={(e) => setFormData({...formData, bankName: e.target.value})}
              />
              <TextField
                fullWidth
                label="계좌번호"
                value={formData.accountNumber}
                onChange={(e) => setFormData({...formData, accountNumber: e.target.value})}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="계약 시작일"
                type="date"
                value={formData.contractStartDate}
                onChange={(e) => setFormData({...formData, contractStartDate: e.target.value})}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                fullWidth
                label="계약 종료일"
                type="date"
                value={formData.contractEndDate}
                onChange={(e) => setFormData({...formData, contractEndDate: e.target.value})}
                InputLabelProps={{ shrink: true }}
              />
            </Box>
            <FormControl fullWidth>
              <InputLabel>상태</InputLabel>
              <Select
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value as any})}
              >
                <MenuItem value="active">활성</MenuItem>
                <MenuItem value="inactive">비활성</MenuItem>
                <MenuItem value="suspended">중단</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="비고"
              multiline
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
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

export default PartnerManagement;
