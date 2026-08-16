import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { Box } from '@mui/material';
import { theme } from '../../theme';
import PayslipContent, {
  type PayslipHeaderLayout,
  type PayslipLabels,
  type PayslipCompanyInfo
} from './PayslipContent';
import { PAYSLIP_LABELS_EN } from './payslipLabelsEn';
import type { PayrollGridRow } from './payroll/payrollGridTypes';

/** A4 인쇄 여백 — 좌우상하 1cm */
const PDF_MARGIN_MM = 10;
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

/** MUI md(900px) 이상 레이아웃과 동일하게 캡처 */
const PDF_CAPTURE_WIDTH_PX = 900;
/** 화면용 충분 + 메일 첨부 용량 최소화 (scale 2 + PNG → 수십 MB 방지) */
const PDF_CAPTURE_SCALE = 1.6;
const PDF_JPEG_QUALITY = 0.82;

let pdfLibsPromise: Promise<[typeof import('html2canvas'), typeof import('jspdf')]> | null = null;

function loadPdfLibs() {
  if (!pdfLibsPromise) {
    pdfLibsPromise = Promise.all([import('html2canvas'), import('jspdf')]);
  }
  return pdfLibsPromise;
}

function nextCaptureRootId() {
  return `payslip-pdf-capture-root-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function buildPayslipLabels(_locale: 'en' | 'ko' = 'en'): PayslipLabels {
  // 급여 명세서는 UI 언어(한글 포함)와 무관하게 항상 영어 고정.
  return PAYSLIP_LABELS_EN;
}

function renderPayslipTree(
  row: PayrollGridRow,
  labels: PayslipLabels,
  companyInfo: PayslipCompanyInfo | null | undefined,
  rootId: string,
  headerLayout: PayslipHeaderLayout,
  companyId?: string | number | null
) {
  return React.createElement(
    ThemeProvider,
    { theme },
    React.createElement(
      Box,
      { id: rootId, sx: { bgcolor: '#FFFFFF', width: `${PDF_CAPTURE_WIDTH_PX}px`, boxSizing: 'border-box' } },
      React.createElement(CssBaseline),
      React.createElement(PayslipContent, {
        row,
        labels,
        companyInfo,
        companyId,
        wide: true,
        forPdf: true,
        showTitle: false,
        headerLayout
      })
    )
  );
}

function fitImageToPrintArea(
  canvasWidth: number,
  canvasHeight: number,
  printWidthMm: number,
  printHeightMm: number
): { widthMm: number; heightMm: number } {
  if (canvasWidth <= 0 || canvasHeight <= 0) {
    return { widthMm: printWidthMm, heightMm: printHeightMm };
  }
  const aspect = canvasWidth / canvasHeight;
  let widthMm = printWidthMm;
  let heightMm = widthMm / aspect;
  if (heightMm > printHeightMm) {
    heightMm = printHeightMm;
    widthMm = heightMm * aspect;
  }
  return { widthMm, heightMm };
}

export async function generatePayslipPdfBlob(
  row: PayrollGridRow,
  companyInfo?: PayslipCompanyInfo | null,
  options?: {
    locale?: 'en' | 'ko';
    headerLayout?: PayslipHeaderLayout;
    companyId?: string | number | null;
  }
): Promise<Blob> {
  const labels = buildPayslipLabels(options?.locale);
  const rootId = nextCaptureRootId();
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-12000px';
  container.style.top = '0';
  container.style.width = `${PDF_CAPTURE_WIDTH_PX}px`;
  container.style.zIndex = '-1';
  container.style.background = '#FFFFFF';
  document.body.appendChild(container);

  const root: Root = createRoot(container);
  root.render(
    renderPayslipTree(
      row,
      labels,
      companyInfo,
      rootId,
      options?.headerLayout || 'standard',
      options?.companyId ?? null
    )
  );

  await document.fonts.ready;
  // 레이아웃 안정화 — 고정 600ms 대기 대신 프레임 2회 + 짧은 여유
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(resolve, 120);
      });
    });
  });

  try {
    const [{ default: html2canvas }, { jsPDF }] = await loadPdfLibs();
    const target = document.getElementById(rootId) as HTMLElement | null;
    if (!target) {
      throw new Error('Payslip PDF capture root not found');
    }
    const canvas = await html2canvas(target, {
      scale: PDF_CAPTURE_SCALE,
      useCORS: true,
      logging: false,
      backgroundColor: '#FFFFFF',
      width: PDF_CAPTURE_WIDTH_PX,
      windowWidth: PDF_CAPTURE_WIDTH_PX,
      scrollX: 0,
      scrollY: 0
    });

    const pdf = new jsPDF({
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait',
      compress: true
    });
    const printWidthMm = A4_WIDTH_MM - PDF_MARGIN_MM * 2;
    const printHeightMm = A4_HEIGHT_MM - PDF_MARGIN_MM * 2;
    const { widthMm, heightMm } = fitImageToPrintArea(canvas.width, canvas.height, printWidthMm, printHeightMm);
    const x = PDF_MARGIN_MM + (printWidthMm - widthMm) / 2;
    const y = PDF_MARGIN_MM;
    // PNG는 무손실이라 수~십수 MB가 됨. JPEG로 압축.
    const imgData = canvas.toDataURL('image/jpeg', PDF_JPEG_QUALITY);

    pdf.addImage(imgData, 'JPEG', x, y, widthMm, heightMm, undefined, 'MEDIUM');

    return pdf.output('blob');
  } finally {
    root.unmount();
    document.body.removeChild(container);
  }
}

export function buildPayslipPdfFilename(
  period?: string | null,
  name?: string | null
): string {
  const month = String(period || '').trim() || 'Unknown';
  const emp = String(name || '').trim() || 'Employee';
  const base = `Payslip (${month}) (${emp})`.replace(/[\\/:*?"<>|]/g, '_');
  return `${base}.pdf`;
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
