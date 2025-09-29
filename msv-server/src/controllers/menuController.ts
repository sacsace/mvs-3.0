import { Request, Response } from 'express';
import { Menu } from '../models';

interface MenuRequest extends Request {
  body: {
    name_ko: string;
    name_en: string;
    route: string;
    icon: string;
    parent_id?: number;
    order: number;
    level: number;
    description?: string;
  };
}

export const getMenus = async (req: Request, res: Response) => {
  try {
    const menus = await Menu.findAll({
      where: { 
        tenant_id: (req as any).user.tenant_id,
        is_active: true 
      },
      order: [['level', 'ASC'], ['order', 'ASC']]
    });

    res.json({
      success: true,
      data: menus
    });
  } catch (error) {
    console.error('메뉴 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
};

export const createMenu = async (req: MenuRequest, res: Response) => {
  try {
    const { name_ko, name_en, route, icon, parent_id, order, level, description } = req.body;

    if (!name_ko || !name_en || !route || !icon) {
      return res.status(400).json({
        success: false,
        message: '필수 필드를 입력해주세요.'
      });
    }

    const menu = await Menu.create({
      tenant_id: (req as any).user.tenant_id,
      name_ko,
      name_en,
      route,
      icon,
      parent_id: parent_id || null,
      order: order || 0,
      level: level || 1,
      description,
      is_active: true
    });

    res.status(201).json({
      success: true,
      data: menu,
      message: '메뉴가 생성되었습니다.'
    });
  } catch (error) {
    console.error('메뉴 생성 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
};

export const updateMenu = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const menu = await Menu.findOne({
      where: { 
        id,
        tenant_id: (req as any).user.tenant_id 
      }
    });

    if (!menu) {
      return res.status(404).json({
        success: false,
        message: '메뉴를 찾을 수 없습니다.'
      });
    }

    await menu.update(updateData);

    res.json({
      success: true,
      data: menu,
      message: '메뉴가 수정되었습니다.'
    });
  } catch (error) {
    console.error('메뉴 수정 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
};

export const deleteMenu = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const menu = await Menu.findOne({
      where: { 
        id,
        tenant_id: (req as any).user.tenant_id 
      }
    });

    if (!menu) {
      return res.status(404).json({
        success: false,
        message: '메뉴를 찾을 수 없습니다.'
      });
    }

    await menu.update({ is_active: false });

    res.json({
      success: true,
      message: '메뉴가 삭제되었습니다.'
    });
  } catch (error) {
    console.error('메뉴 삭제 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
};
