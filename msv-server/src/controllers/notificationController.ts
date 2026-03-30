import { Request, Response } from 'express';
import SocketService from '../services/socketService';

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
    target_id,
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
      return notification.target_type === 'user' && notification.target_id === userId;
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
      (notification.target_type === 'user' && notification.target_id === userId);

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
      (notification.target_type === 'user' && notification.target_id === userId);

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
