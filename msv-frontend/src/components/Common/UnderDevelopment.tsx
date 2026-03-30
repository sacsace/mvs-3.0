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
import { useTranslation } from 'react-i18next';

interface UnderDevelopmentProps {
  pageName: string;
  description?: string;
  estimatedCompletion?: string;
  features?: string[];
  status?: 'planning' | 'development' | 'testing' | 'review';
}

const UnderDevelopment: React.FC<UnderDevelopmentProps> = ({
  pageName,
  description,
  estimatedCompletion,
  features = [],
  status = 'development'
}) => {
  const { t } = useTranslation();
  const desc = description ?? t('common.defaultPageDesc');

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
      case 'planning': return t('common.statusPlanning');
      case 'development': return t('common.statusDevelopment');
      case 'testing': return t('common.statusTesting');
      case 'review': return t('common.statusReview');
      default: return t('common.statusDevelopment');
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
              {desc}
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
                  {t('common.developmentProgress')}
                </Typography>
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <CheckCircleIcon color="success" />
                    <Typography variant="body2">{t('common.uiDesignDone')}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <CheckCircleIcon color="success" />
                    <Typography variant="body2">{t('common.componentStructure')}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <PendingIcon color="warning" />
                    <Typography variant="body2">{t('common.backendApi')}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <PendingIcon color="warning" />
                    <Typography variant="body2">{t('common.dbIntegration')}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <PendingIcon color="warning" />
                    <Typography variant="body2">{t('common.testingValidation')}</Typography>
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
                    {t('common.expectedFeatures')}
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
                    {t('common.expectedCompletion')}
                  </Typography>
                  <Typography variant="h5" color="primary.main" sx={{ fontWeight: 'bold' }}>
                    {estimatedCompletion}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {t('common.scheduleSubjectToChange')}
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
              {t('common.checkProgress')}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default UnderDevelopment;
