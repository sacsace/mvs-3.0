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

// 관�??�정
// ?�넌??관�?
(Tenant as any).hasMany(User, { foreignKey: 'tenant_id', as: 'users' });
(User as any).belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

(Tenant as any).hasMany(Company, { foreignKey: 'tenant_id', as: 'companies' });
(Company as any).belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

(Tenant as any).hasMany(Menu, { foreignKey: 'tenant_id', as: 'menus' });
Menu.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

// ?�사 관�?
(Company as any).hasMany(User, { foreignKey: 'company_id', as: 'users' });
(User as any).belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

// ?�용??권한 관�??�정
(User as any).hasMany(UserPermission, { foreignKey: 'user_id', as: 'permissions' });
UserPermission.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Menu.hasMany(UserPermission, { foreignKey: 'menu_id', as: 'permissions' });
UserPermission.belongsTo(Menu, { foreignKey: 'menu_id', as: 'menu' });

// 고객 관�?
(Tenant as any).hasMany(Customer, { foreignKey: 'tenant_id', as: 'customers' });
(Customer as any).belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

(Company as any).hasMany(Customer, { foreignKey: 'company_id', as: 'customers' });
(Customer as any).belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

// ?�업 기회 관�?
(Customer as any).hasMany(SalesOpportunity, { foreignKey: 'customer_id', as: 'salesOpportunities' });
(SalesOpportunity as any).belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });

(User as any).hasMany(SalesOpportunity, { foreignKey: 'assigned_to', as: 'assignedOpportunities' });
(SalesOpportunity as any).belongsTo(User, { foreignKey: 'assigned_to', as: 'assignedUser' });

// 계약 관�?
(Customer as any).hasMany(Contract, { foreignKey: 'customer_id', as: 'contracts' });
(Contract as any).belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });

// 지???�켓 관�?
(Customer as any).hasMany(SupportTicket, { foreignKey: 'customer_id', as: 'supportTickets' });
(SupportTicket as any).belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });

(User as any).hasMany(SupportTicket, { foreignKey: 'assigned_to', as: 'assignedTickets' });
(SupportTicket as any).belongsTo(User, { foreignKey: 'assigned_to', as: 'assignedUser' });

(SupportTicket as any).hasMany(SupportResponse, { foreignKey: 'ticket_id', as: 'responses' });
(SupportResponse as any).belongsTo(SupportTicket, { foreignKey: 'ticket_id', as: 'ticket' });

(User as any).hasMany(SupportResponse, { foreignKey: 'user_id', as: 'supportResponses' });
(SupportResponse as any).belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// ?�보?�스 관�?
(Customer as any).hasMany(Invoice, { foreignKey: 'customer_id', as: 'invoices' });
(Invoice as any).belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });

(User as any).hasMany(Invoice, { foreignKey: 'created_by', as: 'createdInvoices' });
(Invoice as any).belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

(Invoice as any).hasMany(InvoiceItem, { foreignKey: 'invoice_id', as: 'items' });
(InvoiceItem as any).belongsTo(Invoice, { foreignKey: 'invoice_id', as: 'invoice' });

// ?�품 관�?
(Tenant as any).hasMany(Product, { foreignKey: 'tenant_id', as: 'products' });
(Product as any).belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

(Company as any).hasMany(Product, { foreignKey: 'company_id', as: 'products' });
(Product as any).belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

(User as any).hasMany(Product, { foreignKey: 'created_by', as: 'createdProducts' });
(Product as any).belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// ?�로?�트 관�?
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

// 급여 관�?
(Tenant as any).hasMany(Payroll, { foreignKey: 'tenant_id', as: 'payrolls' });
(Payroll as any).belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

(Company as any).hasMany(Payroll, { foreignKey: 'company_id', as: 'payrolls' });
(Payroll as any).belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

(User as any).hasMany(Payroll, { foreignKey: 'employee_id', as: 'payrolls' });
(Payroll as any).belongsTo(User, { foreignKey: 'employee_id', as: 'employee' });

(User as any).hasMany(Payroll, { foreignKey: 'created_by', as: 'createdPayrolls' });
(Payroll as any).belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// ?�고 거래 관�?
(Tenant as any).hasMany(InventoryTransaction, { foreignKey: 'tenant_id', as: 'inventoryTransactions' });
(InventoryTransaction as any).belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

(Company as any).hasMany(InventoryTransaction, { foreignKey: 'company_id', as: 'inventoryTransactions' });
(InventoryTransaction as any).belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

Product.hasMany(InventoryTransaction, { foreignKey: 'product_id', as: 'transactions' });
(InventoryTransaction as any).belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

(User as any).hasMany(InventoryTransaction, { foreignKey: 'created_by', as: 'createdInventoryTransactions' });
(InventoryTransaction as any).belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// ?�이?�베?�스 ?�결 ?�스??
const connectDB = async () => {
  const maxRetries = 5;
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      await sequelize.authenticate();
      console.log('???�이?�베?�스 ?�결 ?�공');
      
      // 개발 ?�경?�서�??�이�??�기??
      // if (process.env.NODE_ENV === 'development') {
        // await sequelize.sync({ alter: true });
        // console.log('Database table sync completed');
      // }
      return;
    } catch (error) {
      retries++;
      console.error(`???�이?�베?�스 ?�결 ?�패 (?�도 ${retries}/${maxRetries}):`, error.message);
      
      if (retries >= maxRetries) {
        console.error('??최�? ?�시???�수 초과. ?�버�?계속 ?�행?�니??');
        return;
      }
      
      console.log(`??${5000 * retries}ms ???�시??..`);
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
