import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Avatar,
  IconButton,
  Alert,
  Divider,
  Chip,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  InputAdornment
} from '@mui/material';
import {
  Business as BusinessIcon,
  Save as SaveIcon,
  Upload as UploadIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Schedule as ScheduleIcon,
  AccountBalance as AccountBalanceIcon,
  Image as ImageIcon,
  Security as SecurityIcon,
  Settings as SettingsIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Language as LanguageIcon,
  People as PeopleIcon
} from '@mui/icons-material';
import { useStore } from '../../store';
import { api } from '../../services/api';

// TabPanel 컴포넌트 정의
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

// 회사 정보 타입 정의
interface Company {
  id: number;
  tenant_id: number;
  name: string;
  business_number: string;
  ceo_name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  industry: string;
  employee_count: number;
  subscription_plan: string;
  subscription_status: string;
  // 인도 관련 필드
  gst_number: string;
  msme_number: string;
  pan_number: string;
  // 회사 이미지 정보
  company_logo: string;
  company_seal: string;
  ceo_signature: string;
  // 은행 정보
  account_holder_name: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  // 로그인 기간 설정
  login_period_start: string;
  login_period_end: string;
  login_time_start: string;
  login_time_end: string;
  timezone: string;
  settings: any;
  created_at: string;
  updated_at: string;
}

// 로그인 기간 설정 타입
interface LoginPeriod {
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  timezone: string;
}

// 회사 이미지 타입
interface CompanyImages {
  company_logo: File | null;
  company_seal: File | null;
  ceo_signature: File | null;
}

// 이미지 미리보기 타입
interface ImagePreview {
  company_logo: string;
  company_seal: string;
  ceo_signature: string;
}

