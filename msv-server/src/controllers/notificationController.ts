import { Request, Response } from 'express';
import SocketService from '../services/socketService';
import { ExpenseReport, Vacation, Quotation, User, Customer } from '../models';
import { Op } from 'sequelize';

type NotificationTarget = 'user' | 'tenant' | 'all';

interface NotificationRecord {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  data?: any;
  timestamp: string;
  read: boolean;
  target_type: NotificationTarget;
  target_id?: number;
  tenant_id?: number;
}

const notificationsStore: NotificationRecord[] = [];

/** user 타입 불일치(문자/숫자)로 멘션 알림 등이 목록에서 빠지지 않도록 비교 */
function isNotificationForUser(notification: NotificationRecord, userId: number | undefined): boolean {
  if (notification.target_type !== 'user' || userId == null) return false;
  return Number(notification.target_id) === Number(userId);
}

const parseExpenseItemsMeta = (itemsValue: any) => {
  if (!itemsValue) return {};
  if (typeof itemsValue === 'string') {
    try {
      const parsed = JSON.parse(itemsValue);
      return parsed?.meta || {};
    } catch {
      return {};
    }
  }
  if (typeof itemsValue === 'object' && itemsValue !== null) {
    return (itemsValue as any).meta || {};
  }
  return {};
};

const canApproveExpensePayment = (expense: any, user: any) => {
  if (!user) return false;
  // 본인이 요청한 결제는 '받은 알림' 대상 아님
  if (expense.requester_id != null && Number(expense.requester_id) === Number(user.id)) {
    return false;
  }
  if (user.role === 'admin' || user.role === 'root' || user.role === 'audit') return true;
  const meta = parseExpenseItemsMeta(expense.items);
  const approvedById = meta.approvedById ? Number(meta.approvedById) : null;
  return approvedById !== null && approvedById === user.id;
};

const isElevatedRole = (role: string | undefined) =>
  role === 'admin' || role === 'root' || role === 'audit';

/** 결제·휴가·견적 등 승인 대기 건 — 알림 드롭다운용 */
const isMissingTableError = (error: any) =>
  error?.name === 'SequelizeDatabaseError' &&
  (String(error?.message || '').includes('relation') ||
    String(error?.message || '').includes('does not exist') ||
    String(error?.message || '').includes('릴레이션'));

