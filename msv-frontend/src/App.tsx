import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { theme as defaultTheme } from './theme';
import { createDynamicTheme } from './utils/themeUtils';
import { systemSettingsService } from './services/api';
import { useStore } from './store';
import { useErrorStore } from './store/errorStore';
import AppLayout from './components/Layout/AppLayout';
import Login from './pages/Auth/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import PersonalDashboard from './pages/Dashboard/PersonalDashboard';
import TeamDashboard from './pages/Dashboard/TeamDashboard';
import AdminDashboard from './pages/Dashboard/AdminDashboard';
import InventoryManagement from './pages/Inventory/InventoryManagement';
import UserManagement from './pages/Users/UserManagement';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import ErrorDialog from './components/Common/ErrorDialog';
import NotificationSnackbar from './components/Common/NotificationSnackbar';
import ErrorBoundary from './components/Common/ErrorBoundary';

// 새로 생성한 페이지 컴포넌트들
import CompanyManagement from './pages/Company/CompanyManagement';
import PartnerManagement from './pages/Partners/PartnerManagement';
import AttendanceManagement from './pages/Attendance/AttendanceManagement';
import WorkBoardsPage from './pages/Work/WorkBoardsPage';
import WorkBoardDetailPage from './pages/Work/WorkBoardDetailPage';
import EInvoiceManagement from './pages/Invoice/EInvoiceManagement';
import ProformaInvoiceManagement from './pages/Invoice/ProformaInvoiceManagement';
import QuotationManagement from './pages/Quotation/QuotationManagement';
import InventoryStatus from './pages/Inventory/InventoryStatus';
import InventoryReport from './pages/Inventory/InventoryReport';
import CostAnalysis from './pages/AI/CostAnalysis';
import EfficiencyMetrics from './pages/AI/EfficiencyMetrics';
import ForecastingData from './pages/AI/ForecastingData';
import RecommendationEngine from './pages/AI/RecommendationEngine';
import UnderDevelopment from './components/Common/UnderDevelopment';
import ComingSoon from './components/Common/ComingSoon';

// 새로 생성된 페이지들
import StockInManagement from './pages/Inventory/StockInManagement';
import StockOutManagement from './pages/Inventory/StockOutManagement';
import QuotationList from './pages/Invoice/QuotationList';
import CustomerList from './pages/Customers/CustomerList';
import OrganizationChart from './pages/Organization/OrganizationChart';
import MenuPermissionManagement from './pages/System/MenuPermissionManagement';
import EmployeeManagement from './pages/HR/EmployeeManagement';
import VacationManagement from './pages/HR/VacationManagement';
import VacationRequest from './pages/HR/VacationRequest';
import TaskManagement from './pages/Tasks/TaskManagement';
import SystemSettings from './pages/System/SystemSettings';
import LoginInfoManagement from './pages/System/LoginInfoManagement';
// import CodeManagement from './pages/System/CodeManagement'; // 시스템관리 메뉴 제거로 인해 주석 처리

// Communication 페이지들
import NoticeBoard from './pages/Communication/NoticeBoard';
import NoticeManagement from './pages/Communication/NoticeManagement';
import EmailManagement from './pages/Communication/EmailManagement';
import SMSManagement from './pages/Communication/SMSManagement';

// 새로 추가된 페이지들
import PayrollManagement from './pages/HR/PayrollManagement';
import PerformanceManagement from './pages/HR/PerformanceManagement';
import WorkStatistics from './pages/Work/WorkStatistics';
import ElectronicApproval from './pages/Work/ElectronicApproval';
import MeetingRoomBooking from './pages/Work/MeetingRoomBooking';
import RoomBookingManagement from './pages/Work/RoomBookingManagement';
import WorkReport from './pages/Work/WorkReport';
import FrontDesk from './pages/Hotel/FrontDesk';
import Housekeeping from './pages/Hotel/Housekeeping';
import Fnb from './pages/Hotel/Fnb';
import ReservationStatus from './pages/Hotel/ReservationStatus';
import RoomTypeManagement from './pages/Hotel/RoomTypeManagement';
import EInvoiceCreate from './pages/Invoice/EInvoiceCreate';
import ExpenseApproval from './pages/Accounting/ExpenseApproval';
import ExpenseTransferLog from './pages/Accounting/ExpenseTransferLog';
import BudgetManagement from './pages/Accounting/BudgetManagement';
import AssetManagement from './pages/Accounting/AssetManagement';
import AccountingStatistics from './pages/Accounting/AccountingStatistics';
import AccountingBasicInfo from './pages/Accounting/AccountingBasicInfo';
import ExpenseReceiptUpload from './pages/Accounting/ExpenseReceiptUpload';

