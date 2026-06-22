/** 로컬 저장: 선명도 우선. 메일 첨부: Gmail(~25MB) 제한을 피하기 위해 JPEG·낮은 scale */
type QuotationPdfPurpose = 'download' | 'email';

function escapeHtmlText(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * html2canvas 클론에서 입력 UI 제거 → PDF에는 검정 글자만.
 * (상품추가 버튼, 행 삭제, MUI 텍스트필드/셀렉트 테두리 등)
 */
function sanitizeQuotationCloneForPdf(clonedDoc: Document): void {
  const area = clonedDoc.querySelector('.quotation-print-area');
  if (!area) return;

  const plainStyle =
    'color:#000000 !important;-webkit-text-fill-color:#000000 !important;font-size:14px;line-height:1.4;padding:4px 0;white-space:pre-wrap;word-break:break-word;';

  const style = clonedDoc.createElement('style');
  style.textContent = `
    .quotation-print-area, .quotation-print-area * {
      color: #000000 !important;
      -webkit-text-fill-color: #000000 !important;
    }
    .quotation-print-area fieldset:disabled { opacity: 1 !important; }
    .quotation-print-area * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  `;
  clonedDoc.head.appendChild(style);

  area.querySelectorAll('.MuiFormHelperText-root').forEach((el) => el.remove());
  area.querySelectorAll('button').forEach((el) => el.remove());
  area.querySelectorAll('.MuiIconButton-root').forEach((el) => el.remove());

  const itemized = area.querySelector('table.quotation-itemized-costs-table');
  if (itemized) {
    itemized.querySelectorAll('tr').forEach((tr) => {
      const cells = tr.querySelectorAll('th, td');
      if (cells.length > 0) cells[cells.length - 1].remove();
    });
    itemized.querySelectorAll('td').forEach((td) => {
      const inp = td.querySelector('input, textarea') as HTMLInputElement | HTMLTextAreaElement | null;
      if (!inp) return;
      const v = inp.value ?? '';
      td.innerHTML = `<div style="${plainStyle}">${escapeHtmlText(v)}</div>`;
    });
  }

  area.querySelectorAll('.MuiFormControl-root').forEach((fc) => {
    if (fc.closest('table.quotation-itemized-costs-table')) return;
    const combobox = fc.querySelector('[role="combobox"]') as HTMLElement | null;
    const ta = fc.querySelector('textarea') as HTMLTextAreaElement | null;
    const inp = fc.querySelector('input:not([type="hidden"])') as HTMLInputElement | null;
    let val = '';
    if (combobox) val = combobox.innerText?.trim() ?? combobox.textContent?.trim() ?? '';
    else if (ta) val = ta.value;
    else if (inp) val = inp.value;
    else return;
    const div = clonedDoc.createElement('div');
    div.setAttribute('style', plainStyle);
    div.textContent = val;
    fc.innerHTML = '';
    fc.appendChild(div);
  });
}

function buildHtml2CanvasOptions(scale: number) {
  return {
    scale,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
    onclone: (clonedDoc: Document) => {
      const area = clonedDoc.querySelector('.quotation-print-area');
      if (area) {
        const fs = area.querySelector('fieldset');
        if (fs) {
          fs.removeAttribute('disabled');
        }
      }
      sanitizeQuotationCloneForPdf(clonedDoc);
    }
  };
}

async function quotationElementToJsPdf(
  element: HTMLElement,
  purpose: QuotationPdfPurpose
) {
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);
  const isEmail = purpose === 'email';
  /** 메일: PNG 대비 용량 대폭 감소. 저장: 기존과 동일 품질 */
  const scale = isEmail ? 1.35 : 2;
  const canvas = await html2canvas(element, buildHtml2CanvasOptions(scale));

  const imgData = isEmail
    ? canvas.toDataURL('image/jpeg', 0.87)
    : canvas.toDataURL('image/png');
  const imageFormat = isEmail ? 'JPEG' : 'PNG';

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const pageHeight = 297;
  const marginTop = 8;
  const marginBottom = 8;
  const marginLeft = 12;
  const marginRight = 12;
  const imgWidth = pageWidth - marginLeft - marginRight;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  const printableHeight = pageHeight - marginTop - marginBottom;

  let heightLeft = imgHeight;
  let position = marginTop;

  pdf.addImage(imgData, imageFormat, marginLeft, position, imgWidth, imgHeight);
  heightLeft -= printableHeight;
  while (heightLeft > 0) {
    pdf.addPage();
    position = marginTop - (imgHeight - heightLeft);
    pdf.addImage(imgData, imageFormat, marginLeft, position, imgWidth, imgHeight);
    heightLeft -= printableHeight;
  }

  return pdf;
}

/**
 * 견적서 DOM 영역을 캡처해 A4 PDF로 저장합니다. (승인 후 저장 등)
 */
export async function downloadQuotationPdf(element: HTMLElement, filename: string): Promise<void> {
  const pdf = await quotationElementToJsPdf(element, 'download');
  pdf.save(filename);
}

/** 메일 첨부용 — 용량을 줄인 PDF를 base64(순수 페이로드)로 반환 (Gmail 등 메일 크기 제한 대응) */
export async function quotationPdfToBase64(element: HTMLElement): Promise<string> {
  const pdf = await quotationElementToJsPdf(element, 'email');
  const dataUri = pdf.output('datauristring') as string;
  const comma = dataUri.indexOf(',');
  return comma >= 0 ? dataUri.slice(comma + 1) : dataUri;
}
