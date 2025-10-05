import { Request, Response } from 'express';
import { Menu, UserPermission, User } from '../models';
import { Op } from 'sequelize';

// 사용자별 메뉴 목록 조회 (권한 기반)
export const getUserMenus = async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.params;
    const { language = 'ko' } = req.query;

    // 사용자 권한이 있는 메뉴만 조회
    const userMenus = await (Menu as any).findAll({
      where: {
        tenant_id: tenantId,
        is_active: true
      },
      include: [
        {
          model: UserPermission,
          as: 'permissions',
          where: {
            user_id: userId,
            can_view: true
          },
          required: true
        }
      ],
      order: [['order', 'ASC']]
    });

    // 계층 구조로 변환
    const menuTree = buildMenuTree(userMenus, language as string);

    res.json({
      success: true,
      data: menuTree,
      message: '사용자 메뉴 목록을 성공적으로 조회했습니다.'
    });
  } catch (error) {
    console.error('메뉴 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '메뉴 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

// 모든 메뉴 목록 조회 (관리자용)
export const getAllMenus = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { language = 'ko' } = req.query;

    const menus = await (Menu as any).findAll({
      where: {
        tenant_id: tenantId,
        is_active: true
      },
      order: [['order', 'ASC']]
    });

    const menuTree = buildMenuTree(menus, language as string);

    res.json({
      success: true,
      data: menuTree,
      message: '전체 메뉴 목록을 성공적으로 조회했습니다.'
    });
  } catch (error) {
    console.error('전체 메뉴 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '전체 메뉴 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

// 메뉴 생성
export const createMenu = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const menuData = {
      ...req.body,
      tenant_id: tenantId
    };

    const newMenu = await (Menu as any).create(menuData);

    res.status(201).json({
      success: true,
      data: newMenu,
      message: '메뉴가 성공적으로 생성되었습니다.'
    });
  } catch (error) {
    console.error('메뉴 생성 오류:', error);
    res.status(500).json({
      success: false,
      message: '메뉴 생성 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

// 메뉴 수정
export const updateMenu = async (req: Request, res: Response) => {
  try {
    const { menuId } = req.params;
    const updateData = req.body;

    const [updatedRowsCount] = await (Menu as any).update(updateData, {
      where: { id: menuId }
    });

    if (updatedRowsCount === 0) {
      return res.status(404).json({
        success: false,
        message: '메뉴를 찾을 수 없습니다.'
      });
    }

    const updatedMenu = await (Menu as any).findByPk(menuId);

    res.json({
      success: true,
      data: updatedMenu,
      message: '메뉴가 성공적으로 수정되었습니다.'
    });
  } catch (error) {
    console.error('메뉴 수정 오류:', error);
    res.status(500).json({
      success: false,
      message: '메뉴 수정 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

// 메뉴 삭제
export const deleteMenu = async (req: Request, res: Response) => {
  try {
    const { menuId } = req.params;

    // 하위 메뉴가 있는지 확인
    const childMenus = await (Menu as any).count({
      where: { parent_id: menuId }
    });

    if (childMenus > 0) {
      return res.status(400).json({
        success: false,
        message: '하위 메뉴가 있는 메뉴는 삭제할 수 없습니다.'
      });
    }

    const deletedRowsCount = await (Menu as any).destroy({
      where: { id: menuId }
    });

    if (deletedRowsCount === 0) {
      return res.status(404).json({
        success: false,
        message: '메뉴를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      message: '메뉴가 성공적으로 삭제되었습니다.'
    });
  } catch (error) {
    console.error('메뉴 삭제 오류:', error);
    res.status(500).json({
      success: false,
      message: '메뉴 삭제 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

// 사용자 권한 설정
export const setUserPermissions = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { permissions } = req.body;

    // 기존 권한 삭제
    await (UserPermission as any).destroy({
      where: { user_id: userId }
    });

    // 새 권한 생성
    const permissionData = permissions.map((perm: any) => ({
      user_id: userId,
      menu_id: perm.menu_id,
      can_view: perm.can_view || false,
      can_create: perm.can_create || false,
      can_edit: perm.can_edit || false,
      can_delete: perm.can_delete || false
    }));

    await (UserPermission as any).bulkCreate(permissionData);

    res.json({
      success: true,
      message: '사용자 권한이 성공적으로 설정되었습니다.'
    });
  } catch (error) {
    console.error('사용자 권한 설정 오류:', error);
    res.status(500).json({
      success: false,
      message: '사용자 권한 설정 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

// 사용자 권한 조회
export const getUserPermissions = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const permissions = await (UserPermission as any).findAll({
      where: { user_id: userId },
      include: [
        {
          model: Menu,
          as: 'menu',
          attributes: ['id', 'name_ko', 'name_en', 'route', 'icon']
        }
      ]
    });

    res.json({
      success: true,
      data: permissions,
      message: '사용자 권한을 성공적으로 조회했습니다.'
    });
  } catch (error) {
    console.error('사용자 권한 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '사용자 권한 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

// 메뉴 트리 구조 생성 헬퍼 함수
function buildMenuTree(menus: any[], language: string) {
  const menuMap = new Map();
  const rootMenus: any[] = [];

  // 메뉴를 맵에 저장
  menus.forEach(menu => {
    const menuItem = {
      id: menu.id,
      name: language === 'ko' ? menu.name_ko : menu.name_en,
      name_ko: menu.name_ko,
      name_en: menu.name_en,
      route: menu.route,
      icon: menu.icon,
      order: menu.order,
      level: menu.level,
      is_active: menu.is_active,
      description: menu.description,
      children: []
    };
    menuMap.set(menu.id, menuItem);
  });

  // 계층 구조 생성
  menus.forEach(menu => {
    const menuItem = menuMap.get(menu.id);
    if (menu.parent_id) {
      const parent = menuMap.get(menu.parent_id);
      if (parent) {
        parent.children.push(menuItem);
      }
    } else {
      rootMenus.push(menuItem);
    }
  });

  // 자식 메뉴 정렬
  const sortMenus = (menuList: any[]) => {
    menuList.sort((a, b) => a.order - b.order);
    menuList.forEach(menu => {
      if (menu.children.length > 0) {
        sortMenus(menu.children);
      }
    });
  };

  sortMenus(rootMenus);
  return rootMenus;
}