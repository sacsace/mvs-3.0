/** `useTranslation().t` — i18next 버전별 TFunction export 차이 회피 */
export type I18nTranslate = (key: string, options?: Record<string, unknown>) => string;

export function hasDetailValue(value: unknown): boolean {
  if (value == null) return false;
  const text = String(value).trim();
  return text.length > 0 && text !== '-' && text !== '—';
}

export function normalizePhoneDigits(raw: string): string {
  return String(raw ?? '')
    .replace(/\s/g, '')
    .replace(/\D/g, '')
    .slice(0, 10);
}

export function formatPhoneDisplay(digitsOnly: string): string {
  const d = normalizePhoneDigits(digitsOnly);
  if (!d) return '';
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)} ${d.slice(5)}`;
}

export function normalizeBankAccountDigits(raw: string): string {
  return String(raw ?? '')
    .replace(/\s/g, '')
    .replace(/\D/g, '');
}

export function formatBankAccountDisplay(digitsOnly: string): string {
  const d = normalizeBankAccountDigits(digitsOnly);
  if (!d) return '';
  const parts: string[] = [];
  for (let i = 0; i < d.length; i += 4) parts.push(d.slice(i, i + 4));
  return parts.join(' ');
}

export function normalizeIfsc(raw: string): string {
  return String(raw ?? '')
    .replace(/\s/g, '')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase()
    .slice(0, 11);
}

export function formatIfscDisplay(stored: string): string {
  const s = normalizeIfsc(stored);
  if (!s) return '';
  const parts: string[] = [];
  for (let i = 0; i < s.length; i += 4) parts.push(s.slice(i, i + 4));
  return parts.join(' ');
}

export function getGenderLabel(t: I18nTranslate, g: string | undefined): string {
  switch (g) {
    case 'male':
      return t('userManagement.genderMale');
    case 'female':
      return t('userManagement.genderFemale');
    case 'other':
      return t('userManagement.genderOther');
    default:
      return '';
  }
}

export function getEmploymentTypeLabel(t: I18nTranslate, type: string | undefined): string {
  switch (type) {
    case 'fulltime':
      return t('userManagement.empFulltime');
    case 'daily':
      return t('userManagement.empDaily');
    case 'contract':
      return t('userManagement.empContract');
    case 'parttime':
      return t('userManagement.empParttime');
    case 'intern':
      return t('userManagement.empIntern');
    default:
      return '';
  }
}

export function getRoleLabel(t: I18nTranslate, role: string | undefined): string {
  switch (role) {
    case 'root':
      return t('userManagement.roleRoot');
    case 'admin':
      return t('userManagement.roleAdmin');
    case 'user':
      return t('userManagement.roleUser');
    case 'audit':
      return t('userManagement.roleAudit');
    default:
      return role || '';
  }
}

export function getStatusLabel(t: I18nTranslate, status: string | undefined): string {
  switch (status) {
    case 'active':
      return t('userManagement.statusActive');
    case 'inactive':
      return t('userManagement.statusInactive');
    case 'suspended':
      return t('userManagement.statusSuspended');
    default:
      return status || '';
  }
}
