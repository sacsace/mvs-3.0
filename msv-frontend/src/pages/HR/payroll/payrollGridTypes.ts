export type PayrollGridRow = {
  id: number;
  row_no: number;
  bank_account: string;
  ifsc: string;
  bank_name: string;
  department: string;
  employee_name: string;
  position: string;
  birth_date: string;
  joining_date: string;
  /** 급여 근무월(YYYY-MM). 그리드에서는 입사일 대비 근속 개월수로만 표시 */
  working_month: string;
  basic_salary: number;
  total_day_of_month: string;
  unpaid_leave: string;
  days_worked: string;
  overtime: number;
  sum_total: number;
  pf_employee: string;
  pf_employer: string;
  esic_employee: string;
  esic_employer: string;
  tds: number;
  pt: string;
  /** API deductions — 그리드 열 없음, 명세서·저장에 사용 */
  deduct_this_month: number;
  net_salary_payable: number;
  employee_email: string;
  actions?: string;
};
