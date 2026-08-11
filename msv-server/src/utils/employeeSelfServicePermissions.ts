import { Op } from 'sequelize';
import { Menu, UserPermission } from '../models';
import { EMPLOYEE_SELF_SERVICE_ROUTES } from '../constants/myWorkspaceMenus';

export { EMPLOYEE_SELF_SERVICE_ROUTES };

/**
 * 신규/기존 user 역할에 「내 정보·업무」+ 공지 보기 기본 권한 부여.
 * 휴가만 can_create 포함. 이미 권한이 있으면 덮어쓰지 않음.
 */
export async function grantEmployeeSelfServicePermissions(params: {
  userId: number;
  tenantId: number;
  role?: string;
}): Promise<number> {
  const { userId, tenantId, role } = params;
  if (role && role !== 'user') return 0;

  const menus = await (Menu as any).findAll({
    where: {
      tenant_id: tenantId,
      is_active: true,
      route: { [Op.in]: [...EMPLOYEE_SELF_SERVICE_ROUTES] },
    },
    attributes: ['id', 'route'],
  });

  let created = 0;
  for (const menu of menus) {
    const isLeave = menu.route === '/my/leave';
    const [row, wasCreated] = await (UserPermission as any).findOrCreate({
      where: { user_id: userId, menu_id: menu.id },
      defaults: {
        user_id: userId,
        menu_id: menu.id,
        can_view: true,
        can_create: isLeave,
        can_edit: false,
        can_delete: false,
      },
    });
    if (wasCreated) created += 1;
    else if (row && !row.can_view) {
      await row.update({
        can_view: true,
        can_create: Boolean(row.can_create) || isLeave,
      });
    }
  }
  return created;
}
