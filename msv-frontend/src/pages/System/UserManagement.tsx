import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const SystemUserManagement: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        시스템 사용자 관리
      </Typography>
      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography variant="body1">
          시스템 사용자 관리 기능이 곧 제공될 예정입니다.
        </Typography>
      </Paper>
    </Box>
  );
};

export default SystemUserManagement;
