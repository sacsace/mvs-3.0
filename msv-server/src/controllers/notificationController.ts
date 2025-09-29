import { Request, Response } from 'express';
import SocketService from '../services/socketService';

interface NotificationRequest extends Request {
  body: {
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    target_type: 'user' | 'tenant' | 'all';
    target_id?: number;
    data?: any;
  };
}

export const sendNotification = async (req: NotificationRequest, res: Response) => {
  try {
    const { title, message, type, target_type, target_id, data } = req.body;

    if (!title || !message || !type || !target_type) {
      return res.status(400).json({
        success: false,
        message: '필수 필드를 입력해주세요.'
      });
    }

    const notification = {
      id: Date.now(),
      title,
      message,
      type,
      data,
      timestamp: new Date().toISOString(),
      read: false
    };

    // SocketService를 통해 실시간 알림 전송
    const socketService = (req as any).socketService as SocketService;
    
    switch (target_type) {
      case 'user':
        if (target_id) {
          socketService.sendNotificationToUser(target_id, notification);
        }
        break;
      case 'tenant':
        socketService.sendNotificationToTenant((req as any).user.tenant_id, notification);
        break;
      case 'all':
        socketService.sendSystemNotification(notification);
        break;
    }

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
    // 실제로는 데이터베이스에서 알림 목록을 조회
    const notifications = [
      {
        id: 1,
        title: '시스템 업데이트',
        message: 'MVS 3.0 시스템이 업데이트되었습니다.',
        type: 'info',
        timestamp: new Date().toISOString(),
        read: false
      },
      {
        id: 2,
        title: '새로운 사용자 등록',
        message: '새로운 사용자가 등록되었습니다.',
        type: 'success',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        read: true
      }
    ];

    res.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    console.error('알림 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
};
