/** 명세서 Earnings에 그대로 그릴 행 (엑셀 열 단위 수당 등) */
export type PayslipEarningLine = {
  label: string;
  amount: number;
  highlight?: boolean;
};

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
  night_ot_hour: number;
  transport_allowance: number;
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
  /**
   * 엑셀 매핑 열 순서·헤더명 그대로의 수당 행.
   * 있으면 명세서 Earnings는 이 목록을 사용 (합산 Other Allowance 대신).
   */
  payslip_earning_lines?: PayslipEarningLine[];
  actions?: string;
};
