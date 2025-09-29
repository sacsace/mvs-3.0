// MVS 3.0 Backend - 실제 데이터베이스 연동 서버

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from 'dotenv';
import { connectDB } from './models';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import menuRoutes from './routes/menus';
import notificationRoutes from './routes/notifications';
import SocketService from './services/socketService';
import { createServer } from 'http';

// 환경 변수 로드
config();

const app = express();
const PORT = process.env.PORT || 5000;
const server = createServer(app);

// 데이터베이스 연결
connectDB();

// Socket.IO 서비스 초기화
const socketService = new SocketService(server);

// 미들웨어 설정
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting (개발용으로 완화)
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1분
  max: 1000, // 최대 1000 요청
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// 기본 라우트
app.get('/', (req, res) => {
  res.json({
    message: 'MVS 3.0 Backend Server',
    version: '3.0.0',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// 헬스체크 엔드포인트
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API 라우트
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'API is healthy',
    timestamp: new Date().toISOString()
  });
});

// SocketService를 미들웨어로 추가
app.use((req: any, res, next) => {
  req.socketService = socketService;
  next();
});

// 실제 API 라우트
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/menus', menuRoutes);
app.use('/api/notifications', notificationRoutes);

// 메뉴 데이터 API (한글 지원)
app.get('/api/menus', async (req, res) => {
  try {
    const { Menu } = require('./models');
    const menus = await Menu.findAll({
      where: { tenant_id: 1, is_active: true },
      order: [['order', 'ASC']]
    });
    
    res.json({
      success: true,
      data: menus
    });
  } catch (error) {
    console.error('메뉴 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '메뉴 조회 중 오류가 발생했습니다.'
    });
  }
});

// 사용자 정보 API (한글 지원)
app.get('/api/users', async (req, res) => {
  try {
    const { User } = require('./models');
    const users = await User.findAll({
      where: { tenant_id: 1 },
      attributes: { exclude: ['password_hash'] }
    });
    
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('사용자 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '사용자 조회 중 오류가 발생했습니다.'
    });
  }
});

// 알림 데이터 API (한글 지원)
app.get('/api/notifications', async (req, res) => {
  try {
    const { Notification } = require('./models');
    const notifications = await Notification.findAll({
      where: { tenant_id: 1 },
      order: [['created_at', 'DESC']],
      limit: 10
    });
    
    res.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    console.error('알림 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '알림 조회 중 오류가 발생했습니다.'
    });
  }
});

// AI 분석 API
app.get('/api/ai/analysis', (req, res) => {
  const aiService = require('./services/aiService').default;

  // 샘플 데이터로 분석 수행
  const sampleData = {
    userId: 1,
    actions: ['login', 'view_dashboard', 'create_task', 'update_user', 'logout'],
    timestamps: [Date.now() - 3600000, Date.now() - 3000000, Date.now() - 2400000, Date.now() - 1800000, Date.now() - 600000],
    duration: 3000000
  };

  const analysis = aiService.analyzeUserBehavior(sampleData);
  const recommendations = aiService.recommendMenus(1, new Date());
  const insights = aiService.generateInsights([sampleData]);

  res.json({
    success: true,
    data: {
      analysis,
      recommendations,
      insights
    }
  });
});

// 404 핸들러
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.originalUrl
  });
});

// 에러 핸들러
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 서버 시작
server.listen(PORT, () => {
  console.log(`🚀 MVS 3.0 Backend Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🌐 API base URL: http://localhost:${PORT}/api`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
  console.log(`🤖 AI Analysis: http://localhost:${PORT}/api/ai/analysis`);
});

export default app;