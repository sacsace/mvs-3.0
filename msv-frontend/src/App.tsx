import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { theme } from './theme';
import AppLayout from './components/Layout/AppLayout';
import Login from './pages/Auth/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import PersonalDashboard from './pages/Dashboard/PersonalDashboard';
import TeamDashboard from './pages/Dashboard/TeamDashboard';
import AdminDashboard from './pages/Dashboard/AdminDashboard';
import InventoryManagement from './pages/Inventory/InventoryManagement';
import UserManagement from './pages/Users/UserManagement';
import ProtectedRoute from './components/Auth/ProtectedRoute';

// 새로 생성한 페이지 컴포넌트들
import CompanyManagement from './pages/Company/CompanyManagement';
import PartnerManagement from './pages/Partners/PartnerManagement';
import AttendanceManagement from './pages/Attendance/AttendanceManagement';
import ProjectManagement from './pages/Projects/ProjectManagement';
import EInvoiceManagement from './pages/Invoice/EInvoiceManagement';
import ProformaInvoiceManagement from './pages/Invoice/ProformaInvoiceManagement';
import QuotationManagement from './pages/Invoice/QuotationManagement';
import EWayBillManagement from './pages/Invoice/EWayBillManagement';
import InventoryStatus from './pages/Inventory/InventoryStatus';
import CostAnalysis from './pages/AI/CostAnalysis';
import EfficiencyMetrics from './pages/AI/EfficiencyMetrics';
import ForecastingData from './pages/AI/ForecastingData';
import RecommendationEngine from './pages/AI/RecommendationEngine';
import UnderDevelopment from './components/Common/UnderDevelopment';

// 새로 생성된 페이지들
import StockInManagement from './pages/Inventory/StockInManagement';
import StockOutManagement from './pages/Inventory/StockOutManagement';
import QuotationList from './pages/Invoice/QuotationList';
import CustomerList from './pages/Customers/CustomerList';
import OrganizationChart from './pages/Organization/OrganizationChart';
import MenuPermissionManagement from './pages/System/MenuPermissionManagement';
import EmployeeManagement from './pages/HR/EmployeeManagement';
import VacationManagement from './pages/HR/VacationManagement';
import TaskManagement from './pages/Tasks/TaskManagement';
import SystemSettings from './pages/System/SystemSettings';

// 개발중 페이지 컴포넌트들
const ProformaInvoice = () => (
  <UnderDevelopment 
    pageName="프로포마 인보이스 관리"
    description="견적서에서 생성된 프로포마 인보이스를 관리하는 페이지입니다."
    estimatedCompletion="2024년 12월"
    features={[
      "프로포마 인보이스 생성 및 관리",
      "견적서 연동 자동화",
      "고객 승인 워크플로우",
      "E-Invoice 자동 생성",
      "상태 추적 및 알림"
    ]}
    status="development"
  />
);

const RegularInvoice = () => (
  <UnderDevelopment 
    pageName="일반 인보이스 관리"
    description="기본 인보이스 생성 및 관리 기능을 제공하는 페이지입니다."
    estimatedCompletion="2024년 12월"
    features={[
      "인보이스 생성 및 편집",
      "고객 정보 관리",
      "상품/서비스 항목 관리",
      "세금 계산 자동화",
      "인쇄 및 PDF 생성"
    ]}
    status="development"
  />
);

const EInvoice = () => (
  <UnderDevelopment 
    pageName="E-인보이스 관리"
    description="전자 인보이스 생성 및 관리 기능을 제공하는 페이지입니다."
    estimatedCompletion="2024년 12월"
    features={[
      "전자 인보이스 생성",
      "디지털 서명 기능",
      "전자 문서 관리",
      "법적 요구사항 준수",
      "자동 전송 및 알림"
    ]}
    status="development"
  />
);

const EWayBill = () => (
  <UnderDevelopment 
    pageName="E-Way Bill 관리"
    description="전자 운송장 생성 및 관리 기능을 제공하는 페이지입니다."
    estimatedCompletion="2024년 12월"
    features={[
      "E-Way Bill 생성",
      "운송 정보 관리",
      "QR 코드 생성",
      "실시간 추적",
      "상태 모니터링"
    ]}
    status="development"
  />
);

