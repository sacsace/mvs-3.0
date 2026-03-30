import sequelize from '../config/database';
import User from './User';
import Menu from './Menu';
import UserPermission from './UserPermission';
import Company from './Company';
import LoginInfo from './LoginInfo';
import LoginLog from './LoginLog';
import Tenant from './Tenant';
import Customer from './Customer';
import SalesOpportunity from './SalesOpportunity';
import Contract from './Contract';
import SupportTicket from './SupportTicket';
import SupportResponse from './SupportResponse';
import Invoice from './Invoice';
import InvoiceItem from './InvoiceItem';
import Product from './Product';
import Project from './Project';
import Payroll from './Payroll';
import InventoryTransaction from './InventoryTransaction';
import CompanyGstNumber from './CompanyGstNumber';
import Partner from './Partner';
import PartnerGstNumber from './PartnerGstNumber';
import Attendance from './Attendance';
import Vacation from './Vacation';
import Performance from './Performance';
import WorkStatistic from './WorkStatistic';
import Approval from './Approval';
import Quotation from './Quotation';
import RoomBooking from './RoomBooking';
import RoomType from './RoomType';
import RoomTypeRoom from './RoomTypeRoom';
import WorkReport from './WorkReport';
import EWayBill from './EWayBill';
import EWayBillItem from './EWayBillItem';
import Notice from './Notice';
import ExpenseReport from './ExpenseReport';
import Budget from './Budget';
import Asset from './Asset';
import WorkBoard from './WorkBoard';
import WorkBoardList from './WorkBoardList';
import WorkBoardCard from './WorkBoardCard';
import WorkBoardCardComment from './WorkBoardCardComment';
import WorkBoardMember from './WorkBoardMember';

// 관계 설정
// 테넌트 관계
(Tenant as any).hasMany(User, { foreignKey: 'tenant_id', as: 'users' });
(User as any).belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

(Tenant as any).hasMany(Company, { foreignKey: 'tenant_id', as: 'companies' });
(Company as any).belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

(Tenant as any).hasMany(Menu, { foreignKey: 'tenant_id', as: 'menus' });
Menu.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

// 회사 관계
(Company as any).hasMany(User, { foreignKey: 'company_id', as: 'users' });
(User as any).belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

// 로그인 정보 관리 관계
(Company as any).hasMany(LoginInfo, { foreignKey: 'company_id', as: 'loginInfos' });
(Tenant as any).hasMany(LoginInfo, { foreignKey: 'tenant_id', as: 'loginInfos' });
LoginInfo.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });
LoginInfo.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
LoginInfo.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
LoginInfo.belongsTo(User, { foreignKey: 'updated_by', as: 'updater' });

// 로그인 로그 관계
(Tenant as any).hasMany(LoginLog, { foreignKey: 'tenant_id', as: 'loginLogs' });
(Company as any).hasMany(LoginLog, { foreignKey: 'company_id', as: 'companyLoginLogs' });
(User as any).hasMany(LoginLog, { foreignKey: 'user_id', as: 'loginLogs' });
LoginLog.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
LoginLog.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });
LoginLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// 사용자 권한 관계 설정
(User as any).hasMany(UserPermission, { foreignKey: 'user_id', as: 'permissions' });
UserPermission.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Menu.hasMany(UserPermission, { foreignKey: 'menu_id', as: 'permissions' });
UserPermission.belongsTo(Menu, { foreignKey: 'menu_id', as: 'menu' });

// 고객 관계
(Tenant as any).hasMany(Customer, { foreignKey: 'tenant_id', as: 'customers' });
(Customer as any).belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

(Company as any).hasMany(Customer, { foreignKey: 'company_id', as: 'customers' });
(Customer as any).belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

// 영업 기회 관계
(Customer as any).hasMany(SalesOpportunity, { foreignKey: 'customer_id', as: 'salesOpportunities' });
(SalesOpportunity as any).belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });

(User as any).hasMany(SalesOpportunity, { foreignKey: 'assigned_to', as: 'assignedOpportunities' });
(SalesOpportunity as any).belongsTo(User, { foreignKey: 'assigned_to', as: 'assignedUser' });

