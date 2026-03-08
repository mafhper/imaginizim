import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import zlib from 'node:zlib';
import { createRequire } from 'node:module';
import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
import { chromium } from 'playwright';

const require = createRequire(import.meta.url);
const config = require('../lighthouserc.cjs');

const modeArg = process.argv[2] ?? 'all';
const runMobile = modeArg === 'all' || modeArg === 'mobile';
const runDesktop = modeArg === 'all' || modeArg === 'desktop';
const DIST_DIR = path.resolve('dist');
const REPORT_ROOT = path.resolve(config.reportsDir, 'latest');
const CHROME_PROFILE_ROOT = path.resolve(config.reportsDir, '.chrome-profiles');

async function findFreePort(preferredPort) {
  const tryListen = (port) =>
    new Promise((resolve) => {
      const server = net.createServer();
      server.once('error', () => resolve(null));
      server.listen(port, config.host, () => {
        const address = server.address();
        server.close(() => resolve(address?.port ?? null));
      });
    });

  const preferred = await tryListen(preferredPort);
  if (preferred) {
    return preferred;
  }

  const dynamic = await tryListen(0);
  if (!dynamic) {
    throw new Error('Unable to find a free port for Lighthouse server.');
  }

  return dynamic;
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

const PRESETS = {
  desktop: {
    formFactor: 'desktop',
    throttlingMethod: 'provided',
    screenEmulation: {
      mobile: false,
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      disabled: false
    }
  },
  mobile: {
    formFactor: 'mobile',
    screenEmulation: {
      mobile: true,
      width: 390,
      height: 844,
      deviceScaleFactor: 3,
      disabled: false
    }
  }
};

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function safeRemoveDir(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 150 });
  } catch {
    // Windows can keep transient handles open after Chrome exits.
  }
}

function serveFile(res, filePath) {
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] || 'application/octet-stream';
  const isHashedAsset = filePath.includes(`${path.sep}assets${path.sep}`);
  const cacheControl = isHashedAsset
    ? 'public, max-age=31536000, immutable'
    : ext === '.html'
      ? 'no-cache'
      : 'public, max-age=3600';

  const shouldCompress =
    /^(text\/|application\/javascript|application\/json|application\/xml|image\/svg\+xml)/.test(
      contentType
    );

  if (shouldCompress) {
    const buffer = fs.readFileSync(filePath);
    const gzipped = zlib.gzipSync(buffer);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Encoding': 'gzip',
      'Cache-Control': cacheControl,
      Vary: 'Accept-Encoding'
    });
    res.end(gzipped);
    return;
  }

  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': cacheControl
  });
  fs.createReadStream(filePath).pipe(res);
}

function createServer() {
  return http.createServer((req, res) => {
    const reqUrl = new URL(req.url, `http://${config.host}`);
    const pathname = reqUrl.pathname;

    if (pathname === '/imaginizim') {
      res.writeHead(302, { Location: config.basePath });
      res.end();
      return;
    }

    if (!pathname.startsWith(config.basePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    const relativePath = pathname.slice(config.basePath.length);
    const targetPath = relativePath
      ? path.join(DIST_DIR, relativePath)
      : path.join(DIST_DIR, 'index.html');

    if (fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()) {
      serveFile(res, targetPath);
      return;
    }

    serveFile(res, path.join(DIST_DIR, 'index.html'));
  });
}

function categoryScores(lhr) {
  return {
    performance: lhr.categories.performance?.score ?? 0,
    accessibility: lhr.categories.accessibility?.score ?? 0,
    'best-practices': lhr.categories['best-practices']?.score ?? 0,
    seo: lhr.categories.seo?.score ?? 0
  };
}

function hasFailures(scores) {
  return Object.entries(config.thresholds).some(([key, minScore]) => (scores[key] ?? 0) < minScore);
}

async function runRoute(presetName, route, port) {
  const profileDir = path.join(CHROME_PROFILE_ROOT, `${presetName}-${route.name}`);
  safeRemoveDir(profileDir);
  ensureDir(profileDir);

  const chrome = await launch({
    chromePath: chromium.executablePath(),
    chromeFlags: ['--headless=new', '--disable-gpu', '--no-sandbox'],
    userDataDir: profileDir
  });

  try {
    const url = `http://${config.host}:${port}${config.basePath}${route.hash}`;
    const run = await lighthouse(url, {
      port: chrome.port,
      output: 'html',
      logLevel: 'error',
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      ...PRESETS[presetName]
    });

    const presetDir = path.join(REPORT_ROOT, presetName);
    ensureDir(presetDir);

    const htmlPath = path.join(presetDir, `${route.name}.html`);
    const jsonPath = path.join(presetDir, `${route.name}.json`);
    fs.writeFileSync(htmlPath, run.report, 'utf8');
    fs.writeFileSync(jsonPath, JSON.stringify(run.lhr, null, 2), 'utf8');

    const scores = categoryScores(run.lhr);
    return {
      route: route.name,
      preset: presetName,
      url,
      htmlPath,
      jsonPath,
      scores,
      failure: hasFailures(scores)
    };
  } finally {
    try {
      await chrome.kill();
    } catch {
      // Windows temp cleanup can fail after Chrome exits; the run result is still valid.
    }
    safeRemoveDir(profileDir);
  }
}

async function main() {
  ensureDir(REPORT_ROOT);
  ensureDir(CHROME_PROFILE_ROOT);
  const port = await findFreePort(config.port);

  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, config.host, () => resolve());
  });

  const results = [];

  try {
    if (runDesktop) {
      for (const route of config.routes) {
        results.push(await runRoute('desktop', route, port));
      }
    }

    if (runMobile) {
      for (const route of config.routes) {
        results.push(await runRoute('mobile', route, port));
      }
    }
  } finally {
    await new Promise((resolve) => server.close(() => resolve()));
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    mode: modeArg,
    thresholds: config.thresholds,
    results
  };

  fs.writeFileSync(
    path.join(REPORT_ROOT, 'summary.json'),
    JSON.stringify(summary, null, 2),
    'utf8'
  );

  const lines = results.map((result) => {
    const scores = Object.entries(result.scores)
      .map(([key, value]) => `${key}:${Math.round(value * 100)}`)
      .join(' | ');
    return `${result.failure ? 'FAIL' : 'PASS'} ${result.preset} ${result.route} -> ${scores}`;
  });

  console.log(lines.join('\n'));

  if (results.some((result) => result.failure)) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
