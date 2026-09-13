import React from 'react';
import { createRoot } from 'react-dom/client';
import { Box, CssBaseline, ThemeProvider } from '@mui/material';
import { theme } from '../../theme';
import EmployeePersonalRecordContent, {
  type EmployeePersonalRecordProps,
} from './EmployeePersonalRecordContent';
import {
  A4_PAGE_MM,
  DOCUMENT_PDF_CAPTURE_ROOT_ATTR,
  DOCUMENT_PDF_MARGINS_MM,
  injectDocumentPdfStandardCss,
} from '../../utils/pdf';

const A4_WIDTH_MM = A4_PAGE_MM.width;
const A4_HEIGHT_MM = A4_PAGE_MM.height;
/** A4 세로 본문 폭(~186mm)에 맞춘 캡처 너비 */
const PDF_CAPTURE_WIDTH_PX = 720;
const PDF_CAPTURE_SCALE = 1.85;
const PDF_JPEG_QUALITY = 0.86;

let pdfLibsPromise: Promise<[typeof import('html2canvas'), typeof import('jspdf')]> | null = null;

function loadPdfLibs() {
  if (!pdfLibsPromise) {
    pdfLibsPromise = Promise.all([import('html2canvas'), import('jspdf')]);
  }
  return pdfLibsPromise;
}

export async function generateEmployeePersonalRecordPdfBlob(
  props: EmployeePersonalRecordProps
): Promise<Blob> {
  const [{ default: html2canvas }, { jsPDF }] = await loadPdfLibs();
  const rootId = `employee-record-pdf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.top = '0';
  container.style.width = `${PDF_CAPTURE_WIDTH_PX}px`;
  container.style.zIndex = '-1';
  container.style.pointerEvents = 'none';
  document.body.appendChild(container);

  const root = createRoot(container);
  try {
    await new Promise<void>((resolve) => {
      root.render(
        React.createElement(
          ThemeProvider,
          { theme },
          React.createElement(
            Box,
            {
              id: rootId,
              sx: {
                bgcolor: '#FFFFFF',
                width: `${PDF_CAPTURE_WIDTH_PX}px`,
                boxSizing: 'border-box',
              },
            },
            React.createElement(CssBaseline),
            React.createElement(EmployeePersonalRecordContent, props)
          )
        )
      );
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    const host = document.getElementById(rootId);
    if (host) {
      const imgs = Array.from(host.querySelectorAll('img'));
      await Promise.all(
        imgs.map(
          (img) =>
            new Promise<void>((resolve) => {
              if (img.complete) {
                resolve();
                return;
              }
              img.onload = () => resolve();
              img.onerror = () => resolve();
              setTimeout(() => resolve(), 2500);
            })
        )
      );
      await new Promise((r) => setTimeout(r, 80));
    }

    const el = document.getElementById(rootId);
    if (!el) throw new Error('PDF_CAPTURE_ROOT_MISSING');

    const canvas = await html2canvas(el, {
      scale: PDF_CAPTURE_SCALE,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#FFFFFF',
      logging: false,
      width: PDF_CAPTURE_WIDTH_PX,
      windowWidth: PDF_CAPTURE_WIDTH_PX,
      onclone: (clonedDoc: Document) => {
        clonedDoc.getElementById(rootId)?.setAttribute(DOCUMENT_PDF_CAPTURE_ROOT_ATTR, '');
        injectDocumentPdfStandardCss(clonedDoc);
      },
    });

    // 항상 A4 세로 — 가로 폭에 맞추고 길면 페이지 분할
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pageW = A4_WIDTH_MM;
    const pageH = A4_HEIGHT_MM;
    const printWidthMm = pageW - DOCUMENT_PDF_MARGINS_MM.left - DOCUMENT_PDF_MARGINS_MM.right;
    const usableH = pageH - DOCUMENT_PDF_MARGINS_MM.top - DOCUMENT_PDF_MARGINS_MM.bottom;
    const widthMm = printWidthMm;
    const heightMm = (canvas.height / canvas.width) * widthMm;
    const pxPerMm = canvas.height / heightMm;
    const offsetX = DOCUMENT_PDF_MARGINS_MM.left;
    const offsetY = DOCUMENT_PDF_MARGINS_MM.top;

    if (heightMm <= usableH) {
      const imgData = canvas.toDataURL('image/jpeg', PDF_JPEG_QUALITY);
      pdf.addImage(imgData, 'JPEG', offsetX, offsetY, widthMm, heightMm, undefined, 'MEDIUM');
    } else {
      let offsetMm = 0;
      let page = 0;
      while (offsetMm < heightMm - 0.5) {
        if (page > 0) pdf.addPage('a4', 'portrait');
        const sliceHMm = Math.min(usableH, heightMm - offsetMm);
        const srcY = Math.floor(offsetMm * pxPerMm);
        const srcH = Math.max(1, Math.floor(sliceHMm * pxPerMm));
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = srcH;
        const ctx = sliceCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
          ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);
        }
        const sliceData = sliceCanvas.toDataURL('image/jpeg', PDF_JPEG_QUALITY);
        pdf.addImage(sliceData, 'JPEG', offsetX, offsetY, widthMm, sliceHMm, undefined, 'MEDIUM');
        offsetMm += sliceHMm;
        page += 1;
      }
    }

    return pdf.output('blob');
  } finally {
    root.unmount();
    document.body.removeChild(container);
  }
}

export function buildEmployeePersonalRecordFilename(employeeName?: string | null): string {
  const name = String(employeeName || '').trim() || 'Employee';
  const stamp = new Date().toISOString().slice(0, 10);
  return `Employee Personal Record (${name}) (${stamp})`.replace(/[\\/:*?"<>|]/g, '_') + '.pdf';
}

export function downloadEmployeePersonalRecordPdf(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