// 고객관리 관련 페이지들
import SalesOpportunityManagement from './pages/Sales/SalesOpportunityManagement';
import ContractManagement from './pages/Sales/ContractManagement';
import CustomerSupport from './pages/Sales/CustomerSupport';
import CustomerInformation from './pages/Sales/CustomerInformation';

// Invoice 페이지들
import RegularInvoice from './pages/Invoice/RegularInvoice';
import EWayBill from './pages/Invoice/EWayBill';

const Accounting = () => {
  const { t } = useTranslation();
  return (
    <UnderDevelopment 
      pageName={t('app.accountingTitle')}
      description={t('app.accountingDesc')}
      estimatedCompletion={t('app.estimatedCompletion')}
      features={[
        t('app.accountingFeature1'),
        t('app.accountingFeature2'),
        t('app.accountingFeature3'),
        t('app.accountingFeature4'),
        t('app.accountingFeature5')
      ]}
      status="planning"
    />
  );
};

const Reports = () => {
  const { t } = useTranslation();
  return (
    <UnderDevelopment 
      pageName={t('app.reportsTitle')}
      description={t('app.reportsDesc')}
      estimatedCompletion={t('app.estimatedCompletion')}
      features={[
        t('app.reportsFeature1'),
        t('app.reportsFeature2'),
        t('app.reportsFeature3'),
        t('app.reportsFeature4'),
        t('app.reportsFeature5')
      ]}
      status="planning"
    />
  );
};


const Notifications = () => (
  <UnderDevelopment 
    pageName="알림 관리"
    description="시스템 알림 및 메시지를 관리하는 페이지입니다."
    estimatedCompletion="2024년 12월"
    features={[
      "실시간 알림",
      "이메일 알림 설정",
      "알림 히스토리",
      "알림 템플릿 관리",
      "사용자별 알림 설정"
    ]}
    status="development"
  />
);

const AIAnalytics = () => (
  <UnderDevelopment 
    pageName="AI 분석"
    description="인공지능 기반 데이터 분석 및 인사이트를 제공하는 페이지입니다."
    estimatedCompletion="2025년 2월"
    features={[
      "머신러닝 분석",
      "예측 모델링",
      "자동 인사이트 생성",
      "패턴 분석",
      "추천 시스템"
    ]}
    status="planning"
  />
);
const Chat = () => (
  <UnderDevelopment 
    pageName="채팅 시스템"
    description="실시간 채팅 및 커뮤니케이션 기능을 제공하는 페이지입니다."
    estimatedCompletion="2024년 12월"
    features={[
      "실시간 채팅",
      "파일 공유",
      "그룹 채팅",
      "채팅 히스토리",
      "알림 설정"
    ]}
    status="development"
  />
);