// 계약 관계
(Customer as any).hasMany(Contract, { foreignKey: 'customer_id', as: 'contracts' });
(Contract as any).belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });

// 지원 티켓 관계
(Customer as any).hasMany(SupportTicket, { foreignKey: 'customer_id', as: 'supportTickets' });
(SupportTicket as any).belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });

(User as any).hasMany(SupportTicket, { foreignKey: 'assigned_to', as: 'assignedTickets' });
(SupportTicket as any).belongsTo(User, { foreignKey: 'assigned_to', as: 'assignedUser' });

(SupportTicket as any).hasMany(SupportResponse, { foreignKey: 'ticket_id', as: 'responses' });
(SupportResponse as any).belongsTo(SupportTicket, { foreignKey: 'ticket_id', as: 'ticket' });

(User as any).hasMany(SupportResponse, { foreignKey: 'user_id', as: 'supportResponses' });
(SupportResponse as any).belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// 인보이스 관계
(Customer as any).hasMany(Invoice, { foreignKey: 'customer_id', as: 'invoices' });
(Invoice as any).belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });

(User as any).hasMany(Invoice, { foreignKey: 'created_by', as: 'createdInvoices' });
(Invoice as any).belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

(Invoice as any).hasMany(InvoiceItem, { foreignKey: 'invoice_id', as: 'items' });
(InvoiceItem as any).belongsTo(Invoice, { foreignKey: 'invoice_id', as: 'invoice' });

// E-Way Bill 관계
(Tenant as any).hasMany(EWayBill, { foreignKey: 'tenant_id', as: 'ewayBills' });
(EWayBill as any).belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

(Company as any).hasMany(EWayBill, { foreignKey: 'company_id', as: 'ewayBills' });
(EWayBill as any).belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

(Invoice as any).hasMany(EWayBill, { foreignKey: 'invoice_id', as: 'ewayBills' });
(EWayBill as any).belongsTo(Invoice, { foreignKey: 'invoice_id', as: 'invoice' });

(EWayBill as any).hasMany(EWayBillItem, { foreignKey: 'eway_bill_id', as: 'items' });
(EWayBillItem as any).belongsTo(EWayBill, { foreignKey: 'eway_bill_id', as: 'ewayBill' });

(User as any).hasMany(EWayBill, { foreignKey: 'generated_by', as: 'generatedEwayBills' });
(EWayBill as any).belongsTo(User, { foreignKey: 'generated_by', as: 'generator' });

// 제품 관계
(Tenant as any).hasMany(Product, { foreignKey: 'tenant_id', as: 'products' });
(Product as any).belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

(Company as any).hasMany(Product, { foreignKey: 'company_id', as: 'products' });
(Product as any).belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

(User as any).hasMany(Product, { foreignKey: 'created_by', as: 'createdProducts' });
(Product as any).belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// 프로젝트 관계
(Tenant as any).hasMany(Project, { foreignKey: 'tenant_id', as: 'projects' });
(Project as any).belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

(Company as any).hasMany(Project, { foreignKey: 'company_id', as: 'projects' });
(Project as any).belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

(Customer as any).hasMany(Project, { foreignKey: 'customer_id', as: 'projects' });
(Project as any).belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });

(User as any).hasMany(Project, { foreignKey: 'project_manager', as: 'managedProjects' });
(Project as any).belongsTo(User, { foreignKey: 'project_manager', as: 'manager' });

(User as any).hasMany(Project, { foreignKey: 'created_by', as: 'createdProjects' });
(Project as any).belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// 급여 관계
(Tenant as any).hasMany(Payroll, { foreignKey: 'tenant_id', as: 'payrolls' });
(Payroll as any).belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

(Company as any).hasMany(Payroll, { foreignKey: 'company_id', as: 'payrolls' });
(Payroll as any).belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

(User as any).hasMany(Payroll, { foreignKey: 'employee_id', as: 'payrolls' });
(Payroll as any).belongsTo(User, { foreignKey: 'employee_id', as: 'employee' });

