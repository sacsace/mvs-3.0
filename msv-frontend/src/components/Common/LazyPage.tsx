import React, { Suspense, lazy, ComponentType } from 'react';
import { Box, CircularProgress } from '@mui/material';

export const PageLoader = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
    <CircularProgress size={32} />
  </Box>
);

/** props 없는 페이지 라우트용 lazy 래퍼 */
export function lazyPage(
  factory: () => Promise<{ default: ComponentType }>
): React.FC {
  const Lazy = lazy(factory);
  const Page: React.FC = () => (
    <Suspense fallback={<PageLoader />}>
      <Lazy />
    </Suspense>
  );
  return Page;
}
