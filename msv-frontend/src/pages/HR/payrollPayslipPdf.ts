import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { Box } from '@mui/material';
import i18n from '../../locales/i18n';
import { theme } from '../../theme';
import PayslipContent, { type PayslipLabels, type PayslipCompanyInfo } from './PayslipContent';
import type { PayrollGridRow } from './payroll/payrollGridTypes';

export function buildPayslipLabels(): PayslipLabels {
  const p = 'payrollManagement.payslip';
  return {
    title: i18n.t(`${p}.title`),
    companySection: i18n.t(`${p}.companySection`),
    companyName: i18n.t(`${p}.companyName`),
    companyContact: i18n.t(`${p}.companyContact`),
    employee: i18n.t(`${p}.employee`),
    birthDate: i18n.t(`${p}.birthDate`),
    department: i18n.t(`${p}.department`),
    position: i18n.t(`${p}.position`),
    email: i18n.t(`${p}.email`),
    period: i18n.t(`${p}.period`),
    earnings: i18n.t(`${p}.earnings`),
    deductions: i18n.t(`${p}.deductions`),
    netPay: i18n.t(`${p}.netPay`),
    basicSalary: i18n.t(`${p}.basicSalary`),
    overtime: i18n.t(`${p}.overtime`),
    gross: i18n.t(`${p}.gross`),
    tds: i18n.t(`${p}.tds`),
    deductMonth: i18n.t(`${p}.deductMonth`),
    netSalary: i18n.t(`${p}.netSalary`),
    bank: i18n.t(`${p}.bank`),
    account: i18n.t(`${p}.account`),
    pfEmployee: i18n.t(`${p}.pfEmployee`),
    pfEmployer: i18n.t(`${p}.pfEmployer`),
    esicEmployee: i18n.t(`${p}.esicEmployee`),
    esicEmployer: i18n.t(`${p}.esicEmployer`),
    pt: i18n.t(`${p}.pt`),
    bankSection: i18n.t(`${p}.bankSection`)
  };
}

function renderPayslipTree(row: PayrollGridRow, labels: PayslipLabels, companyInfo?: PayslipCompanyInfo | null) {
  return React.createElement(
    ThemeProvider,
    { theme },
    React.createElement(
      Box,
      { sx: { bgcolor: '#fff' } },
      React.createElement(CssBaseline),
      React.createElement(PayslipContent, { row, labels, companyInfo })
    )
  );
}

export async function generatePayslipPdfBlob(
  row: PayrollGridRow,
  companyInfo?: PayslipCompanyInfo | null
): Promise<Blob> {
  const labels = buildPayslipLabels();
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-12000px';
  container.style.top = '0';
  container.style.width = '800px';
  container.style.zIndex = '-1';
  document.body.appendChild(container);

  const root: Root = createRoot(container);
  root.render(renderPayslipTree(row, labels, companyInfo));

  await new Promise<void>((resolve) => setTimeout(resolve, 400));

  try {
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ]);
    const target = container.firstElementChild as HTMLElement;
    const inner = (target?.firstElementChild as HTMLElement) || target;
    const canvas = await html2canvas(inner, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgData = canvas.toDataURL('image/png', 0.92);

    let w = pageWidth;
    let h = (canvas.height * w) / canvas.width;
    if (h > pageHeight) {
      const r = pageHeight / h;
      w *= r;
      h = pageHeight;
    }
    const x = (pageWidth - w) / 2;
    pdf.addImage(imgData, 'PNG', x, 0, w, h);

    return pdf.output('blob');
  } finally {
    root.unmount();
    document.body.removeChild(container);
  }
}

export function downloadPayslipPdf(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function payslipBlobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => {
      const s = String(r.result || '');
      const b64 = s.includes(',') ? s.split(',')[1] : s;
      resolve(b64);
    };
    r.onerror = () => reject(new Error('read failed'));
    r.readAsDataURL(blob);
  });
}
