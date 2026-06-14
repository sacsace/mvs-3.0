import React from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Slide,
  Typography,
} from '@mui/material';
import { Close as CloseIcon, GetApp as GetAppIcon, IosShare as IosShareIcon } from '@mui/icons-material';
import { TransitionProps } from '@mui/material/transitions';
import { useMenuStore } from '../../store';
import { useAppInstallPrompt } from '../../hooks/useAppInstallPrompt';
import { useIsMobileOrTablet, isIOSDevice } from '../../utils/isMobileOrTablet';

const SlideUp = React.forwardRef(function SlideUp(
  props: TransitionProps & { children: React.ReactElement },
  ref: React.Ref<unknown>
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const AppInstallBanner: React.FC = () => {
  const { language } = useMenuStore();
  const isMobileOrTablet = useIsMobileOrTablet();
  const isEn = language === 'en';
  const isIos = isIOSDevice();

  const {
    shouldShow,
    canPromptInstall,
    iosGuideOpen,
    install,
    dismiss,
    closeIosGuide,
  } = useAppInstallPrompt(isMobileOrTablet);

  if (!shouldShow) return null;

  const title = isEn ? 'Install the MVS app' : 'MVS 앱 설치';
  const description = isEn
    ? 'Install the app for faster access and a better mobile experience.'
    : '앱을 설치하면 더 빠르고 편리하게 이용할 수 있습니다.';
  const installLabel = isEn ? 'Install app' : '앱 설치';
  const iosGuideTitle = isEn ? 'Add to Home Screen' : '홈 화면에 추가';
  const iosSteps = isEn
    ? [
        'Tap the Share button at the bottom of Safari.',
        'Select "Add to Home Screen".',
        'Tap "Add" to install the MVS app.',
      ]
    : [
        'Safari 하단의 공유(↑) 버튼을 누르세요.',
        '"홈 화면에 추가"를 선택하세요.',
        '"추가"를 눌러 MVS 앱을 설치하세요.',
      ];

  return (
    <>
      <Box
        role="region"
        aria-label={title}
        sx={{
          position: 'fixed',
          left: { xs: 12, sm: 16 },
          right: { xs: 12, sm: 16 },
          bottom: { xs: 12, sm: 16 },
          zIndex: (theme) => theme.zIndex.snackbar + 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          px: 1.5,
          py: 1.25,
          borderRadius: '14px',
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 8px 28px rgba(15, 23, 42, 0.14)',
        }}
      >
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: '10px',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
          }}
        >
          <GetAppIcon fontSize="small" />
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
            {title}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.45 }}>
            {description}
          </Typography>
        </Box>

        <Button
          variant="contained"
          size="small"
          disableElevation
          onClick={() => void install()}
          sx={{ flexShrink: 0, textTransform: 'none', fontWeight: 600, borderRadius: '8px', px: 1.5 }}
        >
          {canPromptInstall || !isIos ? installLabel : (isEn ? 'How to install' : '설치 방법')}
        </Button>

        <IconButton size="small" aria-label={isEn ? 'Close' : '닫기'} onClick={dismiss} sx={{ flexShrink: 0 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Dialog open={iosGuideOpen} onClose={closeIosGuide} maxWidth="xs" fullWidth TransitionComponent={SlideUp}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
          <IosShareIcon color="primary" fontSize="small" />
          {iosGuideTitle}
        </DialogTitle>
        <DialogContent>
          <Box component="ol" sx={{ m: 0, pl: 2.25, color: 'text.secondary', fontSize: '0.875rem', lineHeight: 1.7 }}>
            {iosSteps.map((step) => (
              <Box component="li" key={step} sx={{ mb: 0.75 }}>
                {step}
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeIosGuide} variant="contained" disableElevation sx={{ textTransform: 'none' }}>
            {isEn ? 'OK' : '확인'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AppInstallBanner;
