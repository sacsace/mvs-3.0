// MVS Backend - 실제 데이터베이스 연동 서버

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Op, fn, col } from 'sequelize';
// 환경 변수 로드 (env.ts에서 monorepo .env 포함 로드)
import { validateEnv, printEnvInfo } from './config/env';
import { connectDB, Menu, Company, Invoice, Customer, Product, User, RoomBooking } from './models';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import menuRoutes from './routes/menuRoutes';
import notificationRoutes from './routes/notifications';
import companyRoutes from './routes/companies';
import customerRoutes from './routes/customers';
import contractRoutes from './routes/contracts';
import supportTicketRoutes from './routes/supportTickets';
import accountingRoutes from './routes/accounting';
import inventoryRoutes from './routes/inventory';
import hrRoutes from './routes/hr';
import projectRoutes from './routes/projects';
import partnerRoutes from './routes/partners';
import systemSettingsRoutes from './routes/systemSettings';
import workRoutes from './routes/work';
import quotationRoutes from './routes/quotations';
import communicationRoutes from './routes/communication';
import aiRoutes from './routes/ai';
import loginInfoRoutes from './routes/loginInfo';
import integrationsRoutes from './routes/integrations';
import systemBootstrapRoutes from './routes/systemBootstrap';
import { startAttendanceAutoCheckoutScheduler } from './controllers/attendanceController';
import SocketService from './services/socketService';
import aiService from './services/aiService';
import { createServer } from 'http';
import path from 'path';
import { isCorsAllowLanEnabled, isPrivateLanHttpOrigin } from './utils/corsPrivateLan';

// 환경 변수 검증 및 출력
validateEnv();
if (process.env.NODE_ENV === 'development') {
  printEnvInfo();
}

const app = express();
/** Railway 등 리버스 프록시 뒤에서 클라이언트 IP·Rate limit이 올바르게 동작하도록 */
if (process.env.NODE_ENV === 'production' || process.env.TRUST_PROXY === '1') {
  app.set('trust proxy', 1);
}
app.disable('x-powered-by');

const sanitizeLogPayload = (payload: any) => {
  if (!payload || typeof payload !== 'object') return payload;
  const sensitiveKeys = ['password', 'token', 'authorization', 'jwt', 'secret', 'apiKey', 'api_key', 'password_hash'];
  const clone: any = Array.isArray(payload) ? [] : {};
  for (const [key, value] of Object.entries(payload)) {
    if (sensitiveKeys.includes(key.toLowerCase())) {
      clone[key] = '***';
    } else if (value && typeof value === 'object') {
      clone[key] = sanitizeLogPayload(value);
    } else {
      clone[key] = value;
    }
  }
  return clone;
};

// Port configuration for Railway deployment
const parsedPort = Number.parseInt(process.env.PORT || '', 10);
const PORT = Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 5000;
const HOST = process.env.HOST || '0.0.0.0';

// Railway handles SSL automatically, so we only use HTTP server
// SSL termination is handled by Railway's load balancer
const server = createServer(app);

// 데이터베이스 연결
connectDB()
  .then(() => {
    startAttendanceAutoCheckoutScheduler();
  })
  .catch((error) => {
    console.error('Database connection error:', error);
    console.error('Server will continue but database operations may fail.');
  });

// Socket.IO 서비스 초기화
const socketService = new SocketService(server);

// 미들웨어 설정
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
if (process.env.NODE_ENV === 'production') {
  app.use(helmet.hsts({
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }));
}
// CORS 설정 - 여러 origin 허용
const getCorsOrigins = (): string[] => {
  // 환경 변수가 명시적으로 설정되어 있으면 사용
  if (process.env.CORS_ORIGIN) {
    return process.env.CORS_ORIGIN.split(',').map(origin => origin.trim());
  }

  if (process.env.NODE_ENV === 'production') {
    return [];
  }

  // 개발 환경 기본값
  return ['http://localhost:3000'];
};

const allowedOrigins = getCorsOrigins();