const CustomerManagement = () => (
  <UnderDevelopment 
    pageName="고객 관리"
    description="고객 정보를 체계적으로 관리하는 페이지입니다."
    estimatedCompletion="2024년 12월"
    features={[
      "고객 정보 등록 및 수정",
      "고객 분류 및 태그 관리",
      "거래 이력 추적",
      "고객별 통계 및 분석",
      "고객 지원 시스템"
    ]}
    status="development"
  />
);
const Accounting = () => (
  <UnderDevelopment 
    pageName="회계 관리"
    description="종합적인 회계 및 재무 관리 기능을 제공하는 페이지입니다."
    estimatedCompletion="2025년 1월"
    features={[
      "차변/대변 관리",
      "계정과목 설정",
      "재무제표 생성",
      "세무 신고 지원",
      "예산 관리"
    ]}
    status="planning"
  />
);

const Reports = () => (
  <UnderDevelopment 
    pageName="보고서 관리"
    description="다양한 비즈니스 보고서를 생성하고 관리하는 페이지입니다."
    estimatedCompletion="2025년 1월"
    features={[
      "사용자 정의 보고서",
      "실시간 데이터 시각화",
      "자동 보고서 생성",
      "PDF/Excel 내보내기",
      "스케줄링 기능"
    ]}
    status="planning"
  />
);


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
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          {/* 인증 관련 라우트 */}
          <Route path="/login" element={<Login />} />
          
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
            <Route path="company" element={<CompanyManagement />} />
            <Route path="partners" element={<PartnerManagement />} />
            <Route path="organization" element={<OrganizationChart />} />
            <Route path="permissions" element={<MenuPermissionManagement />} />
            
            {/* 인사관리 */}
            <Route path="attendance" element={<AttendanceManagement />} />
            <Route path="employees" element={<EmployeeManagement />} />
            <Route path="payroll" element={<UnderDevelopment pageName="급여 관리" description="직원 급여를 체계적으로 관리하는 페이지입니다." estimatedCompletion="2025년 1월" features={["급여 계산", "세금 계산", "급여 지급", "급여 이력", "급여 통계"]} status="planning" />} />
            <Route path="leave" element={<VacationManagement />} />
            <Route path="performance" element={<UnderDevelopment pageName="성과 관리" description="직원 성과를 평가하고 관리하는 페이지입니다." estimatedCompletion="2025년 1월" features={["성과 평가", "목표 설정", "피드백 관리", "성과 분석", "보상 관리"]} status="planning" />} />
            
            {/* 업무관리 */}
            <Route path="projects" element={<ProjectManagement />} />
            <Route path="tasks" element={<TaskManagement />} />
            <Route path="work-stats" element={<UnderDevelopment pageName="업무 통계" description="업무 효율성과 생산성을 분석하는 페이지입니다." estimatedCompletion="2024년 12월" features={["업무 시간 분석", "생산성 지표", "팀 성과 분석", "업무 패턴 분석", "효율성 개선 제안"]} status="development" />} />
            <Route path="approval" element={<UnderDevelopment pageName="전자결재" description="문서 결재 워크플로우를 관리하는 페이지입니다." estimatedCompletion="2024년 12월" features={["결재 워크플로우", "문서 승인", "결재 이력", "알림 관리", "결재 통계"]} status="development" />} />
            <Route path="meeting" element={<UnderDevelopment pageName="회의실 예약" description="회의실 예약 및 관리를 위한 페이지입니다." estimatedCompletion="2024년 12월" features={["회의실 예약", "일정 관리", "회의실 상태", "예약 이력", "회의실 통계"]} status="development" />} />
            <Route path="room-booking" element={<UnderDevelopment pageName="객실 예약 관리" description="객실 예약 및 시설 관리를 위한 페이지입니다." estimatedCompletion="2024년 12월" features={["객실 예약", "시설 관리", "예약 승인", "예약 이력", "시설 통계"]} status="development" />} />
            
            {/* 재고 관리 */}
            <Route path="inventory" element={<InventoryManagement />} />
            <Route path="inventory/status" element={<InventoryStatus />} />
            <Route path="inventory/stock-in" element={<StockInManagement />} />
            <Route path="inventory/stock-out" element={<StockOutManagement />} />
            <Route path="inventory/initial" element={<Navigate to="/inventory" replace />} />
            <Route path="inventory/adjustment" element={<UnderDevelopment pageName="재고 조정" description="재고 수량을 조정하고 관리하는 페이지입니다." estimatedCompletion="2024년 12월" features={["재고 조정", "조정 사유 관리", "조정 승인", "조정 이력", "조정 통계"]} status="development" />} />
            <Route path="inventory/history" element={<UnderDevelopment pageName="재고 이력" description="재고 변동 이력을 추적하는 페이지입니다." estimatedCompletion="2024년 12월" features={["재고 변동 이력", "입출고 추적", "재고 회전율", "이력 분석", "보고서 생성"]} status="development" />} />
            
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
            
            {/* E-인보이스 */}
            <Route path="e-invoice" element={<EInvoiceManagement />} />
            <Route path="e-invoice/list" element={<UnderDevelopment pageName="E-인보이스 목록" description="생성된 E-인보이스 목록을 관리하는 페이지입니다." estimatedCompletion="2024년 12월" features={["E-인보이스 목록 조회", "상태별 필터링", "GST 규정 준수", "일괄 작업", "내보내기"]} status="development" />} />
            <Route path="e-invoice/create" element={<UnderDevelopment pageName="E-인보이스 생성" description="새로운 E-인보이스를 생성하는 페이지입니다." estimatedCompletion="2024년 12월" features={["E-인보이스 생성", "GST 규정 준수", "IRN 생성", "QR 코드 생성", "자동 전송"]} status="development" />} />
            <Route path="e-invoice/send" element={<UnderDevelopment pageName="E-인보이스 전송" description="E-인보이스를 GST 포털에 전송하는 페이지입니다." estimatedCompletion="2024년 12월" features={["GST 포털 전송", "전송 상태 추적", "전송 이력", "전송 통계", "자동 재전송"]} status="development" />} />
            <Route path="e-invoice/status" element={<UnderDevelopment pageName="E-인보이스 상태" description="E-인보이스 상태를 모니터링하는 페이지입니다." estimatedCompletion="2024년 12월" features={["실시간 상태 모니터링", "상태 이력", "알림 관리", "상태 통계", "자동 업데이트"]} status="development" />} />
            
            {/* E-Way Bill */}
            <Route path="eway-bill" element={<EWayBillManagement />} />
            <Route path="eway-bill/list" element={<UnderDevelopment pageName="E-Way Bill 목록" description="생성된 E-Way Bill 목록을 관리하는 페이지입니다." estimatedCompletion="2024년 12월" features={["E-Way Bill 목록 조회", "상태별 필터링", "운송 정보", "일괄 작업", "내보내기"]} status="development" />} />
            <Route path="eway-bill/create" element={<UnderDevelopment pageName="E-Way Bill 생성" description="새로운 E-Way Bill을 생성하는 페이지입니다." estimatedCompletion="2024년 12월" features={["E-Way Bill 생성", "운송 정보 입력", "QR 코드 생성", "자동 생성", "검증"]} status="development" />} />
            <Route path="eway-bill/send" element={<UnderDevelopment pageName="E-Way Bill 전송" description="E-Way Bill을 GST 포털에 전송하는 페이지입니다." estimatedCompletion="2024년 12월" features={["GST 포털 전송", "전송 상태 추적", "전송 이력", "전송 통계", "자동 재전송"]} status="development" />} />
            <Route path="eway-bill/track" element={<UnderDevelopment pageName="E-Way Bill 추적" description="E-Way Bill 운송 상태를 추적하는 페이지입니다." estimatedCompletion="2024년 12월" features={["실시간 추적", "위치 정보", "상태 업데이트", "알림 관리", "추적 통계"]} status="development" />} />
            
            {/* 고객 관리 */}
            <Route path="customers" element={<CustomerManagement />} />
            <Route path="customers/list" element={<CustomerList />} />
            <Route path="customers/register" element={<UnderDevelopment pageName="고객 등록" description="새로운 고객을 등록하는 페이지입니다." estimatedCompletion="2024년 12월" features={["고객 정보 등록", "고객 분류", "연락처 관리", "거래 이력", "자동 중복 검사"]} status="development" />} />
            <Route path="customers/details" element={<UnderDevelopment pageName="고객 상세" description="고객의 상세 정보를 보여주는 페이지입니다." estimatedCompletion="2024년 12월" features={["고객 상세 정보", "거래 이력", "연락처 이력", "고객 통계", "관련 문서"]} status="development" />} />
            <Route path="customers/stats" element={<UnderDevelopment pageName="고객 통계" description="고객 관련 통계를 분석하는 페이지입니다." estimatedCompletion="2024년 12월" features={["고객 분석", "거래 패턴", "고객 분류", "통계 차트", "보고서 생성"]} status="development" />} />
            
            {/* 회계 관리 */}
            <Route path="accounting" element={<Accounting />} />
            <Route path="accounting/income" element={<UnderDevelopment pageName="수입 관리" description="회사 수입을 체계적으로 관리하는 페이지입니다." estimatedCompletion="2025년 1월" features={["수입 등록", "수입 분류", "세금 계산", "수입 분석", "수입 보고서"]} status="planning" />} />
            <Route path="accounting/expense" element={<UnderDevelopment pageName="지출 관리" description="회사 지출을 체계적으로 관리하는 페이지입니다." estimatedCompletion="2025년 1월" features={["지출 등록", "지출 분류", "세금 계산", "지출 분석", "지출 보고서"]} status="planning" />} />
            <Route path="accounting/assets" element={<UnderDevelopment pageName="자산 관리" description="회사 자산을 체계적으로 관리하는 페이지입니다." estimatedCompletion="2025년 1월" features={["자산 등록", "자산 분류", "감가상각", "자산 평가", "자산 보고서"]} status="planning" />} />
            <Route path="accounting/budget" element={<UnderDevelopment pageName="예산 관리" description="회사 예산을 계획하고 관리하는 페이지입니다." estimatedCompletion="2025년 1월" features={["예산 계획", "예산 분배", "예산 실행", "예산 분석", "예산 보고서"]} status="planning" />} />
            <Route path="accounting/reports" element={<UnderDevelopment pageName="재무 보고서" description="재무 관련 보고서를 생성하는 페이지입니다." estimatedCompletion="2025년 1월" features={["손익계산서", "대차대조표", "현금흐름표", "재무 분석", "보고서 내보내기"]} status="planning" />} />
            
            {/* 보고서 */}
            <Route path="reports" element={<Reports />} />
            <Route path="reports/sales" element={<UnderDevelopment pageName="매출 보고서" description="매출 관련 보고서를 생성하는 페이지입니다." estimatedCompletion="2025년 1월" features={["매출 분석", "매출 추이", "고객별 매출", "상품별 매출", "매출 예측"]} status="planning" />} />
            <Route path="reports/inventory" element={<UnderDevelopment pageName="재고 보고서" description="재고 관련 보고서를 생성하는 페이지입니다." estimatedCompletion="2025년 1월" features={["재고 분석", "재고 회전율", "재고 부족 알림", "재고 예측", "재고 최적화"]} status="planning" />} />
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
            <Route path="ai" element={<AIAnalytics />} />
            <Route path="ai/cost-analysis" element={<CostAnalysis />} />
            <Route path="ai/efficiency-metrics" element={<EfficiencyMetrics />} />
            <Route path="ai/forecasting-data" element={<ForecastingData />} />
            <Route path="ai/recommendation-engine" element={<RecommendationEngine />} />
            
            {/* AI 분석 단축 경로 */}
            <Route path="efficiency" element={<EfficiencyMetrics />} />
            <Route path="cost-analysis" element={<CostAnalysis />} />
            <Route path="forecasting" element={<ForecastingData />} />
            <Route path="recommendations" element={<RecommendationEngine />} />
            
            {/* 채팅 */}
            <Route path="chat" element={<Chat />} />
          </Route>
          
          {/* 404 페이지 */}
          <Route path="*" element={<div>404 - 페이지를 찾을 수 없습니다</div>} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;