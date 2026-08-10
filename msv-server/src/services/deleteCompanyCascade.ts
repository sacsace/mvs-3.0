import { Transaction } from 'sequelize';
import sequelize from '../config/database';
import {
  Company,
  User,
  Menu,
  Tenant,
} from '../models';

export class CompanyNotFoundError extends Error {
  constructor() {
    super('회사를 찾을 수 없습니다.');
    this.name = 'CompanyNotFoundError';
  }
}

type DeleteContext = {
  companyId: number;
  tenantId: number;
  userIds: number[];
  purgeTenant: boolean;
};

async function runDelete(
  sql: string,
  replacements: Record<string, unknown>,
  transaction: Transaction
): Promise<void> {
  await sequelize.query(sql, { replacements, transaction });
}

async function deleteByCompanyId(
  table: string,
  ctx: DeleteContext,
  transaction: Transaction
): Promise<void> {
  await runDelete(
    `DELETE FROM ${table} WHERE company_id = :companyId`,
    { companyId: ctx.companyId },
    transaction
  );
}

async function deleteWorkBoards(ctx: DeleteContext, transaction: Transaction): Promise<void> {
  await runDelete(
    `UPDATE work_board_card_comments
     SET deleted_at = COALESCE(deleted_at, NOW())
     WHERE deleted_at IS NULL
       AND card_id IN (
       SELECT c.id FROM work_board_cards c
       JOIN work_board_lists l ON l.id = c.list_id
       JOIN work_boards b ON b.id = l.board_id
       WHERE b.company_id = :companyId
     )`,
    { companyId: ctx.companyId },
    transaction
  );
  await runDelete(
    `UPDATE work_board_cards
     SET deleted_at = COALESCE(deleted_at, NOW())
     WHERE deleted_at IS NULL
       AND list_id IN (
       SELECT l.id FROM work_board_lists l
       JOIN work_boards b ON b.id = l.board_id
       WHERE b.company_id = :companyId
     )`,
    { companyId: ctx.companyId },
    transaction
  );
  await runDelete(
    `UPDATE work_board_lists
     SET deleted_at = COALESCE(deleted_at, NOW())
     WHERE deleted_at IS NULL
       AND board_id IN (SELECT id FROM work_boards WHERE company_id = :companyId)`,
    { companyId: ctx.companyId },
    transaction
  );
  await runDelete(
    `UPDATE work_board_members
     SET deleted_at = COALESCE(deleted_at, NOW())
     WHERE deleted_at IS NULL
       AND board_id IN (SELECT id FROM work_boards WHERE company_id = :companyId)`,
    { companyId: ctx.companyId },
    transaction
  );
  await runDelete(
    `UPDATE work_boards
     SET deleted_at = COALESCE(deleted_at, NOW())
     WHERE deleted_at IS NULL AND company_id = :companyId`,
    { companyId: ctx.companyId },
    transaction
  );
}

async function deleteEmploymentContracts(ctx: DeleteContext, transaction: Transaction): Promise<void> {
  await runDelete(
    `DELETE FROM employment_contract_signatures
     WHERE contract_id IN (SELECT id FROM employment_contracts WHERE company_id = :companyId)`,
    { companyId: ctx.companyId },
    transaction
  );
  await deleteByCompanyId('employment_contract_audit_logs', ctx, transaction);
  await deleteByCompanyId('employment_contracts', ctx, transaction);
  await deleteByCompanyId('employment_contract_templates', ctx, transaction);
}

async function deleteEwayBills(ctx: DeleteContext, transaction: Transaction): Promise<void> {
  await runDelete(
    `DELETE FROM eway_bill_items
     WHERE eway_bill_id IN (SELECT id FROM eway_bills WHERE company_id = :companyId)`,
    { companyId: ctx.companyId },
    transaction
  );
  await deleteByCompanyId('eway_bills', ctx, transaction);
}

async function deleteInvoices(ctx: DeleteContext, transaction: Transaction): Promise<void> {
  await runDelete(
    `DELETE FROM invoice_items
     WHERE invoice_id IN (SELECT id FROM invoices WHERE company_id = :companyId)`,
    { companyId: ctx.companyId },
    transaction
  );
  await deleteByCompanyId('invoices', ctx, transaction);
}

async function deleteSupportTickets(ctx: DeleteContext, transaction: Transaction): Promise<void> {
  await runDelete(
    `DELETE FROM support_responses
     WHERE ticket_id IN (SELECT id FROM support_tickets WHERE company_id = :companyId)`,
    { companyId: ctx.companyId },
    transaction
  );
  await deleteByCompanyId('support_tickets', ctx, transaction);
}

async function deletePartners(ctx: DeleteContext, transaction: Transaction): Promise<void> {
  await runDelete(
    `UPDATE products SET partner_id = NULL
     WHERE company_id = :companyId AND partner_id IS NOT NULL`,
    { companyId: ctx.companyId },
    transaction
  );
  await runDelete(
    `DELETE FROM partner_gst_numbers
     WHERE partner_id IN (SELECT id FROM partners WHERE company_id = :companyId)`,
    { companyId: ctx.companyId },
    transaction
  );
  await deleteByCompanyId('partners', ctx, transaction);
}

