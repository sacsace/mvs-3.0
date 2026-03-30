import { Response } from 'express';
import { AuthRequest } from '../types';
import { Attendance, Company, User } from '../models';
import { Op } from 'sequelize';
import sequelize from '../config/database';

const toRadians = (value: number) => (value * Math.PI) / 180;

const calculateDistanceMeters = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
) => {
  const earthRadiusMeters = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2)
    + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2))
    * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMeters * c;
};

const TIME_ZONE = 'Asia/Kolkata';
const IST_OFFSET_MINUTES = 330;
const pad2 = (value: number) => value.toString().padStart(2, '0');
const toIstDate = (value: Date) => new Date(value.getTime() + IST_OFFSET_MINUTES * 60 * 1000);
const formatClientTimeString = (value?: string | null) => {
  if (!value) return null;
  const match = value.match(/T(\d{2}):(\d{2})/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = match[2];
  const period = hours >= 12 ? '오후' : '오전';
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${period} ${pad2(displayHour)}:${minutes}`;
};

const getDateInTimeZone = (value: Date) => {
  const istDate = toIstDate(value);
  const year = istDate.getUTCFullYear();
  const month = pad2(istDate.getUTCMonth() + 1);
  const day = pad2(istDate.getUTCDate());
  return `${year}-${month}-${day}`;
};

const parseClientTime = (value?: string) => {
  if (!value || typeof value !== 'string') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getDbNow = async () => {
  const [rows] = await sequelize.query('SELECT NOW() as now');
  const row = (Array.isArray(rows) ? rows[0] : rows) as any;
  const raw = row?.now ?? row?.NOW ?? row?.['now'];
  return raw ? new Date(raw) : new Date();
};

const formatTimeInZone = (value?: string | Date | null) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const istDate = toIstDate(date);
  const hours = istDate.getUTCHours();
  const minutes = istDate.getUTCMinutes();
  const period = hours >= 12 ? '오후' : '오전';
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${period} ${pad2(displayHour)}:${pad2(minutes)}`;
};

const normalizeTimestamp = (value?: string | Date | null) => {
  if (!value) return value ?? null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString();
};

/** 근무시간 계산: 퇴근 시간 - 출근 시간 (시간 단위) */
const calculateWorkHours = (checkIn: string | Date | null, checkOut: string | Date | null): number | null => {
  if (!checkIn || !checkOut) return null;
  const cin = checkIn instanceof Date ? checkIn : new Date(checkIn);
  const cout = checkOut instanceof Date ? checkOut : new Date(checkOut);
  if (Number.isNaN(cin.getTime()) || Number.isNaN(cout.getTime())) return null;
  const diffMs = cout.getTime() - cin.getTime();
  if (diffMs < 0) return null;
  return parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
};

const attachLocalTimes = (attendance: any) => {
  if (!attendance) return attendance;
  const data = attendance.toJSON ? attendance.toJSON() : attendance;
  const normalizedCheckIn = normalizeTimestamp(data.check_in);
  const normalizedCheckOut = normalizeTimestamp(data.check_out);
  const checkInDisplay = data.check_in_client_time
    ? formatClientTimeString(data.check_in_client_time)
    : formatTimeInZone(data.check_in);
  const checkOutDisplay = data.check_out_client_time
    ? formatClientTimeString(data.check_out_client_time)
    : formatTimeInZone(data.check_out);
  // 근무시간은 항상 퇴근-출근으로 재계산 (DB에 잘못 저장된 값 보정)
  const workHours = calculateWorkHours(normalizedCheckIn, normalizedCheckOut);
  return {
    ...data,
    check_in: normalizedCheckIn,
    check_out: normalizedCheckOut,
    work_hours: workHours ?? data.work_hours,
    check_in_local: formatTimeInZone(normalizedCheckIn),
    check_out_local: formatTimeInZone(normalizedCheckOut),
    check_in_display: checkInDisplay,
    check_out_display: checkOutDisplay
  };
};

const getServerNowInTimeZone = () => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const parts = formatter.formatToParts(now);
  const lookup = (type: string) => parts.find((part) => part.type === type)?.value || '';
  const year = lookup('year');
  const month = lookup('month');
  const day = lookup('day');
  const hour = lookup('hour');
  const minute = lookup('minute');
  const second = lookup('second');
  const date = `${year}-${month}-${day}`;
  const isoWithOffset = `${year}-${month}-${day}T${hour}:${minute}:${second}+05:30`;
  return {
    date,
    time: new Date(isoWithOffset)
  };
};

