import { Attendance, Company, User } from '../models';

const TIME_ZONE = 'Asia/Kolkata';

export type HeresnowCompanySettings = {
  enabled?: boolean;
  externalCompanyId?: string;
  lastSyncAt?: string | null;
  lastSyncError?: string | null;
  lastSyncCount?: number;
};

export type HeresnowAttendanceRecord = {
  employeeExternalId?: string;
  externalEmployeeId?: string;
  employeeId?: string;
  userId?: string | number;
  date?: string;
  checkIn?: string | null;
  checkOut?: string | null;
  check_in?: string | null;
  check_out?: string | null;
  status?: string;
  type?: string;
  action?: string;
  occurredAt?: string;
  timestamp?: string;
  id?: string;
  eventId?: string;
};

const pad2 = (value: number) => value.toString().padStart(2, '0');

const getDateInTimeZone = (value: Date) => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(value);
};

const parseTimestamp = (value?: string | null) => {
  if (!value || typeof value !== 'string') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const calculateWorkHours = (checkIn: Date | null, checkOut: Date | null) => {
  if (!checkIn || !checkOut) return null;
  const diffMs = checkOut.getTime() - checkIn.getTime();
  if (diffMs < 0) return null;
  return parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
};

const normalizeEventType = (record: HeresnowAttendanceRecord) => {
  const raw = String(record.type || record.action || '').trim().toLowerCase();
  if (['check_in', 'checkin', 'clock_in', 'clockin', 'in', 'punch_in'].includes(raw)) return 'check_in';
  if (['check_out', 'checkout', 'clock_out', 'clockout', 'out', 'punch_out'].includes(raw)) return 'check_out';
  if (record.checkIn || record.check_in) return 'check_in';
  if (record.checkOut || record.check_out) return 'check_out';
  return raw || 'record';
};

const getEmployeeExternalId = (record: HeresnowAttendanceRecord) =>
  String(
    record.employeeExternalId
    ?? record.externalEmployeeId
    ?? record.employeeId
    ?? record.userId
    ?? ''
  ).trim();

export const getHeresnowSettings = (company: Company): HeresnowCompanySettings => {
  const settings = (company.settings || {}) as Record<string, unknown>;
  const integrations = (settings.integrations || {}) as Record<string, unknown>;
  const heresnow = (integrations.heresnow || {}) as HeresnowCompanySettings;
  return {
    enabled: Boolean(heresnow.enabled),
    externalCompanyId: heresnow.externalCompanyId ? String(heresnow.externalCompanyId) : String(company.id),
    lastSyncAt: heresnow.lastSyncAt ?? null,
    lastSyncError: heresnow.lastSyncError ?? null,
    lastSyncCount: typeof heresnow.lastSyncCount === 'number' ? heresnow.lastSyncCount : 0
  };
};

export const mergeHeresnowSettings = (
  company: Company,
  patch: Partial<HeresnowCompanySettings>
) => {
  const settings = { ...(company.settings || {}) } as Record<string, unknown>;
  const integrations = { ...((settings.integrations || {}) as Record<string, unknown>) };
  const current = getHeresnowSettings(company);
  integrations.heresnow = {
    ...current,
    ...patch
  };
  settings.integrations = integrations;
  return settings;
};

export async function findCompanyByExternalId(externalCompanyId: string) {
  const normalized = String(externalCompanyId || '').trim();
  if (!normalized) return null;

  const numericId = parseInt(normalized, 10);
  if (Number.isFinite(numericId)) {
    const byId = await Company.findByPk(numericId);
    if (byId) return byId;
  }

  const companies = await Company.findAll();
  for (const company of companies) {
    const hn = getHeresnowSettings(company);
    if (hn.enabled && hn.externalCompanyId === normalized) {
      return company;
    }
  }

  return null;
}

export async function findUserByExternalEmployeeId(company: Company, externalEmployeeId: string) {
  const normalized = String(externalEmployeeId || '').trim();
  if (!normalized) return null;

  const numericId = parseInt(normalized, 10);
  if (Number.isFinite(numericId)) {
    const byId = await User.findOne({
      where: {
        id: numericId,
        company_id: company.id,
        tenant_id: company.tenant_id,
        status: 'active'
      }
    });
    if (byId) return byId;
  }

  const byEmployeeNumber = await User.findOne({
    where: {
      employee_number: normalized,
      company_id: company.id,
      tenant_id: company.tenant_id,
      status: 'active'
    }
  });
  if (byEmployeeNumber) return byEmployeeNumber;

  return User.findOne({
    where: {
      userid: normalized,
      company_id: company.id,
      tenant_id: company.tenant_id,
      status: 'active'
    }
  });
}

async function upsertAttendanceRecord(
  company: Company,
  user: User,
  input: {
    date: string;
    checkIn?: Date | null;
    checkOut?: Date | null;
    status?: string;
    noteTag?: string;
  }
) {
  const date = input.date.slice(0, 10);
  let attendance = await Attendance.findOne({
    where: {
      user_id: user.id,
      date,
      tenant_id: company.tenant_id,
      company_id: company.id
    }
  });

  const checkIn = input.checkIn ?? (attendance?.check_in ? new Date(attendance.check_in) : null);
  const checkOut = input.checkOut ?? (attendance?.check_out ? new Date(attendance.check_out) : null);
  const workHours = calculateWorkHours(checkIn, checkOut);

  let status: 'normal' | 'late' | 'early' | 'overtime' | 'absent' = 'normal';
  const rawStatus = String(input.status || '').trim().toLowerCase();
  if (['late', 'early', 'overtime', 'absent', 'normal'].includes(rawStatus)) {
    status = rawStatus as typeof status;
  } else if (checkIn) {
    const standardTime = new Date(checkIn);
    standardTime.setHours(9, 0, 0, 0);
    status = checkIn > standardTime ? 'late' : 'normal';
  }

  const notes = input.noteTag ? `[HeresNow] ${input.noteTag}` : '[HeresNow] synced';

  if (attendance) {
    if (input.checkIn) {
      attendance.check_in = checkIn;
      attendance.check_in_client_time = checkIn.toISOString();
    }
    if (input.checkOut) {
      attendance.check_out = checkOut;
      attendance.check_out_client_time = checkOut?.toISOString();
    }
    attendance.work_hours = workHours ?? attendance.work_hours;
    attendance.status = status;
    attendance.notes = attendance.notes ? `${attendance.notes}\n${notes}` : notes;
    await attendance.save();
    return attendance;
  }

  return Attendance.create({
    tenant_id: company.tenant_id,
    company_id: company.id,
    user_id: user.id,
    date,
    check_in: checkIn ?? undefined,
    check_out: checkOut ?? undefined,
    check_in_client_time: checkIn ? checkIn.toISOString() : undefined,
    check_out_client_time: checkOut ? checkOut.toISOString() : undefined,
    work_hours: workHours ?? undefined,
    status,
    notes,
    ...( { is_active: true } as any )
  });
}

export async function applyHeresnowRecord(company: Company, record: HeresnowAttendanceRecord) {
  const employeeExternalId = getEmployeeExternalId(record);
  if (!employeeExternalId) {
    throw new Error('EMPLOYEE_ID_REQUIRED');
  }

  const user = await findUserByExternalEmployeeId(company, employeeExternalId);
  if (!user) {
    throw new Error(`EMPLOYEE_NOT_FOUND:${employeeExternalId}`);
  }

  const occurredAt = parseTimestamp(record.occurredAt || record.timestamp);
  const explicitCheckIn = parseTimestamp(record.checkIn || record.check_in);
  const explicitCheckOut = parseTimestamp(record.checkOut || record.check_out);
  const eventType = normalizeEventType(record);

  let date = record.date ? String(record.date).slice(0, 10) : null;
  if (!date && occurredAt) date = getDateInTimeZone(occurredAt);
  if (!date && explicitCheckIn) date = getDateInTimeZone(explicitCheckIn);
  if (!date && explicitCheckOut) date = getDateInTimeZone(explicitCheckOut);
  if (!date) {
    throw new Error('DATE_REQUIRED');
  }

  if (explicitCheckIn || explicitCheckOut) {
    return upsertAttendanceRecord(company, user, {
      date,
      checkIn: explicitCheckIn,
      checkOut: explicitCheckOut,
      status: record.status,
      noteTag: 'record'
    });
  }

  if (eventType === 'check_in' && occurredAt) {
    return upsertAttendanceRecord(company, user, {
      date,
      checkIn: occurredAt,
      status: record.status,
      noteTag: record.id || record.eventId || 'check_in'
    });
  }

  if (eventType === 'check_out' && occurredAt) {
    return upsertAttendanceRecord(company, user, {
      date,
      checkOut: occurredAt,
      status: record.status,
      noteTag: record.id || record.eventId || 'check_out'
    });
  }

  throw new Error('UNSUPPORTED_EVENT');
}

export async function processHeresnowDispatch(body: any) {
  const externalCompanyId = String(
    body?.externalCompanyId ?? body?.companyId ?? body?.company_id ?? ''
  ).trim();

  const company = externalCompanyId
    ? await findCompanyByExternalId(externalCompanyId)
    : null;

  if (!company) {
    throw new Error('COMPANY_NOT_FOUND');
  }

  const hn = getHeresnowSettings(company);
  if (!hn.enabled) {
    throw new Error('INTEGRATION_DISABLED');
  }

  const events: HeresnowAttendanceRecord[] = Array.isArray(body?.events)
    ? body.events
    : Array.isArray(body?.records)
      ? body.records
      : body && typeof body === 'object' && getEmployeeExternalId(body)
        ? [body as HeresnowAttendanceRecord]
        : [];

  if (events.length === 0) {
    throw new Error('EVENTS_REQUIRED');
  }

  const results: Array<{ ok: boolean; error?: string; employeeExternalId?: string }> = [];
  let applied = 0;

  for (const event of events) {
    try {
      await applyHeresnowRecord(company, event);
      applied += 1;
      results.push({ ok: true, employeeExternalId: getEmployeeExternalId(event) });
    } catch (error: any) {
      results.push({
        ok: false,
        employeeExternalId: getEmployeeExternalId(event),
        error: error?.message || 'FAILED'
      });
    }
  }

  await company.update({
    settings: mergeHeresnowSettings(company, {
      lastSyncAt: new Date().toISOString(),
      lastSyncCount: applied,
      lastSyncError: applied === events.length ? null : 'partial_failure'
    })
  });

  return { companyId: company.id, applied, total: events.length, results };
}

export async function pullHeresnowAttendance(company: Company, options?: { since?: string }) {
  const hn = getHeresnowSettings(company);
  if (!hn.enabled) {
    throw new Error('INTEGRATION_DISABLED');
  }

  const apiKey = process.env.MVS_INTEGRATION_API_KEY || process.env.HERESNOW_INTEGRATION_API_KEY;
  if (!apiKey) {
    throw new Error('API_KEY_NOT_CONFIGURED');
  }

  const baseUrl = (process.env.HERESNOW_API_BASE_URL || 'https://www.heresnow.in').replace(/\/+$/, '');
  const url = new URL(`${baseUrl}/api/integrations/mvs/attendance`);
  url.searchParams.set('companyId', hn.externalCompanyId || String(company.id));
  if (options?.since) {
    url.searchParams.set('since', options.since);
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    Accept: 'application/json'
  };
  const webhookBearer = process.env.MVS_WEBHOOK_BEARER;
  if (webhookBearer) {
    headers['X-MVS-Webhook-Bearer'] = webhookBearer;
  }

  const response = await fetch(url.toString(), { headers });
  const payload = (await response.json().catch(() => ({}))) as {
    message?: string;
    data?: HeresnowAttendanceRecord[];
    records?: HeresnowAttendanceRecord[];
  } | HeresnowAttendanceRecord[];

  if (!response.ok) {
    const message = typeof payload === 'object' && payload && !Array.isArray(payload) && typeof payload.message === 'string'
      ? payload.message
      : `HeresNow API ${response.status}`;
    throw new Error(message);
  }

  const rows: HeresnowAttendanceRecord[] = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.records)
        ? payload.records
        : [];

  let applied = 0;
  const errors: string[] = [];

  for (const row of rows) {
    try {
      await applyHeresnowRecord(company, row);
      applied += 1;
    } catch (error: any) {
      errors.push(error?.message || 'sync_failed');
    }
  }

  await company.update({
    settings: mergeHeresnowSettings(company, {
      lastSyncAt: new Date().toISOString(),
      lastSyncCount: applied,
      lastSyncError: errors.length ? errors.slice(0, 3).join('; ') : null
    })
  });

  return { applied, total: rows.length, errors };
}

