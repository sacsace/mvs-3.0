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
  /** 동적 계정명 등 — labelKey 없을 때 표시 */
  label: string;
  /** i18n 키 (예: balanceSheet.lines.shareCapital) */
  labelKey?: string;
  current: number | null;
  previous: number | null;
  indent?: 0 | 1 | 2;
  section?: boolean;
  total?: boolean;
  note?: string;
  /** 대차 불일치 시 당기 금액 강조 */
  mismatchCurrent?: boolean;
  /** 대차 불일치 시 전기 금액 강조 */
  mismatchPrevious?: boolean;
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

  const mismatchCurrent = Math.abs(equityLiabTotalC - assetsTotalC) > 0.05;
  const mismatchPrevious = Math.abs(equityLiabTotalP - assetsTotalP) > 0.05;

  return [
    line('EQUITY AND LIABILITIES', null, null, {
      section: true,
      indent: 0,
      index: 'A',
      labelKey: 'balanceSheet.lines.equityAndLiabilities',
    }),
    line("Shareholders' funds", null, null, {
      indent: 0,
      index: '1',
      labelKey: 'balanceSheet.lines.shareholdersFunds',
    }),
    line('(a) Share capital', sumAmounts(shareCapitalC), sumAmounts(shareCapitalP), {
      note: '1',
      labelKey: 'balanceSheet.lines.shareCapital',
    }),
    line(
      '(b) Reserves and surplus',
      sumAmounts(reservesC) + (current?.netProfit || 0),
      sumAmounts(reservesP) + (previous?.netProfit || 0),
      { note: '2', labelKey: 'balanceSheet.lines.reservesAndSurplus' }
    ),
    line('Non-current liabilities', null, null, {
      indent: 0,
      index: '2',
      labelKey: 'balanceSheet.lines.nonCurrentLiabilities',
    }),
    line('(a) Long-term borrowings', sumAmounts(longBorrowC), sumAmounts(longBorrowP), {
      note: '3',
      labelKey: 'balanceSheet.lines.longTermBorrowings',
    }),
    line('(b) Deferred tax liabilities (net)', 0, 0, {
      labelKey: 'balanceSheet.lines.deferredTaxLiabilities',
    }),
    line('Current liabilities', null, null, {
      indent: 0,
      index: '3',
      labelKey: 'balanceSheet.lines.currentLiabilities',
    }),
    line('(a) Short Term Borrowings', 0, 0, {
      labelKey: 'balanceSheet.lines.shortTermBorrowings',
    }),
    line('(b) Trade payables', sumAmounts(payablesC), sumAmounts(payablesP), {
      labelKey: 'balanceSheet.lines.tradePayables',
    }),
    line('(c) Other current liabilities', sumAmounts(otherLiabC), sumAmounts(otherLiabP), {
      note: '4',
      labelKey: 'balanceSheet.lines.otherCurrentLiabilities',
    }),
    line('(d) Short-term provisions', sumAmounts(provisionsC), sumAmounts(provisionsP), {
      labelKey: 'balanceSheet.lines.shortTermProvisions',
    }),
    line('Total', equityLiabTotalC, equityLiabTotalP, {
      total: true,
      indent: 0,
      mismatchCurrent,
      mismatchPrevious,
      labelKey: 'balanceSheet.lines.total',
    }),
    line('ASSETS', null, null, {
      section: true,
      indent: 0,
      index: 'B',
      labelKey: 'balanceSheet.lines.assets',
    }),
    line('Non-current assets', null, null, {
      indent: 0,
      index: '1',
      labelKey: 'balanceSheet.lines.nonCurrentAssets',
    }),
    line('(a) Fixed assets', null, null, {
      indent: 1,
      labelKey: 'balanceSheet.lines.fixedAssets',
    }),
    line('(i) Tangible assets', sumAmounts(fixedC), sumAmounts(fixedP), {
      indent: 2,
      note: '5',
      labelKey: 'balanceSheet.lines.tangibleAssets',
    }),
    line('(b) Non-current investments', sumAmounts(investC), sumAmounts(investP), {
      labelKey: 'balanceSheet.lines.nonCurrentInvestments',
    }),
    line('Current assets', null, null, {
      indent: 0,
      index: '2',
      labelKey: 'balanceSheet.lines.currentAssets',
    }),
    line('(a) Inventories', sumAmounts(invC), sumAmounts(invP), {
      labelKey: 'balanceSheet.lines.inventories',
    }),
    line('(b) Trade receivables', sumAmounts(recvC), sumAmounts(recvP), {
      labelKey: 'balanceSheet.lines.tradeReceivables',
    }),
    line('(c) Cash and cash equivalents', sumAmounts(cashC), sumAmounts(cashP), {
      note: '6',
      labelKey: 'balanceSheet.lines.cashAndCashEquivalents',
    }),
    line('(d) Short-term loans and advances', sumAmounts(advanceC), sumAmounts(advanceP), {
      labelKey: 'balanceSheet.lines.shortTermLoansAndAdvances',
    }),
    line('(e) Other Current Assets', sumAmounts(otherAssetC), sumAmounts(otherAssetP), {
      note: '7',
      labelKey: 'balanceSheet.lines.otherCurrentAssets',
    }),
    line('Total', assetsTotalC, assetsTotalP, {
      total: true,
      indent: 0,
      mismatchCurrent,
      mismatchPrevious,
      labelKey: 'balanceSheet.lines.total',
    }),
    ...(mismatchCurrent || mismatchPrevious
      ? [
          line(
            'Difference (Assets − Equity & Liabilities)',
            Number((assetsTotalC - equityLiabTotalC).toFixed(2)),
            Number((assetsTotalP - equityLiabTotalP).toFixed(2)),
            {
              total: true,
              indent: 0,
              mismatchCurrent,
              mismatchPrevious,
              labelKey: 'balanceSheet.lines.difference',
            }
          ),
        ]
      : []),
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
    line('A  CONTINUING OPERATIONS', null, null, {
      section: true,
      indent: 0,
      labelKey: 'balanceSheet.lines.continuingOperations',
    }),
    line('1  Revenue from operations (net)', revenueC, revenueP, {
      note: '8',
      labelKey: 'balanceSheet.lines.revenueFromOperations',
    }),
    line('2  Other Income', otherIncomeC, otherIncomeP, {
      note: '9',
      labelKey: 'balanceSheet.lines.otherIncome',
    }),
    line('3  Total Revenue (1+2)', totalRevC, totalRevP, {
      total: true,
      indent: 0,
      labelKey: 'balanceSheet.lines.totalRevenue',
    }),
    line('4  Expenses', null, null, { indent: 0, labelKey: 'balanceSheet.lines.expenses' }),
    line('(a) Cost of materials consumed', 0, 0, {
      labelKey: 'balanceSheet.lines.costOfMaterials',
    }),
    line('(b) Purchases', sumAmounts(purchaseC), sumAmounts(purchaseP), {
      labelKey: 'balanceSheet.lines.purchases',
    }),
    line('(c) Changes in inventories', 0, 0, {
      labelKey: 'balanceSheet.lines.changesInInventories',
    }),
    line('(d) Employee benefits expenses', sumAmounts(empC), sumAmounts(empP), {
      labelKey: 'balanceSheet.lines.employeeBenefits',
    }),
    line('(e) Finance costs', sumAmounts(finC), sumAmounts(finP), {
      labelKey: 'balanceSheet.lines.financeCosts',
    }),
    line('(f) Depreciation and amortisation expenses', sumAmounts(depC), sumAmounts(depP), {
      labelKey: 'balanceSheet.lines.depreciation',
    }),
    line('(g) Other expenses', sumAmounts(otherExpC), sumAmounts(otherExpP), {
      note: '10',
      labelKey: 'balanceSheet.lines.otherExpenses',
    }),
    line('Total Expenses', totalExpC, totalExpP, {
      total: true,
      indent: 0,
      labelKey: 'balanceSheet.lines.totalExpenses',
    }),
    line('5  Profit / (Loss) before tax (3 - 4)', pbtC, pbtP, {
      total: true,
      indent: 0,
      labelKey: 'balanceSheet.lines.profitBeforeTax',
    }),
    line('6  Tax Expense', null, null, { indent: 0, labelKey: 'balanceSheet.lines.taxExpense' }),
    line('(a) Current tax expense', 0, 0, { labelKey: 'balanceSheet.lines.currentTax' }),
    line('(b) Deferred tax', 0, 0, { labelKey: 'balanceSheet.lines.deferredTax' }),
    line('7  Profit / (Loss) from continuing operations', pbtC, pbtP, {
      total: true,
      indent: 0,
      labelKey: 'balanceSheet.lines.profitFromContinuing',
    }),
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
    line('Note 1  SHARE CAPITAL', null, null, {
      section: true,
      indent: 0,
      labelKey: 'balanceSheet.lines.note1ShareCapital',
    }),
    line('Issued, Subscribed and Paid up', capitalC, capitalP, {
      labelKey: 'balanceSheet.lines.issuedSubscribedPaidUp',
    }),
    line('Total', capitalC, capitalP, {
      total: true,
      indent: 0,
      labelKey: 'balanceSheet.lines.total',
    }),
    line('Note 2  RESERVES AND SURPLUS', null, null, {
      section: true,
      indent: 0,
      labelKey: 'balanceSheet.lines.note2Reserves',
    }),
    line('(A) Share Premium / Other reserves', reservesC, reservesP, {
      labelKey: 'balanceSheet.lines.sharePremiumOtherReserves',
    }),
    line('(B) Surplus / (Deficit) in Statement of P&L', null, null, {
      indent: 0,
      labelKey: 'balanceSheet.lines.surplusDeficit',
    }),
    line('Opening balance', openingSurplusC, reservesP - profitP, {
      labelKey: 'balanceSheet.lines.openingBalance',
    }),
    line('Add: Profit / (Loss) for the year', profitC, profitP, {
      labelKey: 'balanceSheet.lines.addProfitForYear',
    }),
    line('Closing balance (B)', closingSurplusC, closingSurplusP, {
      total: true,
      labelKey: 'balanceSheet.lines.closingBalanceB',
    }),
    line('Total (A)+(B)', reservesC + closingSurplusC, reservesP + closingSurplusP, {
      total: true,
      indent: 0,
      labelKey: 'balanceSheet.lines.totalAB',
    }),
    line('Note 3  LONG TERM BORROWINGS', null, null, {
      section: true,
      indent: 0,
      labelKey: 'balanceSheet.lines.note3LongTermBorrowings',
    }),
    line(
      'Long-term borrowings',
      sumAmounts(pick(current?.liabilityRows || [], PAT.borrowing)),
      sumAmounts(pick(previous?.liabilityRows || [], PAT.borrowing)),
      { labelKey: 'balanceSheet.lines.longTermBorrowingsPlain' }
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
    line('Note 4  OTHER CURRENT LIABILITIES', null, null, {
      section: true,
      indent: 0,
      labelKey: 'balanceSheet.lines.note4OtherCurrentLiabilities',
    }),
  ];
  if (tdsC.length || tdsP.length) {
    lines.push(
      line('TDS Payable', sumAmounts(tdsC), sumAmounts(tdsP), {
        labelKey: 'balanceSheet.lines.tdsPayable',
      })
    );
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
    line('Total', sumAmounts(otherLiabC), sumAmounts(otherLiabP), {
      total: true,
      indent: 0,
      labelKey: 'balanceSheet.lines.total',
    }),
    line('Note 5  FIXED TANGIBLE ASSETS', null, null, {
      section: true,
      indent: 0,
      labelKey: 'balanceSheet.lines.note5FixedTangible',
    }),
    line('Closing balance', sumAmounts(fixedC), sumAmounts(fixedP), {
      total: true,
      labelKey: 'balanceSheet.lines.closingBalance',
    }),
    line('Note 6  CASH AND CASH EQUIVALENTS', null, null, {
      section: true,
      indent: 0,
      labelKey: 'balanceSheet.lines.note6Cash',
    })
  );
  cashC.forEach((r) => {
    const prev = cashP.find((x) => x.name === r.name);
    lines.push(line(accountLineLabel(r.name), r.amount, prev?.amount || 0));
  });
  cashP
    .filter((r) => !cashC.some((x) => x.name === r.name))
    .forEach((r) => lines.push(line(accountLineLabel(r.name), 0, r.amount)));
  lines.push(
    line('Total', sumAmounts(cashC), sumAmounts(cashP), {
      total: true,
      indent: 0,
      labelKey: 'balanceSheet.lines.total',
    }),
    line('Note 7  OTHER CURRENT ASSETS', null, null, {
      section: true,
      indent: 0,
      labelKey: 'balanceSheet.lines.note7OtherCurrentAssets',
    }),
    line('Input GST', sumAmounts(inputGstC), sumAmounts(inputGstP), {
      labelKey: 'balanceSheet.lines.inputGst',
    })
  );
  exclude(otherAssetC, PAT.gstInput).forEach((r) => {
    const prev = otherAssetP.find((x) => x.name === r.name);
    lines.push(line(accountLineLabel(r.name), r.amount, prev?.amount || 0));
  });
  lines.push(
    line('Total', sumAmounts(otherAssetC), sumAmounts(otherAssetP), {
      total: true,
      indent: 0,
      labelKey: 'balanceSheet.lines.total',
    })
  );
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
    line('Note 8  REVENUE FROM OPERATIONS', null, null, {
      section: true,
      indent: 0,
      labelKey: 'balanceSheet.lines.note8Revenue',
    }),
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
      { total: true, indent: 0, labelKey: 'balanceSheet.lines.total' }
    ),
    line('Note 9  OTHER INCOME', null, null, {
      section: true,
      indent: 0,
      labelKey: 'balanceSheet.lines.note9OtherIncome',
    })
  );
  othIncC.forEach((r) => {
    const prev = othIncP.find((x) => x.name === r.name);
    lines.push(line(accountLineLabel(r.name), r.amount, prev?.amount || 0));
  });
  if (!othIncC.length && !othIncP.length) {
    lines.push(line('(None)', 0, 0, { labelKey: 'balanceSheet.lines.none' }));
  }
  lines.push(
    line('Total', sumAmounts(othIncC), sumAmounts(othIncP), {
      total: true,
      indent: 0,
      labelKey: 'balanceSheet.lines.total',
    }),
    line('Note 10  OTHER EXPENSES', null, null, {
      section: true,
      indent: 0,
      labelKey: 'balanceSheet.lines.note10OtherExpenses',
    })
  );
  otherExpC.forEach((r) => {
    const prev = otherExpP.find((x) => x.name === r.name);
    lines.push(line(accountLineLabel(r.name), r.amount, prev?.amount || 0));
  });
  otherExpP
    .filter((r) => !otherExpC.some((x) => x.name === r.name))
    .forEach((r) => lines.push(line(accountLineLabel(r.name), 0, r.amount)));
  lines.push(
    line('Total', sumAmounts(otherExpC), sumAmounts(otherExpP), {
      total: true,
      indent: 0,
      labelKey: 'balanceSheet.lines.total',
    })
  );
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
