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
    // 사이드바 토글 비활성화 - 항상 열린 상태 유지
    // setSidebarOpen(!sidebarOpen);
  };

  return (
    <Box 
      sx={{ 
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: '#f8fafc', // 바탕화면 색상 (연한 회색)
        fontFamily: 'var(--font-sans)',
        '& *': {
          color: '#1e293b',
        },
        // CSS 변수로 사이드바 너비 정의
        '--sidebar-width': '280px',
        '--sidebar-width-mobile': '240px',
        '--sidebar-width-tablet': '260px',
      }}
    >
      {/* 헤더 - 최상단 */}
      <Header />
      
      {/* 메인 컨테이너 - 전체 화면 사용 */}
      <Box
        sx={{
          position: 'relative',
          flexGrow: 1,
          minHeight: 'calc(100vh - 64px)', // 헤더 높이 제외
          backgroundColor: '#f8fafc', // 바탕화면 색상
        }}
      >
        {/* 사이드바 - 절대 위치로 고정 */}
        <Sidebar open={sidebarOpen} onClose={handleSidebarToggle} onToggle={handleSidebarToggle} />
        
        {/* 메인 콘텐츠 영역 - 사이드바 공간을 고려한 중앙 정렬 */}
        <Box
          sx={{
            width: '100%',
            minHeight: 'calc(100vh - 64px)', // 헤더 높이 제외
            display: 'flex',
            justifyContent: 'center', // 수평 중앙 정렬
            alignItems: 'flex-start', // 상단 정렬
            backgroundColor: '#ffeb3b', // 노란색으로 변경 (문제 확인용)
            position: 'relative',
            // 사이드바 너비만큼 왼쪽 패딩 추가 (즉시 적용)
            paddingLeft: '280px',
            paddingRight: '24px',
            paddingTop: '32px',
            paddingBottom: '32px',
            // 반응형 패딩
            '@media (max-width: 600px)': {
              paddingLeft: '240px',
              paddingRight: '8px',
              paddingTop: '16px',
              paddingBottom: '16px',
            },
            '@media (min-width: 600px) and (max-width: 960px)': {
              paddingLeft: '260px',
              paddingRight: '16px',
              paddingTop: '24px',
              paddingBottom: '24px',
            },
            // CSS-in-JS로 즉시 적용되는 스타일
            '& > *': {
              width: '100%',
              maxWidth: '100%',
            }
          }}
        >
          {/* 작업 영역 컨테이너 - 중앙 정렬된 흰색 패널 */}
          <Box
            sx={{
              width: '100%',
              // 브라우저 크기에 따라 자동 조정되는 최대 너비
              maxWidth: { 
                xs: '100%',    // 모바일: 전체 너비
                sm: '100%',    // 태블릿: 전체 너비
                md: '100%',    // 데스크톱: 전체 너비 (사이드바 고려)
                lg: '1200px',  // 큰 화면: 최대 1200px
                xl: '1400px'   // 매우 큰 화면: 최대 1400px
              },
              backgroundColor: '#ffffff', // 작업 영역 배경색 (흰색)
              borderRadius: '16px 0 0 0',
              boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.04)',
              border: '1px solid #e2e8f0',
              borderBottom: 'none',
              borderRight: 'none',
              overflow: 'hidden',
              position: 'relative',
              minHeight: 'calc(100vh - 128px)', // 헤더와 패딩 고려
              display: 'flex',
              flexDirection: 'column',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '1px',
                background: 'linear-gradient(90deg, transparent 0%, #e2e8f0 20%, #e2e8f0 80%, transparent 100%)',
              }
            }}
          >
            {/* 페이지 콘텐츠 내부 - 완전히 중앙 정렬 */}
            <Box
              sx={{
                flexGrow: 1,
                width: '100%',
                // 좌우 공백을 동일하게 유지하는 반응형 패딩
                px: { 
                  xs: 2, // 모바일: 16px
                  sm: 3, // 태블릿: 24px
                  md: 4, // 데스크톱: 32px
                  lg: 5, // 큰 화면: 40px
                  xl: 6  // 매우 큰 화면: 48px
                },
                py: { xs: 2, sm: 3, md: 4 }, // 내부 상하 패딩
                display: 'flex',
                flexDirection: 'column',
                // 모든 페이지 콘텐츠가 자동으로 조정되도록 설정
                '& > *': {
                  width: '100%',
                  maxWidth: '100%',
                },
                // 그리드나 플렉스 컨테이너가 자동 조정되도록
                '& .MuiGrid-container': {
                  width: '100%',
                  maxWidth: '100%',
                },
                '& .MuiGrid-item': {
                  width: '100%',
                  maxWidth: '100%',
                },
                // 카드나 페이퍼 컴포넌트가 자동 조정되도록
                '& .MuiCard-root, & .MuiPaper-root': {
                  width: '100%',
                  maxWidth: '100%',
                },
                // 테이블이 자동 조정되도록
                '& .MuiTableContainer-root': {
                  width: '100%',
                  maxWidth: '100%',
                },
              }}
            >
              {children}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default AppLayout;