export function verifyHeresnowDispatchAuth(headers: Record<string, unknown>) {
  const dispatchSecret = process.env.INTEGRATION_DISPATCH_SECRET;
  const webhookBearer = process.env.MVS_WEBHOOK_BEARER;

  if (!dispatchSecret && !webhookBearer) {
    return process.env.NODE_ENV !== 'production';
  }

  const authHeader = String(headers.authorization || headers.Authorization || '');
  if (webhookBearer && authHeader === `Bearer ${webhookBearer}`) {
    return true;
  }

  const integrationSecret = String(headers['x-integration-secret'] || headers['X-Integration-Secret'] || '');
  if (dispatchSecret && integrationSecret && integrationSecret === dispatchSecret) {
    return true;
  }

  return false;
}

export async function getHeresnowIntegrationStatus(company: Company) {
  const hn = getHeresnowSettings(company);
  const apiConfigured = Boolean(process.env.MVS_INTEGRATION_API_KEY || process.env.HERESNOW_INTEGRATION_API_KEY);
  const dispatchConfigured = Boolean(process.env.INTEGRATION_DISPATCH_SECRET || process.env.MVS_WEBHOOK_BEARER);

  return {
    enabled: hn.enabled,
    externalCompanyId: hn.externalCompanyId || String(company.id),
    lastSyncAt: hn.lastSyncAt,
    lastSyncError: hn.lastSyncError,
    lastSyncCount: hn.lastSyncCount ?? 0,
    heresnowUrl: process.env.HERESNOW_API_BASE_URL || 'https://www.heresnow.in',
    apiConfigured,
    dispatchConfigured,
    webhookPath: '/api/integrations/mvs/dispatch'
  };
}
