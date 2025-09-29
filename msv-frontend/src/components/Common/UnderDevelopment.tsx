import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Chip,
  Divider
} from '@mui/material';
import {
  Construction as ConstructionIcon,
  Schedule as ScheduleIcon,
  Code as CodeIcon,
  BugReport as BugReportIcon,
  Timeline as TimelineIcon,
  Rocket as RocketIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon
} from '@mui/icons-material';

interface UnderDevelopmentProps {
  pageName: string;
  description?: string;
  estimatedCompletion?: string;
  features?: string[];
  status?: 'planning' | 'development' | 'testing' | 'review';
}

const UnderDevelopment: React.FC<UnderDevelopmentProps> = ({
  pageName,
  description = "이 페이지는 현재 개발 중입니다.",
  estimatedCompletion,
  features = [],
  status = 'development'
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'info';
      case 'development': return 'warning';
      case 'testing': return 'secondary';
      case 'review': return 'primary';
      default: return 'warning';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'planning': return '기획 중';
      case 'development': return '개발 중';
      case 'testing': return '테스트 중';
      case 'review': return '검토 중';
      default: return '개발 중';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'planning': return <ScheduleIcon />;
      case 'development': return <CodeIcon />;
      case 'testing': return <BugReportIcon />;
      case 'review': return <TimelineIcon />;
      default: return <CodeIcon />;
    }
  };

  return (
    <Box sx={{ 
      width: '100%',
      p: 3
    }}>
      <Card sx={{ 
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        borderRadius: 3,
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
        border: '1px solid rgba(255,255,255,0.2)'
      }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box sx={{ 
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 120,
              height: 120,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              mb: 3,
              boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)'
            }}>
              <ConstructionIcon sx={{ fontSize: 60, color: 'white' }} />
            </Box>
            
            <Typography variant="h4" gutterBottom sx={{ 
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 2
            }}>
              {pageName}
            </Typography>
            
            <Chip
              icon={getStatusIcon(status)}
              label={getStatusLabel(status)}
              color={getStatusColor(status) as any}
              sx={{ 
                mb: 3,
                fontSize: '1rem',
                py: 2,
                px: 3,
                height: 'auto',
                '& .MuiChip-icon': {
                  fontSize: '1.2rem'
                }
              }}
            />
            
            <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
              {description}
            </Typography>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3, mb: 4 }}>
            {/* 개발 현황 */}
            <Card sx={{ 
              background: 'rgba(255,255,255,0.7)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.2)'
            }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <RocketIcon color="primary" />
                  개발 현황
                </Typography>
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <CheckCircleIcon color="success" />
                    <Typography variant="body2">UI/UX 디자인 완료</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <CheckCircleIcon color="success" />
                    <Typography variant="body2">컴포넌트 구조 설계</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <PendingIcon color="warning" />
                    <Typography variant="body2">백엔드 API 연동</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <PendingIcon color="warning" />
                    <Typography variant="body2">데이터베이스 연동</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <PendingIcon color="warning" />
                    <Typography variant="body2">테스트 및 검증</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            {/* 예상 기능 */}
            {features.length > 0 && (
              <Card sx={{ 
                background: 'rgba(255,255,255,0.7)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.2)'
              }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CodeIcon color="primary" />
                    예상 기능
                  </Typography>
                  <Stack spacing={1}>
                    {features.map((feature, index) => (
                      <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ 
                          width: 6, 
                          height: 6, 
                          borderRadius: '50%', 
                          bgcolor: 'primary.main',
                          flexShrink: 0
                        }} />
                        <Typography variant="body2">{feature}</Typography>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            )}

            {/* 예상 완료일 */}
            {estimatedCompletion && (
              <Card sx={{ 
                background: 'rgba(255,255,255,0.7)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.2)'
              }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ScheduleIcon color="primary" />
                    예상 완료일
                  </Typography>
                  <Typography variant="h5" color="primary.main" sx={{ fontWeight: 'bold' }}>
                    {estimatedCompletion}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    개발 일정은 변경될 수 있습니다.
                  </Typography>
                </CardContent>
              </Card>
            )}
          </Box>

          <Box sx={{ textAlign: 'center' }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<RocketIcon />}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                px: 4,
                py: 1.5,
                fontSize: '1.1rem',
                borderRadius: 2,
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                  boxShadow: '0 6px 20px rgba(102, 126, 234, 0.6)',
                }
              }}
            >
              개발 진행 상황 확인
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default UnderDevelopment;
