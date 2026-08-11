import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';
import MvsPageHeader from '../../components/Common/MvsPageHeader';
import { mvsPageRootSx, mvsBodyCardSx } from '../../theme/mvsLayout';
import { useTranslation } from 'react-i18next';

/** 본인 급여 명세서 — 상세 API 연동 전 안내 화면 */
const MyPayslips: React.FC = () => {
  const { i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  const txt = (ko: string, en: string) => (isEn ? en : ko);

  return (
    <Box sx={mvsPageRootSx}>
      <MvsPageHeader
        title={txt('급여 명세서', 'My Payslips')}
        description={txt(
          '본인 급여 명세서를 확인하는 화면입니다.',
          'View your payslips here.'
        )}
      />
      <Card elevation={0} sx={mvsBodyCardSx}>
        <CardContent>
          <Typography variant="body1" color="text.secondary">
            {txt(
              '급여 명세서 목록 연동을 준비 중입니다. 인사 담당자가 발행한 명세서는 추후 이 메뉴에서 확인할 수 있습니다.',
              'Payslip list integration is being prepared. Issued payslips will appear here.'
            )}
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default MyPayslips;
