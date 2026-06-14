import express from 'express';
import { Op, fn, col } from 'sequelize';
import {
  Invoice,
  Customer,
  Product,
  RoomBooking,
  WorkBoard,
  WorkBoardList,
  WorkBoardCard,
  WorkBoardMember,
} from '../models';
import { AuthRequest } from '../types';

const router = express.Router();

const resolveTenantId = (req: AuthRequest): number => {
  const user = req.user;
  if (!user) return parseInt(String(process.env.DEFAULT_TENANT_ID || 1), 10);
  if (user.role === 'root' || user.role === 'audit') {
    const q = parseInt(String(req.query.tenantId || ''), 10);
    return Number.isFinite(q) && q > 0 ? q : user.tenant_id;
  }
  return user.tenant_id;
};

router.get('/stats', async (req: AuthRequest, res) => {
  try {
    const tenantId = resolveTenantId(req);
    const invoiceBaseWhere: any = {
      tenant_id: tenantId,
      is_active: true,
      [Op.or]: [
        { invoice_category: 'regular' },
        { invoice_category: 'e_invoice' },
        { invoice_category: null }
      ]
    };

    const safeSum = async (runner: () => Promise<number | null>) => {
      try {
        return (await runner()) || 0;
      } catch (err: any) {
        if (err.name === 'SequelizeDatabaseError' &&
            (err.message?.includes('릴레이션') || err.message?.includes('relation'))) {
          return 0;
        }
        throw err;
      }
    };

    const safeCount = async (runner: () => Promise<number>) => {
      try {
        return await runner();
      } catch (err: any) {
        if (err.name === 'SequelizeDatabaseError' &&
            (err.message?.includes('릴레이션') || err.message?.includes('relation'))) {
          return 0;
        }
        throw err;
      }
    };

    const [totalRevenue, roomBookingRevenue, customerCount, invoiceCount, inventoryCount] = await Promise.all([
      safeSum(() => Invoice.sum('total_amount', {
        where: {
          ...invoiceBaseWhere,
          [Op.and]: [{ [Op.or]: [{ payment_status: 'paid' }, { status: 'paid' }] }]
        }
      })),
      safeSum(() => RoomBooking.sum('total_amount', {
        where: { tenant_id: tenantId, payment_status: 'paid', is_active: true }
      })),
      safeCount(() => Customer.count({ where: { tenant_id: tenantId } })),
      safeCount(() => Invoice.count({ where: invoiceBaseWhere })),
      safeSum(() => Product.sum('stock_quantity', { where: { tenant_id: tenantId } }))
    ]);

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
    res.status(500).json({
      success: false,
      message: '대시보드 통계 조회 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
});

router.get('/revenue-trend', async (req: AuthRequest, res) => {
  try {
    const tenantId = resolveTenantId(req);
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const loadInvoiceRevenue = async () => {
      try {
        return await Invoice.findAll({
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
            [Op.and]: [{ [Op.or]: [{ payment_status: 'paid' }, { status: 'paid' }] }],
            created_at: { [Op.gte]: twelveMonthsAgo }
          },
          group: [fn('DATE_TRUNC', 'month', col('created_at'))],
          order: [[fn('DATE_TRUNC', 'month', col('created_at')), 'ASC']]
        });
      } catch (err: any) {
        if (err.name === 'SequelizeDatabaseError') return [];
        throw err;
      }
    };

    const loadBookingRevenue = async () => {
      try {
        return await RoomBooking.findAll({
          attributes: [
            [fn('DATE_TRUNC', 'month', col('check_in_date')), 'month'],
            [fn('SUM', col('total_amount')), 'revenue']
          ],
          where: {
            tenant_id: tenantId,
            payment_status: 'paid',
            is_active: true,
            check_in_date: { [Op.gte]: twelveMonthsAgo }
          },
          group: [fn('DATE_TRUNC', 'month', col('check_in_date'))],
          order: [[fn('DATE_TRUNC', 'month', col('check_in_date')), 'ASC']]
        });
      } catch (err: any) {
        if (err.name === 'SequelizeDatabaseError') return [];
        throw err;
      }
    };

    const [revenueData, bookingRevenueData] = await Promise.all([
      loadInvoiceRevenue(),
      loadBookingRevenue()
    ]);

    const combinedByMonth = new Map<string, number>();
    [...revenueData, ...bookingRevenueData].forEach((row: any) => {
      const key = String(row.get?.('month') ?? row.month);
      const value = Number(row.get?.('revenue') ?? row.revenue ?? 0);
      combinedByMonth.set(key, (combinedByMonth.get(key) || 0) + value);
    });

    const combinedRevenueData = Array.from(combinedByMonth.entries())
      .map(([month, revenue]) => ({ month, revenue }))
      .sort((a, b) => (a.month < b.month ? -1 : 1));

    res.json({ success: true, data: combinedRevenueData });
  } catch (error: any) {
    console.error('매출 추이 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '매출 추이 조회 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
});

router.get('/inventory-status', async (req: AuthRequest, res) => {
  try {
    const tenantId = resolveTenantId(req);
    const lowStockThreshold = parseInt(process.env.LOW_STOCK_THRESHOLD || '10', 10);
    const highStockThreshold = parseInt(process.env.HIGH_STOCK_THRESHOLD || '100', 10);

    const countStock = async (where: Record<string, unknown>) => {
      try {
        return await Product.count({ where: { tenant_id: tenantId, ...where } });
      } catch (err: any) {
        if (err.name === 'SequelizeDatabaseError') return 0;
        throw err;
      }
    };

    const [lowStock, normalStock, overStock] = await Promise.all([
      countStock({ stock_quantity: { [Op.lt]: lowStockThreshold } }),
      countStock({ stock_quantity: { [Op.between]: [lowStockThreshold, highStockThreshold] } }),
      countStock({ stock_quantity: { [Op.gt]: highStockThreshold } })
    ]);

    res.json({
      success: true,
      data: { lowStock, normalStock, overStock }
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

router.get('/notices', async (_req, res) => {
  res.json({ success: true, data: [] });
});

const classifyTaskStatus = (listTitle: string): 'todo' | 'in_progress' | 'done' => {
  const normalized = (listTitle || '').replace(/\s+/g, '').toLowerCase();
  if (normalized.includes('완료') || normalized.includes('done')) return 'done';
  if (normalized.includes('진행') || normalized.includes('doing') || normalized.includes('progress')) {
    return 'in_progress';
  }
  return 'todo';
};

/** 대시보드 — 내 담당 업무 카드 (보드별 N+1 조회 대신 단일 집계) */
router.get('/my-tasks', async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    if (!user?.id) {
      return res.json({ success: true, data: [] });
    }

    const memberships = await WorkBoardMember.findAll({
      where: { user_id: user.id },
      attributes: ['board_id'],
    });
    const boardIds = memberships.map((m) => m.board_id);
    if (boardIds.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const boardWhere: Record<string, unknown> = {
      id: { [Op.in]: boardIds },
      tenant_id: user.tenant_id,
    };
    if (user.company_id) {
      boardWhere.company_id = user.company_id;
    }

    const cards = await WorkBoardCard.findAll({
      where: { assignee_user_id: user.id },
      attributes: ['id', 'title', 'due_date', 'list_id'],
      include: [
        {
          model: WorkBoardList,
          as: 'list',
          attributes: ['id', 'title'],
          required: true,
          include: [
            {
              model: WorkBoard,
              as: 'board',
              attributes: ['id', 'name'],
              required: true,
              where: boardWhere,
            },
          ],
        },
      ],
      limit: 50,
    });

    const tasks = cards.map((card) => {
      const json = card.toJSON ? card.toJSON() : card;
      const list = (json as any).list || {};
      const board = list.board || {};
      const listTitle = list.title || '-';
      return {
        id: `${board.id}-${json.id}`,
        boardId: board.id,
        boardName: board.name || '-',
        listName: listTitle,
        title: json.title || '제목 없음',
        dueDate: json.due_date,
        status: classifyTaskStatus(listTitle),
      };
    });

    tasks.sort((a, b) => {
      const aTime = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      const bTime = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    });

    res.json({ success: true, data: tasks.slice(0, 5) });
  } catch (error: any) {
    console.error('내 담당 업무 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '내 담당 업무 조회 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined,
    });
  }
});

export default router;