function App() {
  const { user } = useStore();
  const { removeOldErrors } = useErrorStore();
  const [currentTheme, setCurrentTheme] = useState(defaultTheme);

  // 주기적으로 오래된 에러 정리 (1시간마다)
  useEffect(() => {
    const interval = setInterval(() => {
      removeOldErrors();
    }, 60 * 60 * 1000); // 1시간

    return () => clearInterval(interval);
  }, [removeOldErrors]);

  // 시스템 설정의 라이트/다크 모드만 적용
  useEffect(() => {
    const loadThemeMode = async () => {
      if (!user) {
        setCurrentTheme(defaultTheme);
        return;
      }

      try {
        const response = await systemSettingsService.getSettings();
        const savedTheme = String(response?.data?.appearance?.theme || 'light');
        const normalizedTheme = savedTheme === 'ocean' ? 'forest' : savedTheme;
        const mode = ['light', 'dark', 'forest', 'sunset', 'lavender', 'graphite'].includes(normalizedTheme)
          ? (normalizedTheme as 'light' | 'dark' | 'forest' | 'sunset' | 'lavender' | 'graphite')
          : 'light';
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-app-theme', mode);
        }
        setCurrentTheme(
          createDynamicTheme({
            theme: mode
          })
        );
      } catch (error) {
        console.error('테마 모드 로드 오류:', error);
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-app-theme', 'light');
        }
        setCurrentTheme(defaultTheme);
      }
    };

    loadThemeMode();
  }, [user]);

  return (
    <ThemeProvider theme={currentTheme}>
      <CssBaseline />
      <ErrorBoundary>
        <ErrorDialog />
        <NotificationSnackbar />
        <Router>
          <Routes>
          {/* 인증 관련 라우트 */}
          <Route path="/login" element={<Login />} />
          <Route path="/expense-receipt-upload" element={<ExpenseReceiptUpload />} />
          
          {/* 메인 애플리케이션 라우트 (인증 필요) */}
          <Route path="/" element={
            <ProtectedRoute>
              <AppLayout><Outlet /></AppLayout>
            </ProtectedRoute>
          }>
                  {/* 대시보드 */}
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="dashboard/personal" element={<PersonalDashboard />} />
                  <Route path="dashboard/team" element={<TeamDashboard />} />
                  <Route path="dashboard/admin" element={<AdminDashboard />} />
                  <Route path="dashboard/stats" element={<UnderDevelopment pageName="통계 대시보드" description="시스템 전반의 통계를 보여주는 페이지입니다." estimatedCompletion="2024년 12월" features={["실시간 통계", "통계 차트", "통계 분석", "통계 내보내기", "통계 알림"]} status="development" />} />
                  <Route path="dashboard/charts" element={<UnderDevelopment pageName="차트 대시보드" description="다양한 차트로 데이터를 시각화하는 페이지입니다." estimatedCompletion="2024년 12월" features={["인터랙티브 차트", "차트 커스터마이징", "차트 내보내기", "차트 공유", "차트 분석"]} status="development" />} />
                  <Route path="dashboard/monitoring" element={<UnderDevelopment pageName="실시간 모니터링" description="시스템을 실시간으로 모니터링하는 페이지입니다." estimatedCompletion="2024년 12월" features={["실시간 모니터링", "알림 관리", "성능 지표", "모니터링 설정", "모니터링 보고서"]} status="development" />} />
            
            {/* 기본정보관리 */}
            <Route path="basic-info" element={<Navigate to="/basic-info/company" replace />} />
            <Route path="basic-info/company" element={<CompanyManagement />} />
            <Route path="basic-info/partners" element={<PartnerManagement />} />
            <Route path="basic-info/organization" element={<OrganizationChart />} />
            <Route path="basic-info/menu-permissions" element={<MenuPermissionManagement />} />
            <Route path="basic-info/login-info" element={<LoginInfoManagement />} />
            <Route path="basic-info/system-settings" element={<SystemSettings />} />
            
            {/* 인사관리 */}
            <Route path="hr" element={<Navigate to="/hr/users" replace />} />
            <Route path="hr/users" element={<UserManagement />} />
            <Route path="hr/attendance" element={<AttendanceManagement />} />
            <Route path="hr/payroll" element={<PayrollManagement />} />
            <Route path="hr/leave" element={<VacationManagement />} />
            <Route path="hr/leave/request" element={<VacationRequest />} />
            <Route path="hr/leave/request/:id" element={<VacationRequest />} />
            <Route path="hr/performance" element={<PerformanceManagement />} />
            
            {/* 업무관리 */}
            <Route path="work" element={<Navigate to="/work/projects" replace />} />
            <Route path="work/projects" element={<WorkBoardsPage />} />
            <Route path="work/projects/:boardId" element={<WorkBoardDetailPage />} />
            <Route path="work/statistics" element={<WorkStatistics />} />
            <Route path="work/approval" element={<ElectronicApproval />} />
            <Route path="work/quotation" element={<QuotationManagement />} />
            <Route path="work/meeting-room" element={<MeetingRoomBooking />} />
            <Route path="work/room-reservation" element={<RoomBookingManagement />} />
            <Route path="work/reports" element={<WorkReport />} />
            
            {/* 호텔 관리 */}
            <Route path="hotel" element={<Navigate to="/hotel/front-desk" replace />} />
            <Route path="hotel/front-desk" element={<FrontDesk />} />
            <Route path="hotel/housekeeping" element={<Housekeeping />} />
            <Route path="hotel/fnb" element={<Fnb />} />
            <Route path="hotel/reservations" element={<ReservationStatus />} />
            <Route path="hotel/room-types" element={<RoomTypeManagement />} />
            <Route path="hotel/room-reservation" element={<RoomBookingManagement />} />

            {/* 재고관리 */}
            <Route path="inventory" element={<Navigate to="/inventory/basic" replace />} />
            <Route path="inventory/basic" element={<InventoryManagement />} />
            <Route path="inventory/status" element={<InventoryStatus />} />
            <Route path="inventory/transaction" element={<StockInManagement />} />
            <Route path="inventory/movement" element={<StockOutManagement />} />
            <Route path="inventory/report" element={<InventoryReport />} />
            
            {/* 견적서 관리 */}
            <Route path="quotation" element={<QuotationManagement />} />
            <Route path="quotation/list" element={<QuotationList />} />
            <Route path="quotation/create" element={<UnderDevelopment pageName="견적서 작성" description="새로운 견적서를 작성하는 페이지입니다." estimatedCompletion="2024년 12월" features={["견적서 작성", "템플릿 사용", "자동 계산", "미리보기", "저장 및 발송"]} status="development" />} />
            <Route path="quotation/approval" element={<UnderDevelopment pageName="견적서 승인" description="견적서 승인 워크플로우를 관리하는 페이지입니다." estimatedCompletion="2024년 12월" features={["승인 워크플로우", "승인 이력", "알림 관리", "승인 통계", "자동 승인"]} status="development" />} />
            <Route path="quotation/templates" element={<UnderDevelopment pageName="견적서 템플릿" description="견적서 템플릿을 관리하는 페이지입니다." estimatedCompletion="2024년 12월" features={["템플릿 생성", "템플릿 편집", "템플릿 공유", "템플릿 분류", "템플릿 통계"]} status="development" />} />
            
            {/* 프로포마 인보이스 */}
            <Route path="proforma" element={<ProformaInvoiceManagement />} />
            <Route path="proforma/list" element={<UnderDevelopment pageName="프로포마 목록" description="생성된 프로포마 인보이스 목록을 관리하는 페이지입니다." estimatedCompletion="2024년 12월" features={["프로포마 목록 조회", "상태별 필터링", "검색 기능", "일괄 작업", "내보내기"]} status="development" />} />
            <Route path="proforma/create" element={<UnderDevelopment pageName="프로포마 작성" description="새로운 프로포마 인보이스를 작성하는 페이지입니다." estimatedCompletion="2024년 12월" features={["프로포마 작성", "견적서 연동", "자동 계산", "미리보기", "저장 및 발송"]} status="development" />} />
            <Route path="proforma/approval" element={<UnderDevelopment pageName="프로포마 승인" description="프로포마 인보이스 승인 워크플로우를 관리하는 페이지입니다." estimatedCompletion="2024년 12월" features={["승인 워크플로우", "승인 이력", "알림 관리", "승인 통계", "자동 승인"]} status="development" />} />
            <Route path="proforma/convert" element={<UnderDevelopment pageName="인보이스 변환" description="프로포마 인보이스를 정식 인보이스로 변환하는 페이지입니다." estimatedCompletion="2024년 12월" features={["인보이스 변환", "데이터 이관", "변환 이력", "변환 통계", "자동 변환"]} status="development" />} />
            
            {/* 일반 인보이스 */}
            <Route path="invoice" element={<RegularInvoice />} />
            <Route path="invoice/list" element={<UnderDevelopment pageName="인보이스 목록" description="생성된 인보이스 목록을 관리하는 페이지입니다." estimatedCompletion="2024년 12월" features={["인보이스 목록 조회", "상태별 필터링", "검색 기능", "일괄 작업", "내보내기"]} status="development" />} />
            <Route path="invoice/create" element={<UnderDevelopment pageName="인보이스 작성" description="새로운 인보이스를 작성하는 페이지입니다." estimatedCompletion="2024년 12월" features={["인보이스 작성", "템플릿 사용", "자동 계산", "미리보기", "저장 및 발송"]} status="development" />} />
            <Route path="invoice/approval" element={<UnderDevelopment pageName="인보이스 승인" description="인보이스 승인 워크플로우를 관리하는 페이지입니다." estimatedCompletion="2024년 12월" features={["승인 워크플로우", "승인 이력", "알림 관리", "승인 통계", "자동 승인"]} status="development" />} />
            <Route path="invoice/dispatch" element={<UnderDevelopment pageName="인보이스 발송" description="인보이스를 고객에게 발송하는 페이지입니다." estimatedCompletion="2024년 12월" features={["이메일 발송", "SMS 발송", "우편 발송", "발송 이력", "발송 통계"]} status="development" />} />
            
            {/* E-인보이스 - 메뉴 경로와 일치하도록 리다이렉트 */}
            <Route path="e-invoice" element={<Navigate to="/accounting/e-invoice" replace />} />
            <Route path="e-invoice/list" element={<Navigate to="/accounting/e-invoice" replace />} />
            <Route path="e-invoice/create" element={<Navigate to="/accounting/e-invoice/create" replace />} />
            <Route path="e-invoice/send" element={<Navigate to="/accounting/e-invoice" replace />} />
            <Route path="e-invoice/status" element={<Navigate to="/accounting/e-invoice" replace />} />
            
            {/* E-Way Bill */}
            <Route path="eway-bill" element={<Navigate to="/accounting/eway-bill" replace />} />
            <Route path="eway-bill/list" element={<Navigate to="/accounting/eway-bill" replace />} />
            <Route path="eway-bill/create" element={<Navigate to="/accounting/eway-bill" replace />} />
            <Route path="eway-bill/send" element={<Navigate to="/accounting/eway-bill" replace />} />
            <Route path="eway-bill/track" element={<Navigate to="/accounting/eway-bill" replace />} />
            
            {/* 고객관리 */}
            <Route path="customers" element={<Navigate to="/customers/info" replace />} />
            <Route path="customers/info" element={<CustomerInformation />} />
            <Route path="customers/sales" element={<SalesOpportunityManagement />} />
            <Route path="customers/contracts" element={<ContractManagement />} />
            <Route path="customers/support" element={<CustomerSupport />} />
            
            {/* 회계관리 */}
            <Route path="accounting" element={<Navigate to="/accounting/e-invoice" replace />} />
            <Route path="accounting/quotation" element={<QuotationManagement />} />
            <Route path="accounting/e-invoice" element={<EInvoiceManagement />} />
            <Route path="accounting/e-invoice/create" element={<EInvoiceCreate />} />
            <Route path="accounting/invoice" element={<RegularInvoice />} />
            <Route path="accounting/eway-bill" element={<EWayBill />} />
            <Route path="accounting/expense" element={<ExpenseApproval />} />
            <Route path="accounting/expense/transfer-log/:id" element={<ExpenseTransferLog />} />
            <Route path="accounting/budget" element={<BudgetManagement />} />
            <Route path="accounting/assets" element={<AssetManagement />} />
            <Route path="accounting/statistics" element={<AccountingStatistics />} />
            <Route path="accounting/basic-info" element={<AccountingBasicInfo />} />
            
            {/* 보고서 */}
            <Route path="reports" element={<Reports />} />
            <Route path="reports/sales" element={<UnderDevelopment pageName="매출 보고서" description="매출 관련 보고서를 생성하는 페이지입니다." estimatedCompletion="2025년 1월" features={["매출 분석", "매출 추이", "고객별 매출", "상품별 매출", "매출 예측"]} status="planning" />} />
            <Route path="reports/inventory" element={<InventoryReport />} />
            <Route path="reports/customers" element={<UnderDevelopment pageName="고객 보고서" description="고객 관련 보고서를 생성하는 페이지입니다." estimatedCompletion="2025년 1월" features={["고객 분석", "고객 분류", "고객 행동 분석", "고객 예측", "고객 최적화"]} status="planning" />} />
            <Route path="reports/financial" element={<UnderDevelopment pageName="재무 보고서" description="재무 관련 보고서를 생성하는 페이지입니다." estimatedCompletion="2025년 1월" features={["재무 분석", "수익성 분석", "현금흐름 분석", "재무 예측", "재무 최적화"]} status="planning" />} />
            <Route path="reports/ai" element={<UnderDevelopment pageName="AI 분석 보고서" description="AI 기반 분석 보고서를 생성하는 페이지입니다." estimatedCompletion="2025년 2월" features={["AI 분석", "예측 모델링", "패턴 분석", "자동 인사이트", "추천 시스템"]} status="planning" />} />
            
            {/* 사용자 관리 */}
            <Route path="users" element={<UserManagement />} />
            <Route path="users/list" element={<UnderDevelopment pageName="사용자 목록" description="등록된 사용자 목록을 관리하는 페이지입니다." estimatedCompletion="2024년 12월" features={["사용자 목록 조회", "검색 및 필터링", "사용자 상태 관리", "일괄 작업", "내보내기"]} status="development" />} />
            <Route path="users/register" element={<UnderDevelopment pageName="사용자 등록" description="새로운 사용자를 등록하는 페이지입니다." estimatedCompletion="2024년 12월" features={["사용자 정보 등록", "권한 설정", "역할 할당", "계정 활성화", "자동 중복 검사"]} status="development" />} />
            <Route path="users/permissions" element={<UnderDevelopment pageName="권한 관리" description="사용자 권한을 관리하는 페이지입니다." estimatedCompletion="2024년 12월" features={["권한 그룹 관리", "권한 설정", "권한 할당", "권한 이력", "권한 통계"]} status="development" />} />
            <Route path="users/roles" element={<UnderDevelopment pageName="역할 관리" description="사용자 역할을 관리하는 페이지입니다." estimatedCompletion="2024년 12월" features={["역할 생성", "역할 편집", "역할 할당", "역할 이력", "역할 통계"]} status="development" />} />
            
            {/* 시스템 설정 */}
            <Route path="settings" element={<SystemSettings />} />
            <Route path="settings/general" element={<UnderDevelopment pageName="일반 설정" description="시스템의 일반적인 설정을 관리하는 페이지입니다." estimatedCompletion="2024년 12월" features={["기본 설정", "언어 설정", "시간대 설정", "테마 설정", "알림 설정"]} status="development" />} />
            <Route path="settings/company" element={<UnderDevelopment pageName="회사 정보" description="회사 정보를 관리하는 페이지입니다." estimatedCompletion="2024년 12월" features={["회사 기본 정보", "회사 로고", "회사 주소", "연락처 정보", "회사 설정"]} status="development" />} />
            <Route path="settings/gst" element={<UnderDevelopment pageName="GST 설정" description="GST 관련 설정을 관리하는 페이지입니다." estimatedCompletion="2024년 12월" features={["GST 설정", "세율 설정", "GST 포털 연동", "GST 보고서", "GST 검증"]} status="development" />} />
            <Route path="settings/security" element={<UnderDevelopment pageName="보안 설정" description="시스템 보안 설정을 관리하는 페이지입니다." estimatedCompletion="2024년 12월" features={["보안 정책", "암호 정책", "접근 제어", "보안 로그", "보안 알림"]} status="development" />} />
            <Route path="settings/integration" element={<UnderDevelopment pageName="통합 설정" description="외부 시스템과의 통합 설정을 관리하는 페이지입니다." estimatedCompletion="2024년 12월" features={["API 설정", "웹훅 설정", "데이터 동기화", "통합 테스트", "통합 모니터링"]} status="development" />} />
            
            {/* 알림 */}
            <Route path="notifications" element={<Notifications />} />
            
            {/* AI 분석 */}
            <Route path="ai" element={<Navigate to="/ai/cost-analysis" replace />} />
            <Route path="ai/cost-analysis" element={<CostAnalysis />} />
            <Route path="ai/efficiency-metrics" element={<EfficiencyMetrics />} />
            <Route path="ai/forecasting-data" element={<ForecastingData />} />
            <Route path="ai/recommendation-engine" element={<RecommendationEngine />} />
            
            {/* 커뮤니케이션 */}
            <Route path="communication" element={<Navigate to="/communication/notice" replace />} />
            <Route path="communication/notice" element={<NoticeManagement />} />
            <Route path="communication/email" element={<EmailManagement />} />
            <Route path="communication/sms" element={<SMSManagement />} />
            
            {/* 시스템관리 - 제거됨 (기본정보관리의 시스템 설정으로 대체) */}
            
            {/* AI 분석 단축 경로 */}
            <Route path="efficiency" element={<EfficiencyMetrics />} />
            <Route path="cost-analysis" element={<CostAnalysis />} />
            <Route path="forecasting" element={<ForecastingData />} />
            <Route path="recommendations" element={<RecommendationEngine />} />
            
            {/* 채팅 */}
            <Route path="chat" element={<Chat />} />
          </Route>
          
          {/* 404 페이지 - 준비중 표시 */}
          <Route path="*" element={<ComingSoon pageName="페이지" description="요청하신 페이지는 현재 준비 중입니다." />} />
        </Routes>
        </Router>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;