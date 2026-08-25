/** A4 expense voucher PDF — margins: left 2cm, right/top/bottom 1cm */

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const MARGIN_LEFT_MM = 20;
const MARGIN_RIGHT_MM = 10;
const MARGIN_TOP_MM = 10;
const MARGIN_BOTTOM_MM = 10;

export async function downloadExpenseApprovalPdf(
  element: HTMLElement,
  filename: string
): Promise<void> {
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
    scrollX: 0,
    scrollY: 0,
    onclone: (clonedDoc: Document) => {
      clonedDoc.querySelectorAll('.expense-pdf-hide').forEach((node) => {
        (node as HTMLElement).style.display = 'none';
      });
      const style = clonedDoc.createElement('style');
      style.textContent = `
        .expense-pdf-root {
          background: #ffffff !important;
          box-shadow: none !important;
        }
        .expense-pdf-root .MuiOutlinedInput-notchedOutline {
          border-color: #E2E8F0 !important;
        }
      `;
      clonedDoc.head.appendChild(style);
    },
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.92);
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const contentWidth = A4_WIDTH_MM - MARGIN_LEFT_MM - MARGIN_RIGHT_MM;
  const contentHeight = A4_HEIGHT_MM - MARGIN_TOP_MM - MARGIN_BOTTOM_MM;
  const imgWidth = contentWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = MARGIN_TOP_MM;

  pdf.addImage(imgData, 'JPEG', MARGIN_LEFT_MM, position, imgWidth, imgHeight);
  heightLeft -= contentHeight;

  while (heightLeft > 0.5) {
    pdf.addPage();
    position = MARGIN_TOP_MM - (imgHeight - heightLeft);
    pdf.addImage(imgData, 'JPEG', MARGIN_LEFT_MM, position, imgWidth, imgHeight);
    heightLeft -= contentHeight;
  }

  pdf.save(filename);
}

export function buildExpenseApprovalPdfFilename(voucherNo?: string | null, title?: string | null): string {
  const no = String(voucherNo || 'expense').trim() || 'expense';
  const name = String(title || '').trim().slice(0, 40);
  const base = name ? `Expense_${no}_${name}` : `Expense_${no}`;
  return `${base.replace(/[\\/:*?"<>|]/g, '_')}.pdf`;
}
