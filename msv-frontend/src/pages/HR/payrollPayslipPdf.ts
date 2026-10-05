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
import {
  A4_PAGE_MM,
  DOCUMENT_PDF_CAPTURE_ROOT_ATTR,
  DOCUMENT_PDF_SCALE_EMAIL,
  type DocumentPdfMarginsMm,
} from '../../utils/pdf';

const A4_WIDTH_MM = A4_PAGE_MM.width;
const A4_HEIGHT_MM = A4_PAGE_MM.height;

/** 급여 명세서는 좌·우 여백을 동일하게 (문서 공통 20/10과 별도) */
const PAYSLIP_PDF_MARGINS_MM: DocumentPdfMarginsMm = {
  left: 12,
  right: 12,
  top: 10,
  bottom: 10,
};

/** MUI md(900px) 이상 레이아웃과 동일하게 캡처 */
const PDF_CAPTURE_WIDTH_PX = 900;
/**
 * html2canvas는 벡터 글자가 아니라 비트맵이다.
 * 다운로드는 A4≈300dpi 근처(900×3) + PNG(무손실)로 글자 번짐을 줄인다.
 * 메일은 첨부 용량을 위해 scale·JPEG을 낮춘다.
 */
const PDF_DOWNLOAD_SCALE = 3;
const PDF_EMAIL_SCALE = DOCUMENT_PDF_SCALE_EMAIL;
const PDF_EMAIL_JPEG_QUALITY = 0.88;

function injectPayslipCaptureCss(doc: Document, rootId: string) {
  const root = doc.getElementById(rootId);
  if (!root) return;
  root.setAttribute(DOCUMENT_PDF_CAPTURE_ROOT_ATTR, '');
  if (doc.head.querySelector('[data-payslip-pdf-capture]')) return;
  const style = doc.createElement('style');
  style.setAttribute('data-payslip-pdf-capture', 'true');
  style.textContent = `
    [${DOCUMENT_PDF_CAPTURE_ROOT_ATTR}],
    [${DOCUMENT_PDF_CAPTURE_ROOT_ATTR}] * {
      -webkit-font-smoothing: antialiased !important;
      -moz-osx-font-smoothing: grayscale !important;
      text-rendering: geometricPrecision !important;
      image-rendering: -webkit-optimize-contrast;
    }
  `;
  doc.head.appendChild(style);
}

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
      {
        id: rootId,
        sx: { bgcolor: '#FFFFFF', width: `${PDF_CAPTURE_WIDTH_PX}px`, boxSizing: 'border-box' },
      },
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
    /** download: 고해상도 / email: 첨부 용량 완화 (기본 download) */
    purpose?: 'download' | 'email';
  }
): Promise<Blob> {
  const labels = buildPayslipLabels(options?.locale);
  const purpose = options?.purpose ?? 'download';
  const isEmail = purpose === 'email';
  const captureScale = isEmail ? PDF_EMAIL_SCALE : PDF_DOWNLOAD_SCALE;
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
      scale: captureScale,
      useCORS: true,
      logging: false,
      backgroundColor: '#FFFFFF',
      width: PDF_CAPTURE_WIDTH_PX,
      windowWidth: PDF_CAPTURE_WIDTH_PX,
      scrollX: 0,
      scrollY: 0,
      // 글자 단위 렌더 — 작은 라벨의 가장자리 뭉개짐을 완화
      letterRendering: true,
      onclone: (clonedDoc: Document) => {
        injectPayslipCaptureCss(clonedDoc, rootId);
      },
    });

    const pdf = new jsPDF({
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait',
      compress: true
    });
    const margins = PAYSLIP_PDF_MARGINS_MM;
    const printWidthMm = A4_WIDTH_MM - margins.left - margins.right;
    const printHeightMm = A4_HEIGHT_MM - margins.top - margins.bottom;
    const { widthMm, heightMm } = fitImageToPrintArea(canvas.width, canvas.height, printWidthMm, printHeightMm);
    const x = margins.left + (printWidthMm - widthMm) / 2;
    const y = margins.top;

    // 다운로드: PNG(무손실) — JPEG 블록 노이즈가 글자를 흐리게 만드는 주원인
    // 메일: JPEG로 용량 완화
    if (isEmail) {
      const imgData = canvas.toDataURL('image/jpeg', PDF_EMAIL_JPEG_QUALITY);
      pdf.addImage(imgData, 'JPEG', x, y, widthMm, heightMm, undefined, 'FAST');
    } else {
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', x, y, widthMm, heightMm, undefined, 'FAST');
    }

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
