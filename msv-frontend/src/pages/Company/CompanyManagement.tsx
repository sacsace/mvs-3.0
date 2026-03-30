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
  InputAdornment,
  CircularProgress
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
  const { user } = useStore();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
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

      try {
        setLoading(true);
        setError('');
        
        // root 사용자는 모든 회사 목록, 일반 사용자는 본인 회사만
        if (user.role === 'root') {
          // root 사용자: 모든 회사 목록 조회
          console.log('🔍 [회사 정보 관리] Root 사용자 - 회사 목록 조회 시작');
          const response = await api.get('/company');
          console.log('🔍 [회사 정보 관리] API 응답:', {
            status: response.status,
            success: response.data?.success,
            dataType: Array.isArray(response.data?.data) ? 'array' : typeof response.data?.data,
            dataLength: Array.isArray(response.data?.data) ? response.data.data.length : (response.data?.data ? 1 : 0),
            fullResponse: response.data
          });
          
          if (response.data && response.data.success) {
            const companiesData = Array.isArray(response.data.data) ? response.data.data : (response.data.data ? [response.data.data] : []);
            console.log('🔍 [회사 정보 관리] 변환 전 데이터:', companiesData);
            
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
            
            console.log('🔍 [회사 정보 관리] 변환 후 데이터:', transformedCompanies);
            console.log('🔍 [회사 정보 관리] 설정할 회사 개수:', transformedCompanies.length);
            setCompanies(transformedCompanies);
          } else {
            console.error('❌ [회사 정보 관리] API 응답 실패:', response.data);
            setError(response.data?.message || '회사 목록을 불러오는데 실패했습니다.');
            setCompanies([]);
          }
        } else {
          // 일반 사용자: 본인 회사 정보만 조회
          if (user.company_id) {
            console.log('🔍 [회사 정보 관리] 일반 사용자 - 회사 정보 조회 시작, company_id:', user.company_id);
            const response = await api.get(`/company/${user.company_id}`);
            console.log('🔍 [회사 정보 관리] API 응답:', {
              status: response.status,
              success: response.data?.success,
              hasData: !!response.data?.data,
              fullResponse: response.data
            });
            
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
              console.log('🔍 [회사 정보 관리] 변환 후 데이터:', transformedCompany);
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
        console.log('🔍 [회사 정보 관리] 로딩 완료, companies.length:', companies.length);
      }
    };

    fetchCompanies();
  }, [user?.role, user?.company_id, user?.id]);

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
    console.log('🔍 handleEdit - 회사 데이터:', {
      id: company.id,
      name: company.name,
      gst_numbers: company.gst_numbers,
      gst_numbers_type: typeof company.gst_numbers,
      gst_numbers_length: company.gst_numbers?.length,
      gst_numbers_isArray: Array.isArray(company.gst_numbers)
    });
    
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
    
    console.log('🔍 handleEdit - 처리된 GST 번호:', {
      original: company.gst_numbers,
      processed: gstNumbers,
      final: gstNumbers.length > 0 ? gstNumbers : ['']
    });
    
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
    console.log('🔍 handleView - 회사 데이터:', {
      id: company.id,
      name: company.name,
      gst_numbers: company.gst_numbers,
      gst_numbers_type: typeof company.gst_numbers,
      gst_numbers_length: company.gst_numbers?.length,
      gst_numbers_isArray: Array.isArray(company.gst_numbers)
    });
    
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
    
    console.log('🔍 handleView - 처리된 GST 번호:', {
      original: company.gst_numbers,
      processed: gstNumbers,
      final: gstNumbers.length > 0 ? gstNumbers : ['']
    });
    
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
    console.log('=== 회사 저장 시작 ===');
    console.log('Dialog Mode:', dialogMode);
    console.log('Form Data:', formData);
    
    setLoading(true);
    setError('');
    setSuccess('');

    // 필수 항목 검증 (NOT NULL 제약조건이 있는 필드)
    // address와 phone은 DB에서 NOT NULL이므로 추가/수정 모두에서 필수
    if (!formData.address || formData.address.trim() === '') {
      console.log('❌ 주소 검증 실패: 주소가 없음');
      setError('주소는 필수 입력 항목입니다.');
      setLoading(false);
      return;
    }

    if (!formData.phone || formData.phone.trim() === '') {
      console.log('❌ 전화번호 검증 실패: 전화번호가 없음');
      setError('전화번호는 필수 입력 항목입니다.');
      setLoading(false);
      return;
    }

    // 필수 항목 검증 (새 회사 추가 시에만)
    if (dialogMode === 'add') {
      // 회사명 검증
      if (!formData.name || formData.name.trim() === '') {
        console.log('❌ 회사명 검증 실패: 회사명이 없음');
        setError('회사명은 필수 입력 항목입니다.');
        setLoading(false);
        return;
      }

      // 사업자등록번호 검증
      if (!formData.business_number || formData.business_number.trim() === '') {
        console.log('❌ 사업자등록번호 검증 실패: 사업자등록번호가 없음');
        setError('사업자등록번호는 필수 입력 항목입니다.');
        setLoading(false);
        return;
      }

      // GST 번호 필수 검증 (최소 1개 이상 입력되어야 함)
      const validGstNumbers = (formData.gst_numbers || []).filter((gst: string) => gst && gst.trim() !== '');
      if (validGstNumbers.length === 0) {
        console.log('❌ GST 번호 검증 실패: GST 번호가 없음');
        setError('GST 번호는 필수 입력 항목입니다. 최소 1개 이상 입력해주세요.');
        setLoading(false);
        return;
      }

      // PAN 번호 필수 검증
      if (!formData.pan_number || formData.pan_number.trim() === '') {
        console.log('❌ PAN 번호 검증 실패: PAN 번호가 없음');
        setError('PAN 번호는 필수 입력 항목입니다.');
        setLoading(false);
        return;
      }
    }

    try {
      if (dialogMode === 'add') {
        console.log('📝 회사 등록 모드');
        // 회사 등록 시 MVS 시스템 사용 가능하도록 설정
        const companyData = {
          ...formData,
          subscription_status: 'active',
          status: 'active' // 백엔드에서 사용하는 status 필드
        };
        console.log('📤 회사 등록 요청 데이터:', {
          ...companyData,
          company_logo: companyData.company_logo ? `Base64(${companyData.company_logo.length} chars)` : null,
          company_seal: companyData.company_seal ? `Base64(${companyData.company_seal.length} chars)` : null,
          ceo_signature: companyData.ceo_signature ? `Base64(${companyData.ceo_signature.length} chars)` : null
        });
        
        const response = await api.post('/company', companyData);
        console.log('📥 회사 등록 응답:', response.data);
        if (response.data.success) {
          console.log('✅ 회사 등록 성공');
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
        
        console.log('수정 요청 데이터:', updateData);
        const response = await api.put(`/company/${selectedCompany.id}`, updateData);
        console.log('수정 응답:', response.data);
        if (response.data.success) {
          console.log('✅ 회사 정보 수정 성공');
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

  // 필터링된 회사 목록 - MVS 시스템을 사용할 수 있는 회사들 (활성 상태)
  const filteredCompanies = companies.filter(company => {
    const matchesSearch = company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          company.business_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          company.ceo_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (company.industry && company.industry.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesPlan = planFilter === 'all' || company.subscription_plan === planFilter;
    // MVS 시스템을 사용할 수 있는 회사만 표시 (활성 상태)
    const isActive = company.subscription_status === 'active';
    return matchesSearch && matchesPlan && isActive;
  });

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

  // 플랜 칩 생성
  const getPlanChip = (plan: string) => {
    const planConfig = {
      basic: { labelKey: 'companyManagement.planBasic' as const, color: 'default' as const },
      standard: { labelKey: 'companyManagement.planStandard' as const, color: 'info' as const },
      premium: { labelKey: 'companyManagement.planPremium' as const, color: 'warning' as const },
      enterprise: { labelKey: 'companyManagement.planEnterprise' as const, color: 'success' as const }
    };
    const config = planConfig[plan as keyof typeof planConfig];
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
                  
                  console.log('🔍 GST 번호 렌더링:', {
                    formData_gst_numbers: formData.gst_numbers,
                    gstNumbersToShow: gstNumbersToShow,
                    dialogMode: dialogMode
                  });
                  
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
          <Button 
            onClick={() => {
              setDialogMode('edit');
            }} 
            variant="contained" 
            color="primary"
            sx={{ borderRadius: 2 }}
          >
            수정
          </Button>
        )}
        {dialogMode !== 'view' && (
          <Button 
            onClick={handleSave} 
            variant="contained" 
            disabled={loading}
            sx={{ borderRadius: 2 }}
          >
            {loading ? t('companyManagement.saving') : t('companyManagement.save')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );

  return (
    <Box sx={{ 
      p: 3, 
      backgroundColor: 'workArea.main',
      borderRadius: 2,
      minHeight: '100%'
    }}>
      {/* 헤더 */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 3 
      }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <BusinessIcon sx={{ fontSize: '16px !important', color: 'primary.main' }} />
            <Typography component="h1" sx={{
              fontSize: '16px !important',
              fontWeight: 600,
              color: 'text.primary',
              lineHeight: 1.5
            }}>
              {t('companyManagement.pageTitle')}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
            {t('companyManagement.description')}
          </Typography>
        </Box>
        {user?.role === 'root' && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAdd}
            sx={{ borderRadius: 2 }}
          >
            {t('companyManagement.addCompany')}
          </Button>
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

      {/* 통계 카드 및 검색 필터 - root 사용자만 표시 */}
      {user?.role === 'root' && (
        <>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
            gap: 2, 
            mb: 3 
          }}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  {t('companyManagement.mvsUsageCompanies')}
                </Typography>
                <Typography variant="h4" color="primary.main">
                  {filteredCompanies.length}
                </Typography>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  {t('companyManagement.totalCompanies')}
                </Typography>
                <Typography variant="h4" color="text.primary">
                  {companies.length}
                </Typography>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  {t('companyManagement.basicPlan')}
                </Typography>
                <Typography variant="h4" color="info.main">
                  {companies.filter(c => c.subscription_plan === 'basic' && c.subscription_status === 'active').length}
                </Typography>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  {t('companyManagement.premiumPlan')}
                </Typography>
                <Typography variant="h4" color="warning.main">
                  {companies.filter(c => c.subscription_plan === 'premium' && c.subscription_status === 'active').length}
                </Typography>
              </CardContent>
            </Card>
          </Box>

          {/* 검색 및 필터 */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <TextField
                  placeholder={t('companyManagement.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  variant="outlined"
                  size="small"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ fontSize: '1.1rem' }} />
                      </InputAdornment>
                    )
                  }}
                  sx={{ minWidth: 300 }}
                />
                <FormControl sx={{ minWidth: 120 }} variant="outlined" size="small">
                  <InputLabel sx={{ fontSize: '0.875rem' }}>{t('companyManagement.subscriptionPlan')}</InputLabel>
                  <Select
                    variant="outlined"
                    value={planFilter}
                    onChange={(e) => setPlanFilter(e.target.value)}
                    label={t('companyManagement.subscriptionPlan')}
                    sx={{ fontSize: '0.875rem' }}
                  >
                    <MenuItem value="all" sx={{ fontSize: '0.875rem' }}>{t('companyManagement.allPlans')}</MenuItem>
                    <MenuItem value="basic" sx={{ fontSize: '0.875rem' }}>{t('companyManagement.planBasic')}</MenuItem>
                    <MenuItem value="standard" sx={{ fontSize: '0.875rem' }}>{t('companyManagement.planStandard')}</MenuItem>
                    <MenuItem value="premium" sx={{ fontSize: '0.875rem' }}>{t('companyManagement.planPremium')}</MenuItem>
                    <MenuItem value="enterprise" sx={{ fontSize: '0.875rem' }}>{t('companyManagement.planEnterprise')}</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </CardContent>
          </Card>
        </>
      )}

      {/* 회사 목록 - root 사용자는 리스트, 일반 사용자는 본인 회사만 view */}
      {loading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', p: 8 }}>
          <CircularProgress sx={{ mb: 2 }} />
          <Typography color="text.secondary">{t('companyManagement.loadingMessage')}</Typography>
        </Box>
      ) : user?.role === 'root' ? (
        // root 사용자: 회사 리스트 표시
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BusinessIcon color="primary" />
                {t('companyManagement.companyListTitle', { count: filteredCompanies.length })}
              </Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<AddIcon />}
                onClick={handleAdd}
                sx={{ borderRadius: 2 }}
              >
                {t('companyManagement.addCompany')}
              </Button>
            </Box>
            {filteredCompanies.length > 0 ? (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'grey.50' }}>
                      <TableCell sx={{ fontWeight: 'bold', color: 'text.primary' }}>{t('companyManagement.companyInfo')}</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: 'text.primary' }}>{t('companyManagement.representative')}</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: 'text.primary' }}>{t('companyManagement.industry')}</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: 'text.primary' }}>{t('companyManagement.employeeCount')}</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: 'text.primary' }}>{t('companyManagement.subscriptionPlan')}</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: 'text.primary' }}>{t('companyManagement.mvsUsagePeriod')}</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', textAlign: 'center', color: 'text.primary' }}>{t('companyManagement.actions')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredCompanies.map((company) => (
                      <TableRow 
                        key={company.id} 
                        hover 
                        onClick={() => handleView(company)}
                        sx={{ cursor: 'pointer' }}
                      >
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
                                {t('companyManagement.businessNumberLabel')}: {company.business_number}
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
                            {company.industry || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <PeopleIcon sx={{ mr: 1, fontSize: '1rem', color: 'text.secondary' }} />
                            <Typography variant="body2">
                              {t('companyManagement.employeesCount', { count: company.employee_count })}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          {getPlanChip(company.subscription_plan)}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {company.mvs_start_date && company.mvs_end_date
                              ? `${company.mvs_start_date} ~ ${company.mvs_end_date}`
                              : '-'}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                            <IconButton 
                              size="small" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(company.id);
                              }} 
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <BusinessIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2, opacity: 0.3 }} />
                <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                  {t('companyManagement.noCompaniesTitle')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {searchTerm || planFilter !== 'all'
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
          <Card>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '0.75rem', fontWeight: 600 }}>
                  <BusinessIcon color="primary" />
                  {t('companyManagement.companyInfo')}
                </Typography>
                {(user?.role === 'admin' || user?.role === 'root') && (
                  <Button
                    variant="outlined"
                    startIcon={<EditIcon />}
                    onClick={() => handleEdit(companies[0])}
                    sx={{ borderRadius: 2, fontSize: '0.75rem' }}
                  >
                    수정
                  </Button>
                )}
              </Box>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  {companies[0].company_logo ? (
                    <Avatar 
                      src={companies[0].company_logo} 
                      sx={{ bgcolor: 'primary.main', width: 100, height: 100, fontSize: '2.5rem' }}
                    >
                      {companies[0].name.charAt(0)}
                    </Avatar>
                  ) : (
                    <Avatar sx={{ bgcolor: 'primary.main', width: 100, height: 100, fontSize: '2.5rem' }}>
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
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mb: 1.5, fontSize: '0.75rem' }}>구독 플랜</Typography>
                    {getPlanChip(companies[0].subscription_plan)}
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
                <BusinessIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2, opacity: 0.3 }} />
                <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                  회사 정보가 없습니다
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  회사 정보를 불러올 수 없습니다.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        )
      )}

      {/* 회사 상세 다이얼로그 */}
      {renderCompanyDialog()}
    </Box>
  );
};

export default CompanyManagement;

// 모듈로 인식되도록 빈 export 추가
export {};