(User as any).hasMany(Payroll, { foreignKey: 'created_by', as: 'createdPayrolls' });
(Payroll as any).belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// 근태 관계
(Tenant as any).hasMany(Attendance, { foreignKey: 'tenant_id', as: 'attendances' });
(Attendance as any).belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

(Company as any).hasMany(Attendance, { foreignKey: 'company_id', as: 'attendances' });
(Attendance as any).belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

(User as any).hasMany(Attendance, { foreignKey: 'user_id', as: 'attendances' });
(Attendance as any).belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// 휴가 관계
(Tenant as any).hasMany(Vacation, { foreignKey: 'tenant_id', as: 'vacations' });
(Vacation as any).belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

(Company as any).hasMany(Vacation, { foreignKey: 'company_id', as: 'vacations' });
(Vacation as any).belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

(User as any).hasMany(Vacation, { foreignKey: 'user_id', as: 'vacations' });
(Vacation as any).belongsTo(User, { foreignKey: 'user_id', as: 'user' });

(User as any).hasMany(Vacation, { foreignKey: 'approved_by', as: 'approvedVacations' });
(Vacation as any).belongsTo(User, { foreignKey: 'approved_by', as: 'approver' });

// 성과 관계
(Tenant as any).hasMany(Performance, { foreignKey: 'tenant_id', as: 'performances' });
(Performance as any).belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

(Company as any).hasMany(Performance, { foreignKey: 'company_id', as: 'performances' });
(Performance as any).belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

(User as any).hasMany(Performance, { foreignKey: 'user_id', as: 'performances' });
(Performance as any).belongsTo(User, { foreignKey: 'user_id', as: 'user' });

(User as any).hasMany(Performance, { foreignKey: 'reviewed_by', as: 'reviewedPerformances' });
(Performance as any).belongsTo(User, { foreignKey: 'reviewed_by', as: 'reviewer' });

// 업무 통계 관계
(Tenant as any).hasMany(WorkStatistic, { foreignKey: 'tenant_id', as: 'workStatistics' });
(WorkStatistic as any).belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

(Company as any).hasMany(WorkStatistic, { foreignKey: 'company_id', as: 'workStatistics' });
(WorkStatistic as any).belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

(User as any).hasMany(WorkStatistic, { foreignKey: 'user_id', as: 'workStatistics' });
(WorkStatistic as any).belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// 전자 결제 관계
(Tenant as any).hasMany(Approval, { foreignKey: 'tenant_id', as: 'approvals' });
(Approval as any).belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

(Company as any).hasMany(Approval, { foreignKey: 'company_id', as: 'approvals' });
(Approval as any).belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

(User as any).hasMany(Approval, { foreignKey: 'requester_id', as: 'requestedApprovals' });
(Approval as any).belongsTo(User, { foreignKey: 'requester_id', as: 'requester' });

(User as any).hasMany(Approval, { foreignKey: 'current_approver_id', as: 'pendingApprovals' });
(Approval as any).belongsTo(User, { foreignKey: 'current_approver_id', as: 'currentApprover' });

// 견적서 관계
(Tenant as any).hasMany(Quotation, { foreignKey: 'tenant_id', as: 'quotations' });
(Quotation as any).belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

(Company as any).hasMany(Quotation, { foreignKey: 'company_id', as: 'quotations' });
(Quotation as any).belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

(Customer as any).hasMany(Quotation, { foreignKey: 'customer_id', as: 'quotations' });
(Quotation as any).belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });

(User as any).hasMany(Quotation, { foreignKey: 'created_by', as: 'createdQuotations' });
(Quotation as any).belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// 회의실 예약 관계
(Tenant as any).hasMany(RoomBooking, { foreignKey: 'tenant_id', as: 'roomBookings' });
(RoomBooking as any).belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

(Company as any).hasMany(RoomBooking, { foreignKey: 'company_id', as: 'roomBookings' });
(RoomBooking as any).belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

(User as any).hasMany(RoomBooking, { foreignKey: 'user_id', as: 'roomBookings' });
(RoomBooking as any).belongsTo(User, { foreignKey: 'user_id', as: 'user' });