// CORS 설정
app.use(cors({
  origin: (origin, callback) => {
    // origin이 없는 경우 (같은 도메인 요청, 모바일 앱 등) 허용
    if (!origin) {
      return callback(null, true);
    }

    // 허용된 origin 목록에 있는지 확인
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // 개발 환경에서는 모든 origin 허용 (편의상)
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }

    // 프로덕션 등: CORS_ALLOW_LAN=1 이면 사설망 IP로 접속한 프론트 오리진 허용
    if (isCorsAllowLanEnabled() && isPrivateLanHttpOrigin(origin)) {
      return callback(null, true);
    }

    // 그 외의 경우 거부
    callback(new Error('CORS 정책에 의해 차단되었습니다.'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-skip-error-popup']
}));
const REQUEST_BODY_LIMIT = process.env.REQUEST_BODY_LIMIT || '50mb';
app.use(express.json({ limit: REQUEST_BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: REQUEST_BODY_LIMIT }));

// Rate limiting (개발용으로 완화)
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1분
  max: 1000,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // 헬스체크와 정적 파일은 제외
    return req.path === '/health' || req.path === '/api/health' || req.path.startsWith('/static');
  }
});
app.use(limiter);

const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 100,
  message: 'Too many upload attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

// 기본 라우트
app.get('/', (req, res) => {
  res.json({
    message: 'MVS Backend Server',
    version: '3.0.0',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// 헬스체크 엔드포인트
app.get('/health', (req, res) => {
  const baseHealth = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  };

  if (process.env.NODE_ENV === 'development') {
    return res.json({
      ...baseHealth,
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development'
    });
  }

  return res.json(baseHealth);
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

// 업로드 파일 정적 제공
const uploadPath = process.env.UPLOAD_PATH || './uploads';
app.use('/uploads', express.static(path.resolve(uploadPath), {
  dotfiles: 'deny',
  index: false,
  redirect: false
}));

// 테스트용 API 제거 - 실제 menuRoutes에서 권한 기반으로 처리

// 업로드 엔드포인트 별도 제한
app.use('/api/work/approvals/upload', uploadLimiter);
app.use('/api/users/excel/import', uploadLimiter);
app.use('/api/partners/excel/import', uploadLimiter);
app.use('/api/login-info/import', uploadLimiter);
app.use('/api/inventory/products/excel/bulk-update', uploadLimiter);

// 실제 API 라우트
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/menus', menuRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/support-tickets', supportTicketRoutes);
app.use('/api/accounting', accountingRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/hr', hrRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/partners', partnerRoutes);
app.use('/api/system-settings', systemSettingsRoutes);
app.use('/api/work', workRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/communication', communicationRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/login-info', loginInfoRoutes);
app.use('/api/integrations', integrationsRoutes);
app.use('/api/system', systemBootstrapRoutes);

// 메뉴 데이터 API (한글 지원)
app.get('/api/menus', async (req, res) => {
  try {
    const menus = await Menu.findAll({
      where: { tenant_id: 1, is_active: true },
      order: [['order', 'ASC']]
    });
    
    res.json({
      success: true,
      data: menus
    });
  } catch (error: any) {
    console.error('메뉴 조회 오류:', error);
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name
    });
    res.status(500).json({
      success: false,
      message: '메뉴 조회 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
});

// 회사 정보 API (테스트용 - 인증 우회)
app.get('/api/company', async (req, res) => {
  try {
    const companies = await Company.findAll({
      where: { tenant_id: 1 },
      order: [['created_at', 'DESC']]
    });
    
    // 이미지 데이터를 Base64로 변환 및 직원 수 계산
    const companiesData = await Promise.all(companies.map(async (company) => {
      const companyData: any = company.toJSON();
      
      // Buffer 데이터를 Base64 문자열로 변환
      if (companyData.company_logo && Buffer.isBuffer(companyData.company_logo)) {
        companyData.company_logo = `data:image/png;base64,${companyData.company_logo.toString('base64')}`;
      }
      if (companyData.company_seal && Buffer.isBuffer(companyData.company_seal)) {
        companyData.company_seal = `data:image/png;base64,${companyData.company_seal.toString('base64')}`;
      }
      if (companyData.ceo_signature && Buffer.isBuffer(companyData.ceo_signature)) {
        companyData.ceo_signature = `data:image/png;base64,${companyData.ceo_signature.toString('base64')}`;
      }
      
      // 각 회사별 실제 직원 수 계산
      try {
        const employeeCount = await User.count({
          where: {
            company_id: companyData.id,
            status: 'active'
          }
        });
        companyData.employee_count = employeeCount || 0;
      } catch (employeeCountError: any) {
        console.error(`직원 수 계산 오류 (회사 ID: ${companyData.id}):`, employeeCountError);
        companyData.employee_count = 0;
      }
      
      return companyData;
    }));
    
    res.json({
      success: true,
      data: companiesData
    });
  } catch (error: any) {
    console.error('회사 정보 조회 오류:', error);
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name
    });
    res.status(500).json({
      success: false,
      message: '회사 정보 조회 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
});

// 특정 회사 정보 조회 (인증 없이)
app.get('/api/company/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const company = await Company.findOne({
      where: { 
        id: parseInt(id),
        tenant_id: 1 
      }
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: '회사를 찾을 수 없습니다.'
      });
    }

    // 이미지 데이터를 Base64로 변환
    const companyData: any = company.toJSON();
    
    // Buffer 데이터를 Base64 문자열로 변환
    if (companyData.company_logo && Buffer.isBuffer(companyData.company_logo)) {
      companyData.company_logo = `data:image/png;base64,${companyData.company_logo.toString('base64')}`;
    }
    if (companyData.company_seal && Buffer.isBuffer(companyData.company_seal)) {
      companyData.company_seal = `data:image/png;base64,${companyData.company_seal.toString('base64')}`;
    }
    if (companyData.ceo_signature && Buffer.isBuffer(companyData.ceo_signature)) {
      companyData.ceo_signature = `data:image/png;base64,${companyData.ceo_signature.toString('base64')}`;
    }

    res.json({
      success: true,
      data: companyData
    });
  } catch (error: any) {
    console.error('회사 정보 조회 오류:', error);
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name
    });
    res.status(500).json({
      success: false,
      message: '회사 정보 조회 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
});

// 대시보드 통계 API (실제 DB 데이터)
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const tenantId = parseInt(String(req.query.tenantId || process.env.DEFAULT_TENANT_ID || 1));
    const invoiceBaseWhere: any = {
      tenant_id: tenantId,
      is_active: true,
      [Op.or]: [
        { invoice_category: 'regular' },
        { invoice_category: 'e_invoice' },
        { invoice_category: null }
      ]
    };
    
    // 총 매출 계산 - invoices 테이블이 없을 수 있으므로 예외 처리
    let totalRevenue = 0;
    let roomBookingRevenue = 0;
    try {
      totalRevenue = await Invoice.sum('total_amount', {
        where: {
          ...invoiceBaseWhere,
          [Op.and]: [
            {
              [Op.or]: [
                { payment_status: 'paid' },
                { status: 'paid' }
              ]
            }
          ]
        }
      }) || 0;
    } catch (invoiceError: any) {
      if (invoiceError.name === 'SequelizeDatabaseError' && 
          invoiceError.message?.includes('릴레이션') || 
          invoiceError.message?.includes('relation')) {
        console.warn('⚠️ invoices 테이블이 없습니다. 기본값 0 사용');
        totalRevenue = 0;
      } else {
        throw invoiceError;
      }
    }

    try {
      roomBookingRevenue = await RoomBooking.sum('total_amount', {
        where: {
          tenant_id: tenantId,
          payment_status: 'paid',
          is_active: true
        }
      }) || 0;
    } catch (bookingError: any) {
      if (bookingError.name === 'SequelizeDatabaseError' &&
          (bookingError.message?.includes('릴레이션') ||
           bookingError.message?.includes('relation'))) {
        console.warn('⚠️ room_bookings 테이블이 없습니다. 기본값 0 사용');
        roomBookingRevenue = 0;
      } else {
        throw bookingError;
      }
    }
    
    // 고객 수 - customers 테이블이 없을 수 있으므로 예외 처리
    let customerCount = 0;
    try {
      customerCount = await Customer.count({
        where: { tenant_id: tenantId }
      });
    } catch (customerError: any) {
      if (customerError.name === 'SequelizeDatabaseError' && 
          (customerError.message?.includes('릴레이션') || 
           customerError.message?.includes('relation'))) {
        console.warn('⚠️ customers 테이블이 없습니다. 기본값 0 사용');
        customerCount = 0;
      } else {
        throw customerError;
      }
    }
    
    // 인보이스 수 - invoices 테이블이 없을 수 있으므로 예외 처리
    let invoiceCount = 0;
    try {
      invoiceCount = await Invoice.count({
        where: invoiceBaseWhere
      });
    } catch (invoiceError: any) {
      if (invoiceError.name === 'SequelizeDatabaseError' && 
          (invoiceError.message?.includes('릴레이션') || 
           invoiceError.message?.includes('relation'))) {
        console.warn('⚠️ invoices 테이블이 없습니다. 기본값 0 사용');
        invoiceCount = 0;
      } else {
        throw invoiceError;
      }
    }
    
    // 재고 수량 - products 테이블이 없을 수 있으므로 예외 처리
    let inventoryCount = 0;
    try {
      inventoryCount = await Product.sum('stock_quantity', {
        where: { tenant_id: tenantId }
      }) || 0;
    } catch (productError: any) {
      if (productError.name === 'SequelizeDatabaseError' && 
          (productError.message?.includes('릴레이션') || 
           productError.message?.includes('relation'))) {
        console.warn('⚠️ products 테이블이 없습니다. 기본값 0 사용');
        inventoryCount = 0;
      } else {
        throw productError;
      }
    }
    
    res.json({
      success: true,
      data: {
        totalRevenue: totalRevenue + roomBookingRevenue,
        customerCount,
        invoiceCount,
        inventoryCount
      }
    });
  } catch (error: any) {
    console.error('대시보드 통계 조회 오류:', error);
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name
    });
    res.status(500).json({
      success: false,
      message: '대시보드 통계 조회 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
});

