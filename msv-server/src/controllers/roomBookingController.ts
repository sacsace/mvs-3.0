import { Response } from 'express';
import { RequestWithUser } from '../types';
import { RoomBooking, User } from '../models';
import { Op } from 'sequelize';

const CHECKOUT_BUFFER_HOURS = 2;
const DEFAULT_CHECKOUT_TIME = '11:00:00';
const DEFAULT_CHECKIN_TIME = '00:00:00';

const normalizeTimeToHHMMSS = (value?: string | null) => {
  const raw = String(value || '').trim();
  if (!raw) return DEFAULT_CHECKOUT_TIME;
  if (/^\d{2}:\d{2}$/.test(raw)) return `${raw}:00`;
  if (/^\d{2}:\d{2}:\d{2}$/.test(raw)) return raw;
  return DEFAULT_CHECKOUT_TIME;
};

const buildDateTime = (dateValue?: string | Date | null, timeValue?: string | null) => {
  const dateStr = String(dateValue || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const dt = new Date(`${dateStr}T${normalizeTimeToHHMMSS(timeValue)}`);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
};

const ensureRoomBookingTimeColumns = async () => {
  try {
    await (RoomBooking as any).sequelize?.query(`
      ALTER TABLE room_bookings
      ADD COLUMN IF NOT EXISTS check_in_time TIME;
    `);
  } catch (error) {
    console.warn('room_bookings.check_in_time 컬럼 확인 실패:', error);
  }
};

// 회의실 예약 목록 조회
export const getRoomBookings = async (req: RequestWithUser, res: Response) => {
  try {
    await ensureRoomBookingTimeColumns();
    const tenantId = req.user?.tenant_id;
    const companyId = req.user?.company_id;
    const userRole = req.user?.role;
    const { room_id, user_id, status, check_in_date, check_out_date, company_id } = req.query;

    const whereClause: any = {};
    
    // root나 audit 권한이면 모든 예약 조회 가능, 아니면 자신의 회사 예약만
    if (userRole !== 'root' && userRole !== 'audit') {
      whereClause.tenant_id = tenantId;
      whereClause.company_id = companyId;
      // 역할이 user여도 동일 회사(tenant+company) 전체 예약 조회 — 메뉴 can_view로 접근 통제.
      // (구) user_id 필터는 숙박/프론트에서 예약자≠로그인 직원일 때 목록이 비는 원인이었음.
    } else {
      // root는 company_id 쿼리 파라미터로 회사별 필터링 가능
      if (userRole === 'root' && company_id) {
        whereClause.company_id = parseInt(company_id as string);
      } else if (userRole === 'root') {
        // root가 company_id를 지정하지 않으면 모든 회사 조회
      } else {
        // audit는 모든 회사 조회 가능
        if (tenantId) whereClause.tenant_id = tenantId;
        if (companyId) whereClause.company_id = companyId;
      }
    }

    if (room_id) {
      whereClause.room_id = room_id;
    }

    if (user_id) {
      whereClause.user_id = user_id;
    }

    if (status) {
      whereClause.status = status;
    }

    if (check_in_date && check_out_date) {
      // 겹치는 기간의 예약도 포함
      whereClause[Op.and] = [
        {
          check_in_date: {
            [Op.lte]: check_out_date
          }
        },
        {
          check_out_date: {
            [Op.gte]: check_in_date
          }
        }
      ];
    }

    // 활성화된 예약만 조회
    whereClause.is_active = true;

    const bookings = await (RoomBooking as any).findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email', 'department', 'position', 'employee_number']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username'],
          required: false
        }
      ],
      order: [['check_in_date', 'DESC'], ['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: bookings
    });
  } catch (error: any) {
    console.error('회의실 예약 목록 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '회의실 예약 목록 조회 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 회의실 예약 상세 조회
export const getRoomBooking = async (req: RequestWithUser, res: Response) => {
  try {
    await ensureRoomBookingTimeColumns();
    const { id } = req.params;
    const tenantId = req.user?.tenant_id;
    const companyId = req.user?.company_id;
    const userRole = req.user?.role;

    const whereClause: any = { id };
    
    if (userRole !== 'root' && userRole !== 'audit') {
      whereClause.tenant_id = tenantId;
      whereClause.company_id = companyId;
    }

    // 활성화된 예약만 조회
    whereClause.is_active = true;

    const booking = await (RoomBooking as any).findOne({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email', 'department', 'position', 'employee_number']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username'],
          required: false
        }
      ]
    });

    if (!booking) {
      return res.status(404).json({ 
        success: false, 
        message: '회의실 예약을 찾을 수 없습니다.' 
      });
    }

    res.json({ success: true, data: booking });
  } catch (error: any) {
    console.error('회의실 예약 상세 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '회의실 예약 상세 조회 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 회의실 예약 생성
export const createRoomBooking = async (req: RequestWithUser, res: Response) => {
  try {
    await ensureRoomBookingTimeColumns();
    const tenantId = req.user?.tenant_id;
    const companyId = req.user?.company_id;
    const userId = req.user?.id;
    const { booking_id, room_id, room_number, room_type, guest_name, company_name, guest_email, guest_phone,
            check_in_date, check_in_time, check_out_date, check_out_time, number_of_guests, total_amount, payment_method,
            special_requests } = req.body;

    if (!booking_id || !room_id || !room_number || !room_type || !guest_name || 
        !check_in_date || !check_out_date || !total_amount) {
      return res.status(400).json({ 
        success: false, 
        message: '필수 필드가 누락되었습니다.' 
      });
    }

    // booking_id 중복 확인
    const existing = await (RoomBooking as any).findOne({
      where: {
        booking_id,
        tenant_id: tenantId,
        company_id: companyId
      }
    });

    if (existing) {
      return res.status(400).json({ 
        success: false, 
        message: '이미 존재하는 예약 ID입니다.' 
      });
    }

    // 날짜 계산
    const checkIn = new Date(check_in_date);
    const checkOut = new Date(check_out_date);
    const totalNights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

    // 중복 예약 확인 (같은 방, 같은 날짜)
    const conflictingBookings = await (RoomBooking as any).findAll({
      where: {
        room_id,
        tenant_id: tenantId,
        company_id: companyId,
        status: { [Op.notIn]: ['cancelled', 'no_show'] },
        [Op.or]: [
          {
            check_in_date: {
              [Op.between]: [check_in_date, check_out_date]
            }
          },
          {
            check_out_date: {
              [Op.between]: [check_in_date, check_out_date]
            }
          }
        ]
      }
    });

    const normalizedNewCheckInDate = String(check_in_date).slice(0, 10);
    const requestedCheckInAt = buildDateTime(check_in_date, check_in_time || DEFAULT_CHECKIN_TIME);
    const hasConflict = (conflictingBookings || []).some((existingBooking: any) => {
      const existingCheckoutDate = String(existingBooking?.check_out_date || '').slice(0, 10);

      // 체크아웃일 동일 + 체크아웃 2시간 경과 시에는 신규 예약 허용
      if (existingCheckoutDate === normalizedNewCheckInDate) {
        const checkoutAt = buildDateTime(existingBooking?.check_out_date, existingBooking?.check_out_time);
        if (checkoutAt && requestedCheckInAt) {
          const availableAt = new Date(checkoutAt.getTime() + CHECKOUT_BUFFER_HOURS * 60 * 60 * 1000);
          if (requestedCheckInAt >= availableAt) {
            return false;
          }
        }
      }
      return true;
    });

    if (hasConflict) {
      return res.status(400).json({ 
        success: false, 
        message: '해당 날짜에 이미 예약이 있습니다.' 
      });
    }

    const booking = await (RoomBooking as any).create({
      tenant_id: tenantId,
      company_id: companyId,
      booking_id,
      room_id,
      room_number,
      is_active: true,
      room_type,
      user_id: userId,
      guest_name,
      company_name: company_name || null,
      guest_email: guest_email || null,
      guest_phone: guest_phone || null,
      check_in_date,
      check_in_time: check_in_time || null,
      check_out_date,
      check_out_time: check_out_time || null,
      number_of_guests: number_of_guests || 1,
      total_nights: totalNights,
      total_amount,
      status: 'pending',
      payment_status: 'pending',
      payment_method: payment_method || null,
      special_requests: special_requests || null,
      created_by: userId
    });

    // 사용자 정보 포함하여 반환
    const bookingWithUser = await (RoomBooking as any).findByPk(booking.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email', 'department', 'position', 'employee_number']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username'],
          required: false
        }
      ]
    });

    res.status(201).json({ 
      success: true, 
      data: bookingWithUser 
    });
  } catch (error: any) {
    console.error('회의실 예약 생성 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '회의실 예약 생성 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 회의실 예약 수정
export const updateRoomBooking = async (req: RequestWithUser, res: Response) => {
  try {
    await ensureRoomBookingTimeColumns();
    const { id } = req.params;
    const tenantId = req.user?.tenant_id;
    const companyId = req.user?.company_id;
    const userRole = req.user?.role;
    const { guest_name, company_name, guest_email, guest_phone, check_in_date, check_in_time, check_out_date, check_out_time,
            number_of_guests, total_amount, status, payment_status, payment_method,
            special_requests, room_id, room_number, room_type } = req.body;

    const whereClause: any = { id, is_active: true };
    
    if (userRole !== 'root' && userRole !== 'audit') {
      whereClause.tenant_id = tenantId;
      whereClause.company_id = companyId;
    }

    const booking = await (RoomBooking as any).findOne({
      where: whereClause
    });

    if (!booking) {
      return res.status(404).json({ 
        success: false, 
        message: '회의실 예약을 찾을 수 없습니다.' 
      });
    }

    const wantsRoomChange = [room_id, room_number, room_type].some((x) => x !== undefined);
    if (wantsRoomChange) {
      if (room_id === undefined || room_number === undefined || room_type === undefined) {
        return res.status(400).json({
          success: false,
          message: '객실을 변경할 때는 room_id, room_number, room_type을 함께 보내야 합니다.'
        });
      }
      const nextRoomId = Number(room_id);
      const nextRoomNumber = String(room_number).trim();
      const nextRoomType = String(room_type).trim();
      if (!Number.isFinite(nextRoomId) || !nextRoomNumber || !nextRoomType) {
        return res.status(400).json({
          success: false,
          message: '객실 정보가 올바르지 않습니다.'
        });
      }

      const effCheckIn = check_in_date !== undefined ? check_in_date : booking.check_in_date;
      const effCheckOut = check_out_date !== undefined ? check_out_date : booking.check_out_date;
      const effCheckInTime = check_in_time !== undefined ? check_in_time : booking.check_in_time;

      const conflictingBookings = await (RoomBooking as any).findAll({
        where: {
          room_id: nextRoomId,
          tenant_id: tenantId,
          company_id: companyId,
          id: { [Op.ne]: booking.id },
          status: { [Op.notIn]: ['cancelled', 'no_show'] },
          [Op.or]: [
            {
              check_in_date: {
                [Op.between]: [effCheckIn, effCheckOut]
              }
            },
            {
              check_out_date: {
                [Op.between]: [effCheckIn, effCheckOut]
              }
            }
          ]
        }
      });

      const normalizedNewCheckInDate = String(effCheckIn).slice(0, 10);
      const requestedCheckInAt = buildDateTime(effCheckIn as string, effCheckInTime || DEFAULT_CHECKIN_TIME);
      const hasConflict = (conflictingBookings || []).some((existingBooking: any) => {
        const existingCheckoutDate = String(existingBooking?.check_out_date || '').slice(0, 10);
        if (existingCheckoutDate === normalizedNewCheckInDate) {
          const checkoutAt = buildDateTime(existingBooking?.check_out_date, existingBooking?.check_out_time);
          if (checkoutAt && requestedCheckInAt) {
            const availableAt = new Date(checkoutAt.getTime() + CHECKOUT_BUFFER_HOURS * 60 * 60 * 1000);
            if (requestedCheckInAt >= availableAt) {
              return false;
            }
          }
        }
        return true;
      });

      if (hasConflict) {
        return res.status(400).json({
          success: false,
          message: '해당 날짜에 이미 예약이 있습니다.'
        });
      }
    }

    // 날짜 재계산
    let totalNights = booking.total_nights;
    if (check_in_date && check_out_date) {
      const checkIn = new Date(check_in_date);
      const checkOut = new Date(check_out_date);
      totalNights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    }

    await booking.update({
      guest_name: guest_name !== undefined ? guest_name : booking.guest_name,
      company_name: company_name !== undefined ? company_name : booking.company_name,
      guest_email: guest_email !== undefined ? guest_email : booking.guest_email,
      guest_phone: guest_phone !== undefined ? guest_phone : booking.guest_phone,
      check_in_date: check_in_date !== undefined ? check_in_date : booking.check_in_date,
      check_in_time: check_in_time !== undefined ? check_in_time : booking.check_in_time,
      check_out_date: check_out_date !== undefined ? check_out_date : booking.check_out_date,
      check_out_time: check_out_time !== undefined ? check_out_time : booking.check_out_time,
      number_of_guests: number_of_guests !== undefined ? number_of_guests : booking.number_of_guests,
      total_nights: totalNights,
      total_amount: total_amount !== undefined ? total_amount : booking.total_amount,
      status: status !== undefined ? status : booking.status,
      payment_status: payment_status !== undefined ? payment_status : booking.payment_status,
      payment_method: payment_method !== undefined ? payment_method : booking.payment_method,
      special_requests: special_requests !== undefined ? special_requests : booking.special_requests,
      ...(wantsRoomChange
        ? {
            room_id: Number(room_id),
            room_number: String(room_number).trim(),
            room_type: String(room_type).trim()
          }
        : {})
    });

    // 사용자 정보 포함하여 반환
    const bookingWithUser = await (RoomBooking as any).findByPk(booking.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email', 'department', 'position', 'employee_number']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username'],
          required: false
        }
      ]
    });

    res.json({ 
      success: true, 
      data: bookingWithUser 
    });
  } catch (error: any) {
    console.error('회의실 예약 수정 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '회의실 예약 수정 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 회의실 예약 삭제
export const deleteRoomBooking = async (req: RequestWithUser, res: Response) => {
  try {
    await ensureRoomBookingTimeColumns();
    const { id } = req.params;
    const tenantId = req.user?.tenant_id;
    const companyId = req.user?.company_id;
    const userRole = req.user?.role;

    const whereClause: any = { id };
    
    if (userRole !== 'root' && userRole !== 'audit') {
      whereClause.tenant_id = tenantId;
      whereClause.company_id = companyId;
    }

    const booking = await (RoomBooking as any).findOne({
      where: whereClause
    });

    if (!booking) {
      return res.status(404).json({ 
        success: false, 
        message: '회의실 예약을 찾을 수 없습니다.' 
      });
    }

    // 소프트 삭제: is_active를 false로 설정
    await booking.update({ is_active: false });

    res.json({ 
      success: true, 
      message: '회의실 예약이 비활성화되었습니다.' 
    });
  } catch (error: any) {
    console.error('회의실 예약 삭제 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '회의실 예약 삭제 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 회의실 예약 확인
export const confirmRoomBooking = async (req: RequestWithUser, res: Response) => {
  try {
    await ensureRoomBookingTimeColumns();
    const { id } = req.params;
    const tenantId = req.user?.tenant_id;
    const companyId = req.user?.company_id;

    const booking = await (RoomBooking as any).findOne({
      where: {
        id,
        tenant_id: tenantId,
        company_id: companyId,
        status: 'pending'
      }
    });

    if (!booking) {
      return res.status(404).json({ 
        success: false, 
        message: '회의실 예약을 찾을 수 없거나 확인할 수 없습니다.' 
      });
    }

    await booking.update({
      status: 'confirmed'
    });

    // 사용자 정보 포함하여 반환
    const bookingWithUser = await (RoomBooking as any).findByPk(booking.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email', 'department', 'position', 'employee_number']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username'],
          required: false
        }
      ]
    });

    res.json({ 
      success: true, 
      data: bookingWithUser 
    });
  } catch (error: any) {
    console.error('회의실 예약 확인 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '회의실 예약 확인 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 회의실 예약 취소
export const cancelRoomBooking = async (req: RequestWithUser, res: Response) => {
  try {
    await ensureRoomBookingTimeColumns();
    const { id } = req.params;
    const tenantId = req.user?.tenant_id;
    const companyId = req.user?.company_id;

    const whereClause: any = {
      id,
      tenant_id: tenantId,
      company_id: companyId,
      status: { [Op.in]: ['pending', 'confirmed'] }
    };

    const booking = await (RoomBooking as any).findOne({
      where: whereClause
    });

    if (!booking) {
      return res.status(404).json({ 
        success: false, 
        message: '회의실 예약을 찾을 수 없거나 취소할 수 없습니다.' 
      });
    }

    await booking.update({
      status: 'cancelled',
      payment_status: booking.payment_status === 'paid' ? 'refunded' : booking.payment_status
    });

    // 사용자 정보 포함하여 반환
    const bookingWithUser = await (RoomBooking as any).findByPk(booking.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email', 'department', 'position', 'employee_number']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username'],
          required: false
        }
      ]
    });

    res.json({ 
      success: true, 
      data: bookingWithUser 
    });
  } catch (error: any) {
    console.error('회의실 예약 취소 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '회의실 예약 취소 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

