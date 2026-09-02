/** 문서 PDF 표준 — 견적서(quotation) 다운로드 양식을 기준 */

export type DocumentPdfMarginsMm = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

/** A4 여백 (mm): 좌 2cm / 우 1cm / 상 2cm / 하 1.2cm — 견적서와 동일 */
export const DOCUMENT_PDF_MARGINS_MM: DocumentPdfMarginsMm = {
  left: 20,
  right: 10,
  top: 20,
  bottom: 12,
};

export const A4_PAGE_MM = { width: 210, height: 297 } as const;

/** 다운로드 기본 캡처 scale (견적서 download) */
export const DOCUMENT_PDF_SCALE_DOWNLOAD = 2;
/** 메일용 낮은 scale (견적서 email) */
export const DOCUMENT_PDF_SCALE_EMAIL = 1.35;

/** 이 개수 미만이면 1페이지 맞춤 축소 시도 */
export const DOCUMENT_PDF_FIT_ONE_PAGE_ITEM_THRESHOLD = 10;

/** 오프스크린 클론 루트 표시 속성 */
export const DOCUMENT_PDF_CAPTURE_ROOT_ATTR = 'data-document-pdf-root';

/**
 * 견적서 PDF와 동일한 기본 타이포·색.
 * 문서별 레이아웃 CSS는 이 위에 얹는다.
 */
export const DOCUMENT_PDF_BASE_TYPOGRAPHY_CSS = `
  color: #000000 !important;
  -webkit-text-fill-color: #000000 !important;
  font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif !important;
  font-size: 8.55pt !important;
  line-height: 1.45 !important;
  box-sizing: border-box !important;
`;

export function getPrintableSizeMm(margins: DocumentPdfMarginsMm = DOCUMENT_PDF_MARGINS_MM) {
  return {
    widthMm: A4_PAGE_MM.width - margins.left - margins.right,
    heightMm: A4_PAGE_MM.height - margins.top - margins.bottom,
  };
}
