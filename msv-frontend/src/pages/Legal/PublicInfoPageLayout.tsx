import React from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { ensureI18nLanguage } from '../../locales/i18n';
import { Link as RouterLink } from 'react-router-dom';
import { useMenuStore } from '../../store';

interface PublicInfoPageLayoutProps {
  title: string;
  subtitle?: string;
  lastUpdated?: string;
  children: React.ReactNode;
}

const PublicInfoPageLayout: React.FC<PublicInfoPageLayoutProps> = ({
  title,
  subtitle,
  lastUpdated,
  children,
}) => {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const setMenuLanguage = useMenuStore((s) => s.setLanguage);

  const handleLanguageChange = (_event: React.MouseEvent<HTMLElement>, newLang: 'ko' | 'en' | null) => {
    if (newLang === null) return;
    void ensureI18nLanguage(newLang);
    setMenuLanguage(newLang);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background:
          theme.palette.mode === 'light'
            ? `
              radial-gradient(ellipse 80% 55% at 12% 8%, rgba(106, 143, 147, 0.1) 0%, transparent 58%),
              radial-gradient(ellipse 70% 50% at 88% 92%, rgba(13, 43, 91, 0.07) 0%, transparent 52%),
              linear-gradient(168deg, #e4ebf3 0%, #f0f4f9 38%, #e8eef5 100%)
            `
            : `linear-gradient(180deg, ${theme.palette.grey[900]} 0%, ${alpha(theme.palette.common.black, 0.92)} 100%)`,
        py: { xs: 2.5, sm: 4 },
        px: { xs: 2, sm: 3 },
      }}
    >
      <Container maxWidth="md">
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            mb: 2.5,
            flexWrap: 'wrap',
          }}
        >
          <Button
            component={RouterLink}
            to="/login"
            startIcon={<ArrowBackIcon />}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: '12px',
              color: 'text.secondary',
              '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.06) },
            }}
          >
            {t('legalPages.backToLogin')}
          </Button>
          <ToggleButtonGroup
            exclusive
            value={i18n.language?.startsWith('en') ? 'en' : 'ko'}
            onChange={handleLanguageChange}
            aria-label={t('login.languageToggleAria')}
            size="small"
            sx={{
              bgcolor: alpha(theme.palette.background.paper, 0.72),
              p: 0.35,
              borderRadius: '999px',
              border: `1px solid ${alpha('#ffffff', 0.9)}`,
              '& .MuiToggleButtonGroup-grouped': {
                border: 0,
                mx: 0.15,
                borderRadius: '999px !important',
                px: 1.5,
                py: 0.4,
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'none',
              },
            }}
          >
            <ToggleButton value="en" disableRipple>
              {t('login.langEn')}
            </ToggleButton>
            <ToggleButton value="ko" disableRipple>
              {t('login.langKo')}
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Paper
          elevation={0}
          sx={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: '24px',
            px: { xs: 2.5, sm: 4 },
            py: { xs: 3, sm: 4 },
            bgcolor: alpha(theme.palette.background.paper, theme.palette.mode === 'light' ? 0.96 : 1),
            border: `1px solid ${theme.palette.mode === 'light' ? alpha('#ffffff', 0.85) : alpha(theme.palette.divider, 0.5)}`,
            boxShadow:
              theme.palette.mode === 'light'
                ? '0 8px 24px rgba(15, 23, 42, 0.08), 0 24px 48px rgba(15, 23, 42, 0.06)'
                : '0 20px 50px rgba(0,0,0,0.45)',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '3px',
              background: `linear-gradient(90deg, #0D2B5B 0%, ${theme.palette.primary.main} 55%, ${alpha(theme.palette.primary.light, 0.85)} 100%)`,
            },
          }}
        >
          <Typography
            component="h1"
            sx={{
              fontWeight: 700,
              fontSize: { xs: '1.5rem', sm: '1.75rem' },
              letterSpacing: '-0.03em',
              mb: subtitle ? 0.75 : 1.5,
            }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, lineHeight: 1.65 }}>
              {subtitle}
            </Typography>
          )}
          {lastUpdated && (
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                mb: 3,
                color: alpha(theme.palette.text.secondary, 0.85),
                fontWeight: 500,
              }}
            >
              {t('legalPages.lastUpdated', { date: lastUpdated })}
            </Typography>
          )}
          {children}
        </Paper>
      </Container>
    </Box>
  );
};

export default PublicInfoPageLayout;
