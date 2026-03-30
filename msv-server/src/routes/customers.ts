import express from 'express';
import { Request, Response } from 'express';
import { Customer, RoomBooking } from '../models';
import { validateBody } from '../middleware/validate';

const router = express.Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 고객 목록 조회
router.get('/', async (req: Request, res: Response) => {
  try {
    const customers = await (Customer as any).findAll({
      where: { tenant_id: 1 },
      order: [['created_at', 'DESC']]
    });

    const roomGuests = await (RoomBooking as any).findAll({
      where: {
        tenant_id: 1,
        company_id: 1,
        is_active: true
      },
      attributes: [
        'id',
        'guest_name',
        'company_name',
        'guest_email',
        'guest_phone',
        'status',
        'created_at',
        'updated_at'
      ],
      order: [['updated_at', 'DESC']]
    });

    const customerRows = customers.map((row: any) => ({
      ...row.toJSON(),
      source_type: 'customer'
    }));

    const guestMap = new Map<string, any>();
    for (const booking of roomGuests) {
      const guestName = String(booking.guest_name || '').trim();
      if (!guestName) continue;
      const guestPhone = String(booking.guest_phone || '').trim();
      const guestEmail = String(booking.guest_email || '').trim().toLowerCase();
      const dedupeKey = `${guestName.toLowerCase()}|${guestPhone}|${guestEmail}`;
      if (guestMap.has(dedupeKey)) continue;

      guestMap.set(dedupeKey, {
        id: 1000000000 + Number(booking.id || 0),
        tenant_id: 1,
        company_id: 1,
        name: guestName,
        business_number: null,
        ceo_name: booking.company_name || '숙박손님',
        address: null,
        phone: guestPhone || null,
        email: guestEmail || null,
        website: null,
        industry: '숙박손님',
        status: booking.status === 'cancelled' || booking.status === 'no_show' ? 'inactive' : 'active',
        created_at: booking.created_at,
        updated_at: booking.updated_at,
        source_type: 'room_guest',
        source_booking_id: booking.id
      });
    }

    const mergedRows = [...customerRows, ...Array.from(guestMap.values())].sort((a: any, b: any) => {
      const aTs = a?.updated_at ? new Date(a.updated_at).getTime() : 0;
      const bTs = b?.updated_at ? new Date(b.updated_at).getTime() : 0;
      return bTs - aTs;
    });

    res.json({
      success: true,
      data: mergedRows
    });
  } catch (error: any) {
    console.error('고객 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '고객 목록 조회 중 오류가 발생했습니다.'
    });
  }
});

// 특정 고객 조회
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const customer = await (Customer as any).findOne({
      where: { id, tenant_id: 1 }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: '고객을 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      data: customer
    });
  } catch (error: any) {
    console.error('고객 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '고객 조회 중 오류가 발생했습니다.'
    });
  }
});

// 고객 생성
router.post(
  '/',
  validateBody({
    name: { required: true, type: 'string', minLength: 1, maxLength: 200 },
    email: { type: 'string', maxLength: 255, pattern: emailPattern },
    business_number: { type: 'string', maxLength: 50 },
    status: { type: 'string', maxLength: 20 }
  }),
  async (req: Request, res: Response) => {
  try {
    const customerData = {
      ...req.body,
      tenant_id: 1,
      company_id: 1
    };

    const customer = await (Customer as any).create(customerData);

    res.status(201).json({
      success: true,
      message: '고객이 성공적으로 등록되었습니다.',
      data: customer
    });
  } catch (error: any) {
    console.error('고객 생성 오류:', error);
    res.status(500).json({
      success: false,
      message: '고객 생성 중 오류가 발생했습니다.'
    });
  }
});

// 고객 수정
router.put(
  '/:id',
  validateBody({
    name: { type: 'string', minLength: 1, maxLength: 200 },
    email: { type: 'string', maxLength: 255, pattern: emailPattern },
    business_number: { type: 'string', maxLength: 50 },
    status: { type: 'string', maxLength: 20 }
  }),
  async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const customer = await (Customer as any).findOne({
      where: { id, tenant_id: 1 }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: '고객을 찾을 수 없습니다.'
      });
    }

    await customer.update(req.body);

    res.json({
      success: true,
      message: '고객 정보가 성공적으로 수정되었습니다.',
      data: customer
    });
  } catch (error: any) {
    console.error('고객 수정 오류:', error);
    res.status(500).json({
      success: false,
      message: '고객 수정 중 오류가 발생했습니다.'
    });
  }
});

// 고객 삭제
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const customer = await (Customer as any).findOne({
      where: { id, tenant_id: 1 }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: '고객을 찾을 수 없습니다.'
      });
    }

    await customer.destroy();

    res.json({
      success: true,
      message: '고객이 성공적으로 삭제되었습니다.'
    });
  } catch (error: any) {
    console.error('고객 삭제 오류:', error);
    res.status(500).json({
      success: false,
      message: '고객 삭제 중 오류가 발생했습니다.'
    });
  }
});

export default router;