// 월별 매출 추이 API
app.get('/api/dashboard/revenue-trend', async (req, res) => {
  try {
    const tenantId = parseInt(String(req.query.tenantId || process.env.DEFAULT_TENANT_ID || 1));
    
    // 최근 12개월 데이터
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    
    let revenueData: any[] = [];
    let bookingRevenueData: any[] = [];
    try {
      revenueData = await Invoice.findAll({
        attributes: [
          [fn('DATE_TRUNC', 'month', col('created_at')), 'month'],
          [fn('SUM', col('total_amount')), 'revenue']
        ],
        where: {
          tenant_id: tenantId,
          is_active: true,
          [Op.or]: [
            { invoice_category: 'regular' },
            { invoice_category: 'e_invoice' },
            { invoice_category: null }
          ],
          [Op.and]: [
            {
              [Op.or]: [
                { payment_status: 'paid' },
                { status: 'paid' }
              ]
            }
          ],
          created_at: {
            [Op.gte]: twelveMonthsAgo
          }
        },
        group: [fn('DATE_TRUNC', 'month', col('created_at'))],
        order: [[fn('DATE_TRUNC', 'month', col('created_at')), 'ASC']]
      });
    } catch (invoiceError: any) {
      if (invoiceError.name === 'SequelizeDatabaseError' && 
          (invoiceError.message?.includes('릴레이션') || 
           invoiceError.message?.includes('relation'))) {
        console.warn('⚠️ invoices 테이블이 없습니다. 빈 배열 반환');
        revenueData = [];
      } else {
        throw invoiceError;
      }
    }

    try {
      bookingRevenueData = await RoomBooking.findAll({
        attributes: [
          [fn('DATE_TRUNC', 'month', col('check_in_date')), 'month'],
          [fn('SUM', col('total_amount')), 'revenue']
        ],
        where: {
          tenant_id: tenantId,
          payment_status: 'paid',
          is_active: true,
          check_in_date: {
            [Op.gte]: twelveMonthsAgo
          }
        },
        group: [fn('DATE_TRUNC', 'month', col('check_in_date'))],
        order: [[fn('DATE_TRUNC', 'month', col('check_in_date')), 'ASC']]
      });
    } catch (bookingError: any) {
      if (bookingError.name === 'SequelizeDatabaseError' &&
          (bookingError.message?.includes('릴레이션') ||
           bookingError.message?.includes('relation'))) {
        console.warn('⚠️ room_bookings 테이블이 없습니다. 빈 배열 반환');
        bookingRevenueData = [];
      } else {
        throw bookingError;
      }
    }

    const combinedByMonth = new Map<string, number>();
    revenueData.forEach((row: any) => {
      const key = String(row.get?.('month') ?? row.month);
      const value = Number(row.get?.('revenue') ?? row.revenue ?? 0);
      combinedByMonth.set(key, (combinedByMonth.get(key) || 0) + value);
    });
    bookingRevenueData.forEach((row: any) => {
      const key = String(row.get?.('month') ?? row.month);
      const value = Number(row.get?.('revenue') ?? row.revenue ?? 0);
      combinedByMonth.set(key, (combinedByMonth.get(key) || 0) + value);
    });
    const combinedRevenueData = Array.from(combinedByMonth.entries())
      .map(([month, revenue]) => ({ month, revenue }))
      .sort((a, b) => (a.month < b.month ? -1 : 1));
    
    res.json({
      success: true,
      data: combinedRevenueData
    });
  } catch (error: any) {
    console.error('매출 추이 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '매출 추이 조회 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
});

// 재고 현황 API
app.get('/api/dashboard/inventory-status', async (req, res) => {
  try {
    const tenantId = parseInt(String(req.query.tenantId || process.env.DEFAULT_TENANT_ID || 1));
    const lowStockThreshold = parseInt(process.env.LOW_STOCK_THRESHOLD || '10');
    const highStockThreshold = parseInt(process.env.HIGH_STOCK_THRESHOLD || '100');
    
    let lowStock = 0;
    let normalStock = 0;
    let overStock = 0;
    
    try {
      // 재고 부족 (설정값 미만)
      lowStock = await Product.count({
        where: {
          tenant_id: tenantId,
          stock_quantity: {
            [Op.lt]: lowStockThreshold
          }
        }
      });
      
      // 정상 재고 (설정값 범위)
      normalStock = await Product.count({
        where: {
          tenant_id: tenantId,
          stock_quantity: {
            [Op.between]: [lowStockThreshold, highStockThreshold]
          }
        }
      });
      
      // 과다 재고 (설정값 초과)
      overStock = await Product.count({
        where: {
          tenant_id: tenantId,
          stock_quantity: {
            [Op.gt]: highStockThreshold
          }
        }
      });
    } catch (productError: any) {
      if (productError.name === 'SequelizeDatabaseError' && 
          (productError.message?.includes('릴레이션') || 
           productError.message?.includes('relation'))) {
        console.warn('⚠️ products 테이블이 없습니다. 기본값 0 사용');
        lowStock = 0;
        normalStock = 0;
        overStock = 0;
      } else {
        throw productError;
      }
    }
    
    res.json({
      success: true,
      data: {
        lowStock,
        normalStock,
        overStock
      }
    });
  } catch (error: any) {
    console.error('재고 현황 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '재고 현황 조회 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
});

// 공지사항 API
app.get('/api/dashboard/notices', async (req, res) => {
  try {
    // Notification 모델이 없으면 빈 배열 반환
    res.json({
      success: true,
      data: []
    });
  } catch (error) {
    console.error('공지사항 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '공지사항 조회 중 오류가 발생했습니다.'
    });
  }
});

// 메뉴 한글 업데이트 API
app.post('/api/menus/update-korean', async (req, res) => {
  try {
    const koreanMenus = [
      { id: 1, name_ko: '대시보드' },
      { id: 2, name_ko: '사용자 관리' },
      { id: 3, name_ko: '회사 관리' },
      { id: 4, name_ko: '프로젝트 관리' },
      { id: 5, name_ko: '회계 관리' },
      { id: 6, name_ko: '재고 관리' },
      { id: 7, name_ko: '고객 관리' },
      { id: 8, name_ko: '보고서' },
      { id: 9, name_ko: '설정' }
    ];
    
    for (const menu of koreanMenus) {
      await Menu.update(
        { name_ko: menu.name_ko },
        { where: { id: menu.id } }
      );
    }
    
    res.json({
      success: true,
      message: '메뉴 한글명이 업데이트되었습니다.'
    });
  } catch (error) {
    console.error('메뉴 업데이트 오류:', error);
    res.status(500).json({
      success: false,
      message: '메뉴 업데이트 중 오류가 발생했습니다.'
    });
  }
});

// 사용자 정보 API (한글 지원)
app.get('/api/users', async (req, res) => {
  try {
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
    // Notification 모델이 없으면 빈 배열 반환
    res.json({
      success: true,
      data: []
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
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const isMulterError = err?.name === 'MulterError';
  const isFileValidationError = typeof err?.message === 'string' && err.message.includes('허용되지 않은 파일');
  const isPayloadTooLarge =
    err?.type === 'entity.too.large' ||
    err?.status === 413 ||
    err?.statusCode === 413 ||
    err?.name === 'PayloadTooLargeError' ||
    (typeof err?.message === 'string' && err.message.toLowerCase().includes('request entity too large'));
  const statusCode = isPayloadTooLarge ? 413 : (isMulterError || isFileValidationError ? 400 : 500);
  const message = isMulterError
    ? '업로드 파일 처리 중 오류가 발생했습니다.'
    : isFileValidationError
      ? err.message
      : isPayloadTooLarge
        ? '요청 데이터가 너무 큽니다. 이미지 크기를 줄이거나 압축 후 다시 시도해주세요.'
        : 'Internal server error';

  console.error('Error:', {
    message: err?.message,
    name: err?.name,
    path: req.originalUrl,
    method: req.method,
    body: sanitizeLogPayload(req.body)
  });

  res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? err?.message : undefined
  });
});

// Server startup with error handling
server.listen(PORT, HOST, () => {
  console.log(`🚀 MVS Backend Server running on ${HOST}:${PORT}`);
  console.log(`📊 Health check: http://${HOST}:${PORT}/health`);
  console.log(`🌐 API base URL: http://${HOST}:${PORT}/api`);
  console.log(`🔌 WebSocket: ws://${HOST}:${PORT}`);
  console.log(`🤖 AI Analysis: http://${HOST}:${PORT}/api/ai/analysis`);
  
  // Railway deployment info
  if (process.env.RAILWAY_ENVIRONMENT) {
    console.log(`🚂 Railway Environment: ${process.env.RAILWAY_ENVIRONMENT}`);
    console.log(`🌍 Public URL: ${process.env.RAILWAY_PUBLIC_DOMAIN}`);
  }
}).on('error', (error: any) => {
  console.error('❌ 서버 시작 실패:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`⚠️  포트 ${PORT}가 이미 사용 중입니다.`);
  } else if (error.code === 'EACCES') {
    console.error(`⚠️  포트 ${PORT}에 대한 접근 권한이 없습니다.`);
  }
  process.exit(1);
});

// 프로세스 에러 핸들링
process.on('uncaughtException', (error) => {
  console.error('❌ 처리되지 않은 예외:', error);
  // Railway에서는 자동 재시작되므로 프로세스를 종료
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 처리되지 않은 Promise 거부:', reason);
  console.error('Promise:', promise);
  // Railway에서는 자동 재시작되므로 프로세스를 종료
  process.exit(1);
});

export default app;