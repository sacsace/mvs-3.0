import React, { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem, IconButton, Chip, Avatar,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, InputAdornment, Divider,
  Grid, LinearProgress
} from '@mui/material';
import {
  Description as ContractIcon, Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  Search as SearchIcon, Download as DownloadIcon, Print as PrintIcon, Visibility as ViewIcon,
  Business as BusinessIcon, Person as PersonIcon, AttachMoney as MoneyIcon,
  CalendarToday as CalendarIcon, Warning as WarningIcon, CheckCircle as CheckIcon,
  Schedule as ScheduleIcon, TrendingUp as TrendingUpIcon, Phone as PhoneIcon
} from '@mui/icons-material';

interface Contract {
  id: number;
  contractCode: string;
  contractName: string;
  customerName: string;
  customerContact: string;
  customerPhone: string;
  customerEmail: string;
  salesPerson: string;
  department: string;
  contractType: 'sales' | 'service' | 'maintenance' | 'consulting';
  contractValue: number;
  paidAmount: number;
  remainingAmount: number;
  startDate: string;
  endDate: string;
  renewalDate?: string;
  paymentTerms: string;
  paymentSchedule: 'monthly' | 'quarterly' | 'annually' | 'one_time';
  status: 'draft' | 'active' | 'expired' | 'terminated' | 'renewed';
  priority: 'high' | 'medium' | 'low';
  description: string;
  terms: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

const ContractManagement: React.FC = () => {
  const [contracts, setContracts] = useState<Contract[]>([
    {
      id: 1,
      contractCode: 'CNT-2024-001',
      contractName: 'ABC 기업 ERP 시스템 구축 계약',
      customerName: 'ABC 기업',
      customerContact: '김대표',
      customerPhone: '02-1234-5678',
      customerEmail: 'ceo@abc.com',
      salesPerson: '이영업',
      department: '영업팀',
      contractType: 'sales',
      contractValue: 100000000,
      paidAmount: 30000000,
      remainingAmount: 70000000,
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      renewalDate: '2024-11-01',
      paymentTerms: '30일',
      paymentSchedule: 'quarterly',
      status: 'active',
      priority: 'high',
      description: '전사 ERP 시스템 구축 및 운영 계약',
      terms: '계약금 30%, 진행률에 따른 단계별 지급',
      notes: '고객사와의 원활한 소통 필요',
      createdAt: '2023-12-15',
      updatedAt: '2024-01-20'
    },
    {
      id: 2,
      contractCode: 'CNT-2024-002',
      contractName: 'XYZ 스타트업 CRM 유지보수 계약',
      customerName: 'XYZ 스타트업',
      customerContact: '박CTO',
      customerPhone: '02-9876-5432',
      customerEmail: 'cto@xyz.com',
      salesPerson: '최영업',
      department: '영업팀',
      contractType: 'maintenance',
      contractValue: 5000000,
      paidAmount: 5000000,
      remainingAmount: 0,
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      paymentTerms: '선불',
      paymentSchedule: 'annually',
      status: 'active',
      priority: 'medium',
      description: 'CRM 시스템 유지보수 및 기술지원',
      terms: '연간 유지보수 계약, 24시간 기술지원',
      notes: '정기 점검 일정 조율 필요',
      createdAt: '2023-11-20',
      updatedAt: '2024-01-15'
    },
    {
      id: 3,
      contractCode: 'CNT-2023-003',
      contractName: 'DEF 제조업 컨설팅 계약',
      customerName: 'DEF 제조업',
      customerContact: '이사장',
      customerPhone: '010-1111-2222',
      customerEmail: 'owner@def.com',
      salesPerson: '김영업',
      department: '영업팀',
      contractType: 'consulting',
      contractValue: 20000000,
      paidAmount: 20000000,
      remainingAmount: 0,
      startDate: '2023-06-01',
      endDate: '2023-12-31',
      paymentTerms: '완료시',
      paymentSchedule: 'one_time',
      status: 'expired',
      priority: 'low',
      description: '제조 프로세스 개선 컨설팅',
      terms: '프로젝트 완료 후 전액 지급',
      notes: '계약 만료, 재계약 검토 중',
      createdAt: '2023-05-15',
      updatedAt: '2023-12-31'
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [formData, setFormData] = useState<Omit<Contract, 'id' | 'remainingAmount' | 'createdAt' | 'updatedAt'>>({
    contractCode: '',
    contractName: '',
    customerName: '',
    customerContact: '',
    customerPhone: '',
    customerEmail: '',
    salesPerson: '',
    department: '',
    contractType: 'sales',
    contractValue: 0,
    paidAmount: 0,
    startDate: '',
    endDate: '',
    renewalDate: '',
    paymentTerms: '',
    paymentSchedule: 'monthly',
    status: 'draft',
    priority: 'medium',
    description: '',
    terms: '',
    notes: ''
  });

  const handleAdd = () => {
    setSelectedContract(null);
    setFormData({
      contractCode: `CNT-${new Date().getFullYear()}-${String(contracts.length + 1).padStart(3, '0')}`,
      contractName: '',
      customerName: '',
      customerContact: '',
      customerPhone: '',
      customerEmail: '',
      salesPerson: '',
      department: '',
      contractType: 'sales',
      contractValue: 0,
      paidAmount: 0,
      startDate: '',
      endDate: '',
      renewalDate: '',
      paymentTerms: '',
      paymentSchedule: 'monthly',
      status: 'draft',
      priority: 'medium',
      description: '',
      terms: '',
      notes: ''
    });
    setOpenDialog(true);
  };

  const handleEdit = (contract: Contract) => {
    setSelectedContract(contract);
    setFormData(contract);
    setOpenDialog(true);
  };

  const handleSave = () => {
    const remainingAmount = formData.contractValue - formData.paidAmount;
    
    if (selectedContract) {
      setContracts(contracts.map(contract =>
        contract.id === selectedContract.id 
          ? { ...contract, ...formData, remainingAmount, updatedAt: new Date().toISOString().split('T')[0] }
          : contract
      ));
    } else {
      const newContract: Contract = {
        id: contracts.length > 0 ? Math.max(...contracts.map(c => c.id)) + 1 : 1,
        ...formData,
        remainingAmount,
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0]
      };
      setContracts([...contracts, newContract]);
    }
    setOpenDialog(false);
  };

  const handleDelete = (id: number) => {
    setContracts(contracts.filter(contract => contract.id !== id));
  };

  const getStatusChip = (status: string) => {
    const statusConfig = {
      draft: { label: '초안', color: 'default' as const },
      active: { label: '활성', color: 'success' as const },
      expired: { label: '만료', color: 'warning' as const },
      terminated: { label: '해지', color: 'error' as const },
      renewed: { label: '갱신', color: 'info' as const }
    };
    const config = statusConfig[status as keyof typeof statusConfig];
    return <Chip label={config.label} color={config.color} size="small" />;
  };

  const getTypeChip = (type: string) => {
    const typeConfig = {
      sales: { label: '판매', color: 'primary' as const },
      service: { label: '서비스', color: 'secondary' as const },
      maintenance: { label: '유지보수', color: 'success' as const },
      consulting: { label: '컨설팅', color: 'info' as const }
    };
    const config = typeConfig[type as keyof typeof typeConfig];
    return <Chip label={config.label} color={config.color} size="small" />;
  };

  const getPriorityChip = (priority: string) => {
    const priorityConfig = {
      high: { label: '높음', color: 'error' as const },
      medium: { label: '보통', color: 'warning' as const },
      low: { label: '낮음', color: 'info' as const }
    };
    const config = priorityConfig[priority as keyof typeof priorityConfig];
    return <Chip label={config.label} color={config.color} size="small" />;
  };

  const getTypeLabel = (type: string) => {
    const typeConfig = {
      sales: '판매',
      service: '서비스',
      maintenance: '유지보수',
      consulting: '컨설팅'
    };
    return typeConfig[type as keyof typeof typeConfig] || type;
  };

  const getPaymentScheduleLabel = (schedule: string) => {
    const scheduleConfig = {
      monthly: '월별',
      quarterly: '분기별',
      annually: '연간',
      one_time: '일시불'
    };
    return scheduleConfig[schedule as keyof typeof scheduleConfig] || schedule;
  };

  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = contract.contractCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          contract.contractName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          contract.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          contract.salesPerson.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || contract.contractType === typeFilter;
    const matchesStatus = statusFilter === 'all' || contract.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || contract.priority === priorityFilter;
    return matchesSearch && matchesType && matchesStatus && matchesPriority;
  });

  const totalContracts = contracts.length;
  const activeContracts = contracts.filter(contract => contract.status === 'active').length;
  const totalValue = contracts.reduce((sum, contract) => sum + contract.contractValue, 0);
  const totalPaid = contracts.reduce((sum, contract) => sum + contract.paidAmount, 0);
  const totalRemaining = totalValue - totalPaid;
  const paymentRate = totalValue > 0 ? Math.round((totalPaid / totalValue) * 100) : 0;

  // 만료 예정 계약 (30일 이내)
  const expiringSoon = contracts.filter(contract => {
    if (contract.status !== 'active') return false;
    const endDate = new Date(contract.endDate);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays > 0;
  }).length;

  return (
    <Box sx={{ width: '100%', px: 2, py: 3 }}>
      {/* 헤더 */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <ContractIcon sx={{ mr: 2, fontSize: '2rem', color: 'primary.main' }} />
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          계약 관리
        </Typography>
      </Box>

      {/* 계약 요약 카드 */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, 
        gap: 3, 
        mb: 3 
      }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <ContractIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">총 계약</Typography>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
              {totalContracts}개
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <CheckIcon sx={{ mr: 1, color: 'success.main' }} />
              <Typography variant="h6">활성 계약</Typography>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'success.main' }}>
              {activeContracts}개
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <MoneyIcon sx={{ mr: 1, color: 'info.main' }} />
              <Typography variant="h6">총 계약금액</Typography>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'info.main' }}>
              {totalValue.toLocaleString()}원
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <TrendingUpIcon sx={{ mr: 1, color: 'warning.main' }} />
              <Typography variant="h6">수금률</Typography>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
              {paymentRate}%
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={paymentRate} 
              sx={{ mt: 1 }}
              color={paymentRate >= 80 ? 'success' : paymentRate >= 60 ? 'warning' : 'error'}
            />
          </CardContent>
        </Card>
      </Box>

      {/* 만료 예정 경고 */}
      {expiringSoon > 0 && (
        <Card sx={{ mb: 3, bgcolor: 'warning.light' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <WarningIcon sx={{ mr: 1, color: 'warning.dark' }} />
              <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                {expiringSoon}개의 계약이 30일 이내에 만료 예정입니다.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* 검색 및 필터 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              placeholder="계약코드, 계약명, 고객명, 담당자로 검색..."
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
              <InputLabel>계약 유형</InputLabel>
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <MenuItem value="all">전체 유형</MenuItem>
                <MenuItem value="sales">판매</MenuItem>
                <MenuItem value="service">서비스</MenuItem>
                <MenuItem value="maintenance">유지보수</MenuItem>
                <MenuItem value="consulting">컨설팅</MenuItem>
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>상태</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">전체 상태</MenuItem>
                <MenuItem value="draft">초안</MenuItem>
                <MenuItem value="active">활성</MenuItem>
                <MenuItem value="expired">만료</MenuItem>
                <MenuItem value="terminated">해지</MenuItem>
                <MenuItem value="renewed">갱신</MenuItem>
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>우선순위</InputLabel>
              <Select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <MenuItem value="all">전체 우선순위</MenuItem>
                <MenuItem value="high">높음</MenuItem>
                <MenuItem value="medium">보통</MenuItem>
                <MenuItem value="low">낮음</MenuItem>
              </Select>
            </FormControl>
            <Box sx={{ flexGrow: 1 }} />
            <Button variant="outlined" startIcon={<PrintIcon />} sx={{ mr: 1 }}>
              인쇄
            </Button>
            <Button variant="outlined" startIcon={<DownloadIcon />} sx={{ mr: 1 }}>
              내보내기
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd}>
              계약 추가
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* 계약 목록 테이블 */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>계약 정보</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>고객 정보</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>담당자</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>계약 유형</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>계약 금액</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>수금 현황</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>계약 기간</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>상태</TableCell>
                <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>작업</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredContracts.map((contract) => (
                <TableRow key={contract.id} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                        {contract.contractCode}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {contract.contractName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {getPaymentScheduleLabel(contract.paymentSchedule)}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                        <BusinessIcon sx={{ mr: 1, fontSize: '1rem', color: 'text.secondary' }} />
                        <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                          {contract.customerName}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                        <PersonIcon sx={{ mr: 1, fontSize: '1rem', color: 'text.secondary' }} />
                        <Typography variant="body2">
                          {contract.customerContact}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <PhoneIcon sx={{ mr: 1, fontSize: '1rem', color: 'text.secondary' }} />
                        <Typography variant="body2">
                          {contract.customerPhone}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {contract.salesPerson}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {contract.department}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {getTypeChip(contract.contractType)}
                      {getPriorityChip(contract.priority)}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                      {contract.contractValue.toLocaleString()}원
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {contract.paidAmount.toLocaleString()}원 / {contract.contractValue.toLocaleString()}원
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        잔액: {contract.remainingAmount.toLocaleString()}원
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={(contract.paidAmount / contract.contractValue) * 100} 
                        sx={{ mt: 0.5, height: 4, borderRadius: 2 }}
                        color={contract.paidAmount === contract.contractValue ? 'success' : 'primary'}
                      />
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                        <CalendarIcon sx={{ mr: 1, fontSize: '1rem', color: 'text.secondary' }} />
                        <Typography variant="body2">
                          {contract.startDate} ~ {contract.endDate}
                        </Typography>
                      </Box>
                      {contract.renewalDate && (
                        <Typography variant="caption" color="warning.main">
                          갱신일: {contract.renewalDate}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {getStatusChip(contract.status)}
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                      <IconButton size="small" onClick={() => handleEdit(contract)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton size="small" color="primary">
                        <ViewIcon />
                      </IconButton>
                      <IconButton size="small" color="primary">
                        <PrintIcon />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDelete(contract.id)} color="error">
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

      {/* 계약 추가/수정 다이얼로그 */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          {selectedContract ? '계약 수정' : '새 계약 추가'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="계약 코드"
                value={formData.contractCode}
                onChange={(e) => setFormData({...formData, contractCode: e.target.value})}
                required
              />
              <TextField
                fullWidth
                label="계약명"
                value={formData.contractName}
                onChange={(e) => setFormData({...formData, contractName: e.target.value})}
                required
              />
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
                label="고객 담당자"
                value={formData.customerContact}
                onChange={(e) => setFormData({...formData, customerContact: e.target.value})}
                required
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="고객 전화번호"
                value={formData.customerPhone}
                onChange={(e) => setFormData({...formData, customerPhone: e.target.value})}
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
                label="영업 담당자"
                value={formData.salesPerson}
                onChange={(e) => setFormData({...formData, salesPerson: e.target.value})}
                required
              />
              <TextField
                fullWidth
                label="부서"
                value={formData.department}
                onChange={(e) => setFormData({...formData, department: e.target.value})}
                required
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>계약 유형</InputLabel>
                <Select
                  value={formData.contractType}
                  onChange={(e) => setFormData({...formData, contractType: e.target.value as any})}
                >
                  <MenuItem value="sales">판매</MenuItem>
                  <MenuItem value="service">서비스</MenuItem>
                  <MenuItem value="maintenance">유지보수</MenuItem>
                  <MenuItem value="consulting">컨설팅</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>우선순위</InputLabel>
                <Select
                  value={formData.priority}
                  onChange={(e) => setFormData({...formData, priority: e.target.value as any})}
                >
                  <MenuItem value="high">높음</MenuItem>
                  <MenuItem value="medium">보통</MenuItem>
                  <MenuItem value="low">낮음</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="계약 금액 (원)"
                type="number"
                value={formData.contractValue}
                onChange={(e) => setFormData({...formData, contractValue: parseInt(e.target.value) || 0})}
                required
              />
              <TextField
                fullWidth
                label="지급 금액 (원)"
                type="number"
                value={formData.paidAmount}
                onChange={(e) => setFormData({...formData, paidAmount: parseInt(e.target.value) || 0})}
                required
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="계약 시작일"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                InputLabelProps={{ shrink: true }}
                required
              />
              <TextField
                fullWidth
                label="계약 종료일"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="갱신일"
                type="date"
                value={formData.renewalDate}
                onChange={(e) => setFormData({...formData, renewalDate: e.target.value})}
                InputLabelProps={{ shrink: true }}
              />
              <FormControl fullWidth>
                <InputLabel>지급 조건</InputLabel>
                <Select
                  value={formData.paymentSchedule}
                  onChange={(e) => setFormData({...formData, paymentSchedule: e.target.value as any})}
                >
                  <MenuItem value="monthly">월별</MenuItem>
                  <MenuItem value="quarterly">분기별</MenuItem>
                  <MenuItem value="annually">연간</MenuItem>
                  <MenuItem value="one_time">일시불</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="지급 조건"
                value={formData.paymentTerms}
                onChange={(e) => setFormData({...formData, paymentTerms: e.target.value})}
                required
              />
              <FormControl fullWidth>
                <InputLabel>상태</InputLabel>
                <Select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                >
                  <MenuItem value="draft">초안</MenuItem>
                  <MenuItem value="active">활성</MenuItem>
                  <MenuItem value="expired">만료</MenuItem>
                  <MenuItem value="terminated">해지</MenuItem>
                  <MenuItem value="renewed">갱신</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <TextField
              fullWidth
              label="계약 설명"
              multiline
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              required
            />
            <TextField
              fullWidth
              label="계약 조건"
              multiline
              rows={2}
              value={formData.terms}
              onChange={(e) => setFormData({...formData, terms: e.target.value})}
            />
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

export default ContractManagement;
