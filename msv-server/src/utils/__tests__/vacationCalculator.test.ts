import {
  countAnnualLeaveMonthsInLeaveYear,
  getDefaultIndiaFiscalYearRange,
} from '../vacationCalculator';

describe('countAnnualLeaveMonthsInLeaveYear', () => {
  const fy2026 = getDefaultIndiaFiscalYearRange(new Date('2026-08-01'));

  it('counts Aug–Mar as 8 months for mid-July hire', () => {
    const hire = new Date('2026-07-13');
    const eligibility = new Date('2026-07-13');
    expect(countAnnualLeaveMonthsInLeaveYear(hire, fy2026, eligibility)).toBe(8);
  });

  it('counts Sep–Mar as 7 months for July 31 hire', () => {
    const hire = new Date('2026-07-31');
    const eligibility = new Date('2026-07-31');
    expect(countAnnualLeaveMonthsInLeaveYear(hire, fy2026, eligibility)).toBe(7);
  });

  it('counts Apr–Mar as 12 months for April 1 hire', () => {
    const hire = new Date('2026-04-01');
    const eligibility = new Date('2026-04-01');
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
});
