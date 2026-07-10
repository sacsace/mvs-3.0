export type PayrollGridRow = {
  id: number;
  row_no: number;
  emp_id: string;
  bank_account: string;
  ifsc: string;
  bank_name: string;
  employee_email: string;
  department: string;
  employee_name: string;
  position: string;
  birth_date: string;
  joining_date: string;
  /** 급여 근무월(YYYY-MM) */
  working_month: string;
  basic_salary: number;
  house_rent_allowance: number;
  other_allowance: number;
  total_salary: number;
  total_day_of_month: string;
  unpaid_leave: string;
  days_worked: string;
  ot_rate: number;
  day_ot_hour: number;
  /** 레거시 호환 — 항상 0 (야간 OT 미사용) */
  night_ot_hour: number;
  transport_allowance: number;
  /** 주간 OT시간 × OT Rate (API overtime_pay) */
  overtime: number;
  sum_total: number;
  /** extra_fields.indian_pf_mode — 기본 basic_12pct */
  indian_pf_mode?: 'basic_12pct' | 'gross_6pct' | 'epf_12pct_half';
  pf_employee: string;
  pf_employer: string;
  esic_employee: string;
  esic_employer: string;
  tds: number;
  pt: string;
  /** API deductions — 명세서·저장에 사용 */
  deduct_this_month: number;
  net_salary_payable: number;
  actions?: string;
};
