import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  FormControl,
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
  TableSortLabel,
  InputAdornment,
  CircularProgress,
  Tooltip
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
  People as PeopleIcon,
  Close as CloseIcon,
  PhotoCamera as PhotoCameraIcon
} from '@mui/icons-material';
import { useStore } from '../../store';
import { api } from '../../services/api';
import { useTranslation } from 'react-i18next';
import { alpha, useTheme } from '@mui/material/styles';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import { useMenuRoutePermissionFlags } from '../../hooks/useMenuRoutePermissionFlags';

const COMPANY_MENU_ROUTES = ['/basic-info/company', '/basic-info'] as const;

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
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
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
  gst_numbers?: string[]; // GST 번호 배열 (최대 10개)
  msme_number?: string;
  iec_number?: string;
  pan_number?: string;
  // 회사 이미지 정보
  company_logo: string;
  company_seal: string;
  ceo_signature: string;
  // 은행 정보
  account_holder_name: string;
  bank_name: string;
  bank_address: string;
  account_number: string;
  ifsc_code: string;
  swift_code: string;
  // 로그인 기간 설정
  login_period_start: string;
  login_period_end: string;
  login_time_start: string;
  login_time_end: string;
  timezone: string;
  // MVS 사용 기간
  mvs_start_date: string;
  mvs_end_date: string;
  settings: any;
  created_at: string;
  updated_at: string;
}

type CompanySortKey = 'name' | 'ceo_name' | 'industry' | 'employee_count' | 'mvs_start';

function descendingComparator(a: Company, b: Company, orderBy: CompanySortKey): number {
  if (orderBy === 'employee_count') {
    return (b.employee_count ?? 0) - (a.employee_count ?? 0);
  }
  if (orderBy === 'mvs_start') {
    const as = a.mvs_start_date || '';
    const bs = b.mvs_start_date || '';
    if (bs < as) return -1;
    if (bs > as) return 1;
    return 0;
  }
  const va = String(a[orderBy] ?? '').toLowerCase();
  const vb = String(b[orderBy] ?? '').toLowerCase();
  if (vb < va) return -1;
  if (vb > va) return 1;
  return 0;
}

