import React from 'react';
import { Box, Card, CardContent, Grid, Typography, Divider, Button } from '@mui/material';

const summaryCards = [
  { label: '오늘 주문', value: '0' },
  { label: '진행 중 주문', value: '0' },
  { label: '품절 알림', value: '0' },
  { label: '오늘 매출', value: 'Rs. 0' }
];

const Fnb: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>F&amp;B</Typography>
        <Typography variant="body2" color="text.secondary">
          식음료 주문과 재고, 매출 현황을 관리합니다.
        </Typography>
      </Box>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        {summaryCards.map((item) => (
          <Grid key={item.label} size={{ xs: 12, sm: 6, md: 3 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>{item.value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>주문 내역</Typography>
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="body2" color="text.secondary">
                아직 표시할 데이터가 없습니다.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>빠른 작업</Typography>
              <Divider sx={{ my: 1.5 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button variant="outlined">주문 등록</Button>
                <Button variant="outlined">재고 확인</Button>
                <Button variant="outlined">매출 리포트</Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Fnb;
