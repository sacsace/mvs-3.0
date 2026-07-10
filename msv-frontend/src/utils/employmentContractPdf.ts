export async function downloadEmploymentContractPdf(element: HTMLElement, filename: string): Promise<void> {
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const pageHeight = 297;
  const marginTop = 10;
  const marginBottom = 10;
  const marginLeft = 12;
  const marginRight = 12;
  const imgWidth = pageWidth - marginLeft - marginRight;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  const printableHeight = pageHeight - marginTop - marginBottom;

  let heightLeft = imgHeight;
  let position = marginTop;

  pdf.addImage(imgData, 'PNG', marginLeft, position, imgWidth, imgHeight);
  heightLeft -= printableHeight;
  while (heightLeft > 0) {
    pdf.addPage();
    position = marginTop - (imgHeight - heightLeft);
    pdf.addImage(imgData, 'PNG', marginLeft, position, imgWidth, imgHeight);
    heightLeft -= printableHeight;
  }

  pdf.save(filename);
}
