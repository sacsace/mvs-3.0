import { Sequelize } from 'sequelize';
import sequelize from '../config/database';
import User from './User';
import Menu from './Menu';
import UserPermission from './UserPermission';
import Company from './Company';
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

// 관계 설정
// 테넌트 관계
Tenant.hasMany(User, { foreignKey: 'tenant_id', as: 'users' });
User.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

Tenant.hasMany(Company, { foreignKey: 'tenant_id', as: 'companies' });
Company.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

Tenant.hasMany(Menu, { foreignKey: 'tenant_id', as: 'menus' });
Menu.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

// 회사 관계
Company.hasMany(User, { foreignKey: 'company_id', as: 'users' });
User.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

// 사용자 권한 관계 설정
User.hasMany(UserPermission, { foreignKey: 'user_id', as: 'permissions' });
UserPermission.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Menu.hasMany(UserPermission, { foreignKey: 'menu_id', as: 'permissions' });
UserPermission.belongsTo(Menu, { foreignKey: 'menu_id', as: 'menu' });

// 고객 관계
Tenant.hasMany(Customer, { foreignKey: 'tenant_id', as: 'customers' });
Customer.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

Company.hasMany(Customer, { foreignKey: 'company_id', as: 'customers' });
Customer.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

// 영업 기회 관계
Customer.hasMany(SalesOpportunity, { foreignKey: 'customer_id', as: 'salesOpportunities' });
SalesOpportunity.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });

User.hasMany(SalesOpportunity, { foreignKey: 'assigned_to', as: 'assignedOpportunities' });
SalesOpportunity.belongsTo(User, { foreignKey: 'assigned_to', as: 'assignedUser' });

// 계약 관계
Customer.hasMany(Contract, { foreignKey: 'customer_id', as: 'contracts' });
Contract.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });

// 지원 티켓 관계
Customer.hasMany(SupportTicket, { foreignKey: 'customer_id', as: 'supportTickets' });
SupportTicket.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });

User.hasMany(SupportTicket, { foreignKey: 'assigned_to', as: 'assignedTickets' });
SupportTicket.belongsTo(User, { foreignKey: 'assigned_to', as: 'assignedUser' });

SupportTicket.hasMany(SupportResponse, { foreignKey: 'ticket_id', as: 'responses' });
SupportResponse.belongsTo(SupportTicket, { foreignKey: 'ticket_id', as: 'ticket' });

User.hasMany(SupportResponse, { foreignKey: 'user_id', as: 'supportResponses' });
SupportResponse.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// 인보이스 관계
Customer.hasMany(Invoice, { foreignKey: 'customer_id', as: 'invoices' });
Invoice.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });

User.hasMany(Invoice, { foreignKey: 'created_by', as: 'createdInvoices' });
Invoice.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

Invoice.hasMany(InvoiceItem, { foreignKey: 'invoice_id', as: 'items' });
InvoiceItem.belongsTo(Invoice, { foreignKey: 'invoice_id', as: 'invoice' });

// 제품 관계
Tenant.hasMany(Product, { foreignKey: 'tenant_id', as: 'products' });
Product.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

Company.hasMany(Product, { foreignKey: 'company_id', as: 'products' });
Product.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

User.hasMany(Product, { foreignKey: 'created_by', as: 'createdProducts' });
Product.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// 프로젝트 관계
Tenant.hasMany(Project, { foreignKey: 'tenant_id', as: 'projects' });
Project.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

Company.hasMany(Project, { foreignKey: 'company_id', as: 'projects' });
Project.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

Customer.hasMany(Project, { foreignKey: 'customer_id', as: 'projects' });
Project.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });

User.hasMany(Project, { foreignKey: 'project_manager', as: 'managedProjects' });
Project.belongsTo(User, { foreignKey: 'project_manager', as: 'manager' });

User.hasMany(Project, { foreignKey: 'created_by', as: 'createdProjects' });
Project.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// 급여 관계
Tenant.hasMany(Payroll, { foreignKey: 'tenant_id', as: 'payrolls' });
Payroll.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

Company.hasMany(Payroll, { foreignKey: 'company_id', as: 'payrolls' });
Payroll.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

User.hasMany(Payroll, { foreignKey: 'employee_id', as: 'payrolls' });
Payroll.belongsTo(User, { foreignKey: 'employee_id', as: 'employee' });

User.hasMany(Payroll, { foreignKey: 'created_by', as: 'createdPayrolls' });
Payroll.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// 재고 거래 관계
Tenant.hasMany(InventoryTransaction, { foreignKey: 'tenant_id', as: 'inventoryTransactions' });
InventoryTransaction.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

Company.hasMany(InventoryTransaction, { foreignKey: 'company_id', as: 'inventoryTransactions' });
InventoryTransaction.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

Product.hasMany(InventoryTransaction, { foreignKey: 'product_id', as: 'transactions' });
InventoryTransaction.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

User.hasMany(InventoryTransaction, { foreignKey: 'created_by', as: 'createdInventoryTransactions' });
InventoryTransaction.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// 데이터베이스 연결 테스트
const connectDB = async () => {
  const maxRetries = 5;
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      await sequelize.authenticate();
      console.log('✅ 데이터베이스 연결 성공');
      
      // 개발 환경에서만 테이블 동기화
      if (process.env.NODE_ENV === 'development') {
        await sequelize.sync({ alter: true });
        console.log('✅ 데이터베이스 테이블 동기화 완료');
      }
      return;
    } catch (error) {
      retries++;
      console.error(`❌ 데이터베이스 연결 실패 (시도 ${retries}/${maxRetries}):`, error.message);
      
      if (retries >= maxRetries) {
        console.error('❌ 최대 재시도 횟수 초과. 서버를 계속 실행합니다.');
        return;
      }
      
      console.log(`⏳ ${5000 * retries}ms 후 재시도...`);
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
  connectDB 
};
