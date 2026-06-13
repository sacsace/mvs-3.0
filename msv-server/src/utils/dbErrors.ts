/** 테이블·릴레이션 미존재 등 DB 스키마 미비 오류 */
export const isMissingTableError = (error: unknown): boolean => {
  const err = error as { name?: string; message?: string; parent?: { message?: string } };
  const message = String(err?.message || err?.parent?.message || '');

  return (
    err?.name === 'SequelizeDatabaseError' &&
    (message.includes('relation') ||
      message.includes('does not exist') ||
      message.includes('릴레이션') ||
      message.includes('존재하지'))
  );
};
