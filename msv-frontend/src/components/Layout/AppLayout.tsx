import React, { useState } from 'react';
import { Box } from '@mui/material';
import Header from './Header';
import Sidebar from './Sidebar';

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <Box 
      sx={{ 
        display: 'flex',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        fontFamily: 'var(--font-sans)',
        '& *': {
          color: '#1e293b',
        }
      }}
    >
      {/* 사이드바 */}
      <Sidebar open={sidebarOpen} onToggle={handleSidebarToggle} />
      
      {/* 메인 콘텐츠 영역 */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
          minHeight: '100vh',
          width: sidebarOpen ? 'calc(100% - 280px)' : 'calc(100% - 72px)',
          transition: 'width 0.3s ease-in-out',
          background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'
        }}
      >
        {/* 헤더 */}
        <Header />
        
        {/* 메인 콘텐츠 */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            mt: 7, // 헤더 높이만큼 마진 (56px + 8px)
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            width: '100%',
            px: 4, // 좌우 패딩 증가 (16px)
            pt: 4, // 위쪽 패딩 증가 (16px)
            pb: 4, // 아래쪽 패딩 추가 (16px)
            borderRadius: '16px 0 0 0',
            boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.05)',
            '& *': {
              backgroundColor: 'transparent !important',
            }
          }}
        >
          <Box
            sx={{
              width: '100%',
              maxWidth: '1400px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
              p: 3, // 내부 패딩 추가
              minHeight: 'calc(100vh - 200px)' // 최소 높이 설정
            }}
          >
            {children}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default AppLayout;
