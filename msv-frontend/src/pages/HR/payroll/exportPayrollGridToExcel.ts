import * as XLSX from 'xlsx';
import type { PayrollGridRow } from './payrollGridTypes';
import { computeTenureMonths, formatOtHourDisplay } from './payrollGridUtils';

type PayrollTranslate = (key: string) => string;

/** Salary Details 엑셀 시트와 동일한 열 순서로 xlsx 저장 */
export function exportPayrollGridToExcel(rows: PayrollGridRow[], t: PayrollTranslate): void {
  const sheetRows = rows.map((row) => {
    const tenure = computeTenureMonths(row.joining_date, row.working_month);
    return {
      [t('payrollManagement.gridColumns.rowNo')]: row.row_no,
      [t('payrollManagement.gridColumns.empId')]: row.emp_id,
      [t('payrollManagement.gridColumns.bankAccount')]: row.bank_account,
      [t('payrollManagement.gridColumns.ifsc')]: row.ifsc,
      [t('payrollManagement.gridColumns.bankName')]: row.bank_name,
      [t('payrollManagement.gridColumns.email')]: row.employee_email,
      [t('payrollManagement.gridColumns.department')]: row.department,
      [t('payrollManagement.gridColumns.employeeName')]: row.employee_name,
      [t('payrollManagement.gridColumns.joiningDate')]: row.joining_date,
      [t('payrollManagement.gridColumns.workingMonth')]: tenure,
      [t('payrollManagement.gridColumns.basicSalary')]: row.basic_salary,
      [t('payrollManagement.gridColumns.houseRentAllowance')]: row.house_rent_allowance,
      [t('payrollManagement.gridColumns.otherAllowance')]: row.other_allowance,
      [t('payrollManagement.gridColumns.totalSalary')]: row.total_salary,
      [t('payrollManagement.gridColumns.totalDayOfMonth')]: row.total_day_of_month,
      [t('payrollManagement.gridColumns.unpaidLeave')]: row.unpaid_leave,
      [t('payrollManagement.gridColumns.daysWorked')]: row.days_worked,
      [t('payrollManagement.gridColumns.otRate')]: row.ot_rate,
      [t('payrollManagement.gridColumns.dayOtHour')]: formatOtHourDisplay(row.day_ot_hour),
      [t('payrollManagement.gridColumns.extraAllowance')]: row.transport_allowance,
      [t('payrollManagement.gridColumns.sumTotal')]: row.sum_total,
      [t('payrollManagement.gridColumns.esicEmployer')]: row.esic_employer,
      [t('payrollManagement.gridColumns.pfEmployer')]: row.pf_employer,
      [t('payrollManagement.gridColumns.esicEmployee')]: row.esic_employee,
      [t('payrollManagement.gridColumns.pfEmployee')]: row.pf_employee,
      [t('payrollManagement.gridColumns.tds')]: row.tds,
      [t('payrollManagement.gridColumns.pt')]: row.pt,
      [t('payrollManagement.gridColumns.netSalary')]: row.net_salary_payable
    };
  });

  const ws = XLSX.utils.json_to_sheet(sheetRows);
  const wb = XLSX.utils.book_new();
  const sheetName = 'Payroll'.slice(0, 31);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const dateToken = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `payroll_export_${dateToken}.xlsx`);
}
