/**
 * Railway 등에서 CRA build 정적 파일을 서빙.
 * - HTTP→HTTPS 리다이렉트 (X-Forwarded-Proto)
 * - 보안 헤더 + CSP (스캔 항목 대응)
 */
const path = require('path');
const express = require('express');

const PORT = Number.parseInt(process.env.PORT || '3000', 10) || 3000;
const isProd = process.env.NODE_ENV === 'production' || process.env.FORCE_HTTPS === '1';
const buildDir = path.join(__dirname, '..', 'build');

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

const resolveApiOrigin = () => {
  const raw =
    process.env.CSP_API_ORIGIN ||
    process.env.REACT_APP_API_URL ||
    'https://api.mvsystem.in/api';
  try {
    const withScheme = /:\/\//.test(raw) ? raw : `https://${raw}`;
    return new URL(withScheme).origin;
  } catch {
    return 'https://api.mvsystem.in';
  }
};

const buildCsp = () => {
  const apiOrigin = resolveApiOrigin();
  const extra = String(process.env.CSP_CONNECT_SRC || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const connectSrc = [
    "'self'",
    apiOrigin,
    'https://fonts.googleapis.com',
    'https://*.up.railway.app',
    'https://*.railway.app',
    ...extra,
  ].join(' ');

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'",
    "form-action 'self'",
    // index.html SEO 언어 스크립트 + CRA 번들
    "script-src 'self' 'unsafe-inline'",
    // MUI Emotion 인라인 스타일 + Google Fonts CSS
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    `connect-src ${connectSrc}`,
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    'upgrade-insecure-requests',
  ].join('; ');
};

/** 프록시 앞단에서 HTTP로 들어오면 HTTPS로 301 */
app.use((req, res, next) => {
  if (!isProd) return next();
  const forwarded = req.get('x-forwarded-proto');
  if (!forwarded) return next();
  const proto = forwarded.split(',')[0].trim().toLowerCase();
  if (proto === 'https') return next();
  const host = req.get('host') || 'mvsystem.in';
  return res.redirect(301, `https://${host}${req.originalUrl}`);
});

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
  );
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('Content-Security-Policy', buildCsp());
  if (isProd) {
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }
  next();
});

app.get('/health', (_req, res) => {
  res.status(200).type('text/plain').send('ok');
});

app.use(
  express.static(buildDir, {
    index: false,
    maxAge: '7d',
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('index.html') || filePath.endsWith('serve.json')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    },
  })
);

app.get('*', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(buildDir, 'index.html'), (err) => {
    if (err) {
      res.status(500).type('text/plain').send('Frontend build missing. Run npm run build.');
    }
  });
});

app.listen(PORT, '0.0.0.0', () => {
  // eslint-disable-next-line no-console
  console.log(`[mvs-frontend] serving ${buildDir} on :${PORT} (httpsRedirect=${isProd})`);
});
