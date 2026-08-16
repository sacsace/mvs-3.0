/** SEDA 재무제표 엑셀 시트와 동일한 구조로 MVS 집계를 재구성 */

import { toSentenceCase } from './textCase';

export type AmountRow = {
  accountId: number;
  code: string;
  name: string;
  nameEn?: string | null;
  amount: number;
  nature?: string;
  debit?: number;
  credit?: number;
  opening?: number;
  synthetic?: boolean;
};

export type ComparativeLine = {
  /** 좌측 인덱스 (A, B, 1, 2, 3 등) — 엑셀 BS 첫 열 */
  index?: string;
  label: string;
  current: number | null;
  previous: number | null;
  indent?: 0 | 1 | 2;
  section?: boolean;
  total?: boolean;
  note?: string;
};

export type BsBundle = {
  assetRows: AmountRow[];
  liabilityRows: AmountRow[];
  equityRows: AmountRow[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  totalLiabilitiesAndEquity: number;
  netProfit: number;
};

export type PlBundle = {
  incomeRows: AmountRow[];
  expenseRows: AmountRow[];
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
};

export type TbRow = {
  accountId: number;
  code: string;
  name: string;
  nature?: string;
  debit: number;
  credit: number;
  balance: number;
  opening?: number;
};

const rx = (pattern: string | RegExp) =>
  typeof pattern === 'string' ? new RegExp(pattern, 'i') : pattern;

export const matchName = (name: string, pattern: string | RegExp) => rx(pattern).test(name || '');

export const sumAmounts = (rows: AmountRow[]) =>
  rows.reduce((s, r) => s + Number(r.amount || 0), 0);

export const pick = (rows: AmountRow[], pattern: string | RegExp) =>
  rows.filter((r) => matchName(r.name, pattern));

export const exclude = (rows: AmountRow[], pattern: string | RegExp) =>
  rows.filter((r) => !matchName(r.name, pattern));

const accountLineLabel = (name: string) => toSentenceCase(name);

const PAT = {
  cash: /\b(bank|cash|petty cash|cash[- ]?in[- ]?hand)\b/i,
  receivable: /\b(receivable|sundry debtors|debtor)\b/i,
  advance: /\b(advance|loan|deposit)\b/i,
  fixed: /\b(fixed|vehicle|furniture|computer|equipment|machinery|building|tangible|depreciation)\b/i,
  inventory: /\b(inventory|stock|stock[- ]?in[- ]?hand)\b/i,
  investment: /\b(investment)\b/i,
  borrowing: /\b(loan|borrowing|overdraft|\bod\b)\b/i,
  payable: /\b(payable|sundry creditors|creditor|supplier)\b/i,
  provision: /\b(provision)\b/i,
  gstOutput: /\b(output\s*(cgst|sgst|igst|gst)|(cgst|sgst|igst)\s*output)\b/i,
  gstInput: /\b(input\s*(cgst|sgst|igst|gst)|(cgst|sgst|igst)\s*input)\b/i,
  tds: /\btds\b/i,
  capital: /\b(share capital|capital account|equity share)\b/i,
  reserve: /\b(reserve|surplus|premium|retained)\b/i,
  sales: /\b(sales|revenue|service fee|professional service|room rent|food sales|card sales)\b/i,
  otherIncome: /\b(other income|written off|interest (received|income)|discount received|prior period income)\b/i,
  purchase: /\b(purchase|cost of|material)\b/i,
  employee: /\b(salary|wage|employee|payroll|pf |esi )\b/i,
  finance: /\b(bank charge|interest (paid|on)|finance cost)\b/i,
  depreciation: /\b(depreciation|amortisation|amortization)\b/i,
  otherExpense: /\b(expense|charges|repair|maintenance|travel|telephone|electric|professional|legal|consultancy|labour|food|accomodation|accommodation)\b/i,
};

const line = (
  label: string,
  current: number | null,
  previous: number | null,
  opts?: Partial<ComparativeLine>
): ComparativeLine => ({
  label,
  current,
  previous,
  indent: 1,
  ...opts,
});

/** BS 시트 */
export function buildBsSheet(current: BsBundle | null, previous: BsBundle | null): ComparativeLine[] {
  const ca = current?.assetRows || [];
  const pa = previous?.assetRows || [];
  const cl = current?.liabilityRows || [];
  const pl = previous?.liabilityRows || [];
  const ce = (current?.equityRows || []).filter((r) => !r.synthetic);
  const pe = (previous?.equityRows || []).filter((r) => !r.synthetic);

  const shareCapitalC = pick(ce, PAT.capital);
  const shareCapitalP = pick(pe, PAT.capital);
  const reservesC = exclude(ce, PAT.capital);
  const reservesP = exclude(pe, PAT.capital);

  const longBorrowC = pick(cl, PAT.borrowing);
  const longBorrowP = pick(pl, PAT.borrowing);
  const payablesC = pick(cl, PAT.payable);
  const payablesP = pick(pl, PAT.payable);
  const provisionsC = pick(cl, PAT.provision);
  const provisionsP = pick(pl, PAT.provision);
  const otherLiabC = exclude(cl, new RegExp(`${PAT.borrowing.source}|${PAT.payable.source}|${PAT.provision.source}`, 'i'));
  const otherLiabP = exclude(pl, new RegExp(`${PAT.borrowing.source}|${PAT.payable.source}|${PAT.provision.source}`, 'i'));

  const fixedC = pick(ca, PAT.fixed);
  const fixedP = pick(pa, PAT.fixed);
  const investC = pick(ca, PAT.investment);
  const investP = pick(pa, PAT.investment);
  const invC = pick(ca, PAT.inventory);
  const invP = pick(pa, PAT.inventory);
  const recvC = pick(ca, PAT.receivable);
  const recvP = pick(pa, PAT.receivable);
  const cashC = pick(ca, PAT.cash);
  const cashP = pick(pa, PAT.cash);
  const advanceC = pick(ca, PAT.advance);
  const advanceP = pick(pa, PAT.advance);
  const otherAssetC = exclude(
    ca,
    new RegExp(
      `${PAT.fixed.source}|${PAT.investment.source}|${PAT.inventory.source}|${PAT.receivable.source}|${PAT.cash.source}|${PAT.advance.source}`,
      'i'
    )
  );
  const otherAssetP = exclude(
    pa,
    new RegExp(
      `${PAT.fixed.source}|${PAT.investment.source}|${PAT.inventory.source}|${PAT.receivable.source}|${PAT.cash.source}|${PAT.advance.source}`,
      'i'
    )
  );

  const equityLiabTotalC =
    sumAmounts(shareCapitalC) +
    sumAmounts(reservesC) +
    (current?.netProfit || 0) +
    sumAmounts(longBorrowC) +
    sumAmounts(payablesC) +
    sumAmounts(otherLiabC) +
    sumAmounts(provisionsC);
  const equityLiabTotalP =
    sumAmounts(shareCapitalP) +
    sumAmounts(reservesP) +
    (previous?.netProfit || 0) +
    sumAmounts(longBorrowP) +
    sumAmounts(payablesP) +
    sumAmounts(otherLiabP) +
    sumAmounts(provisionsP);

  const assetsTotalC =
    sumAmounts(fixedC) +
    sumAmounts(investC) +
    sumAmounts(invC) +
    sumAmounts(recvC) +
    sumAmounts(cashC) +
    sumAmounts(advanceC) +
    sumAmounts(otherAssetC);
  const assetsTotalP =
    sumAmounts(fixedP) +
    sumAmounts(investP) +
    sumAmounts(invP) +
    sumAmounts(recvP) +
    sumAmounts(cashP) +
    sumAmounts(advanceP) +
    sumAmounts(otherAssetP);

  return [
    line('EQUITY AND LIABILITIES (지분과 부채)', null, null, { section: true, indent: 0, index: 'A' }),
    line("Shareholders' funds (주주자금)", null, null, { indent: 0, index: '1' }),
    line('(a) Share capital (주식자본)', sumAmounts(shareCapitalC), sumAmounts(shareCapitalP), { note: '1' }),
    line(
      '(b) Reserves and surplus (적립금 및 잉여금)',
      sumAmounts(reservesC) + (current?.netProfit || 0),
      sumAmounts(reservesP) + (previous?.netProfit || 0),
      { note: '2' }
    ),
    line('Non-current liabilities (비유동 부채)', null, null, { indent: 0, index: '2' }),
    line('(a) Long-term borrowings (장기차입금)', sumAmounts(longBorrowC), sumAmounts(longBorrowP), { note: '3' }),
    line('(b) Deferred tax liabilities (net) (이연법인세부채)', 0, 0),
    line('Current liabilities (유동부채)', null, null, { indent: 0, index: '3' }),
    line('(a) Short Term Borrowings (단기차입금)', 0, 0),
    line('(b) Trade payables (무역채무)', sumAmounts(payablesC), sumAmounts(payablesP)),
    line('(c) Other current liabilities (기타유동부채)', sumAmounts(otherLiabC), sumAmounts(otherLiabP), {
      note: '4',
    }),
    line('(d) Short-term provisions (단기충당금)', sumAmounts(provisionsC), sumAmounts(provisionsP)),
    line('Total', equityLiabTotalC, equityLiabTotalP, { total: true, indent: 0 }),
    line('ASSETS (자산)', null, null, { section: true, indent: 0, index: 'B' }),
    line('Non-current assets (비유동 자산)', null, null, { indent: 0, index: '1' }),
    line('(a) Fixed assets (고정자산)', null, null, { indent: 1 }),
    line('(i) Tangible assets (유형자산)', sumAmounts(fixedC), sumAmounts(fixedP), { indent: 2, note: '5' }),
    line('(b) Non-current investments (비유동투자)', sumAmounts(investC), sumAmounts(investP)),
    line('Current assets (유동 자산)', null, null, { indent: 0, index: '2' }),
    line('(a) Inventories (재고자산)', sumAmounts(invC), sumAmounts(invP)),
    line('(b) Trade receivables (매출채권)', sumAmounts(recvC), sumAmounts(recvP)),
    line('(c) Cash and cash equivalents (현금 및 현금성자산)', sumAmounts(cashC), sumAmounts(cashP), {
      note: '6',
    }),
    line('(d) Short-term loans and advances (단기대여금 및 선급금)', sumAmounts(advanceC), sumAmounts(advanceP)),
    line('(e) Other Current Assets (기타 유동자산)', sumAmounts(otherAssetC), sumAmounts(otherAssetP), {
      note: '7',
    }),
    line('Total', assetsTotalC, assetsTotalP, { total: true, indent: 0 }),
  ];
}

/** PL 시트 */
export function buildPlSheet(current: PlBundle | null, previous: PlBundle | null): ComparativeLine[] {
  const ci = current?.incomeRows || [];
  const pi = previous?.incomeRows || [];
  const ce = current?.expenseRows || [];
  const pe = previous?.expenseRows || [];

  const revC = pick(ci, PAT.sales);
  const revP = pick(pi, PAT.sales);
  const othIncC = exclude(ci, PAT.sales);
  const othIncP = exclude(pi, PAT.sales);
  // if sales pick empty, treat all income as revenue
  const revenueC = revC.length ? sumAmounts(revC) : sumAmounts(ci);
  const revenueP = revP.length ? sumAmounts(revP) : sumAmounts(pi);
  const otherIncomeC = revC.length ? sumAmounts(othIncC) : 0;
  const otherIncomeP = revP.length ? sumAmounts(othIncP) : 0;

  const purchaseC = pick(ce, PAT.purchase);
  const purchaseP = pick(pe, PAT.purchase);
  const empC = pick(ce, PAT.employee);
  const empP = pick(pe, PAT.employee);
  const finC = pick(ce, PAT.finance);
  const finP = pick(pe, PAT.finance);
  const depC = pick(ce, PAT.depreciation);
  const depP = pick(pe, PAT.depreciation);
  const otherExpC = exclude(
    ce,
    new RegExp(`${PAT.purchase.source}|${PAT.employee.source}|${PAT.finance.source}|${PAT.depreciation.source}`, 'i')
  );
  const otherExpP = exclude(
    pe,
    new RegExp(`${PAT.purchase.source}|${PAT.employee.source}|${PAT.finance.source}|${PAT.depreciation.source}`, 'i')
  );

  const totalRevC = revenueC + otherIncomeC;
  const totalRevP = revenueP + otherIncomeP;
  const totalExpC =
    sumAmounts(purchaseC) + sumAmounts(empC) + sumAmounts(finC) + sumAmounts(depC) + sumAmounts(otherExpC);
  const totalExpP =
    sumAmounts(purchaseP) + sumAmounts(empP) + sumAmounts(finP) + sumAmounts(depP) + sumAmounts(otherExpP);
  const pbtC = totalRevC - totalExpC;
  const pbtP = totalRevP - totalExpP;

  return [
    line('A  CONTINUING OPERATIONS', null, null, { section: true, indent: 0 }),
    line('1  Revenue from operations (net)', revenueC, revenueP, { note: '8' }),
    line('2  Other Income', otherIncomeC, otherIncomeP, { note: '9' }),
    line('3  Total Revenue (1+2)', totalRevC, totalRevP, { total: true, indent: 0 }),
    line('4  Expenses', null, null, { indent: 0 }),
    line('(a) Cost of materials consumed', 0, 0),
    line('(b) Purchases', sumAmounts(purchaseC), sumAmounts(purchaseP)),
    line('(c) Changes in inventories', 0, 0),
    line('(d) Employee benefits expenses', sumAmounts(empC), sumAmounts(empP)),
    line('(e) Finance costs', sumAmounts(finC), sumAmounts(finP)),
    line('(f) Depreciation and amortisation expenses', sumAmounts(depC), sumAmounts(depP)),
    line('(g) Other expenses', sumAmounts(otherExpC), sumAmounts(otherExpP), { note: '10' }),
    line('Total Expenses', totalExpC, totalExpP, { total: true, indent: 0 }),
    line('5  Profit / (Loss) before tax (3 - 4)', pbtC, pbtP, { total: true, indent: 0 }),
    line('6  Tax Expense', null, null, { indent: 0 }),
    line('(a) Current tax expense', 0, 0),
    line('(b) Deferred tax', 0, 0),
    line('7  Profit / (Loss) from continuing operations', pbtC, pbtP, { total: true, indent: 0 }),
  ];
}

/** Capital (Note 1–3) — 자본/잉여금 스케줄 */
export function buildCapitalSheet(current: BsBundle | null, previous: BsBundle | null): ComparativeLine[] {
  const ce = (current?.equityRows || []).filter((r) => !r.synthetic);
  const pe = (previous?.equityRows || []).filter((r) => !r.synthetic);
  const capitalC = sumAmounts(pick(ce, PAT.capital));
  const capitalP = sumAmounts(pick(pe, PAT.capital));
  const reservesC = sumAmounts(exclude(ce, PAT.capital));
  const reservesP = sumAmounts(exclude(pe, PAT.capital));
  const profitC = current?.netProfit || 0;
  const profitP = previous?.netProfit || 0;
  const openingSurplusC = reservesP; // 전기 잉여금을 당기 기초로 근사
  const closingSurplusC = openingSurplusC + profitC;
  const closingSurplusP = reservesP + profitP;

  return [
    line('Note 1  SHARE CAPITAL', null, null, { section: true, indent: 0 }),
    line('Issued, Subscribed and Paid up', capitalC, capitalP),
    line('Total', capitalC, capitalP, { total: true, indent: 0 }),
    line('Note 2  RESERVES AND SURPLUS', null, null, { section: true, indent: 0 }),
    line('(A) Share Premium / Other reserves', reservesC, reservesP),
    line('(B) Surplus / (Deficit) in Statement of P&L', null, null, { indent: 0 }),
    line('Opening balance', openingSurplusC, reservesP - profitP),
    line('Add: Profit / (Loss) for the year', profitC, profitP),
    line('Closing balance (B)', closingSurplusC, closingSurplusP, { total: true }),
    line('Total (A)+(B)', reservesC + closingSurplusC, reservesP + closingSurplusP, {
      total: true,
      indent: 0,
    }),
    line('Note 3  LONG TERM BORROWINGS', null, null, { section: true, indent: 0 }),
    line(
      'Long-term borrowings',
      sumAmounts(pick(current?.liabilityRows || [], PAT.borrowing)),
      sumAmounts(pick(previous?.liabilityRows || [], PAT.borrowing))
    ),
  ];
}

/** Sch - BS */
export function buildSchBsSheet(current: BsBundle | null, previous: BsBundle | null): ComparativeLine[] {
  const ca = current?.assetRows || [];
  const pa = previous?.assetRows || [];
  const cl = current?.liabilityRows || [];
  const pl = previous?.liabilityRows || [];

  const otherLiabC = exclude(cl, new RegExp(`${PAT.payable.source}|${PAT.borrowing.source}`, 'i'));
  const otherLiabP = exclude(pl, new RegExp(`${PAT.payable.source}|${PAT.borrowing.source}`, 'i'));
  const tdsC = pick(cl, PAT.tds);
  const tdsP = pick(pl, PAT.tds);
  const fixedC = pick(ca, PAT.fixed);
  const fixedP = pick(pa, PAT.fixed);
  const cashC = pick(ca, PAT.cash);
  const cashP = pick(pa, PAT.cash);
  const inputGstC = pick(ca, PAT.gstInput);
  const inputGstP = pick(pa, PAT.gstInput);
  const otherAssetC = exclude(ca, new RegExp(`${PAT.fixed.source}|${PAT.cash.source}|${PAT.receivable.source}|${PAT.inventory.source}`, 'i'));
  const otherAssetP = exclude(pa, new RegExp(`${PAT.fixed.source}|${PAT.cash.source}|${PAT.receivable.source}|${PAT.inventory.source}`, 'i'));

  const lines: ComparativeLine[] = [
    line('Note 4  OTHER CURRENT LIABILITIES', null, null, { section: true, indent: 0 }),
  ];
  if (tdsC.length || tdsP.length) {
    lines.push(line('TDS Payable', sumAmounts(tdsC), sumAmounts(tdsP)));
  }
  const restLiabC = exclude(otherLiabC, PAT.tds);
  const restLiabP = exclude(otherLiabP, PAT.tds);
  restLiabC.forEach((r) => {
    const prev = restLiabP.find((x) => x.name === r.name);
    lines.push(line(accountLineLabel(r.name), r.amount, prev?.amount || 0));
  });
  restLiabP
    .filter((r) => !restLiabC.some((x) => x.name === r.name))
    .forEach((r) => lines.push(line(accountLineLabel(r.name), 0, r.amount)));
  lines.push(
    line('Total', sumAmounts(otherLiabC), sumAmounts(otherLiabP), { total: true, indent: 0 }),
    line('Note 5  FIXED TANGIBLE ASSETS', null, null, { section: true, indent: 0 }),
    line('Closing balance', sumAmounts(fixedC), sumAmounts(fixedP), { total: true }),
    line('Note 6  CASH AND CASH EQUIVALENTS', null, null, { section: true, indent: 0 })
  );
  cashC.forEach((r) => {
    const prev = cashP.find((x) => x.name === r.name);
    lines.push(line(accountLineLabel(r.name), r.amount, prev?.amount || 0));
  });
  cashP
    .filter((r) => !cashC.some((x) => x.name === r.name))
    .forEach((r) => lines.push(line(accountLineLabel(r.name), 0, r.amount)));
  lines.push(
    line('Total', sumAmounts(cashC), sumAmounts(cashP), { total: true, indent: 0 }),
    line('Note 7  OTHER CURRENT ASSETS', null, null, { section: true, indent: 0 }),
    line('Input GST', sumAmounts(inputGstC), sumAmounts(inputGstP))
  );
  exclude(otherAssetC, PAT.gstInput).forEach((r) => {
    const prev = otherAssetP.find((x) => x.name === r.name);
    lines.push(line(accountLineLabel(r.name), r.amount, prev?.amount || 0));
  });
  lines.push(line('Total', sumAmounts(otherAssetC), sumAmounts(otherAssetP), { total: true, indent: 0 }));
  return lines;
}

/** Sch - PL */
export function buildSchPlSheet(current: PlBundle | null, previous: PlBundle | null): ComparativeLine[] {
  const ci = current?.incomeRows || [];
  const pi = previous?.incomeRows || [];
  const ce = current?.expenseRows || [];
  const pe = previous?.expenseRows || [];

  const revC = pick(ci, PAT.sales);
  const revP = pick(pi, PAT.sales);
  const othIncC = exclude(ci, PAT.sales);
  const othIncP = exclude(pi, PAT.sales);
  const otherExpC = exclude(
    ce,
    new RegExp(`${PAT.purchase.source}|${PAT.employee.source}|${PAT.finance.source}|${PAT.depreciation.source}`, 'i')
  );
  const otherExpP = exclude(
    pe,
    new RegExp(`${PAT.purchase.source}|${PAT.employee.source}|${PAT.finance.source}|${PAT.depreciation.source}`, 'i')
  );

  const lines: ComparativeLine[] = [
    line('Note 8  REVENUE FROM OPERATIONS', null, null, { section: true, indent: 0 }),
  ];
  (revC.length ? revC : ci).forEach((r) => {
    const prev = (revP.length ? revP : pi).find((x) => x.name === r.name);
    lines.push(line(accountLineLabel(r.name), r.amount, prev?.amount || 0));
  });
  lines.push(
    line(
      'Total',
      revC.length ? sumAmounts(revC) : sumAmounts(ci),
      revP.length ? sumAmounts(revP) : sumAmounts(pi),
      { total: true, indent: 0 }
    ),
    line('Note 9  OTHER INCOME', null, null, { section: true, indent: 0 })
  );
  othIncC.forEach((r) => {
    const prev = othIncP.find((x) => x.name === r.name);
    lines.push(line(accountLineLabel(r.name), r.amount, prev?.amount || 0));
  });
  if (!othIncC.length && !othIncP.length) lines.push(line('(None)', 0, 0));
  lines.push(
    line('Total', sumAmounts(othIncC), sumAmounts(othIncP), { total: true, indent: 0 }),
    line('Note 10  OTHER EXPENSES', null, null, { section: true, indent: 0 })
  );
  otherExpC.forEach((r) => {
    const prev = otherExpP.find((x) => x.name === r.name);
    lines.push(line(accountLineLabel(r.name), r.amount, prev?.amount || 0));
  });
  otherExpP
    .filter((r) => !otherExpC.some((x) => x.name === r.name))
    .forEach((r) => lines.push(line(accountLineLabel(r.name), 0, r.amount)));
  lines.push(line('Total', sumAmounts(otherExpC), sumAmounts(otherExpP), { total: true, indent: 0 }));
  return lines;
}

export function buildTradePayableRows(liabilityRows: AmountRow[]): AmountRow[] {
  return pick(liabilityRows, PAT.payable).sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
}

export function buildGstRows(rows: AmountRow[], kind: 'input' | 'output'): AmountRow[] {
  return pick(rows, kind === 'input' ? PAT.gstInput : PAT.gstOutput).sort(
    (a, b) => Math.abs(b.amount) - Math.abs(a.amount)
  );
}

export function buildOtherExpenseRows(expenseRows: AmountRow[]): AmountRow[] {
  return exclude(
    expenseRows,
    new RegExp(`${PAT.purchase.source}|${PAT.employee.source}|${PAT.finance.source}|${PAT.depreciation.source}`, 'i')
  ).sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
}