export const getActionInbox = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userId = user?.id;
    const tenantId = user?.tenant_id;
    const companyId = user?.company_id;
    const userRole = user?.role;

    if (!userId) {
      return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
    }

    const items: Array<{
      id: string;
      kind: 'expense_payment' | 'vacation_pending' | 'quotation_pending';
      timestamp: string;
      href: string;
      payload: Record<string, unknown>;
    }> = [];

    const baseCompany = (where: any) => {
      if (tenantId) where.tenant_id = tenantId;
      if (companyId) where.company_id = companyId;
    };

    // 1) 지출결의서 결제 승인 대기
    try {
      const expenseWhere: any = {
        is_active: true,
        payment_request_status: 'requested'
      };
      baseCompany(expenseWhere);

      const expenses = await (ExpenseReport as any).findAll({
        where: expenseWhere,
        order: [['payment_requested_at', 'DESC']],
        limit: 40
      });

      for (const exp of expenses) {
        const row = exp.toJSON ? exp.toJSON() : exp;
        if (!canApproveExpensePayment(row, user)) continue;
        const reqAt = row.payment_requested_at || row.updated_at || row.created_at;
        items.push({
          id: `expense_payment-${row.id}`,
          kind: 'expense_payment',
          timestamp: reqAt ? new Date(reqAt).toISOString() : new Date().toISOString(),
          href: '/accounting/expense',
          payload: {
            expenseId: row.id,
            requesterName: row.requester_name || '',
            expenseTitle: row.title || row.expense_id || '',
            amount: row.total_amount != null ? String(row.total_amount) : '',
            currency: row.currency || 'KRW'
          }
        });
      }
    } catch (expenseError) {
      if (!isMissingTableError(expenseError)) throw expenseError;
      console.warn('알림 인박스: expense_reports 조회 건너뜀 —', (expenseError as Error).message);
    }

    // 2) 휴가 승인 대기 — 타인이 신청한 건만 (본인 신청 분은 제외)
    try {
      const vacWhere: any = {
        is_active: true,
        status: 'pending',
        user_id: { [Op.ne]: userId }
      };
      baseCompany(vacWhere);
      if (!isElevatedRole(userRole)) {
        vacWhere.approved_by = userId;
      }

      const vacations = await (Vacation as any).findAll({
        where: vacWhere,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username'],
            required: false
          }
        ],
        order: [['applied_date', 'DESC']],
        limit: 40
      });

      for (const v of vacations) {
        const row = v.toJSON ? v.toJSON() : v;
        const start = row.start_date ? String(row.start_date).slice(0, 10) : '';
        const end = row.end_date ? String(row.end_date).slice(0, 10) : '';
        items.push({
          id: `vacation_pending-${row.id}`,
          kind: 'vacation_pending',
          timestamp: row.applied_date
            ? new Date(row.applied_date).toISOString()
            : new Date().toISOString(),
          href: '/hr/leave',
          payload: {
            vacationId: row.id,
            applicantName: (row as any).user?.username || '',
            start,
            end,
            days: row.days != null ? Number(row.days) : 0,
            vacationType: row.vacation_type || ''
          }
        });
      }
    } catch (vacationError) {
      if (!isMissingTableError(vacationError)) throw vacationError;
      console.warn('알림 인박스: vacations 조회 건너뜀 —', (vacationError as Error).message);
    }

    // 3) 견적서 승인 대기 — 내가 작성한 견적은 제외(남이 올려 나에게 승인이 온 건만)
    try {
      const qWhere: any = {
        is_active: true,
        status: 'pending_approval',
        created_by: { [Op.ne]: userId }
      };
      baseCompany(qWhere);
      if (!isElevatedRole(userRole)) {
        qWhere.approver_user_id = userId;
      }

      const quotations = await (Quotation as any).findAll({
        where: qWhere,
        include: [
          {
            model: Customer,
            as: 'customer',
            attributes: ['id', 'name'],
            required: false
          }
        ],
        order: [['created_at', 'DESC']],
        limit: 40
      });

      for (const q of quotations) {
        const row = q.toJSON ? q.toJSON() : q;
        items.push({
          id: `quotation_pending-${row.id}`,
          kind: 'quotation_pending',
          timestamp: row.created_at
            ? new Date(row.created_at).toISOString()
            : new Date().toISOString(),
          href: '/work/quotation',
          payload: {
            quotationId: row.id,
            quotationNumber: row.quotation_number || row.id,
            customerName: (row as any).customer?.name || ''
          }
        });
      }
    } catch (quotationError) {
      if (!isMissingTableError(quotationError)) throw quotationError;
      console.warn('알림 인박스: quotations 조회 건너뜀 —', (quotationError as Error).message);
    }

    items.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    res.json({ success: true, data: items });
  } catch (error) {
    console.error('알림 인박스 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '알림 인박스를 불러오지 못했습니다.'
    });
  }
};

interface NotificationRequest extends Request {
  body: {
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    target_type: NotificationTarget;
    target_id?: number;
    data?: any;
  };
}

interface NotificationPayload {
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  target_type: NotificationTarget;
  target_id?: number;
  data?: any;
  tenant_id?: number;
}

export const pushNotification = (
  payload: NotificationPayload,
  socketService?: SocketService
) => {
  const {
    title,
    message,
    type,
    target_type,
    target_id,
    data,
    tenant_id
  } = payload;

  const notification: NotificationRecord = {
    id: Date.now(),
    title,
    message,
    type,
    data,
    timestamp: new Date().toISOString(),
    read: false,
    target_type,
    target_id: target_id !== undefined && target_id !== null ? Number(target_id) : undefined,
    tenant_id: target_type === 'tenant' ? tenant_id : undefined
  };

  notificationsStore.unshift(notification);

  if (socketService) {
    switch (target_type) {
      case 'user':
        if (target_id) {
          socketService.sendNotificationToUser(target_id, notification);
        }
        break;
      case 'tenant':
        if (tenant_id) {
          socketService.sendNotificationToTenant(tenant_id, notification);
        }
        break;
      case 'all':
        socketService.sendSystemNotification(notification);
        break;
    }
  }

  return notification;
};