async function deleteCustomerRelated(ctx: DeleteContext, transaction: Transaction): Promise<void> {
  await deleteByCompanyId('contracts', ctx, transaction);
  await deleteByCompanyId('sales_opportunities', ctx, transaction);
  await deleteSupportTickets(ctx, transaction);
  await deleteInvoices(ctx, transaction);
  await deleteByCompanyId('projects', ctx, transaction);
  await deleteByCompanyId('quotations', ctx, transaction);
  await deleteByCompanyId('customers', ctx, transaction);
}

async function deleteChatRooms(ctx: DeleteContext, transaction: Transaction): Promise<void> {
  await runDelete(
    `DELETE FROM chat_messages
     WHERE room_id IN (SELECT id FROM chat_rooms WHERE company_id = :companyId)`,
    { companyId: ctx.companyId },
    transaction
  );
  await deleteByCompanyId('chat_rooms', ctx, transaction);
}

async function deleteCompanyScopedData(ctx: DeleteContext, transaction: Transaction): Promise<void> {
  await deleteWorkBoards(ctx, transaction);
  await deleteEmploymentContracts(ctx, transaction);
  await deleteEwayBills(ctx, transaction);
  await deletePartners(ctx, transaction);
  await deleteCustomerRelated(ctx, transaction);
  await deleteChatRooms(ctx, transaction);

  const companyTables = [
    'inventory_transactions',
    'payrolls',
    'payroll_period_locks',
    'vacations',
    'attendances',
    'performances',
    'work_statistics',
    'approvals',
    'work_reports',
    'notices',
    'expense_reports',
    'budgets',
    'assets',
    'room_bookings',
    'room_type_rooms',
    'room_types',
    'login_logs',
    'login_infos',
    'login_info_tabs',
    'tasks',
    'positions',
    'system_settings',
    'product_categories',
    'product_units',
    'products',
    'inventory_locations',
  ];

  for (const table of companyTables) {
    await deleteByCompanyId(table, ctx, transaction);
  }
}

async function deleteCompanyUsers(ctx: DeleteContext, transaction: Transaction): Promise<void> {
  if (ctx.userIds.length > 0) {
    await runDelete(
      `DELETE FROM user_permissions WHERE user_id IN (:userIds)`,
      { userIds: ctx.userIds },
      transaction
    );
  }

  await runDelete(
    `UPDATE departments SET manager_id = NULL WHERE company_id = :companyId`,
    { companyId: ctx.companyId },
    transaction
  );
  await deleteByCompanyId('departments', ctx, transaction);

  await User.destroy({
    where: { company_id: ctx.companyId },
    transaction,
  });
}

async function purgeTenantData(tenantId: number, transaction: Transaction): Promise<void> {
  await runDelete(
    `DELETE FROM user_permissions WHERE menu_id IN (SELECT id FROM menus WHERE tenant_id = :tenantId)`,
    { tenantId },
    transaction
  );
  await runDelete(
    `UPDATE menus SET parent_id = NULL WHERE tenant_id = :tenantId`,
    { tenantId },
    transaction
  );
  await Menu.destroy({ where: { tenant_id: tenantId }, transaction });
  await Tenant.destroy({ where: { id: tenantId }, transaction });
}

/**
 * root 사용자가 회사를 삭제할 때 연관 데이터를 FK 역순으로 모두 제거합니다.
 * 테넌트에 회사가 1개뿐이면 메뉴·테넌트까지 함께 삭제합니다.
 */
export async function deleteCompanyWithCascade(
  companyId: number
): Promise<{ companyId: number; tenantId: number; purgedTenant: boolean }> {
  const transaction = await sequelize.transaction();

  try {
    const company = await Company.findByPk(companyId, { transaction });
    if (!company) {
      throw new CompanyNotFoundError();
    }

    const tenantId = company.tenant_id;
    const companyCount = await Company.count({
      where: { tenant_id: tenantId },
      transaction,
    });
    const purgeTenant = companyCount === 1;

    const users = await User.findAll({
      where: { company_id: companyId },
      attributes: ['id'],
      transaction,
    });
    const userIds = users.map((u) => u.id);

    const ctx: DeleteContext = { companyId, tenantId, userIds, purgeTenant };

    await deleteCompanyScopedData(ctx, transaction);
    await deleteCompanyUsers(ctx, transaction);
    await deleteByCompanyId('company_gst_numbers', ctx, transaction);

    await Company.destroy({
      where: { id: companyId },
      transaction,
    });

    if (purgeTenant) {
      await purgeTenantData(tenantId, transaction);
    }

    await transaction.commit();

    return { companyId, tenantId, purgedTenant: purgeTenant };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