const CompanyManagement: React.FC = () => {
  const { user } = useStore();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'view' | 'edit' | 'add'>('view');
  const [formData, setFormData] = useState<Omit<Company, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>>({
    name: '',
    business_number: '',
    ceo_name: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    industry: '',
    employee_count: 0,
    subscription_plan: 'basic',
    subscription_status: 'active',
    gst_number: '',
    msme_number: '',
    pan_number: '',
    company_logo: '',
    company_seal: '',
    ceo_signature: '',
    account_holder_name: '',
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    login_period_start: '',
    login_period_end: '',
    login_time_start: '09:00:00',
    login_time_end: '18:00:00',
    timezone: 'Asia/Seoul',
    settings: {}
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 회사 목록 로드
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        setLoading(true);
        // 실제 API 호출
        const response = await api.get('/company');
        if (response.data.success) {
          const companiesData = Array.isArray(response.data.data) ? response.data.data : [response.data.data];
          
          // 데이터베이스 필드를 프론트엔드 인터페이스에 맞게 변환
          const transformedCompanies = companiesData.map((company: any) => ({
            ...company,
            employee_count: company.employee_count || 0,
            subscription_plan: company.subscription_plan || 'basic',
            subscription_status: company.status || 'active',
            company_logo: company.company_logo || '',
            company_seal: company.company_seal || '',
            ceo_signature: company.ceo_signature || '',
            account_holder_name: company.account_holder_name || '',
            bank_name: company.bank_name || '',
            account_number: company.account_number || '',
            ifsc_code: company.ifsc_code || '',
            login_period_start: company.login_period_start || '',
            login_period_end: company.login_period_end || '',
            login_time_start: company.login_time_start || '09:00:00',
            login_time_end: company.login_time_end || '18:00:00',
            timezone: company.timezone || 'Asia/Seoul',
            settings: company.settings || {}
          }));
          
          setCompanies(transformedCompanies);
        }
      } catch (error) {
        console.error('회사 목록 로드 오류:', error);
        setError('회사 목록을 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
  }, [user?.role]);

  // 회사 추가
  const handleAdd = () => {
    setSelectedCompany(null);
    setFormData({
      name: '',
      business_number: '',
      ceo_name: '',
      address: '',
      phone: '',
      email: '',
      website: '',
      industry: '',
      employee_count: 0,
      subscription_plan: 'basic',
      subscription_status: 'active',
      gst_number: '',
      msme_number: '',
      pan_number: '',
      company_logo: '',
      company_seal: '',
      ceo_signature: '',
      account_holder_name: '',
      bank_name: '',
      account_number: '',
      ifsc_code: '',
      login_period_start: '',
      login_period_end: '',
      login_time_start: '09:00:00',
      login_time_end: '18:00:00',
      timezone: 'Asia/Seoul',
      settings: {}
    });
    setDialogMode('add');
    setOpenDialog(true);
  };

  // 회사 보기
  const handleView = (company: Company) => {
    setSelectedCompany(company);
    setFormData(company);
    setDialogMode('view');
    setOpenDialog(true);
  };

  // 회사 수정
  const handleEdit = (company: Company) => {
    setSelectedCompany(company);
    setFormData(company);
    setDialogMode('edit');
    setOpenDialog(true);
  };

  // 회사 저장
  const handleSave = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (dialogMode === 'add') {
        await api.post('/company', formData);
        setSuccess('회사가 성공적으로 추가되었습니다.');
      } else if (dialogMode === 'edit' && selectedCompany) {
        await api.put(`/company/${selectedCompany.id}`, formData);
        setSuccess('회사 정보가 성공적으로 수정되었습니다.');
      }
      
      // 목록 새로고침
      const response = await api.get('/company');
      if (response.data.success) {
        const companiesData = Array.isArray(response.data.data) ? response.data.data : [response.data.data];
        
        // 데이터베이스 필드를 프론트엔드 인터페이스에 맞게 변환
        const transformedCompanies = companiesData.map((company: any) => ({
          ...company,
          employee_count: company.employee_count || 0,
          subscription_plan: company.subscription_plan || 'basic',
          subscription_status: company.status || 'active',
          company_logo: company.company_logo || '',
          company_seal: company.company_seal || '',
          ceo_signature: company.ceo_signature || '',
          account_holder_name: company.account_holder_name || '',
          bank_name: company.bank_name || '',
          account_number: company.account_number || '',
          ifsc_code: company.ifsc_code || '',
          login_period_start: company.login_period_start || '',
          login_period_end: company.login_period_end || '',
          login_time_start: company.login_time_start || '09:00:00',
          login_time_end: company.login_time_end || '18:00:00',
          timezone: company.timezone || 'Asia/Seoul',
          settings: company.settings || {}
        }));
        
        setCompanies(transformedCompanies);
      }
      
      setOpenDialog(false);
    } catch (error: any) {
      console.error('회사 저장 오류:', error);
      setError(error.response?.data?.message || '회사 저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 회사 삭제
  const handleDelete = async (id: number) => {
    if (!window.confirm('정말로 이 회사를 삭제하시겠습니까?')) return;
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.delete(`/company/${id}`);
      setSuccess('회사가 성공적으로 삭제되었습니다.');
      
      // 목록 새로고침
      const response = await api.get('/company');
      if (response.data.success) {
        const companiesData = Array.isArray(response.data.data) ? response.data.data : [response.data.data];
        
        // 데이터베이스 필드를 프론트엔드 인터페이스에 맞게 변환
        const transformedCompanies = companiesData.map((company: any) => ({
          ...company,
          employee_count: company.employee_count || 0,
          subscription_plan: company.subscription_plan || 'basic',
          subscription_status: company.status || 'active',
          company_logo: company.company_logo || '',
          company_seal: company.company_seal || '',
          ceo_signature: company.ceo_signature || '',
          account_holder_name: company.account_holder_name || '',
          bank_name: company.bank_name || '',
          account_number: company.account_number || '',
          ifsc_code: company.ifsc_code || '',
          login_period_start: company.login_period_start || '',
          login_period_end: company.login_period_end || '',
          login_time_start: company.login_time_start || '09:00:00',
          login_time_end: company.login_time_end || '18:00:00',
          timezone: company.timezone || 'Asia/Seoul',
          settings: company.settings || {}
        }));
        
        setCompanies(transformedCompanies);
      }
    } catch (error: any) {
      console.error('회사 삭제 오류:', error);
      setError(error.response?.data?.message || '회사 삭제 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 필터링된 회사 목록
  const filteredCompanies = companies.filter(company => {
    const matchesSearch = company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          company.business_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          company.ceo_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          company.industry.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || company.subscription_status === statusFilter;
    const matchesPlan = planFilter === 'all' || company.subscription_plan === planFilter;
    return matchesSearch && matchesStatus && matchesPlan;
  });

  // 상태 칩 생성
  const getStatusChip = (status: string) => {
    const statusConfig = {
      active: { label: '활성', color: 'success' as const },
      inactive: { label: '비활성', color: 'default' as const },
      suspended: { label: '중단', color: 'error' as const }
    };
    const config = statusConfig[status as keyof typeof statusConfig];
    return <Chip label={config.label} color={config.color} size="small" />;
  };

  // 플랜 칩 생성
  const getPlanChip = (plan: string) => {
    const planConfig = {
      basic: { label: '기본', color: 'default' as const },
      standard: { label: '표준', color: 'info' as const },
      premium: { label: '프리미엄', color: 'warning' as const },
      enterprise: { label: '엔터프라이즈', color: 'success' as const }
    };
    const config = planConfig[plan as keyof typeof planConfig];
    return <Chip label={config.label} color={config.color} size="small" />;
  };

  // 회사 목록 테이블
  const renderCompanyList = () => (
    <Card>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell sx={{ fontWeight: 'bold' }}>회사 정보</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>대표자</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>업종</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>직원 수</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>구독 플랜</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>상태</TableCell>
              <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>작업</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredCompanies.map((company) => (
              <TableRow key={company.id} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar sx={{ mr: 2, bgcolor: 'primary.main', width: 40, height: 40 }}>
                      {company.name.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                        {company.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        사업자번호: {company.business_number}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                    {company.ceo_name}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {company.industry}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <PeopleIcon sx={{ mr: 1, fontSize: '1rem', color: 'text.secondary' }} />
                    <Typography variant="body2">
                      {company.employee_count}명
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  {getPlanChip(company.subscription_plan)}
                </TableCell>
                <TableCell>
                  {getStatusChip(company.subscription_status)}
                </TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                    <IconButton size="small" onClick={() => handleView(company)} color="primary">
                      <ViewIcon />
                    </IconButton>
                    {user?.role === 'root' && (
                      <>
                        <IconButton size="small" onClick={() => handleEdit(company)} color="primary">
                          <EditIcon />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleDelete(company.id)} color="error">
                          <DeleteIcon />
                        </IconButton>
                      </>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );

  // 회사 상세 다이얼로그
  const renderCompanyDialog = () => (
    <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
      <DialogTitle>
        {dialogMode === 'add' ? '새 회사 추가' : 
         dialogMode === 'edit' ? '회사 정보 수정' : '회사 정보 보기'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              label="회사명"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
              disabled={dialogMode === 'view'}
            />
            <TextField
              fullWidth
              label="사업자등록번호"
              value={formData.business_number}
              onChange={(e) => setFormData({...formData, business_number: e.target.value})}
              required
              disabled={dialogMode === 'view'}
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              label="대표자명"
              value={formData.ceo_name}
              onChange={(e) => setFormData({...formData, ceo_name: e.target.value})}
              disabled={dialogMode === 'view'}
            />
            <TextField
              fullWidth
              label="업종"
              value={formData.industry}
              onChange={(e) => setFormData({...formData, industry: e.target.value})}
              disabled={dialogMode === 'view'}
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              label="전화번호"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              disabled={dialogMode === 'view'}
            />
            <TextField
              fullWidth
              label="이메일"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              disabled={dialogMode === 'view'}
            />
          </Box>
          <TextField
            fullWidth
            label="웹사이트"
            value={formData.website}
            onChange={(e) => setFormData({...formData, website: e.target.value})}
            disabled={dialogMode === 'view'}
          />
          <TextField
            fullWidth
            label="주소"
            multiline
            rows={2}
            value={formData.address}
            onChange={(e) => setFormData({...formData, address: e.target.value})}
            disabled={dialogMode === 'view'}
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              label="직원 수"
              type="number"
              value={formData.employee_count}
              onChange={(e) => setFormData({...formData, employee_count: parseInt(e.target.value) || 0})}
              disabled={dialogMode === 'view'}
            />
            <FormControl fullWidth disabled={dialogMode === 'view'}>
              <InputLabel>구독 플랜</InputLabel>
              <Select
                value={formData.subscription_plan}
                onChange={(e) => setFormData({...formData, subscription_plan: e.target.value})}
              >
                <MenuItem value="basic">기본</MenuItem>
                <MenuItem value="standard">표준</MenuItem>
                <MenuItem value="premium">프리미엄</MenuItem>
                <MenuItem value="enterprise">엔터프라이즈</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl fullWidth disabled={dialogMode === 'view'}>
              <InputLabel>상태</InputLabel>
              <Select
                value={formData.subscription_status}
                onChange={(e) => setFormData({...formData, subscription_status: e.target.value})}
              >
                <MenuItem value="active">활성</MenuItem>
                <MenuItem value="inactive">비활성</MenuItem>
                <MenuItem value="suspended">중단</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="시간대"
              value={formData.timezone}
              onChange={(e) => setFormData({...formData, timezone: e.target.value})}
              disabled={dialogMode === 'view'}
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOpenDialog(false)}>
          {dialogMode === 'view' ? '닫기' : '취소'}
        </Button>
        {dialogMode !== 'view' && (
          <Button onClick={handleSave} variant="contained" disabled={loading}>
            {loading ? '저장 중...' : '저장'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );

  return (
    <Box sx={{ width: '100%' }}>
      {/* 헤더 */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <BusinessIcon sx={{ mr: 2, fontSize: '2rem', color: 'primary.main' }} />
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          {user?.role === 'root' ? '회사 정보 관리' : '회사 정보'}
        </Typography>
        {user?.role === 'root' && (
          <Chip 
            label="관리자 모드" 
            color="primary" 
            size="small" 
            sx={{ ml: 2 }}
          />
        )}
      </Box>

      {/* 알림 메시지 */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* 검색 및 필터 - root 사용자만 표시 */}
      {user?.role === 'root' && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <TextField
                placeholder="회사명, 사업자번호, 대표자, 업종으로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  )
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
                <InputLabel>구독 플랜</InputLabel>
                <Select
                  value={planFilter}
                  onChange={(e) => setPlanFilter(e.target.value)}
                >
                  <MenuItem value="all">전체 플랜</MenuItem>
                  <MenuItem value="basic">기본</MenuItem>
                  <MenuItem value="standard">표준</MenuItem>
                  <MenuItem value="premium">프리미엄</MenuItem>
                  <MenuItem value="enterprise">엔터프라이즈</MenuItem>
                </Select>
              </FormControl>
              <Box sx={{ flexGrow: 1 }} />
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAdd}
              >
                회사 추가
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* 회사 목록 - root 사용자만 리스트 형태로 표시 */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <Typography>로딩 중...</Typography>
        </Box>
      ) : user?.role === 'root' ? (
        renderCompanyList()
      ) : (
        // 일반 사용자는 자신의 회사 정보만 카드 형태로 표시
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <BusinessIcon color="primary" />
              회사 정보
            </Typography>
            {companies.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'primary.main', width: 50, height: 50 }}>
                    {companies[0].name.charAt(0)}
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 'medium' }}>
                      {companies[0].name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      사업자번호: {companies[0].business_number}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">대표자</Typography>
                    <Typography variant="body1">{companies[0].ceo_name}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">업종</Typography>
                    <Typography variant="body1">{companies[0].industry}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">직원 수</Typography>
                    <Typography variant="body1">{companies[0].employee_count}명</Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">구독 플랜</Typography>
                    {getPlanChip(companies[0].subscription_plan)}
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">상태</Typography>
                    {getStatusChip(companies[0].subscription_status)}
                  </Box>
                </Box>
                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    startIcon={<ViewIcon />}
                    onClick={() => handleView(companies[0])}
                    size="small"
                  >
                    상세 보기
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<EditIcon />}
                    onClick={() => handleEdit(companies[0])}
                    size="small"
                  >
                    수정
                  </Button>
                </Box>
              </Box>
            ) : (
              <Typography color="text.secondary">회사 정보가 없습니다.</Typography>
            )}
          </CardContent>
        </Card>
      )}

      {/* 회사 상세 다이얼로그 */}
      {renderCompanyDialog()}
    </Box>
  );
};

export default CompanyManagement;