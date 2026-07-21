import React from 'react';
import {
  AccountBalance,
  Assessment,
  AttachMoney,
  Business,
  Category,
  Chat,
  Dashboard,
  Description,
  Email,
  EventAvailable,
  Inventory,
  LocalShipping,
  Menu as MenuIcon,
  MoveToInbox,
  Notifications,
  People,
  Person,
  PostAdd,
  Psychology,
  QrCodeScanner,
  Receipt,
  ReceiptLong,
  Settings,
  TrendingUp,
  ViewKanban,
} from '@mui/icons-material';
import type { Menu } from '../services/menuService';

const MENU_ICON_MAP: Record<string, React.ReactElement> = {
  dashboard: <Dashboard />,
  inventory: <Inventory />,
  description: <Description />,
  receipt: <Receipt />,
  receipt_long: <ReceiptLong />,
  local_shipping: <LocalShipping />,
  people: <People />,
  account_balance: <AccountBalance />,
  assessment: <Assessment />,
  person: <Person />,
  settings: <Settings />,
  notifications: <Notifications />,
  psychology: <Psychology />,
  chat: <Chat />,
  attach_money: <AttachMoney />,
  event_available: <EventAvailable />,
  category: <Category />,
  view_kanban: <ViewKanban />,
  move_to_inbox: <MoveToInbox />,
  post_add: <PostAdd />,
  qr_code_scanner: <QrCodeScanner />,
  business: <Business />,
  email: <Email />,
  trending_up: <TrendingUp />,
};

export function getMenuIconByName(iconName?: string | null): React.ReactElement {
  const key = String(iconName || '').trim().toLowerCase();
  return MENU_ICON_MAP[key] || <MenuIcon />;
}

export function getPageIconByRoute(route: string): React.ReactElement | null {
  const normalized = String(route || '').toLowerCase();

  if (normalized.includes('/dashboard')) return <Dashboard />;
  if (normalized.includes('/basic-info/company')) return <AccountBalance />;
  if (normalized.includes('/basic-info/partners')) return <People />;
  if (normalized.includes('/basic-info/organization')) return <Category />;
  if (normalized.includes('/basic-info/menu-permissions')) return <Settings />;
  if (normalized.includes('/basic-info/login-info')) return <Person />;
  if (normalized.includes('/basic-info/system-settings')) return <Settings />;
  if (normalized.includes('/basic-info/mail-send-test')) return <Email />;
  if (normalized.includes('/basic-info')) return <Settings />;

  if (normalized.includes('/hr/users')) return <Person />;
  if (normalized.includes('/hr/departments')) return <Business />;
  if (normalized.includes('/hr/attendance/statistics')) return <Assessment />;
  if (normalized.includes('/hr/attendance')) return <EventAvailable />;
  if (normalized.includes('/hr/payroll')) return <AttachMoney />;
  if (normalized.includes('/hr/leave') || normalized.includes('/hr/vacation')) return <EventAvailable />;
  if (normalized.includes('/hr/employment-contracts')) return <Description />;
  if (normalized.includes('/hr')) return <People />;

  if (normalized.includes('/work/projects')) return <ViewKanban />;
  if (normalized.includes('/work/statistics')) return <Assessment />;
  if (normalized.includes('/work/approval')) return <Description />;
  if (normalized.includes('/work/room')) return <LocalShipping />;
  if (normalized.includes('/work/reports')) return <ReceiptLong />;
  if (normalized.includes('/work')) return <ViewKanban />;

  if (normalized.includes('/hotel/front-desk')) return <Dashboard />;
  if (normalized.includes('/hotel/reservations')) return <EventAvailable />;
  if (normalized.includes('/hotel/room-types')) return <Inventory />;
  if (normalized.includes('/hotel')) return <Dashboard />;

  if (normalized.includes('/inventory/stock-in')) return <PostAdd />;
  if (normalized.includes('/inventory/stock-out')) return <QrCodeScanner />;
  if (normalized.includes('/inventory/basic')) return <Inventory />;
  if (normalized.includes('/inventory/status')) return <Assessment />;
  if (normalized.includes('/inventory/transaction')) return <AttachMoney />;
  if (normalized.includes('/inventory/report')) return <ReceiptLong />;
  if (normalized.includes('/inventory')) return <Inventory />;

  if (normalized.includes('/accounting/e-invoice')) return <ReceiptLong />;
  if (normalized.includes('/accounting/eway')) return <LocalShipping />;
  if (normalized.includes('/accounting/expense')) return <AttachMoney />;
  if (normalized.includes('/accounting/assets')) return <AccountBalance />;
  if (normalized.includes('/accounting/statistics')) return <Assessment />;
  if (normalized.includes('/accounting')) return <AttachMoney />;

  if (normalized.includes('/customers') || normalized.includes('/sales')) return <TrendingUp />;
  if (normalized.includes('/quotation')) return <Description />;
  if (normalized.includes('/invoice') || normalized.includes('/invoices')) return <ReceiptLong />;
  if (normalized.includes('/projects')) return <Category />;
  if (normalized.includes('/organization')) return <Category />;
  if (normalized.includes('/company')) return <AccountBalance />;
  if (normalized.includes('/partners')) return <People />;
  if (normalized.includes('/users')) return <Person />;
  if (normalized.includes('/attendance')) return <EventAvailable />;
  if (normalized.includes('/notifications')) return <Notifications />;
  if (normalized.includes('/notice')) return <Notifications />;
  if (normalized.includes('/communication')) return <Notifications />;
  if (normalized.includes('/ai/')) return <Psychology />;
  if (normalized.includes('/reports/')) return <Assessment />;
  if (normalized.includes('/tasks')) return <ViewKanban />;

  return null;
}

export function resolvePageIcon(route: string, menu?: Menu | null): React.ReactElement {
  const routeIcon = getPageIconByRoute(route);
  if (routeIcon) return routeIcon;
  if (menu?.icon) return getMenuIconByName(menu.icon);

  const ko = String(menu?.name_ko || '');
  const en = String(menu?.name_en || '').toLowerCase();
  if (ko.includes('기초') || en.includes('basic')) return <Settings />;
  if (ko.includes('인사') || en.includes('hr')) return <People />;
  if (ko.includes('업무') || en.includes('work')) return <ViewKanban />;
  if (ko.includes('호텔') || en.includes('hotel')) return <Dashboard />;
  if (ko.includes('재고') || en.includes('inventory')) return <Inventory />;
  if (ko.includes('회계') || en.includes('accounting')) return <AttachMoney />;
  if (ko.includes('공지') || en.includes('notice')) return <Notifications />;

  return <MenuIcon />;
}