export const sendNotification = async (req: NotificationRequest, res: Response) => {
  try {
    const { title, message, type, target_type, target_id, data } = req.body;

    if (!title || !message || !type || !target_type) {
      return res.status(400).json({
        success: false,
        message: '필수 필드를 입력해주세요.'
      });
    }

    const tenantId = (req as any).user?.tenant_id;
    const socketService = (req as any).socketService as SocketService;
    const notification = pushNotification(
      {
        title,
        message,
        type,
        target_type,
        target_id,
        data,
        tenant_id: tenantId
      },
      socketService
    );

    res.json({
      success: true,
      data: notification,
      message: '알림이 전송되었습니다.'
    });
  } catch (error) {
    console.error('알림 전송 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
};

export const getNotifications = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20; // 기본 20개만 반환
    const offset = (page - 1) * limit;
    const userId = (req as any).user?.id;
    const tenantId = (req as any).user?.tenant_id;

    const filteredNotifications = notificationsStore.filter((notification) => {
      if (notification.target_type === 'all') {
        return true;
      }
      if (notification.target_type === 'tenant') {
        return notification.tenant_id === tenantId;
      }
      return isNotificationForUser(notification, userId);
    });

    const notifications = filteredNotifications.slice(offset, offset + limit);
    const totalCount = filteredNotifications.length;

    res.json({
      success: true,
      data: notifications,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('알림 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
};

export const updateNotification = async (req: Request, res: Response) => {
  try {
    const notificationId = Number(req.params.id);
    const { read, title, message, type, data } = req.body || {};
    const userId = (req as any).user?.id;
    const tenantId = (req as any).user?.tenant_id;

    const notification = notificationsStore.find((item) => item.id === notificationId);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: '알림을 찾을 수 없습니다.'
      });
    }

    const isAccessible =
      notification.target_type === 'all' ||
      (notification.target_type === 'tenant' && notification.tenant_id === tenantId) ||
      isNotificationForUser(notification, userId);

    if (!isAccessible) {
      return res.status(403).json({
        success: false,
        message: '알림에 대한 권한이 없습니다.'
      });
    }

    if (typeof read === 'boolean') {
      notification.read = read;
    }
    if (title) {
      notification.title = title;
    }
    if (message) {
      notification.message = message;
    }
    if (type) {
      notification.type = type;
    }
    if (data !== undefined) {
      notification.data = data;
    }

    res.json({
      success: true,
      data: notification,
      message: '알림이 업데이트되었습니다.'
    });
  } catch (error) {
    console.error('알림 업데이트 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
};

export const deleteNotification = async (req: Request, res: Response) => {
  try {
    const notificationId = Number(req.params.id);
    const userId = (req as any).user?.id;
    const tenantId = (req as any).user?.tenant_id;

    const notificationIndex = notificationsStore.findIndex((item) => item.id === notificationId);

    if (notificationIndex === -1) {
      return res.status(404).json({
        success: false,
        message: '알림을 찾을 수 없습니다.'
      });
    }

    const notification = notificationsStore[notificationIndex];
    const isAccessible =
      notification.target_type === 'all' ||
      (notification.target_type === 'tenant' && notification.tenant_id === tenantId) ||
      isNotificationForUser(notification, userId);

    if (!isAccessible) {
      return res.status(403).json({
        success: false,
        message: '알림에 대한 권한이 없습니다.'
      });
    }

    notificationsStore.splice(notificationIndex, 1);

    res.json({
      success: true,
      message: '알림이 삭제되었습니다.'
    });
  } catch (error) {
    console.error('알림 삭제 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
};
