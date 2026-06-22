/** `useTranslation().t` — i18next 버전별 TFunction export 차이 회피 */
export type I18nTranslate = (key: string, options?: Record<string, unknown>) => string;

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  details?: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'success' | 'error';
  read: boolean;
  href?: string;
  inboxChip?: 'payment' | 'vacation' | 'quotation';
  source?: 'error' | 'notification' | 'server' | 'inbox';
}

export interface ActionInboxRow {
  id: string;
  kind: 'expense_payment' | 'vacation_pending' | 'quotation_pending';
  timestamp: string;
  href: string;
  payload: Record<string, unknown>;
}

export interface ServerNotificationItem {
  id: number | string;
  title?: string;
  message: string;
  type?: 'info' | 'warning' | 'success' | 'error';
  timestamp?: string;
  read?: boolean;
  data?: Record<string, unknown>;
}

export function hrefFromServerNotificationData(data: unknown): string | undefined {
  if (data == null || typeof data !== 'object') return undefined;
  const d = data as Record<string, unknown>;
  if (d.feature !== 'work_report') return undefined;
  const rawId = d.id;
  const reportId =
    typeof rawId === 'number' && Number.isInteger(rawId)
      ? rawId
      : parseInt(String(rawId ?? ''), 10);
  if (!Number.isInteger(reportId) || reportId <= 0) return undefined;
  const list =
    d.list === 'authored' || d.list === 'received' || d.list === 'cc' ? d.list : 'received';
  return `/work/reports?report=${reportId}&list=${list}`;
}

export const mapInboxRowToNotification = (
  row: ActionInboxRow,
  t: I18nTranslate
): AppNotification => {
  const ts = row.timestamp || new Date().toISOString();
  const p = row.payload || {};

  if (row.kind === 'expense_payment') {
    return {
      id: `inbox-${row.id}`,
      title: t('common.notificationInbox.expenseTitle'),
      message: t('common.notificationInbox.expenseBody', {
        requester: String(p.requesterName ?? ''),
        title: String(p.expenseTitle ?? ''),
        amount: String(p.amount ?? ''),
        currency: String(p.currency ?? ''),
      }),
      timestamp: ts,
      severity: 'warning',
      read: false,
      href: row.href,
      inboxChip: 'payment',
      source: 'inbox',
    };
  }

  if (row.kind === 'vacation_pending') {
    return {
      id: `inbox-${row.id}`,
      title: t('common.notificationInbox.vacationTitle'),
      message: t('common.notificationInbox.vacationBody', {
        name: String(p.applicantName ?? '—'),
        start: String(p.start ?? ''),
        end: String(p.end ?? ''),
        days: String(p.days ?? ''),
      }),
      timestamp: ts,
      severity: 'info',
      read: false,
      href: row.href,
      inboxChip: 'vacation',
      source: 'inbox',
    };
  }

  return {
    id: `inbox-${row.id}`,
    title: t('common.notificationInbox.quotationTitle'),
    message: t('common.notificationInbox.quotationBody', {
      customer: String(p.customerName ?? '—'),
      number: String(p.quotationNumber ?? ''),
    }),
    timestamp: ts,
    severity: 'success',
    read: false,
    href: row.href,
    inboxChip: 'quotation',
    source: 'inbox',
  };
};

export function buildNotificationsFromSources(params: {
  serverNotifications: ServerNotificationItem[];
  clientNotifications: Array<{
    id: string;
    message: string;
    severity: 'info' | 'warning' | 'success';
    timestamp: Date;
  }>;
  errors: Array<{
    id: string;
    title: string;
    message: string;
    details?: string;
    timestamp: Date;
    type?: 'error' | 'warning' | 'info';
  }>;
  inboxActions: ActionInboxRow[];
  t: I18nTranslate;
}): AppNotification[] {
  const { serverNotifications, clientNotifications, errors, inboxActions, t } = params;
  const items: AppNotification[] = [];

  inboxActions.forEach((row) => {
    items.push(mapInboxRowToNotification(row, t));
  });

  serverNotifications.forEach((item) => {
    const href = hrefFromServerNotificationData(item.data);
    items.push({
      id: `server-${item.id}`,
      title: item.title || t('common.notification'),
      message: item.message,
      timestamp: item.timestamp || new Date().toISOString(),
      severity: (item.type || 'info') as AppNotification['severity'],
      read: Boolean(item.read),
      ...(href ? { href } : {}),
      source: 'server',
    });
  });

  clientNotifications.forEach((item) => {
    items.push({
      id: `notification-${item.id}`,
      title: t('common.notification'),
      message: item.message,
      timestamp: item.timestamp.toISOString(),
      severity: item.severity,
      read: false,
      source: 'notification',
    });
  });

  errors.forEach((item) => {
    items.push({
      id: `error-${item.id}`,
      title: item.title || t('common.notification'),
      message: item.message,
      timestamp: item.timestamp.toISOString(),
      severity: (item.type || 'error') as AppNotification['severity'],
      read: false,
      source: 'error',
    });
  });

  items.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return items;
}

export function getNotificationChipLabel(
  item: AppNotification,
  t: I18nTranslate
): string {
  if (item.inboxChip === 'payment') return t('common.notificationInbox.chipPayment');
  if (item.inboxChip === 'vacation') return t('common.notificationInbox.chipVacation');
  if (item.inboxChip === 'quotation') return t('common.notificationInbox.chipQuotation');
  return item.severity.toUpperCase();
}

export function getNotificationChipColor(
  item: AppNotification
): 'warning' | 'info' | 'secondary' | 'error' | 'success' {
  if (item.inboxChip === 'payment') return 'warning';
  if (item.inboxChip === 'vacation') return 'info';
  if (item.inboxChip === 'quotation') return 'secondary';
  if (item.severity === 'error') return 'error';
  if (item.severity === 'warning') return 'warning';
  if (item.severity === 'success') return 'success';
  return 'info';
}