// 근태 목록 조회
export const getAttendances = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenant_id;
    const companyId = req.user?.company_id;
    const userRole = req.user?.role;
    const { user_id, date, start_date, end_date, department, status } = req.query;

    const whereClause: any = {};
    
    // root나 audit 권한이면 모든 근태 조회 가능, 아니면 자신의 회사 근태만
    if (userRole !== 'root' && userRole !== 'audit') {
      whereClause.tenant_id = tenantId;
      whereClause.company_id = companyId;
    } else {
      if (tenantId) whereClause.tenant_id = tenantId;
      if (companyId) whereClause.company_id = companyId;
    }

    if (user_id) {
      whereClause.user_id = user_id;
    }

    if (date) {
      whereClause.date = date;
    } else if (start_date && end_date) {
      whereClause.date = {
        [Op.between]: [start_date, end_date]
      };
    }

    if (status) {
      whereClause.status = status;
    }

    // 활성화된 근태만 조회
    whereClause.is_active = true;

    // 사용자 정보 포함
    const includeOptions: any[] = [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'email', 'department', 'position', 'employee_number'],
        where: department ? { department } : undefined,
        required: true
      }
    ];

    const attendances = await (Attendance as any).findAll({
      where: whereClause,
      include: includeOptions,
      order: [['date', 'DESC'], ['check_in', 'DESC']]
    });

    res.json({
      success: true,
      data: (attendances || []).map(attachLocalTimes)
    });
  } catch (error: any) {
    console.error('근태 목록 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '근태 목록 조회 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 근태 상세 조회
export const getAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenant_id;
    const companyId = req.user?.company_id;
    const userRole = req.user?.role;

    const whereClause: any = { id };
    
    if (userRole !== 'root' && userRole !== 'audit') {
      whereClause.tenant_id = tenantId;
      whereClause.company_id = companyId;
    }

    // 활성화된 근태만 조회
    whereClause.is_active = true;

    const attendance = await (Attendance as any).findOne({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email', 'department', 'position', 'employee_number']
        }
      ]
    });

    if (!attendance) {
      return res.status(404).json({ 
        success: false, 
        message: '근태 정보를 찾을 수 없습니다.' 
      });
    }

    res.json({ success: true, data: attachLocalTimes(attendance) });
  } catch (error: any) {
    console.error('근태 상세 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '근태 상세 조회 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 출근 처리
export const checkIn = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const tenantId = req.user?.tenant_id;
    const companyId = req.user?.company_id;
    const { latitude, longitude, accuracy, client_time, client_date, use_server_time, skip_geo } = req.body || {};
    const clientTime = parseClientTime(client_time);
    const allowSkipGeo = process.env.NODE_ENV !== 'production' || process.env.ALLOW_INTRANET_NO_GEO === 'true';
    const shouldSkipGeo = Boolean(skip_geo) && allowSkipGeo;
    let checkInTime = clientTime;
    if (!checkInTime && use_server_time) {
      checkInTime = await getDbNow();
    }
    if (!checkInTime) {
      return res.status(400).json({
        success: false,
        message: '출근 시간을 가져올 수 없습니다. 브라우저 시간을 다시 확인해주세요.'
      });
    }
    const today = getDateInTimeZone(checkInTime);
    console.log('[Attendance] check-in time source', {
      use_server_time,
      client_time,
      client_date,
      resolved_today: today,
      resolved_check_in_ist: formatTimeInZone(checkInTime),
      skip_geo: shouldSkipGeo
    });
    const parsedLatitude = typeof latitude === 'string' ? parseFloat(latitude) : latitude;
    const parsedLongitude = typeof longitude === 'string' ? parseFloat(longitude) : longitude;
    if (!shouldSkipGeo) {
      if (typeof parsedLatitude !== 'number' || typeof parsedLongitude !== 'number' || Number.isNaN(parsedLatitude) || Number.isNaN(parsedLongitude)) {
        return res.status(400).json({
          success: false,
          message: '출근 처리를 위해 위치 정보가 필요합니다.'
        });
      }
    }

    const company = await Company.findOne({
      where: {
        id: companyId,
        tenant_id: tenantId
      }
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: '회사를 찾을 수 없습니다.'
      });
    }

    if (!shouldSkipGeo) {
      const settings: any = company.settings || {};
      const officeLocation = settings.general?.officeLocation;
      const officeLat = typeof officeLocation?.latitude === 'string'
        ? parseFloat(officeLocation.latitude)
        : officeLocation?.latitude;
      const officeLng = typeof officeLocation?.longitude === 'string'
        ? parseFloat(officeLocation.longitude)
        : officeLocation?.longitude;
      const radiusMeters = typeof officeLocation?.radiusMeters === 'string'
        ? parseFloat(officeLocation.radiusMeters)
        : (officeLocation?.radiusMeters ?? 200);

      if (typeof officeLat !== 'number' || typeof officeLng !== 'number' || Number.isNaN(officeLat) || Number.isNaN(officeLng)) {
        return res.status(400).json({
          success: false,
          message: '사무실 위치가 등록되지 않았습니다. 시스템 설정에서 사무실 위치를 등록해주세요.'
        });
      }

      const distance = calculateDistanceMeters(parsedLatitude, parsedLongitude, officeLat, officeLng);
      if (distance > radiusMeters) {
        return res.status(403).json({
          success: false,
          message: '등록된 사무실 위치에서만 출근할 수 있습니다.'
        });
      }
    }

    // 오늘 날짜의 근태 기록 확인
    let attendance = await (Attendance as any).findOne({
      where: {
        user_id: userId,
        date: today,
        tenant_id: tenantId,
        company_id: companyId
      }
    });

    if (attendance && attendance.check_in) {
      return res.status(400).json({ 
        success: false, 
        message: '이미 출근 등록을 했습니다.' 
      });
    }

    // 지각 여부 판단 (기본 9시 기준, 로컬 시간대 기준)
    // 한국 시간대(KST, UTC+9) 기준으로 9시
    const standardTime = new Date(checkInTime);
    standardTime.setHours(9, 0, 0, 0); // 로컬 시간대 기준 9시
    const isLate = checkInTime > standardTime;

    if (attendance) {
      // 기존 기록 업데이트
      attendance.check_in = checkInTime;
      attendance.check_in_client_time = client_time;
      attendance.check_in_lat = shouldSkipGeo ? null : parsedLatitude;
      attendance.check_in_lng = shouldSkipGeo ? null : parsedLongitude;
      attendance.check_in_accuracy = typeof accuracy === 'number' ? accuracy : null;
      attendance.status = isLate ? 'late' : 'normal';
      await attendance.save();
    } else {
      // 새 기록 생성
      attendance = await (Attendance as any).create({
        tenant_id: tenantId,
        company_id: companyId,
        user_id: userId,
        date: today,
        is_active: true,
        check_in: checkInTime,
        check_in_client_time: client_time,
        check_in_lat: shouldSkipGeo ? null : parsedLatitude,
        check_in_lng: shouldSkipGeo ? null : parsedLongitude,
        check_in_accuracy: typeof accuracy === 'number' ? accuracy : null,
        status: isLate ? 'late' : 'normal'
      });
    }

    // 사용자 정보 포함하여 반환
    const attendanceWithUser = await (Attendance as any).findByPk(attendance.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email', 'department', 'position', 'employee_number']
        }
      ]
    });

    const payload = attachLocalTimes(attendanceWithUser);
    if (payload) {
      const clientDisplay = formatClientTimeString(client_time);
      payload.check_in_local = clientDisplay ?? formatTimeInZone(checkInTime);
      payload.check_in_display = clientDisplay ?? formatTimeInZone(checkInTime);
    }
    console.log('[Attendance] check-in response display', {
      check_in: payload?.check_in,
      check_in_local: payload?.check_in_local,
      check_in_display: payload?.check_in_display
    });
    res.json({
      success: true,
      data: payload,
      message: isLate ? '출근 처리되었습니다. (지각)' : '출근 처리되었습니다.'
    });
  } catch (error: any) {
    console.error('출근 처리 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '출근 처리 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 퇴근 처리
export const checkOut = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const tenantId = req.user?.tenant_id;
    const companyId = req.user?.company_id;
    const { client_time, client_date, use_server_time } = req.body || {};
    const clientTime = parseClientTime(client_time);
    let checkOutTime = clientTime;
    if (!checkOutTime && use_server_time) {
      checkOutTime = await getDbNow();
    }
    if (!checkOutTime) {
      return res.status(400).json({
        success: false,
        message: '퇴근 시간을 가져올 수 없습니다. 브라우저 시간을 다시 확인해주세요.'
      });
    }
    const today = getDateInTimeZone(checkOutTime);
    console.log('[Attendance] check-out time source', {
      use_server_time,
      client_time,
      client_date,
      resolved_today: today,
      resolved_check_out_ist: formatTimeInZone(checkOutTime)
    });

    // 출근 기록이 있지만 퇴근 기록이 없는 가장 최근 근태 기록 찾기
    // 하루가 지나더라도 출근 기록이 있으면 퇴근 가능
    const attendance = await (Attendance as any).findOne({
      where: {
        user_id: userId,
        tenant_id: tenantId,
        company_id: companyId,
        check_in: { [Op.ne]: null },
        check_out: null
      },
      order: [['date', 'DESC'], ['check_in', 'DESC']],
      limit: 1
    });

    if (!attendance || !attendance.check_in) {
      return res.status(400).json({ 
        success: false, 
        message: '출근 기록이 없습니다. 먼저 출근 처리해주세요.' 
      });
    }

    if (attendance.check_out) {
      return res.status(400).json({ 
        success: false, 
        message: '이미 퇴근 처리되었습니다.' 
      });
    }

    // 근무 시간 계산: 퇴근 시간 - 출근 시간 (getTime()은 UTC 기준 밀리초)
    const checkInDate = attendance.check_in instanceof Date
      ? attendance.check_in
      : new Date(attendance.check_in);
    const checkInMs = checkInDate.getTime();
    let checkOutMs = checkOutTime.getTime();
    let timeDiffMs = checkOutMs - checkInMs;

    // 음수 값 방지 (퇴근 시간이 출근 시간보다 이전인 경우)
    if (timeDiffMs < 0) {
      return res.status(400).json({
        success: false,
        message: '퇴근 시간이 출근 시간보다 이전일 수 없습니다.'
      });
    }

    // 밀리초 → 시간 (퇴근 - 출근)
    let workHours = timeDiffMs / (1000 * 60 * 60);
    let adjustedForMaxHours = false;

    // 디버깅 로그 (개발 환경)
    if (process.env.NODE_ENV === 'development') {
      console.log('[Attendance] 근무시간 계산 (퇴근 - 출근)', {
        check_in_ms: checkInMs,
        check_out_ms: checkOutMs,
        timeDiff_ms: timeDiffMs,
        workHours: workHours.toFixed(4),
        workHours_rounded: parseFloat(workHours.toFixed(2))
      });
    }
    
    // 비정상적으로 긴 근무시간 방지 (24시간 초과 시 24시간으로 보정)
    if (workHours > 24) {
      adjustedForMaxHours = true;
      checkOutMs = checkInMs + 24 * 60 * 60 * 1000;
      checkOutTime = new Date(checkOutMs);
      timeDiffMs = checkOutMs - checkInMs;
      workHours = timeDiffMs / (1000 * 60 * 60);
    }

    // 상태 판단
    let status = attendance.status;
    const standardEndTime = new Date(checkInDate);
    standardEndTime.setHours(18, 0, 0, 0);

    if (checkOutTime < standardEndTime) {
      status = 'early'; // 조기퇴근
    } else if (checkOutTime > standardEndTime) {
      status = 'overtime'; // 야근
    } else if (status === 'late') {
      // 지각이었지만 정상 퇴근
      status = 'normal';
    }

    attendance.check_out = checkOutTime;
    attendance.check_out_client_time = client_time;
    attendance.work_hours = parseFloat(workHours.toFixed(2));
    attendance.status = status;
    await attendance.save();

    // 사용자 정보 포함하여 반환
    const attendanceWithUser = await (Attendance as any).findByPk(attendance.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email', 'department', 'position', 'employee_number']
        }
      ]
    });

    const payload = attachLocalTimes(attendanceWithUser);
    if (payload) {
      const clientDisplay = formatClientTimeString(client_time);
      payload.check_out_local = clientDisplay ?? formatTimeInZone(checkOutTime);
      payload.check_out_display = clientDisplay ?? formatTimeInZone(checkOutTime);
    }
    console.log('[Attendance] check-out response display', {
      check_out: payload?.check_out,
      check_out_local: payload?.check_out_local,
      check_out_display: payload?.check_out_display
    });
    res.json({
      success: true,
      data: payload,
      message: adjustedForMaxHours
        ? '근무 시간이 24시간을 초과하여 퇴근 시간이 24시간으로 보정되었습니다.'
        : '퇴근 처리되었습니다.'
    });
  } catch (error: any) {
    console.error('퇴근 처리 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '퇴근 처리 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 근태 생성 (관리자용)
export const createAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenant_id;
    const companyId = req.user?.company_id;
    const { user_id, date, check_in, check_out, status, notes } = req.body;

    if (!user_id || !date) {
      return res.status(400).json({ 
        success: false, 
        message: '사용자 ID와 날짜는 필수입니다.' 
      });
    }

    // 중복 확인
    const existing = await (Attendance as any).findOne({
      where: {
        user_id,
        date,
        tenant_id: tenantId,
        company_id: companyId
      }
    });

    if (existing) {
      return res.status(400).json({ 
        success: false, 
        message: '해당 날짜의 근태 기록이 이미 존재합니다.' 
      });
    }

    // 근무 시간 계산: 퇴근 시간 - 출근 시간
    let workHours = null;
    if (check_in && check_out) {
      const checkInDate = check_in instanceof Date ? check_in : new Date(check_in);
      const checkOutDate = check_out instanceof Date ? check_out : new Date(check_out);
      const timeDiffMs = checkOutDate.getTime() - checkInDate.getTime();

      if (timeDiffMs < 0) {
        return res.status(400).json({
          success: false,
          message: '퇴근 시간이 출근 시간보다 이전일 수 없습니다.'
        });
      }

      const calculatedHours = timeDiffMs / (1000 * 60 * 60);
      if (calculatedHours > 24) {
        return res.status(400).json({
          success: false,
          message: '근무 시간이 24시간을 초과할 수 없습니다. 출근/퇴근 시간을 확인해주세요.'
        });
      }

      workHours = parseFloat(calculatedHours.toFixed(2));
    }

    const attendance = await (Attendance as any).create({
      tenant_id: tenantId,
      company_id: companyId,
      user_id,
      date,
      check_in: check_in ? new Date(check_in) : null,
      check_out: check_out ? new Date(check_out) : null,
      work_hours: workHours,
      status: status || 'normal',
      notes,
      is_active: true
    });

    // 사용자 정보 포함하여 반환
    const attendanceWithUser = await (Attendance as any).findByPk(attendance.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email', 'department', 'position', 'employee_number']
        }
      ]
    });

    res.status(201).json({ 
      success: true, 
      data: attendanceWithUser 
    });
  } catch (error: any) {
    console.error('근태 생성 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '근태 생성 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 근태 수정
export const updateAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenant_id;
    const companyId = req.user?.company_id;
    const userRole = req.user?.role;
    const { check_in, check_out, status, notes } = req.body;

    const whereClause: any = { id };
    
    if (userRole !== 'root' && userRole !== 'audit') {
      whereClause.tenant_id = tenantId;
      whereClause.company_id = companyId;
    }

    const attendance = await (Attendance as any).findOne({
      where: whereClause
    });

    if (!attendance) {
      return res.status(404).json({ 
        success: false, 
        message: '근태 정보를 찾을 수 없습니다.' 
      });
    }

    // 근무 시간 재계산: 퇴근 시간 - 출근 시간
    let workHours = attendance.work_hours;
    if (check_in && check_out) {
      const checkInDate = check_in instanceof Date ? check_in : new Date(check_in);
      const checkOutDate = check_out instanceof Date ? check_out : new Date(check_out);
      const timeDiffMs = checkOutDate.getTime() - checkInDate.getTime();

      if (timeDiffMs < 0) {
        return res.status(400).json({
          success: false,
          message: '퇴근 시간이 출근 시간보다 이전일 수 없습니다.'
        });
      }

      const calculatedHours = timeDiffMs / (1000 * 60 * 60);
      if (calculatedHours > 24) {
        return res.status(400).json({
          success: false,
          message: '근무 시간이 24시간을 초과할 수 없습니다. 출근/퇴근 시간을 확인해주세요.'
        });
      }

      workHours = parseFloat(calculatedHours.toFixed(2));
    } else if (attendance.check_in && attendance.check_out) {
      const checkInDate = attendance.check_in instanceof Date
        ? attendance.check_in
        : new Date(attendance.check_in);
      const checkOutDate = attendance.check_out instanceof Date
        ? attendance.check_out
        : new Date(attendance.check_out);
      const timeDiffMs = checkOutDate.getTime() - checkInDate.getTime();

      if (timeDiffMs >= 0) {
        const calculatedHours = timeDiffMs / (1000 * 60 * 60);
        if (calculatedHours <= 24) {
          workHours = parseFloat(calculatedHours.toFixed(2));
        }
      }
    }

    await attendance.update({
      check_in: check_in ? new Date(check_in) : attendance.check_in,
      check_out: check_out ? new Date(check_out) : attendance.check_out,
      work_hours: workHours,
      status: status || attendance.status,
      notes: notes !== undefined ? notes : attendance.notes
    });

    // 사용자 정보 포함하여 반환
    const attendanceWithUser = await (Attendance as any).findByPk(attendance.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email', 'department', 'position', 'employee_number']
        }
      ]
    });

    res.json({ 
      success: true, 
      data: attendanceWithUser 
    });
  } catch (error: any) {
    console.error('근태 수정 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '근태 수정 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 근태 삭제
export const deleteAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenant_id;
    const companyId = req.user?.company_id;
    const userRole = req.user?.role;

    const whereClause: any = { id };
    
    if (userRole !== 'root' && userRole !== 'audit') {
      whereClause.tenant_id = tenantId;
      whereClause.company_id = companyId;
    }

    const attendance = await (Attendance as any).findOne({
      where: whereClause
    });

    if (!attendance) {
      return res.status(404).json({ 
        success: false, 
        message: '근태 정보를 찾을 수 없습니다.' 
      });
    }

    // 소프트 삭제: is_active를 false로 설정
    await attendance.update({ is_active: false });

    res.json({ 
      success: true, 
      message: '근태 정보가 비활성화되었습니다.' 
    });
  } catch (error: any) {
    console.error('근태 삭제 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '근태 삭제 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 오늘의 근태 상태 조회
export const getTodayAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const tenantId = req.user?.tenant_id;
    const companyId = req.user?.company_id;
    const clientDate = typeof req.query.client_date === 'string' ? req.query.client_date : '';
    const today = clientDate && /^\d{4}-\d{2}-\d{2}$/.test(clientDate)
      ? clientDate
      : new Date().toISOString().split('T')[0];

    // 먼저 오늘 날짜의 근태 기록 확인
    let attendance = await (Attendance as any).findOne({
      where: {
        user_id: userId,
        date: today,
        tenant_id: tenantId,
        company_id: companyId
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email', 'department', 'position', 'employee_number']
        }
      ]
    });

    // 오늘 날짜에 근태 기록이 없거나, 출근 기록이 있지만 퇴근 기록이 없는 경우
    // 하루가 지나더라도 출근 기록이 있으면 퇴근 가능하도록 가장 최근의 출근 기록 찾기
    if (!attendance || (attendance.check_in && !attendance.check_out)) {
      // 출근 기록이 있지만 퇴근 기록이 없는 가장 최근 근태 기록 찾기
      const pendingAttendance = await (Attendance as any).findOne({
        where: {
          user_id: userId,
          tenant_id: tenantId,
          company_id: companyId,
          check_in: { [Op.ne]: null },
          check_out: null
        },
        order: [['date', 'DESC'], ['check_in', 'DESC']],
        limit: 1,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'email', 'department', 'position', 'employee_number']
          }
        ]
      });

      // 오늘 날짜의 기록이 없고, 미완료 출근 기록이 있으면 그것을 반환
      if (!attendance && pendingAttendance) {
        attendance = pendingAttendance;
      }
      // 오늘 날짜의 기록이 있지만 퇴근이 없고, 더 최근의 미완료 출근 기록이 있으면 그것을 반환
      else if (attendance && attendance.check_in && !attendance.check_out && pendingAttendance) {
        const attendanceDate = new Date(attendance.date);
        const pendingDate = new Date(pendingAttendance.date);
        if (pendingDate > attendanceDate) {
          attendance = pendingAttendance;
        }
      }
    }

    res.json({ 
      success: true, 
      data: attendance ? attachLocalTimes(attendance) : null 
    });
  } catch (error: any) {
    console.error('오늘의 근태 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '오늘의 근태 조회 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};


