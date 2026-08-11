import type { UserUiPreferencesData } from '../services/api/domains/userPreferences';

export type NotificationSettings = NonNullable<UserUiPreferencesData['notificationSettings']>;

/** 알림 수신 기본값 (메일 설정·알림 관리 공용) */
export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  realtime: true,
  email: true,
  browser: true,
  system: true,
  approval: true,
  vacation: true,
  expense: true,
  workReport: true,
  workBoard: true,
  emailDigest: 'immediate',
};

export const NOTIFICATION_CATEGORY_KEYS = [
  'system',
  'approval',
  'vacation',
  'expense',
  'workReport',
  'workBoard',
] as const;

export type NotificationCategoryKey = (typeof NOTIFICATION_CATEGORY_KEYS)[number];
