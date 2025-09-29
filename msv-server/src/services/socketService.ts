import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';

interface AuthenticatedSocket extends Socket {
  user?: {
    id: number;
    userid: string;
    tenant_id: number;
    company_id: number;
  };
}

class SocketService {
  private io: SocketIOServer;
  private connectedUsers: Map<number, string> = new Map();

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        methods: ['GET', 'POST']
      }
    });

    this.setupSocketHandlers();
  }

  private setupSocketHandlers() {
    this.io.use((socket: AuthenticatedSocket, next) => {
      // 간단한 인증 (실제로는 JWT 토큰 검증)
      const token = socket.handshake.auth.token;
      if (token) {
        // 토큰 검증 로직 (실제로는 JWT 검증)
        socket.user = {
          id: 1,
          userid: 'testuser',
          tenant_id: 1,
          company_id: 1
        };
      }
      next();
    });

    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`사용자 연결: ${socket.user?.userid}`);

      if (socket.user) {
        this.connectedUsers.set(socket.user.id, socket.id);
      }

      // 사용자별 알림 구독
      socket.on('subscribe_notifications', (data) => {
        if (socket.user) {
          socket.join(`user_${socket.user.id}`);
          socket.join(`tenant_${socket.user.tenant_id}`);
        }
      });

      // 채팅방 참여
      socket.on('join_room', (roomId: string) => {
        socket.join(`room_${roomId}`);
        socket.to(`room_${roomId}`).emit('user_joined', {
          user: socket.user?.userid,
          message: `${socket.user?.userid}님이 참여했습니다.`
        });
      });

      // 채팅 메시지 전송
      socket.on('send_message', (data) => {
        const { roomId, message, type = 'text' } = data;
        socket.to(`room_${roomId}`).emit('new_message', {
          id: Date.now(),
          user: socket.user?.userid,
          message,
          type,
          timestamp: new Date().toISOString()
        });
      });

      // 연결 해제
      socket.on('disconnect', () => {
        if (socket.user) {
          this.connectedUsers.delete(socket.user.id);
          console.log(`사용자 연결 해제: ${socket.user.userid}`);
        }
      });
    });
  }

  // 사용자에게 알림 전송
  sendNotificationToUser(userId: number, notification: any) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.io.to(socketId).emit('notification', notification);
    }
  }

  // 테넌트 전체에 알림 전송
  sendNotificationToTenant(tenantId: number, notification: any) {
    this.io.to(`tenant_${tenantId}`).emit('notification', notification);
  }

  // 채팅방에 메시지 전송
  sendMessageToRoom(roomId: string, message: any) {
    this.io.to(`room_${roomId}`).emit('new_message', message);
  }

  // 시스템 알림 전송
  sendSystemNotification(notification: any) {
    this.io.emit('system_notification', notification);
  }

  getIO() {
    return this.io;
  }
}

export default SocketService;
