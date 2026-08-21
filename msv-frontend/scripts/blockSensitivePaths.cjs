/**
 * 스캐너가 SPA catch-all(200 + index.html)을 .git/phpinfo 등으로 오인하지 않도록
 * 알려진 민감·레거시 경로를 404로 차단한다.
 */

/** 경로 접두/정확 매칭용 (소문자 비교) */
const BLOCKED_PREFIXES = [
  '/.git',
  '/.svn',
  '/.hg',
  '/.bzr',
  '/.env',
  '/.aws',
  '/.docker',
  '/.vscode',
  '/.idea',
  '/wp-admin',
  '/wp-content',
  '/wp-includes',
  '/wp-json',
  '/xmlrpc.php',
  '/phpmyadmin',
  '/pma',
  '/adminer',
  '/server-status',
  '/server-info',
];

const BLOCKED_EXACT = new Set([
  '/phpinfo.php',
  '/info.php',
  '/test.php',
  '/phpinfo',
  '/elmah.axd',
  '/trace.axd',
  '/web.config',
  '/crossdomain.xml',
  '/clientaccesspolicy.xml',
  '/composer.json',
  '/composer.lock',
  '/package-lock.json',
  '/yarn.lock',
  '/.gitignore',
  '/.gitattributes',
  '/thumbs.db',
  '/desktop.ini',
]);

const BLOCKED_SUFFIXES = [
  '.php',
  '.asp',
  '.aspx',
  '.axd',
  '.bak',
  '.sql',
  '.sqlite',
  '.env',
];

/**
 * @param {string} rawPath
 * @returns {boolean}
 */
function isBlockedSensitivePath(rawPath) {
  const pathOnly = String(rawPath || '')
    .split('?')[0]
    .split('#')[0]
    .toLowerCase();
  if (!pathOnly || pathOnly === '/') return false;

  if (BLOCKED_EXACT.has(pathOnly)) return true;

  for (const prefix of BLOCKED_PREFIXES) {
    if (pathOnly === prefix || pathOnly.startsWith(`${prefix}/`)) return true;
  }

  // /wp-json 전체
  if (pathOnly.startsWith('/wp-json')) return true;

  for (const suffix of BLOCKED_SUFFIXES) {
    if (pathOnly.endsWith(suffix)) return true;
  }

  return false;
}

/**
 * Express middleware — 민감 경로 404 (본문 없음)
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function blockSensitivePaths(req, res, next) {
  if (isBlockedSensitivePath(req.path || req.url)) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.status(404).type('text/plain').send('Not Found');
  }
  return next();
}

module.exports = {
  isBlockedSensitivePath,
  blockSensitivePaths,
  BLOCKED_PREFIXES,
  BLOCKED_EXACT,
};
