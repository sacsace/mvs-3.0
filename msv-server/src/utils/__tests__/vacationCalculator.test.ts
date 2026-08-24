import {
  buildEmployeeAccrualLeaveYearLabel,
  countAnnualLeaveMonthsInLeaveYear,
  getAnnualLeaveAccrualPeriod,
  getDefaultIndiaFiscalYearRange,
  getHireAccrualStartMonth,
} from '../vacationCalculator';

describe('annual leave accrual by hire date and fiscal year', () => {
  const fy2026 = getDefaultIndiaFiscalYearRange(new Date('2026-08-01'));

  it('counts Aug–Mar as 8 months for mid-July hire', () => {
    const hire = new Date('2026-07-13');
    const eligibility = new Date('2026-07-13');
    expect(countAnnualLeaveMonthsInLeaveYear(hire, fy2026, eligibility)).toBe(8);
  });

  it('counts Aug–Mar as 8 months for July 1 hire (hire month excluded)', () => {
    const hire = new Date('2026-07-01');
    const eligibility = new Date('2026-07-01');
    expect(countAnnualLeaveMonthsInLeaveYear(hire, fy2026, eligibility)).toBe(8);
  });

  it('counts Sep–Mar as 7 months for July 31 hire', () => {
    const hire = new Date('2026-07-31');
    const eligibility = new Date('2026-07-31');
    expect(countAnnualLeaveMonthsInLeaveYear(hire, fy2026, eligibility)).toBe(7);
  });

  it('counts Apr–Mar as 12 months for April 1 hire at fiscal year start', () => {
    const hire = new Date('2026-04-01');
    const eligibility = new Date('2026-04-01');
    expect(countAnnualLeaveMonthsInLeaveYear(hire, fy2026, eligibility)).toBe(12);
  });

  it('counts Apr–Mar for March hire before fiscal year (clamped to FY start)', () => {
    const hire = new Date('2026-03-01');
    const eligibility = new Date('2026-03-01');
    expect(countAnnualLeaveMonthsInLeaveYear(hire, fy2026, eligibility)).toBe(12);
  });

  it('respects eligibility delay within fiscal year', () => {
    const hire = new Date('2026-07-13');
    const eligibility = new Date('2026-10-01');
    expect(countAnnualLeaveMonthsInLeaveYear(hire, fy2026, eligibility)).toBe(6);
  });

  it('counts Oct–Mar as 6 months for Aug 10 hire with 30-day wait (eligible Sep 9)', () => {
    const hire = new Date('2026-08-10');
    const eligibility = new Date('2026-09-09');
    expect(countAnnualLeaveMonthsInLeaveYear(hire, fy2026, eligibility)).toBe(6);
  });

  it('builds per-employee accrual label within fiscal year', () => {
    const hire = new Date('2026-08-10');
    const eligibility = new Date('2026-09-09');
    const period = getAnnualLeaveAccrualPeriod(hire, fy2026, eligibility);
    expect(period?.months).toBe(6);
    expect(buildEmployeeAccrualLeaveYearLabel(fy2026, period)).toBe(
      '2026-27 (2026-10-01 ~ 2027-03-31)'
    );
  });

  it('April 1 fiscal hire starts accrual in April', () => {
    const hire = new Date('2026-04-01');
    const start = getHireAccrualStartMonth(hire, fy2026.start);
    expect(start).toEqual({ year: 2026, month: 3 });
  });
});
