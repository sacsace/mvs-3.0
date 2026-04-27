import type { Menu } from '../services/menuService';

/** 현재 경로에 해당하는 leaf(또는 prefix 일치) 메뉴 id — AppLayout.findMenuByRoute 와 동일 규칙 */
export function findMenuIdByPath(menuList: Menu[], pathname: string): number | null {
  const normalizedRoute = pathname.replace(/^\/+|\/+$/g, '');

  const findMenu = (menus: Menu[]): Menu | null => {
    for (const menu of menus) {
      if (!menu.route) {
        if (menu.children && menu.children.length > 0) {
          const found = findMenu(menu.children);
          if (found) return found;
        }
        continue;
      }

      const normalizedMenuRoute = menu.route.replace(/^\/+|\/+$/g, '');

      if (normalizedMenuRoute === normalizedRoute) {
        return menu;
      }

      if (menu.children && menu.children.length > 0) {
        const found = findMenu(menu.children);
        if (found) return found;
      }

      if (normalizedRoute.startsWith(`${normalizedMenuRoute}/`)) {
        return menu;
      }
    }
    return null;
  };

  const menu = findMenu(menuList);
  return menu ? menu.id : null;
}
