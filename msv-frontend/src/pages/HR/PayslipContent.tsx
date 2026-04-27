import React from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableRow, Paper } from '@mui/material';
import type { PayrollGridRow } from './payroll/payrollGridTypes';

export type PayslipLabels = {
  title: string;
  companySection: string;
  companyName: string;
  companyContact: string;
  employee: string;
  birthDate: string;
  department: string;
  position: string;
  email: string;
  period: string;
  earnings: string;
  deductions: string;
  netPay: string;
  basicSalary: string;
  overtime: string;
  gross: string;
  tds: string;
  deductMonth: string;
  netSalary: string;
  bank: string;
  account: string;
  pfEmployee: string;
  pfEmployer: string;
  esicEmployee: string;
  esicEmployer: string;
  pt: string;
  bankSection: string;
};

export type PayslipCompanyInfo = {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
};

type Props = {
  row: PayrollGridRow;
  labels: PayslipLabels;
  companyInfo?: PayslipCompanyInfo | null;
  /** 다이얼로그에서는 바깥 제목과 중복되지 않게 false */
  showTitle?: boolean;
  /** true면 부모(다이얼로그) 가로폭에 맞춤 — PDF/단독 표시는 기본 좁은 폭 유지 */
  wide?: boolean;
};

const INR = 'en-IN';

