import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import MvsPageHeader from '../../components/Common/MvsPageHeader';
import {
  mvsBodyCardSx,
  mvsBodyOutlinedBtnSx,
  mvsBodyPrimaryBtnSx,
  mvsPageRootSx,
} from '../../theme/mvsLayout';
import { useTranslation } from 'react-i18next';
import { showSuccessPopup, showWarningPopup } from '../../utils/errorHandler';

const DOWNLOAD_HREF = `${process.env.PUBLIC_URL || ''}/downloads/mvs-notifier/MVS-Notifier.zip`;

/** 알람 > 알림 프로그램 다운로드 */
const DesktopNotifierDownload: React.FC = () => {
  const { i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  const txt = (ko: string, en: string) => (isEn ? en : ko);
  const [copying, setCopying] = useState(false);

  const apiHint = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/api`;
  }, []);

  const copyApiUrl = async () => {
    if (!apiHint) return;
    setCopying(true);
    try {
      await navigator.clipboard.writeText(apiHint);
      showSuccessPopup(txt('API 주소를 복사했습니다.', 'API URL copied.'));
    } catch {
      showWarningPopup(txt('복사에 실패했습니다. 주소를 직접 선택해 복사하세요.', 'Copy failed. Select the URL manually.'));
    } finally {
      setCopying(false);
    }
  };

  return (
    <Box sx={mvsPageRootSx}>
      <MvsPageHeader
        title={txt('알림 프로그램', 'Desktop Notifier')}
        description={txt(
          '브라우저를 켜지 않아도 Windows 트레이·Toast로 MVS 알림을 받을 수 있습니다.',
          'Receive MVS alerts via Windows tray/Toast without keeping the browser open.'
        )}
      />

      <Card elevation={0} sx={mvsBodyCardSx}>
        <CardContent sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Box
              component="img"
              src={`${process.env.PUBLIC_URL || ''}/logo192.png`}
              alt="MVS"
              sx={{ width: 48, height: 48, borderRadius: '50%' }}
            />
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                MVS Notifier v2.1
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {txt('설치 프로그램 · 제거 지원 · Windows 버전 호환', 'Installer, uninstall, multi-Windows support')}
              </Typography>
            </Box>
          </Box>

          <Alert severity="info" sx={{ mb: 2, borderRadius: 0 }}>
            {txt(
              'v2.1: Win10/11은 Toast, 구형은 풍선 알림으로 자동 전환합니다. TLS1.2·아이콘·제거 로직을 버전별로 안전하게 처리합니다. Setup.bat 설치 / Windows 설정 → 앱에서 제거. 업그레이드 후 트레이에서 다시 로그인하세요.',
              'v2.1: Toast on Win10/11; balloon fallback on older Windows. TLS 1.2, icons, and uninstall are version-safe. Install with Setup.bat; remove from Settings → Apps. Re-login in the tray after upgrade.'
            )}
          </Alert>

          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            {txt('구성', 'Contents')}
          </Typography>
          <List dense disablePadding sx={{ mb: 2 }}>
            <ListItem disableGutters>
              <ListItemText
                primary={txt('Windows Toast + 트레이', 'Windows Toast + tray')}
                secondary={txt('알림 센터 표시, 더블클릭·풍선 클릭으로 바로가기', 'Notification Center; open via double-click / balloon')}
              />
            </ListItem>
            <ListItem disableGutters>
              <ListItemText
                primary={txt('웹과 독립 세션', 'Independent of web session')}
                secondary={txt(
                  '다른 곳 웹 로그인·중복 로그인에 영향받지 않음',
                  'Unaffected by web login on another device'
                )}
              />
            </ListItem>
            <ListItem disableGutters>
              <ListItemText
                primary={txt('설치 / 제거', 'Install / Uninstall')}
                secondary={txt(
                  'Setup.bat · Uninstall.bat · Windows 앱 목록 등록',
                  'Setup.bat · Uninstall.bat · Apps & Features entry'
                )}
              />
            </ListItem>
          </List>

          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            {txt('설치 방법', 'How to install')}
          </Typography>
          <Typography variant="body2" color="text.secondary" component="div" sx={{ mb: 1.5 }}>
            <ol style={{ margin: 0, paddingLeft: 18 }}>
              <li>{txt('ZIP 다운로드 후 압축 해제', 'Download ZIP and extract')}</li>
              <li>{txt('Setup.bat 실행 (설치 프로그램)', 'Run Setup.bat (installer)')}</li>
              <li>
                {txt(
                  'API 주소 입력 후 MVS 계정으로 로그인',
                  'Enter API base URL and sign in with your MVS account'
                )}
              </li>
              <li>
                {txt(
                  '제거: Windows 설정 → 앱 → MVS Notifier 또는 Uninstall.bat',
                  'Uninstall: Windows Settings → Apps → MVS Notifier, or Uninstall.bat'
                )}
              </li>
            </ol>
          </Typography>

          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 1,
              mb: 2,
              p: 1.25,
              border: '1px solid #B4B4B4',
              bgcolor: '#FAFAFA',
            }}
          >
            <Typography variant="body2" sx={{ flex: '1 1 220px', fontFamily: 'Consolas, monospace' }}>
              {apiHint || '/api'}
            </Typography>
            <Button
              size="small"
              variant="outlined"
              startIcon={<ContentCopyIcon />}
              onClick={() => void copyApiUrl()}
              disabled={copying || !apiHint}
              sx={mvsBodyOutlinedBtnSx}
            >
              {txt('API 주소 복사', 'Copy API URL')}
            </Button>
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Button
              variant="contained"
              disableElevation
              startIcon={<DownloadIcon />}
              href={DOWNLOAD_HREF}
              download="MVS-Notifier.zip"
              sx={mvsBodyPrimaryBtnSx}
            >
              {txt('설치 파일 다운로드', 'Download installer')}
            </Button>
            <Button
              variant="outlined"
              href={DOWNLOAD_HREF}
              target="_blank"
              rel="noopener noreferrer"
              sx={mvsBodyOutlinedBtnSx}
            >
              {txt('새 탭에서 열기', 'Open in new tab')}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default DesktopNotifierDownload;