function getCompanySortComparator(
  order: 'asc' | 'desc',
  orderBy: CompanySortKey
): (a: Company, b: Company) => number {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
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
  const { t } = useTranslation();
  const { dialogState, showConfirm, handleConfirm, handleCancel } = useConfirmDialog();
  const theme = useTheme();
  /** text.secondary보다 진한 보조 텍스트 (통계·테이블 보조 열) */
  const pageMutedFg = alpha(
    theme.palette.text.primary,
    theme.palette.mode === 'dark' ? 0.93 : 0.84
  );
  /** 테이블 주요 본문(회사명·대표 등) */
  const tablePrimaryFg = alpha(
    theme.palette.text.primary,
    theme.palette.mode === 'dark' ? 0.98 : 0.92
  );
  const { user } = useStore();
  const menuFlags = useMenuRoutePermissionFlags(COMPANY_MENU_ROUTES);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [orderBy, setOrderBy] = useState<CompanySortKey>('name');
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
    gst_numbers: [''],
    msme_number: '',
    iec_number: '',
    pan_number: '',
    company_logo: '',
    company_seal: '',
    ceo_signature: '',
    account_holder_name: '',
    bank_name: '',
    bank_address: '',
    account_number: '',
    ifsc_code: '',
    swift_code: '',
    login_period_start: '',
    login_period_end: '',
    login_time_start: '09:00:00',
    login_time_end: '18:00:00',
    timezone: 'Asia/Seoul',
    mvs_start_date: '',
    mvs_end_date: '',
    settings: {}
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [imageFiles, setImageFiles] = useState<CompanyImages>({
    company_logo: null,
    company_seal: null,
    ceo_signature: null
  });
  const [imagePreviews, setImagePreviews] = useState<ImagePreview>({
    company_logo: '',
    company_seal: '',
    ceo_signature: ''
  });

  // 이미지 파일을 Base64로 변환하는 함수
  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  // 이미지 업로드 핸들러
  const handleImageUpload = async (field: keyof CompanyImages, file: File) => {
    try {
      const base64 = await convertToBase64(file);
      setImageFiles(prev => ({ ...prev, [field]: file }));
      setImagePreviews(prev => ({ ...prev, [field]: base64 }));
      setFormData(prev => ({ ...prev, [field]: base64 }));
    } catch (error) {
      console.error('이미지 변환 오류:', error);
      setError('이미지 업로드 중 오류가 발생했습니다.');
    }
  };

  // 이미지 삭제 핸들러
  const handleImageRemove = (field: keyof CompanyImages) => {
    setImageFiles(prev => ({ ...prev, [field]: null }));
    setImagePreviews(prev => ({ ...prev, [field]: '' }));
    setFormData(prev => ({ ...prev, [field]: '' }));
  };

  // 회사 목록 로드
  useEffect(() => {
    const fetchCompanies = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      if (menuFlags.menusLoading || !menuFlags.canRead) {
        setCompanies([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        
        // root 사용자는 모든 회사 목록, 일반 사용자는 본인 회사만
        if (user.role === 'root') {
          // root 사용자: 모든 회사 목록 조회
                    const response = await api.get('/company');
                    
          if (response.data && response.data.success) {
            const companiesData = Array.isArray(response.data.data) ? response.data.data : (response.data.data ? [response.data.data] : []);
                        
            // 데이터베이스 필드를 프론트엔드 인터페이스에 맞게 변환
            const transformedCompanies = companiesData.map((company: any) => {
              // GST 번호 처리: 배열이 아니거나 비어있으면 빈 배열로 설정
              let gstNumbers: string[] = [];
              if (Array.isArray(company.gst_numbers) && company.gst_numbers.length > 0) {
                gstNumbers = company.gst_numbers.filter((gst: string) => gst && gst.trim() !== '');
              }
              
              return {
                ...company,
                employee_count: company.employee_count || 0,
                subscription_plan: company.subscription_plan || 'basic',
                subscription_status: company.status || 'active',
                company_logo: company.company_logo || '',
                company_seal: company.company_seal || '',
                ceo_signature: company.ceo_signature || '',
                account_holder_name: company.account_holder_name || '',
                bank_name: company.bank_name || '',
                bank_address: company.bank_address || '',
                account_number: company.account_number || '',
                ifsc_code: company.ifsc_code || '',
                swift_code: company.swift_code || '',
                gst_numbers: gstNumbers.length > 0 ? gstNumbers : [''],
                msme_number: company.msme_number || '',
                iec_number: company.iec_number || '',
                pan_number: company.pan_number || '',
                login_period_start: company.login_period_start || '',
                login_period_end: company.login_period_end || '',
                login_time_start: company.login_time_start || '09:00:00',
                login_time_end: company.login_time_end || '18:00:00',
                timezone: company.timezone || 'Asia/Seoul',
                settings: company.settings || {}
              };
            });
            
                                    setCompanies(transformedCompanies);
          } else {
            console.error('❌ [회사 정보 관리] API 응답 실패:', response.data);
            setError(response.data?.message || '회사 목록을 불러오는데 실패했습니다.');
            setCompanies([]);
          }
        } else {
          // 일반 사용자: 본인 회사 정보만 조회
          if (user.company_id) {
                        const response = await api.get(`/company/${user.company_id}`);
                        
            if (response.data && response.data.success && response.data.data) {
              const company = response.data.data;
              
              // GST 번호 처리: 배열이 아니거나 비어있으면 빈 배열로 설정
              let gstNumbers: string[] = [];
              if (Array.isArray(company.gst_numbers) && company.gst_numbers.length > 0) {
                gstNumbers = company.gst_numbers.filter((gst: string) => gst && gst.trim() !== '');
              }
              
              const transformedCompany = {
                ...company,
                employee_count: company.employee_count || 0,
                subscription_plan: company.subscription_plan || 'basic',
                subscription_status: company.status || 'active',
                company_logo: company.company_logo || '',
                company_seal: company.company_seal || '',
                ceo_signature: company.ceo_signature || '',
                account_holder_name: company.account_holder_name || '',
                bank_name: company.bank_name || '',
                bank_address: company.bank_address || '',
                account_number: company.account_number || '',
                ifsc_code: company.ifsc_code || '',
                swift_code: company.swift_code || '',
                gst_numbers: gstNumbers.length > 0 ? gstNumbers : [''],
                msme_number: company.msme_number || '',
                iec_number: company.iec_number || '',
                pan_number: company.pan_number || '',
                login_period_start: company.login_period_start || '',
                login_period_end: company.login_period_end || '',
                login_time_start: company.login_time_start || '09:00:00',
                login_time_end: company.login_time_end || '18:00:00',
                timezone: company.timezone || 'Asia/Seoul',
                settings: company.settings || {}
              };
                            setCompanies([transformedCompany]);
            } else {
              console.error('❌ [회사 정보 관리] API 응답 실패 또는 데이터 없음:', response.data);
              setError(response.data?.message || '회사 정보를 불러오는데 실패했습니다.');
              setCompanies([]);
            }
          } else {
            console.warn('⚠️ [회사 정보 관리] 사용자에게 company_id가 없음');
            setError('회사 정보가 없습니다. 관리자에게 문의하세요.');
            setCompanies([]);
          }
        }
      } catch (error: any) {
        console.error('❌ [회사 정보 관리] 회사 목록 로드 오류:', error);
        console.error('❌ [회사 정보 관리] 에러 상세:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          statusText: error.response?.statusText
        });
        
        // 인증 오류인 경우 특별 처리
        if (error.response?.status === 401 || error.response?.status === 403) {
          const errorMessage = error.response?.data?.message || '인증 오류가 발생했습니다. 다시 로그인해주세요.';
          setError(errorMessage);
          // 로그아웃 처리는 API 인터셉터에서 처리됨
        } else {
          const errorMessage = error.response?.data?.message || error.message || '회사 정보를 불러오는데 실패했습니다.';
          setError(errorMessage);
        }
        setCompanies([]);
      } finally {
        setLoading(false);
              }
    };

    fetchCompanies();
  }, [user?.role, user?.company_id, user?.id, menuFlags.menusLoading, menuFlags.canRead]);

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
      gst_numbers: [''],
      msme_number: '',
      iec_number: '',
      pan_number: '',
      company_logo: '',
      company_seal: '',
      ceo_signature: '',
      account_holder_name: '',
      bank_name: '',
      bank_address: '',
      account_number: '',
      ifsc_code: '',
      swift_code: '',
      login_period_start: '',
      login_period_end: '',
      login_time_start: '09:00:00',
      login_time_end: '18:00:00',
      timezone: 'Asia/Seoul',
      mvs_start_date: '',
      mvs_end_date: '',
      settings: {}
    });
    // 이미지 상태 초기화
    setImageFiles({
      company_logo: null,
      company_seal: null,
      ceo_signature: null
    });
    setImagePreviews({
      company_logo: '',
      company_seal: '',
      ceo_signature: ''
    });
    setDialogMode('add');
    setOpenDialog(true);
  };

  // 회사 수정
  const handleEdit = (company: Company) => {
        
    setSelectedCompany(company);
    
    // GST 번호 처리 - 빈 문자열이 아닌 값만 필터링
    let gstNumbers: string[] = [];
    if (company.gst_numbers) {
      if (Array.isArray(company.gst_numbers)) {
        gstNumbers = company.gst_numbers.filter((gst: string) => gst && gst.trim() !== '');
      } else if (typeof company.gst_numbers === 'string') {
        // 문자열인 경우 배열로 변환
        gstNumbers = [company.gst_numbers].filter((gst: string) => gst && gst.trim() !== '');
      }
    }
    
        
    setFormData({
      ...company,
      gst_numbers: gstNumbers.length > 0 ? gstNumbers : [''],
      bank_address: company.bank_address || '',
      swift_code: company.swift_code || '',
      iec_number: company.iec_number || ''
    });
    // 기존 이미지 데이터를 미리보기에 설정
    setImagePreviews({
      company_logo: company.company_logo || '',
      company_seal: company.company_seal || '',
      ceo_signature: company.ceo_signature || ''
    });
    setDialogMode('edit');
    setOpenDialog(true);
  };

  // 회사 보기
  const handleView = (company: Company) => {
        
    setSelectedCompany(company);
    
    // GST 번호 처리 - 빈 문자열이 아닌 값만 필터링
    let gstNumbers: string[] = [];
    if (company.gst_numbers) {
      if (Array.isArray(company.gst_numbers)) {
        gstNumbers = company.gst_numbers.filter((gst: string) => gst && gst.trim() !== '');
      } else if (typeof company.gst_numbers === 'string') {
        // 문자열인 경우 배열로 변환
        gstNumbers = [company.gst_numbers].filter((gst: string) => gst && gst.trim() !== '');
      }
    }
    
        
    setFormData({
      ...company,
      gst_numbers: gstNumbers.length > 0 ? gstNumbers : [''],
      bank_address: company.bank_address || '',
      swift_code: company.swift_code || '',
      iec_number: company.iec_number || ''
    });
    // 기존 이미지 데이터를 미리보기에 설정
    setImagePreviews({
      company_logo: company.company_logo || '',
      company_seal: company.company_seal || '',
      ceo_signature: company.ceo_signature || ''
    });
    setImageFiles({
      company_logo: null,
      company_seal: null,
      ceo_signature: null
    });
    setDialogMode('view');
    setOpenDialog(true);
  };

  // 회사 저장
  const handleSave = async () => {
                
    setLoading(true);
    setError('');
    setSuccess('');

    // 필수 항목 검증 (NOT NULL 제약조건이 있는 필드)
    // address와 phone은 DB에서 NOT NULL이므로 추가/수정 모두에서 필수
    if (!formData.address || formData.address.trim() === '') {
            setError('주소는 필수 입력 항목입니다.');
      setLoading(false);
      return;
    }

    if (!formData.phone || formData.phone.trim() === '') {
            setError('전화번호는 필수 입력 항목입니다.');
      setLoading(false);
      return;
    }

    // 필수 항목 검증 (새 회사 추가 시에만)
    if (dialogMode === 'add') {
      // 회사명 검증
      if (!formData.name || formData.name.trim() === '') {
                setError('회사명은 필수 입력 항목입니다.');
        setLoading(false);
        return;
      }

      // 사업자등록번호 검증
      if (!formData.business_number || formData.business_number.trim() === '') {
                setError('사업자등록번호는 필수 입력 항목입니다.');
        setLoading(false);
        return;
      }

      // GST 번호 필수 검증 (최소 1개 이상 입력되어야 함)
      const validGstNumbers = (formData.gst_numbers || []).filter((gst: string) => gst && gst.trim() !== '');
      if (validGstNumbers.length === 0) {
                setError('GST 번호는 필수 입력 항목입니다. 최소 1개 이상 입력해주세요.');
        setLoading(false);
        return;
      }

      // PAN 번호 필수 검증
      if (!formData.pan_number || formData.pan_number.trim() === '') {
                setError('PAN 번호는 필수 입력 항목입니다.');
        setLoading(false);
        return;
      }
    }

    try {
      if (dialogMode === 'add') {
                // 회사 등록 시 MVS 시스템 사용 가능하도록 설정
        const companyData = {
          ...formData,
          subscription_status: 'active',
          status: 'active' // 백엔드에서 사용하는 status 필드
        };
                
        const response = await api.post('/company', companyData);
                if (response.data.success) {
                    setSuccess('회사가 성공적으로 등록되었습니다. MVS 시스템을 사용할 수 있습니다.');
        } else {
          console.error('❌ 회사 등록 실패:', response.data.message);
          setError(response.data.message || '회사 등록에 실패했습니다.');
          setLoading(false);
          return;
        }
      } else if (dialogMode === 'edit' && selectedCompany) {
        // 수정 시 이미지 처리: 새로 업로드한 이미지만 전송
        const updateData: any = { ...formData };
        
        // 이미지 필드 처리: 새로 업로드한 이미지(파일이 있는 경우)만 전송
        const imageFields: (keyof CompanyImages)[] = ['company_logo', 'company_seal', 'ceo_signature'];
        imageFields.forEach(field => {
          // 새로 업로드한 파일이 있는 경우에만 전송
          if (imageFiles[field]) {
            // Base64 데이터가 이미 formData에 있으므로 그대로 전송
            // updateData[field]는 이미 Base64로 설정되어 있음
          } else {
            // 파일이 없고, 이미지가 삭제된 경우 (빈 문자열)
            if (!formData[field] || formData[field] === '') {
              updateData[field] = null;
            } else {
              // 기존 이미지를 유지하는 경우 - 전송하지 않음 (백엔드에서 업데이트하지 않음)
              delete updateData[field];
            }
          }
        });
        
        // NOT NULL 필드가 빈 문자열이거나 undefined인 경우 빈 문자열로 설정
        const notNullFields = ['address', 'phone', 'email'];
        notNullFields.forEach(field => {
          if (updateData[field] === undefined || updateData[field] === null) {
            updateData[field] = '';
          }
        });
        
                const response = await api.put(`/company/${selectedCompany.id}`, updateData);
                if (response.data.success) {
                    setSuccess('회사 정보가 성공적으로 수정되었습니다.');
          // 성공 시 다이얼로그 닫기
          setOpenDialog(false);
        } else {
          console.error('❌ 회사 정보 수정 실패:', response.data.message);
          // 오류 메시지는 메인 페이지에 표시되도록 유지 (다이얼로그는 닫지 않음)
          setError(response.data.message || '회사 정보 수정에 실패했습니다.');
          setLoading(false);
          return;
        }
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
      
      // 등록 모드에서는 성공 시 다이얼로그 닫기 (수정 모드는 위에서 처리)
      if (dialogMode === 'add') {
        setOpenDialog(false);
      }
    } catch (error: any) {
      console.error('회사 저장 오류:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || '회사 저장 중 오류가 발생했습니다.';
      setError(errorMessage);
      console.error('에러 상세:', {
        message: errorMessage,
        status: error.response?.status,
        data: error.response?.data
      });
      // 오류 발생 시 다이얼로그는 닫지 않음 (사용자가 직접 닫도록)
    } finally {
      setLoading(false);
    }
  };

  // 회사 삭제
  const handleDelete = (id: number) => {
    showConfirm(
      '정말로 이 회사를 삭제하시겠습니까?',
      () => {
        void (async () => {
          setLoading(true);
          setError('');
          setSuccess('');

          try {
            await api.delete(`/company/${id}`);
            setSuccess('회사가 성공적으로 삭제되었습니다.');

            const response = await api.get('/company');
            if (response.data.success) {
              const companiesData = Array.isArray(response.data.data) ? response.data.data : [response.data.data];

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
        })();
      },
      { title: '삭제 확인', confirmColor: 'error', confirmText: t('common.delete'), cancelText: t('common.cancel') }
    );
  };

  // 필터링된 회사 목록 - MVS 시스템을 사용할 수 있는 회사들 (활성 상태)
  const filteredCompanies = companies.filter(company => {
    const matchesSearch = company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          company.business_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          company.ceo_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (company.industry && company.industry.toLowerCase().includes(searchTerm.toLowerCase()));
    // MVS 시스템을 사용할 수 있는 회사만 표시 (활성 상태)
    const isActive = company.subscription_status === 'active';
    return matchesSearch && isActive;
  });

  const handleRequestSort = (property: CompanySortKey) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const sortedCompanies = useMemo(() => {
    const copy = [...filteredCompanies];
    copy.sort(getCompanySortComparator(order, orderBy));
    return copy;
  }, [filteredCompanies, order, orderBy]);

  // 공통 TextField 스타일
  const textFieldStyles = {
    InputLabelProps: {
      shrink: true,
      sx: {
        backgroundColor: 'white',
        px: 1,
        color: 'primary.main',
        transform: 'translate(14px, -9px) scale(0.75)',
        transformOrigin: 'top left'
      }
    },
    sx: {
      '& .MuiOutlinedInput-root': {
        '& .MuiOutlinedInput-notchedOutline': {
          borderColor: '#e0e0e0'
        },
        '&:hover .MuiOutlinedInput-notchedOutline': {
          borderColor: '#1976d2'
        },
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
          borderColor: '#1976d2',
          borderWidth: 2
        }
      }
    }
  };

  // 이미지 업로드 컴포넌트 생성
  const renderImageUpload = (field: keyof CompanyImages, label: string) => {
    // 이미지 데이터가 있는지 확인 (Base64 또는 URL)
    const hasImage = imagePreviews[field] && imagePreviews[field].length > 0;
    
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 'medium' }}>
          {label}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {hasImage ? (
            <Box sx={{ position: 'relative', display: 'inline-block' }}>
              <img
                src={imagePreviews[field]}
                alt={label}
                style={{
                  width: 100,
                  height: 100,
                  objectFit: 'cover',
                  borderRadius: 8,
                  border: '1px solid #e0e0e0'
                }}
                onError={(e) => {
                  console.error(`이미지 로드 실패 (${label}):`, e);
                  // 이미지 로드 실패 시 빈 상태로 설정
                  setImagePreviews(prev => ({ ...prev, [field]: '' }));
                }}
              />
              {dialogMode !== 'view' && (
                <IconButton
                  size="small"
                  onClick={() => handleImageRemove(field)}
                  sx={{
                    position: 'absolute',
                    top: -8,
                    right: -8,
                    backgroundColor: 'error.main',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: 'error.dark'
                    }
                  }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
          ) : (
            <Box
              sx={{
                width: 100,
                height: 100,
                border: '2px dashed #ccc',
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f5f5f5'
              }}
            >
              <PhotoCameraIcon sx={{ color: 'text.secondary', fontSize: 24 }} />
            </Box>
          )}
          {dialogMode !== 'view' && (
            <Box>
              <input
                accept="image/*"
                style={{ display: 'none' }}
                id={`${field}-upload`}
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleImageUpload(field, file);
                  }
                }}
              />
              <label htmlFor={`${field}-upload`}>
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<UploadIcon />}
                  size="small"
                >
                  이미지 업로드
                </Button>
              </label>
            </Box>
          )}
        </Box>
      </Box>
    );
  };

  // 상태 칩 생성
  const getStatusChip = (status: string) => {
    const statusConfig = {
      active: { labelKey: 'companyManagement.active' as const, color: 'success' as const },
      inactive: { labelKey: 'companyManagement.inactive' as const, color: 'default' as const },
      suspended: { labelKey: 'companyManagement.suspended' as const, color: 'error' as const }
    };
    const config = statusConfig[status as keyof typeof statusConfig];
    if (!config) return null;
    return <Chip label={t(config.labelKey)} color={config.color} size="small" sx={{ fontSize: '0.75rem' }} />;
  };

  // 회사 상세 다이얼로그
  const renderCompanyDialog = () => (
    <Dialog 
      open={openDialog} 
      onClose={() => setOpenDialog(false)} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle sx={{ 
        fontSize: '1.25rem', 
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        gap: 1
      }}>
        <BusinessIcon color="primary" />
        {dialogMode === 'add' ? t('companyManagement.addNewCompany') : 
         dialogMode === 'edit' ? t('companyManagement.editCompany') : t('companyManagement.viewCompany')}
      </DialogTitle>
      <DialogContent>
        {/* 오류 메시지 표시 */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        {/* 성공 메시지 표시 */}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {/* 좌우 분할 레이아웃 */}
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2.5 }}>
            {/* 왼쪽: 기본 정보 */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box>
                  <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: 'text.secondary', fontSize: '0.75rem' }}>
                    <span style={{ color: 'red' }}>*</span> 회사명
                  </Typography>
                  <TextField
                    fullWidth
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                    disabled={dialogMode === 'view'}
                    placeholder="회사명을 입력하세요"
                    {...textFieldStyles}
                  />
                </Box>
                
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: 'text.secondary', fontSize: '0.75rem' }}>
                      <span style={{ color: 'red' }}>*</span> 사업자등록번호
                    </Typography>
                    <TextField
                      fullWidth
                      value={formData.business_number}
                      onChange={(e) => setFormData({...formData, business_number: e.target.value})}
                      required
                      disabled={dialogMode === 'view'}
                      placeholder="사업자등록번호를 입력하세요"
                      {...textFieldStyles}
                    />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: 'text.secondary', fontSize: '0.75rem' }}>
                      업종
                    </Typography>
                    <TextField
                      fullWidth
                      value={formData.industry}
                      onChange={(e) => setFormData({...formData, industry: e.target.value})}
                      disabled={dialogMode === 'view'}
                      placeholder="업종을 입력하세요"
                      {...textFieldStyles}
                    />
                  </Box>
                </Box>
                
                <Box>
                  <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: 'text.secondary', fontSize: '0.75rem' }}>
                    대표자명
                  </Typography>
                  <TextField
                    fullWidth
                    value={formData.ceo_name}
                    onChange={(e) => setFormData({...formData, ceo_name: e.target.value})}
                    disabled={dialogMode === 'view'}
                    placeholder="대표자명을 입력하세요"
                    {...textFieldStyles}
                  />
                </Box>
              </Box>
            </Box>

            {/* 오른쪽: 연락처 및 기타 정보 */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: 'text.secondary', fontSize: '0.75rem' }}>
                      전화번호 <span style={{ color: 'red' }}>*</span>
                    </Typography>
                    <TextField
                      fullWidth
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      disabled={dialogMode === 'view'}
                      placeholder="전화번호를 입력하세요"
                      error={!formData.phone || formData.phone.trim() === ''}
                      helperText={(!formData.phone || formData.phone.trim() === '') ? '전화번호는 필수 입력 항목입니다.' : ''}
                      {...textFieldStyles}
                    />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: 'text.secondary', fontSize: '0.75rem' }}>
                      이메일
                    </Typography>
                    <TextField
                      fullWidth
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      disabled={dialogMode === 'view'}
                      placeholder="이메일을 입력하세요"
                      {...textFieldStyles}
                    />
                  </Box>
                </Box>
                
                <Box>
                  <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: 'text.secondary', fontSize: '0.75rem' }}>
                    웹사이트
                  </Typography>
                  <TextField
                    fullWidth
                    value={formData.website}
                    onChange={(e) => setFormData({...formData, website: e.target.value})}
                    disabled={dialogMode === 'view'}
                    placeholder="웹사이트를 입력하세요"
                    {...textFieldStyles}
                  />
                </Box>
                
                <Box>
                  <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: 'text.secondary', fontSize: '0.75rem' }}>
                    {t('companyManagement.status')}
                  </Typography>
                  <FormControl fullWidth disabled={dialogMode === 'view'} variant="outlined" size="small">
                    <Select
                      variant="outlined"
                      value={formData.subscription_status}
                      onChange={(e) => setFormData({...formData, subscription_status: e.target.value})}
                      sx={{
                        ...textFieldStyles.sx,
                        height: '40px',
                        '& .MuiSelect-select': {
                          height: '40px',
                          display: 'flex',
                          alignItems: 'center'
                        }
                      }}
                    >
                      <MenuItem value="active">{t('companyManagement.active')}</MenuItem>
                      <MenuItem value="inactive">{t('companyManagement.inactive')}</MenuItem>
                      <MenuItem value="suspended">{t('companyManagement.suspended')}</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Box>
            </Box>
          </Box>

          {/* 주소 입력창 (전체 너비) */}
          <Box>
            <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: 'text.secondary', fontSize: '0.75rem' }}>
              주소 <span style={{ color: 'red' }}>*</span>
            </Typography>
            <TextField
              fullWidth
              required
              multiline
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              disabled={dialogMode === 'view'}
              placeholder="주소를 입력하세요"
              error={!formData.address || formData.address.trim() === ''}
              helperText={(!formData.address || formData.address.trim() === '') ? '주소는 필수 입력 항목입니다.' : ''}
              {...textFieldStyles}
              sx={{
                ...textFieldStyles.sx,
                '& .MuiOutlinedInput-root': {
                  ...textFieldStyles.sx['& .MuiOutlinedInput-root'],
                  height: 'auto',
                  minHeight: '40px'
                }
              }}
            />
          </Box>

          {/* 세금 및 등록 번호 정보 */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 3 }}>
            <Divider sx={{ mb: 2, borderWidth: 1.5, borderColor: 'divider' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.875rem', mb: 1 }}>
              세금 및 등록 번호
            </Typography>
            
            {/* GST 번호 (최대 10개) */}
            <Box>
              <Typography variant="caption" sx={{ display: 'block', mb: 1, color: 'text.secondary', fontSize: '0.75rem' }}>
                <span style={{ color: 'red' }}>*</span> GST 번호 (최대 10개)
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {(() => {
                  // GST 번호 배열 처리 - 빈 배열이거나 없으면 빈 문자열 하나 표시
                  let gstNumbersToShow: string[] = [];
                  if (formData.gst_numbers && Array.isArray(formData.gst_numbers) && formData.gst_numbers.length > 0) {
                    // 빈 문자열이 아닌 값만 필터링
                    gstNumbersToShow = formData.gst_numbers.filter((gst: string) => gst && gst.trim() !== '');
                    // 필터링 후 비어있으면 빈 문자열 하나 추가
                    if (gstNumbersToShow.length === 0) {
                      gstNumbersToShow = [''];
                    }
                  } else {
                    gstNumbersToShow = [''];
                  }
                  
                                    
                  return gstNumbersToShow;
                })().map((gstNumber: string, index: number) => (
                    <Box key={index} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                      <TextField
                        fullWidth
                        value={gstNumber || ''}
                        onChange={(e) => {
                          const currentGstNumbers = formData.gst_numbers || [''];
                          const newGstNumbers = [...currentGstNumbers];
                          newGstNumbers[index] = e.target.value;
                          setFormData({...formData, gst_numbers: newGstNumbers});
                        }}
                        disabled={dialogMode === 'view'}
                        placeholder={`GST 번호 ${index + 1}`}
                        {...textFieldStyles}
                      />
                    {dialogMode !== 'view' && (
                      <>
                        {index > 0 && (
                          <IconButton
                            size="small"
                            onClick={() => {
                              const currentGstNumbers = formData.gst_numbers || [''];
                              const newGstNumbers = currentGstNumbers.filter((_, i) => i !== index);
                              setFormData({...formData, gst_numbers: newGstNumbers.length > 0 ? newGstNumbers : ['']});
                            }}
                            sx={{ mt: 0.5 }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        )}
                        {index === (formData.gst_numbers?.length || 1) - 1 && 
                         (formData.gst_numbers?.length || 1) < 10 && (
                          <IconButton
                            size="small"
                            onClick={() => {
                              const currentGstNumbers = formData.gst_numbers || [''];
                              setFormData({...formData, gst_numbers: [...currentGstNumbers, '']});
                            }}
                            sx={{ mt: 0.5, color: 'primary.main' }}
                          >
                            <AddIcon fontSize="small" />
                          </IconButton>
                        )}
                      </>
                    )}
                  </Box>
                ))}
              </Box>
            </Box>
            
            {/* MSME, IEC, PAN */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 1.5 }}>
              <Box>
                <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: 'text.secondary', fontSize: '0.75rem' }}>
                  MSME 번호
                </Typography>
                <TextField
                  fullWidth
                  value={formData.msme_number || ''}
                  onChange={(e) => setFormData({...formData, msme_number: e.target.value})}
                  disabled={dialogMode === 'view'}
                  placeholder="MSME 번호를 입력하세요"
                  {...textFieldStyles}
                />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: 'text.secondary', fontSize: '0.75rem' }}>
                  IEC 번호
                </Typography>
                <TextField
                  fullWidth
                  value={formData.iec_number || ''}
                  onChange={(e) => setFormData({...formData, iec_number: e.target.value})}
                  disabled={dialogMode === 'view'}
                  placeholder="IEC 번호를 입력하세요"
                  {...textFieldStyles}
                />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: 'text.secondary', fontSize: '0.75rem' }}>
                  <span style={{ color: 'red' }}>*</span> PAN 번호
                </Typography>
                <TextField
                  fullWidth
                  value={formData.pan_number || ''}
                  onChange={(e) => setFormData({...formData, pan_number: e.target.value})}
                  disabled={dialogMode === 'view'}
                  placeholder="PAN 번호를 입력하세요"
                  required
                  {...textFieldStyles}
                />
              </Box>
            </Box>
          </Box>

          {/* 은행 정보 */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 3 }}>
            <Divider sx={{ mb: 2, borderWidth: 1.5, borderColor: 'divider' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.875rem', mb: 1 }}>
              은행 정보
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 1.5 }}>
              <Box>
                <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: 'text.secondary', fontSize: '0.75rem' }}>
                  예금주
                </Typography>
                <TextField
                  fullWidth
                  value={formData.account_holder_name || ''}
                  onChange={(e) => setFormData({...formData, account_holder_name: e.target.value})}
                  disabled={dialogMode === 'view'}
                  placeholder="예금주를 입력하세요"
                  {...textFieldStyles}
                />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: 'text.secondary', fontSize: '0.75rem' }}>
                  은행명
                </Typography>
                <TextField
                  fullWidth
                  value={formData.bank_name || ''}
                  onChange={(e) => setFormData({...formData, bank_name: e.target.value})}
                  disabled={dialogMode === 'view'}
                  placeholder="은행명을 입력하세요"
                  {...textFieldStyles}
                />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: 'text.secondary', fontSize: '0.75rem' }}>
                  계좌번호
                </Typography>
                <TextField
                  fullWidth
                  value={formData.account_number || ''}
                  onChange={(e) => setFormData({...formData, account_number: e.target.value})}
                  disabled={dialogMode === 'view'}
                  placeholder="계좌번호를 입력하세요"
                  {...textFieldStyles}
                />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: 'text.secondary', fontSize: '0.75rem' }}>
                  IFSC 코드
                </Typography>
                <TextField
                  fullWidth
                  value={formData.ifsc_code || ''}
                  onChange={(e) => setFormData({...formData, ifsc_code: e.target.value})}
                  disabled={dialogMode === 'view'}
                  placeholder="IFSC 코드를 입력하세요"
                  {...textFieldStyles}
                />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: 'text.secondary', fontSize: '0.75rem' }}>
                  SWIFT 코드
                </Typography>
                <TextField
                  fullWidth
                  value={formData.swift_code || ''}
                  onChange={(e) => setFormData({...formData, swift_code: e.target.value})}
                  disabled={dialogMode === 'view'}
                  placeholder="SWIFT 코드를 입력하세요"
                  {...textFieldStyles}
                />
              </Box>
              <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
                <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: 'text.secondary', fontSize: '0.75rem' }}>
                  은행 주소
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  value={formData.bank_address || ''}
                  onChange={(e) => setFormData({...formData, bank_address: e.target.value})}
                  disabled={dialogMode === 'view'}
                  placeholder="은행 주소를 입력하세요"
                  {...textFieldStyles}
                  sx={{
                    ...textFieldStyles.sx,
                    '& .MuiOutlinedInput-root': {
                      ...textFieldStyles.sx['& .MuiOutlinedInput-root'],
                      height: 'auto',
                      minHeight: '40px'
                    }
                  }}
                />
              </Box>
            </Box>
          </Box>

          {/* MVS 사용 기간 */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 3 }}>
            <Divider sx={{ mb: 2, borderWidth: 1.5, borderColor: 'divider' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.875rem', mb: 1 }}>
              MVS 사용 기간
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: 'text.secondary', fontSize: '0.75rem' }}>
                  MVS 사용 시작일
                </Typography>
                <TextField
                  fullWidth
                  type="date"
                  value={formData.mvs_start_date}
                  onChange={(e) => setFormData({...formData, mvs_start_date: e.target.value})}
                  disabled={dialogMode === 'view'}
                  {...textFieldStyles}
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: 'text.secondary', fontSize: '0.75rem' }}>
                  MVS 사용 종료일
                </Typography>
                <TextField
                  fullWidth
                  type="date"
                  value={formData.mvs_end_date}
                  onChange={(e) => setFormData({...formData, mvs_end_date: e.target.value})}
                  disabled={dialogMode === 'view'}
                  {...textFieldStyles}
                />
              </Box>
            </Box>
          </Box>

          {/* 하단: 이미지 정보 */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 3 }}>
            <Divider sx={{ mb: 2, borderWidth: 1.5, borderColor: 'divider' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.875rem', mb: 1 }}>
              회사 이미지 정보
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
              {renderImageUpload('company_logo', '회사 로고')}
              {renderImageUpload('company_seal', '회사 인장')}
              {renderImageUpload('ceo_signature', '대표자 서명')}
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 3, gap: 1 }}>
        <Button 
          onClick={() => setOpenDialog(false)}
          sx={{ borderRadius: 2 }}
        >
          {dialogMode === 'view' ? t('companyManagement.close') : t('companyManagement.cancel')}
        </Button>
        {dialogMode === 'view' && (user?.role === 'root' || user?.role === 'admin') && (
          <Tooltip title={t('common.menuNoEdit')} disableHoverListener={menuFlags.menusLoading || menuFlags.canEdit}>
            <span style={{ display: 'inline-flex' }}>
              <Button 
                onClick={() => {
                  setDialogMode('edit');
                }} 
                variant="contained" 
                color="primary"
                disabled={menuFlags.menusLoading || !menuFlags.canEdit}
                sx={{ borderRadius: 2 }}
              >
                수정
              </Button>
            </span>
          </Tooltip>
        )}
        {dialogMode !== 'view' && (
          <Tooltip
            title={dialogMode === 'add' ? t('common.menuNoCreate') : t('common.menuNoEdit')}
            disableHoverListener={
              menuFlags.menusLoading ||
              (dialogMode === 'add' ? menuFlags.canCreate : menuFlags.canEdit)
            }
          >
            <span style={{ display: 'inline-flex' }}>
              <Button 
                onClick={handleSave} 
                variant="contained" 
                disabled={
                  loading ||
                  menuFlags.menusLoading ||
                  (dialogMode === 'add' ? !menuFlags.canCreate : !menuFlags.canEdit)
                }
                sx={{ borderRadius: 2 }}
              >
                {loading ? t('companyManagement.saving') : t('companyManagement.save')}
              </Button>
            </span>
          </Tooltip>
        )}
      </DialogActions>
    </Dialog>
  );

  const sortLabelSx = {
    fontWeight: 600,
    fontSize: '0.75rem',
    letterSpacing: '0.01em',
    color: theme.palette.mode === 'light' ? 'rgba(60, 60, 67, 0.55)' : theme.palette.grey[400],
    '&.Mui-active': {
      color: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.92)' : theme.palette.grey[100],
    },
    '& .MuiTableSortLabel-icon': {
      color: 'inherit',
      opacity: 0.85,
    },
  } as const;

  return (
    <Box sx={{ p: 0, width: '100%', maxWidth: '100%', bgcolor: 'transparent', minHeight: '100%' }}>
      {/* 헤더 */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 2,
          mb: 3,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography
            component="h1"
            variant="pageTitle"
            sx={{
              mb: 0.75,
              fontSize: { xs: '1.125rem', sm: '1.3125rem' },
              fontWeight: 600,
              letterSpacing: '-0.022em',
              lineHeight: 1.28,
              color: tablePrimaryFg,
            }}
          >
            {t('companyManagement.pageTitle')}
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '0.8125rem', lineHeight: 1.55, color: pageMutedFg, maxWidth: 640 }}>
            {t('companyManagement.description')}
          </Typography>
        </Box>
        {user?.role === 'root' && (
          <Tooltip title={t('common.menuNoCreate')} disableHoverListener={menuFlags.menusLoading || menuFlags.canCreate}>
            <span style={{ display: 'inline-flex' }}>
              <Button
                variant="contained"
                color="primary"
                disableElevation
                startIcon={<AddIcon sx={{ fontSize: 20 }} />}
                onClick={handleAdd}
                disabled={menuFlags.menusLoading || !menuFlags.canCreate}
                sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 600, px: 2.5 }}
              >
                {t('companyManagement.addCompany')}
              </Button>
            </span>
          </Tooltip>
        )}
      </Box>

      {/* 알림 메시지 */}
      {!menuFlags.menusLoading && !menuFlags.canRead && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {t('common.menuNoView')}
        </Alert>
      )}
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

      {/* 통계 카드 및 검색 필터 - root 사용자만 표시 */}
      {user?.role === 'root' && (
        <>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
              gap: 2,
              mb: 3,
            }}
          >
            {[filteredCompanies.length, companies.length].map((value, idx) => (
              <Card
                key={idx === 0 ? 'mvs' : 'total'}
                elevation={0}
                sx={{
                  borderRadius: '16px',
                  border: '1px solid',
                  borderColor: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.08)' : 'divider',
                  boxShadow:
                    theme.palette.mode === 'light' ? '0 2px 10px rgba(15, 23, 42, 0.04)' : '0 2px 12px rgba(0,0,0,0.25)',
                  bgcolor: 'background.paper',
                }}
              >
                <CardContent sx={{ py: 2, px: 2.5 }}>
                  <Typography
                    sx={{
                      color: pageMutedFg,
                      display: 'block',
                      fontWeight: 600,
                      letterSpacing: '0.02em',
                      fontSize: '0.75rem',
                      mb: 1,
                    }}
                  >
                    {idx === 0 ? t('companyManagement.mvsUsageCompanies') : t('companyManagement.totalCompanies')}
                  </Typography>
                  <Typography variant="kpiNumber" sx={{ color: tablePrimaryFg, fontWeight: 600 }}>
                    {value}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>

          {/* 검색 */}
          <Box
            sx={{
              mb: 3,
              p: 2,
              borderRadius: '14px',
              bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.06) : alpha(theme.palette.common.black, 0.03),
            }}
          >
            <TextField
              fullWidth
              placeholder={t('companyManagement.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              variant="outlined"
              size="small"
              disabled={menuFlags.menusLoading || !menuFlags.canRead}
              hiddenLabel
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: '1.125rem', color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                maxWidth: 560,
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  bgcolor: 'background.paper',
                  '& fieldset': {
                    borderColor: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.1)' : undefined,
                  },
                },
              }}
            />
          </Box>
        </>
      )}

      {/* 회사 목록 - root 사용자는 리스트, 일반 사용자는 본인 회사만 view */}
      {loading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', p: 8 }}>
          <CircularProgress sx={{ mb: 2 }} />
          <Typography sx={{ color: pageMutedFg }}>{t('companyManagement.loadingMessage')}</Typography>
        </Box>
      ) : user?.role === 'root' ? (
        // root 사용자: 회사 리스트 표시
        <Card
          elevation={0}
          sx={{
            borderRadius: '20px',
            border: '1px solid',
            borderColor: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.08)' : 'divider',
            boxShadow:
              theme.palette.mode === 'light' ? '0 2px 14px rgba(15, 23, 42, 0.05)' : '0 4px 18px rgba(0,0,0,0.3)',
            bgcolor: 'background.paper',
            overflow: 'hidden',
          }}
        >
          <CardContent sx={{ py: 3, px: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 2.5 }}>
              <Typography
                variant="subtitle1"
                sx={{
                  color: tablePrimaryFg,
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                  fontSize: '1rem',
                }}
              >
                {t('companyManagement.companyListTitle', { count: filteredCompanies.length })}
              </Typography>
              <Tooltip title={t('common.menuNoCreate')} disableHoverListener={menuFlags.menusLoading || menuFlags.canCreate}>
                <span style={{ display: 'inline-flex' }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<AddIcon sx={{ fontSize: 18 }} />}
                    onClick={handleAdd}
                    disabled={menuFlags.menusLoading || !menuFlags.canCreate}
                    sx={{
                      borderRadius: '12px',
                      textTransform: 'none',
                      fontWeight: 600,
                      borderColor: 'divider',
                      color: 'text.secondary',
                      '&:hover': {
                        borderColor: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.16)' : undefined,
                        bgcolor: 'action.hover',
                        color: 'text.primary',
                      },
                    }}
                  >
                    {t('companyManagement.addCompany')}
                  </Button>
                </span>
              </Tooltip>
            </Box>
            {filteredCompanies.length > 0 ? (
              <TableContainer sx={{ bgcolor: 'transparent', boxShadow: 'none', border: 'none' }}>
                <Table
                  size="small"
                  sx={{
                    borderCollapse: 'collapse',
                    '& .MuiTableCell-root': {
                      borderLeft: 'none',
                      borderRight: 'none',
                      borderTop: 'none',
                    },
                  }}
                >
                  <TableHead
                    sx={{
                      '& .MuiTableCell-head': {
                        bgcolor:
                          theme.palette.mode === 'light'
                            ? 'rgba(0, 0, 0, 0.02)'
                            : alpha(theme.palette.common.white, 0.04),
                        color: theme.palette.mode === 'light' ? 'rgba(60, 60, 67, 0.6)' : theme.palette.grey[300],
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        letterSpacing: '0.01em',
                        borderBottom: `1px solid ${
                          theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.06)' : theme.palette.divider
                        }`,
                        py: 1.5,
                        px: 2,
                      },
                    }}
                  >
                    <TableRow>
                      <TableCell sortDirection={orderBy === 'name' ? order : false}>
                        <TableSortLabel
                          active={orderBy === 'name'}
                          direction={orderBy === 'name' ? order : 'asc'}
                          onClick={() => handleRequestSort('name')}
                          sx={sortLabelSx}
                        >
                          {t('companyManagement.companyInfo')}
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sortDirection={orderBy === 'ceo_name' ? order : false}>
                        <TableSortLabel
                          active={orderBy === 'ceo_name'}
                          direction={orderBy === 'ceo_name' ? order : 'asc'}
                          onClick={() => handleRequestSort('ceo_name')}
                          sx={sortLabelSx}
                        >
                          {t('companyManagement.representative')}
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sortDirection={orderBy === 'industry' ? order : false}>
                        <TableSortLabel
                          active={orderBy === 'industry'}
                          direction={orderBy === 'industry' ? order : 'asc'}
                          onClick={() => handleRequestSort('industry')}
                          sx={sortLabelSx}
                        >
                          {t('companyManagement.industry')}
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sortDirection={orderBy === 'employee_count' ? order : false}>
                        <TableSortLabel
                          active={orderBy === 'employee_count'}
                          direction={orderBy === 'employee_count' ? order : 'asc'}
                          onClick={() => handleRequestSort('employee_count')}
                          sx={sortLabelSx}
                        >
                          {t('companyManagement.employeeCount')}
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sortDirection={orderBy === 'mvs_start' ? order : false}>
                        <TableSortLabel
                          active={orderBy === 'mvs_start'}
                          direction={orderBy === 'mvs_start' ? order : 'asc'}
                          onClick={() => handleRequestSort('mvs_start')}
                          sx={sortLabelSx}
                        >
                          {t('companyManagement.mvsUsagePeriod')}
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, textAlign: 'center', color: 'text.secondary', fontSize: '0.75rem' }}>
                        {t('companyManagement.actions')}
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody
                    sx={{
                      '& .MuiTableCell-body': {
                        py: 1.5,
                        px: 2,
                        fontSize: '0.875rem',
                        borderBottom: `1px solid ${
                          theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.06)' : theme.palette.divider
                        }`,
                      },
                      '& .MuiTableRow-root:last-of-type .MuiTableCell-body': {
                        borderBottom: 'none',
                      },
                    }}
                  >
                    {sortedCompanies.map((company) => (
                      <TableRow
                        key={company.id}
                        hover
                        onClick={() => {
                          if (!menuFlags.menusLoading && menuFlags.canRead) handleView(company);
                        }}
                        sx={{
                          cursor: menuFlags.menusLoading || !menuFlags.canRead ? 'default' : 'pointer',
                          transition: 'background-color 0.15s ease',
                          '&:hover': { bgcolor: 'action.hover' },
                        }}
                      >
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Avatar
                              sx={{
                                mr: 2,
                                width: 40,
                                height: 40,
                                fontSize: '1rem',
                                fontWeight: 600,
                                bgcolor:
                                  theme.palette.mode === 'light'
                                    ? 'rgba(15, 23, 42, 0.08)'
                                    : alpha(theme.palette.common.white, 0.12),
                                color: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.75)' : theme.palette.grey[200],
                              }}
                            >
                              {company.name.charAt(0)}
                            </Avatar>
                            <Typography variant="body1" sx={{ fontWeight: 600, color: tablePrimaryFg }}>
                              {company.name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: tablePrimaryFg }}>
                            {company.ceo_name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ color: tablePrimaryFg, fontWeight: 500 }}>
                            {company.industry || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <PeopleIcon sx={{ mr: 1, fontSize: '1rem', color: 'text.secondary', opacity: 0.7 }} />
                            <Typography variant="body2" sx={{ color: tablePrimaryFg, fontWeight: 500 }}>
                              {t('companyManagement.employeesCount', { count: company.employee_count })}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ color: tablePrimaryFg, fontWeight: 500 }}>
                            {company.mvs_start_date && company.mvs_end_date
                              ? `${company.mvs_start_date} ~ ${company.mvs_end_date}`
                              : '-'}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                            <Tooltip title={menuFlags.menusLoading || !menuFlags.canDelete ? t('common.menuNoDelete') : t('companyManagement.delete')}>
                              <span style={{ display: 'inline-flex' }}>
                                <IconButton
                                  size="small"
                                  disabled={menuFlags.menusLoading || !menuFlags.canDelete}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(company.id);
                                  }}
                                  sx={{
                                    color: 'text.secondary',
                                    borderRadius: '10px',
                                    '&:hover': {
                                      color: 'error.main',
                                      bgcolor: alpha(theme.palette.error.main, 0.08),
                                    },
                                  }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <BusinessIcon sx={{ fontSize: 64, color: pageMutedFg, mb: 2, opacity: 0.45 }} />
                <Typography variant="h6" sx={{ mb: 1, color: pageMutedFg }}>
                  {t('companyManagement.noCompaniesTitle')}
                </Typography>
                <Typography variant="body2" sx={{ color: pageMutedFg }}>
                  {searchTerm.trim()
                    ? t('companyManagement.noCompaniesMatch')
                    : t('companyManagement.noActiveCompanies')}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      ) : (
        // 일반 사용자: 본인 회사 정보만 view 모드로 표시
        companies.length > 0 ? (
          <Card
            elevation={0}
            sx={{
              borderRadius: '20px',
              border: '1px solid',
              borderColor: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.08)' : 'divider',
              boxShadow:
                theme.palette.mode === 'light' ? '0 2px 14px rgba(15, 23, 42, 0.05)' : '0 4px 18px rgba(0,0,0,0.3)',
              bgcolor: 'background.paper',
            }}
          >
            <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 4 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, letterSpacing: '-0.02em', color: tablePrimaryFg }}>
                  {t('companyManagement.companyInfo')}
                </Typography>
                {(user?.role === 'admin' || user?.role === 'root') && (
                  <Tooltip title={t('common.menuNoEdit')} disableHoverListener={menuFlags.menusLoading || menuFlags.canEdit}>
                    <span style={{ display: 'inline-flex' }}>
                      <Button
                        variant="outlined"
                        startIcon={<EditIcon sx={{ fontSize: 18 }} />}
                        onClick={() => handleEdit(companies[0])}
                        disabled={menuFlags.menusLoading || !menuFlags.canEdit}
                        sx={{
                          borderRadius: '12px',
                          textTransform: 'none',
                          fontWeight: 600,
                          borderColor: 'divider',
                          color: 'text.secondary',
                          '&:hover': {
                            borderColor: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.16)' : undefined,
                            bgcolor: 'action.hover',
                            color: 'text.primary',
                          },
                        }}
                      >
                        수정
                      </Button>
                    </span>
                  </Tooltip>
                )}
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  {companies[0].company_logo ? (
                    <Avatar
                      src={companies[0].company_logo}
                      sx={{
                        width: 100,
                        height: 100,
                        fontSize: '2.5rem',
                        bgcolor:
                          theme.palette.mode === 'light'
                            ? 'rgba(15, 23, 42, 0.08)'
                            : alpha(theme.palette.common.white, 0.12),
                        color: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.75)' : theme.palette.grey[200],
                      }}
                    >
                      {companies[0].name.charAt(0)}
                    </Avatar>
                  ) : (
                    <Avatar
                      sx={{
                        width: 100,
                        height: 100,
                        fontSize: '2.5rem',
                        bgcolor:
                          theme.palette.mode === 'light'
                            ? 'rgba(15, 23, 42, 0.08)'
                            : alpha(theme.palette.common.white, 0.12),
                        color: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.75)' : theme.palette.grey[200],
                      }}
                    >
                      {companies[0].name.charAt(0)}
                    </Avatar>
                  )}
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 'medium', mb: 1, fontSize: '0.75rem' }}>
                      {companies[0].name}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                      사업자번호: {companies[0].business_number}
                    </Typography>
                  </Box>
                </Box>
                
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 4 }}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mb: 1.5, fontSize: '0.75rem' }}>대표자</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 'medium', fontSize: '0.75rem' }}>{companies[0].ceo_name || '-'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mb: 1.5, fontSize: '0.75rem' }}>업종</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 'medium', fontSize: '0.75rem' }}>{companies[0].industry || '-'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mb: 1.5, fontSize: '0.75rem' }}>직원 수</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 'medium', fontSize: '0.75rem' }}>{companies[0].employee_count}명</Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mb: 1.5, fontSize: '0.75rem' }}>{t('companyManagement.status')}</Typography>
                    {getStatusChip(companies[0].subscription_status)}
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mb: 1.5, fontSize: '0.75rem' }}>{t('companyManagement.contact')}</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 'medium', fontSize: '0.75rem' }}>{companies[0].phone || '-'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mb: 1.5, fontSize: '0.75rem' }}>이메일</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 'medium', fontSize: '0.75rem' }}>{companies[0].email || '-'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mb: 1.5, fontSize: '0.75rem' }}>MVS 사용 기간</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 'medium', fontSize: '0.75rem' }}>
                      {companies[0].mvs_start_date && companies[0].mvs_end_date
                        ? `${companies[0].mvs_start_date} ~ ${companies[0].mvs_end_date}`
                        : '-'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mb: 1.5, fontSize: '0.75rem' }}>웹사이트</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 'medium', fontSize: '0.75rem' }}>{companies[0].website || '-'}</Typography>
                  </Box>
                </Box>
                
                {companies[0].address && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mb: 1.5, fontSize: '0.75rem' }}>주소</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 'medium', fontSize: '0.75rem' }}>{companies[0].address}</Typography>
                  </Box>
                )}

                {/* 세금 및 등록 번호 */}
                {(companies[0].gst_numbers?.some((gst: string) => gst && gst.trim() !== '') || companies[0].msme_number || companies[0].iec_number || companies[0].pan_number) && (
                  <Box>
                    <Divider sx={{ my: 3, borderWidth: 1.5, borderColor: 'divider' }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, fontSize: '0.75rem' }}>세금 및 등록 번호</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 4 }}>
                      {companies[0].gst_numbers?.some((gst: string) => gst && gst.trim() !== '') && (
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mb: 1.5, fontSize: '0.75rem' }}>GST 번호</Typography>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {companies[0].gst_numbers.filter((gst: string) => gst && gst.trim() !== '').map((gst: string, index: number) => (
                              <Typography key={index} variant="body1" sx={{ fontWeight: 'medium', fontSize: '0.75rem' }}>{gst}</Typography>
                            ))}
                          </Box>
                        </Box>
                      )}
                      {companies[0].msme_number && (
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mb: 1.5, fontSize: '0.75rem' }}>MSME 번호</Typography>
                          <Typography variant="body1" sx={{ fontWeight: 'medium', fontSize: '0.75rem' }}>{companies[0].msme_number}</Typography>
                        </Box>
                      )}
                      {companies[0].iec_number && (
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mb: 1.5, fontSize: '0.75rem' }}>IEC 번호</Typography>
                          <Typography variant="body1" sx={{ fontWeight: 'medium', fontSize: '0.75rem' }}>{companies[0].iec_number}</Typography>
                        </Box>
                      )}
                      {companies[0].pan_number && (
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mb: 1.5, fontSize: '0.75rem' }}>PAN 번호</Typography>
                          <Typography variant="body1" sx={{ fontWeight: 'medium', fontSize: '0.75rem' }}>{companies[0].pan_number}</Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>
                )}

                {/* 은행 정보 */}
                {(companies[0].account_holder_name || companies[0].bank_name || companies[0].account_number || companies[0].ifsc_code || companies[0].swift_code || companies[0].bank_address) && (
                  <Box>
                    <Divider sx={{ my: 3, borderWidth: 1.5, borderColor: 'divider' }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, fontSize: '0.75rem' }}>은행 정보</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 4 }}>
                      {companies[0].account_holder_name && (
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mb: 1.5, fontSize: '0.75rem' }}>예금주</Typography>
                          <Typography variant="body1" sx={{ fontWeight: 'medium', fontSize: '0.75rem' }}>{companies[0].account_holder_name}</Typography>
                        </Box>
                      )}
                      {companies[0].bank_name && (
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mb: 1.5, fontSize: '0.75rem' }}>은행명</Typography>
                          <Typography variant="body1" sx={{ fontWeight: 'medium', fontSize: '0.75rem' }}>{companies[0].bank_name}</Typography>
                        </Box>
                      )}
                      {companies[0].account_number && (
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mb: 1.5, fontSize: '0.75rem' }}>계좌번호</Typography>
                          <Typography variant="body1" sx={{ fontWeight: 'medium', fontSize: '0.75rem' }}>{companies[0].account_number}</Typography>
                        </Box>
                      )}
                      {companies[0].ifsc_code && (
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mb: 1.5, fontSize: '0.75rem' }}>IFSC 코드</Typography>
                          <Typography variant="body1" sx={{ fontWeight: 'medium', fontSize: '0.75rem' }}>{companies[0].ifsc_code}</Typography>
                        </Box>
                      )}
                      {companies[0].swift_code && (
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mb: 1.5, fontSize: '0.75rem' }}>SWIFT 코드</Typography>
                          <Typography variant="body1" sx={{ fontWeight: 'medium', fontSize: '0.75rem' }}>{companies[0].swift_code}</Typography>
                        </Box>
                      )}
                      {companies[0].bank_address && (
                        <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mb: 1.5, fontSize: '0.75rem' }}>은행 주소</Typography>
                          <Typography variant="body1" sx={{ fontWeight: 'medium', fontSize: '0.75rem' }}>{companies[0].bank_address}</Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>
                )}

                {/* 로그인 기간 */}
                {(companies[0].login_period_start || companies[0].login_period_end) && (
                  <Box>
                    <Divider sx={{ my: 3, borderWidth: 1.5, borderColor: 'divider' }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, fontSize: '0.75rem' }}>로그인 기간</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 4 }}>
                      {companies[0].login_period_start && (
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mb: 1.5, fontSize: '0.75rem' }}>로그인 시작일</Typography>
                          <Typography variant="body1" sx={{ fontWeight: 'medium', fontSize: '0.75rem' }}>{companies[0].login_period_start}</Typography>
                        </Box>
                      )}
                      {companies[0].login_period_end && (
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mb: 1.5, fontSize: '0.75rem' }}>로그인 종료일</Typography>
                          <Typography variant="body1" sx={{ fontWeight: 'medium', fontSize: '0.75rem' }}>{companies[0].login_period_end}</Typography>
                        </Box>
                      )}
                      {companies[0].login_time_start && (
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mb: 1.5, fontSize: '0.75rem' }}>로그인 시작 시간</Typography>
                          <Typography variant="body1" sx={{ fontWeight: 'medium', fontSize: '0.75rem' }}>{companies[0].login_time_start}</Typography>
                        </Box>
                      )}
                      {companies[0].login_time_end && (
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mb: 1.5, fontSize: '0.75rem' }}>로그인 종료 시간</Typography>
                          <Typography variant="body1" sx={{ fontWeight: 'medium', fontSize: '0.75rem' }}>{companies[0].login_time_end}</Typography>
                        </Box>
                      )}
                      {companies[0].timezone && (
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mb: 1.5, fontSize: '0.75rem' }}>타임존</Typography>
                          <Typography variant="body1" sx={{ fontWeight: 'medium', fontSize: '0.75rem' }}>{companies[0].timezone}</Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent>
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <BusinessIcon sx={{ fontSize: 64, color: pageMutedFg, mb: 2, opacity: 0.45 }} />
                <Typography variant="h6" sx={{ mb: 1, color: pageMutedFg }}>
                  회사 정보가 없습니다
                </Typography>
                <Typography variant="body2" sx={{ color: pageMutedFg }}>
                  회사 정보를 불러올 수 없습니다.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        )
      )}

      {/* 회사 상세 다이얼로그 */}
      {renderCompanyDialog()}

      <ConfirmDialog
        open={dialogState.open}
        title={dialogState.title}
        message={dialogState.message}
        confirmText={dialogState.confirmText}
        cancelText={dialogState.cancelText}
        confirmColor={dialogState.confirmColor}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </Box>
  );
};

export default CompanyManagement;

// 모듈로 인식되도록 빈 export 추가
export {};