function parseMoney(v: string | number | undefined | null): number {
  if (v === '' || v == null) return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const n = parseFloat(String(v).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : 0;
}

/** Rs. + 천단위 콤마 + 소수 2자리 통일 */
export function money(n: number): string {
  const x = Number(n || 0);
  return `Rs. ${x.toLocaleString(INR, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function moneyFromField(v: string | number | undefined | null): string {
  return money(parseMoney(v));
}

const cellLabel = {
  width: '52%',
  fontWeight: 600,
  fontSize: '0.8125rem',
  color: 'text.primary',
  borderColor: 'divider',
  py: 1,
  pl: 1.5,
  bgcolor: 'grey.50'
} as const;

const cellValue = {
  fontSize: '0.8125rem',
  fontVariantNumeric: 'tabular-nums',
  borderColor: 'divider',
  py: 1,
  pr: 1.5
} as const;

const sectionTitleSx = {
  fontWeight: 700,
  fontSize: '0.75rem',
  letterSpacing: '0.06em',
  color: 'primary.main',
  textTransform: 'uppercase' as const,
  mb: 0.75,
  mt: 0
};

const PayslipContent = React.forwardRef<HTMLDivElement, Props>(function PayslipContent(
  { row, labels, companyInfo, showTitle = true, wide = false },
  ref
) {
  const bankLine =
    [row.bank_name, row.bank_account].filter(Boolean).length > 0
      ? `${labels.bank}: ${row.bank_name || '—'} · ${labels.account}: ${row.bank_account || '—'}`
      : `${labels.bank}: — · ${labels.account}: —`;

  return (
    <Box
      ref={ref}
      sx={{
        bgcolor: '#fff',
        color: 'text.primary',
        p: { xs: 2, sm: 3 },
        width: wide ? '100%' : undefined,
        maxWidth: wide ? '100%' : 640,
        mx: wide ? 0 : 'auto',
        boxSizing: 'border-box',
        fontFamily: '"Malgun Gothic", "Apple SD Gothic Neo", system-ui, sans-serif'
      }}
    >
      <Paper
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          overflow: 'hidden'
        }}
      >
        {showTitle ? (
          <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'grey.50' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, textAlign: 'center', fontSize: '1.1rem' }}>
              {labels.title}
            </Typography>
          </Box>
        ) : null}

        <Box sx={{ p: 2.5 }}>
          <Table size="small" sx={{ mb: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            <TableBody>
              <TableRow>
                <TableCell sx={cellLabel}>{labels.companyName}</TableCell>
                <TableCell sx={{ ...cellValue, fontWeight: 600 }}>{companyInfo?.name || '—'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={cellLabel}>{labels.companyContact}</TableCell>
                <TableCell sx={cellValue}>
                  {[companyInfo?.address, companyInfo?.phone, companyInfo?.email]
                    .filter((x) => !!String(x || '').trim())
                    .join(' · ') || '—'}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={cellLabel}>{labels.employee}</TableCell>
                <TableCell sx={{ ...cellValue, fontWeight: 500 }}>{row.employee_name || '—'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={cellLabel}>{labels.email}</TableCell>
                <TableCell sx={cellValue}>{row.employee_email || '—'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={cellLabel}>{labels.birthDate}</TableCell>
                <TableCell sx={cellValue}>{row.birth_date || '—'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={cellLabel}>{labels.department}</TableCell>
                <TableCell sx={cellValue}>{row.department || '—'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={cellLabel}>{labels.position}</TableCell>
                <TableCell sx={cellValue}>{row.position || '—'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={cellLabel}>{labels.period}</TableCell>
                <TableCell sx={{ ...cellValue, fontWeight: 600 }}>{row.working_month || '—'}</TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <Typography sx={sectionTitleSx}>{labels.earnings}</Typography>
          <Table size="small" sx={{ mb: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            <TableBody>
              <TableRow>
                <TableCell sx={{ ...cellLabel, bgcolor: 'grey.50' }}>{labels.basicSalary}</TableCell>
                <TableCell align="right" sx={{ ...cellValue, fontWeight: 500 }}>
                  {money(row.basic_salary)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ ...cellLabel, bgcolor: 'grey.50' }}>{labels.overtime}</TableCell>
                <TableCell align="right" sx={cellValue}>
                  {money(row.overtime)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ ...cellLabel, bgcolor: 'grey.200', fontWeight: 700 }}>{labels.gross}</TableCell>
                <TableCell align="right" sx={{ ...cellValue, fontWeight: 700, bgcolor: 'grey.200' }}>
                  {money(row.sum_total)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <Typography sx={{ ...sectionTitleSx, mt: 0.5 }}>{labels.deductions}</Typography>
          <Table size="small" sx={{ mb: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            <TableBody>
              <TableRow>
                <TableCell sx={{ ...cellLabel, bgcolor: 'grey.50' }}>{labels.tds}</TableCell>
                <TableCell align="right" sx={cellValue}>
                  {money(row.tds)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ ...cellLabel, bgcolor: 'grey.50' }}>{labels.pfEmployee}</TableCell>
                <TableCell align="right" sx={cellValue}>
                  {moneyFromField(row.pf_employee)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ ...cellLabel, bgcolor: 'grey.50' }}>{labels.pfEmployer}</TableCell>
                <TableCell align="right" sx={cellValue}>
                  {moneyFromField(row.pf_employer)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ ...cellLabel, bgcolor: 'grey.50' }}>{labels.esicEmployee}</TableCell>
                <TableCell align="right" sx={cellValue}>
                  {moneyFromField(row.esic_employee)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ ...cellLabel, bgcolor: 'grey.50' }}>{labels.esicEmployer}</TableCell>
                <TableCell align="right" sx={cellValue}>
                  {moneyFromField(row.esic_employer)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ ...cellLabel, bgcolor: 'grey.50' }}>{labels.pt}</TableCell>
                <TableCell align="right" sx={cellValue}>
                  {moneyFromField(row.pt)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ ...cellLabel, bgcolor: 'grey.50' }}>{labels.deductMonth}</TableCell>
                <TableCell align="right" sx={cellValue}>
                  {money(row.deduct_this_month)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <Table
            size="small"
            sx={{
              border: '1px solid',
              borderColor: 'success.main',
              borderRadius: 1,
              borderLeft: '4px solid',
              borderLeftColor: 'success.main',
              bgcolor: 'rgba(46, 125, 50, 0.06)',
              overflow: 'hidden'
            }}
          >
            <TableBody>
              <TableRow>
                <TableCell
                  sx={{
                    ...cellLabel,
                    bgcolor: 'success.main',
                    color: 'success.contrastText',
                    fontWeight: 700,
                    borderColor: 'success.dark'
                  }}
                >
                  {labels.netPay}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    ...cellValue,
                    fontWeight: 700,
                    fontSize: '1rem',
                    bgcolor: 'success.main',
                    color: 'success.contrastText',
                    borderColor: 'success.dark'
                  }}
                >
                  {money(row.net_salary_payable)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <Box
            sx={{
              mt: 2,
              p: 1.5,
              borderRadius: 1,
              bgcolor: 'grey.50',
              border: '1px dashed',
              borderColor: 'divider'
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5, color: 'text.secondary' }}>
              {labels.bankSection}
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '0.8125rem', lineHeight: 1.5 }}>
              {bankLine}
            </Typography>
            {(row.ifsc || row.bank_name) && (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                IFSC: {row.ifsc || '—'}
              </Typography>
            )}
          </Box>
        </Box>
      </Paper>
    </Box>
  );
});

export default PayslipContent;