(User as any).hasMany(RoomBooking, { foreignKey: 'created_by', as: 'createdRoomBookings' });
(RoomBooking as any).belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// 객실 유형 관계
(Tenant as any).hasMany(RoomType, { foreignKey: 'tenant_id', as: 'roomTypes' });
RoomType.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

(Company as any).hasMany(RoomType, { foreignKey: 'company_id', as: 'roomTypes' });
RoomType.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

(User as any).hasMany(RoomType, { foreignKey: 'created_by', as: 'createdRoomTypes' });
RoomType.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// 객실 유형-호실 관계
(RoomType as any).hasMany(RoomTypeRoom, { foreignKey: 'room_type_id', as: 'rooms' });
(RoomTypeRoom as any).belongsTo(RoomType, { foreignKey: 'room_type_id', as: 'roomType' });

// 업무 보고서 관계
(Tenant as any).hasMany(WorkReport, { foreignKey: 'tenant_id', as: 'workReports' });
(WorkReport as any).belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

(Company as any).hasMany(WorkReport, { foreignKey: 'company_id', as: 'workReports' });
(WorkReport as any).belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

(User as any).hasMany(WorkReport, { foreignKey: 'author_id', as: 'workReports' });
(WorkReport as any).belongsTo(User, { foreignKey: 'author_id', as: 'author' });

(User as any).hasMany(WorkReport, { foreignKey: 'reviewer_id', as: 'reviewedWorkReports' });
(WorkReport as any).belongsTo(User, { foreignKey: 'reviewer_id', as: 'reviewer' });

// 재고 거래 관계
(Tenant as any).hasMany(InventoryTransaction, { foreignKey: 'tenant_id', as: 'inventoryTransactions' });
(InventoryTransaction as any).belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

(Company as any).hasMany(InventoryTransaction, { foreignKey: 'company_id', as: 'inventoryTransactions' });
(InventoryTransaction as any).belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

Product.hasMany(InventoryTransaction, { foreignKey: 'product_id', as: 'transactions' });
(InventoryTransaction as any).belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

(User as any).hasMany(InventoryTransaction, { foreignKey: 'created_by', as: 'createdInventoryTransactions' });
(InventoryTransaction as any).belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// 공지사항 관계
(Tenant as any).hasMany(Notice, { foreignKey: 'tenant_id', as: 'notices' });
(Notice as any).belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

(Company as any).hasMany(Notice, { foreignKey: 'company_id', as: 'notices' });
(Notice as any).belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

(User as any).hasMany(Notice, { foreignKey: 'author_id', as: 'notices' });
(Notice as any).belongsTo(User, { foreignKey: 'author_id', as: 'author' });

// 회사와 GST 번호 관계
(Company as any).hasMany(CompanyGstNumber, { foreignKey: 'company_id', as: 'gstNumbers' });
CompanyGstNumber.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

// 파트너 관계
(Tenant as any).hasMany(Partner, { foreignKey: 'tenant_id', as: 'partners' });
(Partner as any).belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

(Company as any).hasMany(Partner, { foreignKey: 'company_id', as: 'partners' });
(Partner as any).belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

// 파트너와 GST 번호 관계
(Partner as any).hasMany(PartnerGstNumber, { foreignKey: 'partner_id', as: 'gstNumbers' });
PartnerGstNumber.belongsTo(Partner, { foreignKey: 'partner_id', as: 'partner' });

// 회계 관리 관계
(Tenant as any).hasMany(ExpenseReport, { foreignKey: 'tenant_id', as: 'expenseReports' });
ExpenseReport.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
(Company as any).hasMany(ExpenseReport, { foreignKey: 'company_id', as: 'expenseReports' });
ExpenseReport.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

(Tenant as any).hasMany(Budget, { foreignKey: 'tenant_id', as: 'budgets' });
Budget.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
(Company as any).hasMany(Budget, { foreignKey: 'company_id', as: 'budgets' });
Budget.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

(Tenant as any).hasMany(Asset, { foreignKey: 'tenant_id', as: 'assets' });
Asset.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
(Company as any).hasMany(Asset, { foreignKey: 'company_id', as: 'assets' });
Asset.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

// 작업 보드 (트렐로형)
(Tenant as any).hasMany(WorkBoard, { foreignKey: 'tenant_id', as: 'workBoards' });
(WorkBoard as any).belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
(Company as any).hasMany(WorkBoard, { foreignKey: 'company_id', as: 'workBoards' });
(WorkBoard as any).belongsTo(Company, { foreignKey: 'company_id', as: 'company' });
(User as any).hasMany(WorkBoard, { foreignKey: 'created_by', as: 'createdWorkBoards' });
(WorkBoard as any).belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

(WorkBoard as any).hasMany(WorkBoardList, { foreignKey: 'board_id', as: 'lists' });
(WorkBoardList as any).belongsTo(WorkBoard, { foreignKey: 'board_id', as: 'board' });

(WorkBoardList as any).hasMany(WorkBoardCard, { foreignKey: 'list_id', as: 'cards' });
(WorkBoardCard as any).belongsTo(WorkBoardList, { foreignKey: 'list_id', as: 'list' });
(User as any).hasMany(WorkBoardCard, { foreignKey: 'assignee_user_id', as: 'assignedBoardCards' });
(WorkBoardCard as any).belongsTo(User, { foreignKey: 'assignee_user_id', as: 'assignee' });
(User as any).hasMany(WorkBoardCard, { foreignKey: 'created_by', as: 'createdBoardCards' });
(WorkBoardCard as any).belongsTo(User, { foreignKey: 'created_by', as: 'cardCreator' });
(WorkBoardCard as any).hasMany(WorkBoardCardComment, { foreignKey: 'card_id', as: 'comments' });
(WorkBoardCardComment as any).belongsTo(WorkBoardCard, { foreignKey: 'card_id', as: 'card' });
(User as any).hasMany(WorkBoardCardComment, { foreignKey: 'user_id', as: 'boardCardComments' });
(WorkBoardCardComment as any).belongsTo(User, { foreignKey: 'user_id', as: 'user' });

(WorkBoard as any).hasMany(WorkBoardMember, { foreignKey: 'board_id', as: 'members' });
(WorkBoardMember as any).belongsTo(WorkBoard, { foreignKey: 'board_id', as: 'board' });
(User as any).hasMany(WorkBoardMember, { foreignKey: 'user_id', as: 'boardMemberships' });
(WorkBoardMember as any).belongsTo(User, { foreignKey: 'user_id', as: 'user' });
(WorkBoardMember as any).belongsTo(User, { foreignKey: 'invited_by', as: 'inviter' });

// 데이터베이스 연결 함수
const connectDB = async () => {
  const maxRetries = 5;
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      await sequelize.authenticate();
      console.log('Database connection successful');
      
      // 개발 환경에서만 테이블 동기화
      // if (process.env.NODE_ENV === 'development') {
        // await sequelize.sync({ alter: true });
        // console.log('Database table sync completed');
      // }
      return;
    } catch (error) {
      retries++;
      console.error(`Database connection failed (attempt ${retries}/${maxRetries}):`, error.message);
      
      if (retries >= maxRetries) {
        console.error('Maximum retry attempts exceeded. Continuing server startup.');
        return;
      }
      
      console.log(`Retrying in ${5000 * retries}ms...`);
      await new Promise(resolve => setTimeout(resolve, 5000 * retries));
    }
  }
};

export { 
  sequelize, 
  User, 
  Menu, 
  UserPermission, 
  Company, 
  LoginInfo,
  LoginLog,
  Tenant, 
  Customer,
  SalesOpportunity,
  Contract,
  SupportTicket,
  SupportResponse,
  Invoice,
  InvoiceItem,
  Product,
  Project,
  Payroll,
  InventoryTransaction,
  CompanyGstNumber,
  Partner,
  PartnerGstNumber,
  Attendance,
  Vacation,
  Performance,
  WorkStatistic,
  Approval,
  Quotation,
  RoomBooking,
  RoomType,
  RoomTypeRoom,
  WorkReport,
  EWayBill,
  EWayBillItem,
  Notice,
  ExpenseReport,
  Budget,
  Asset,
  WorkBoard,
  WorkBoardList,
  WorkBoardCard,
  WorkBoardCardComment,
  WorkBoardMember,
  connectDB 
};
