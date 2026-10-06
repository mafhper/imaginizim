/**
 * Smoke do fluxo real do Imaginizim: carregar, processar, receber saída.
 *
 * Existe para responder a uma pergunta que nenhum gate atual responde:
 * a aplicação ainda funciona como está disponível hoje?
 *
 * `npm run check` prova que compila e que os testes unitários passam.
 * `npm run lighthouse` prova que a página carrega dentro de um orçamento.
 * Nenhum dos dois toca o worker, a fila ou a comparação de bytes — que é
 * justamente onde o motor será reescrito.
 *
 * Uso (a partir da raiz do repo):
 *   node .dev/tools/smoke-app.mjs <caminho-do-dist>
 */
import { createServer } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const dist = path.resolve(process.argv[2] ?? 'dist');
const BASE = '/imaginizim/';
const HOST = '127.0.0.1';
const PORT = 5190;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8'
};

function serve() {
  const server = createServer((req, res) => {
    let urlPath = decodeURIComponent((req.url ?? '/').split('?')[0]);
    if (!urlPath.startsWith(BASE)) {
      res.writeHead(404).end('fora do base');
      return;
    }
    urlPath = urlPath.slice(BASE.length) || 'index.html';
    const file = path.join(dist, urlPath);
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404).end('nao encontrado');
      return;
    }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] ?? 'application/octet-stream' });
    res.end(fs.readFileSync(file));
  });
  return new Promise((resolve) => server.listen(PORT, HOST, () => resolve(server)));
}

const steps = [];
function step(name, ok, detail = '') {
  steps.push({ name, ok, detail });
  console.log(`${ok ? '  ok  ' : ' FALHA'} ${name}${detail ? ` — ${detail}` : ''}`);
}

/**
 * Espera o card mostrar a seta de tamanho (`original → novo`) sem "Trabalhando".
 * É o único sinal honesto de que o worker rodou. A versão antiga casava
 * `/conclu/` no cabeçalho ("0 concluídos") e dava verde sem processar nada.
 */
async function waitForProcessed(page) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    const text = await page
      .locator('article')
      .first()
      .innerText()
      .catch(() => '');
    if (/→/.test(text) && !/trabalhando/i.test(text)) return true;
    await page.waitForTimeout(500);
  }
  return false;
}

const server = await serve();
const browser = await chromium.launch();

try {
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => consoleErrors.push(String(e)));

  await page.goto(`http://${HOST}:${PORT}${BASE}`, { waitUntil: 'networkidle' });
  step('pagina carrega', (await page.title()).length > 0, await page.title());

  const input = page.locator('input[type=file]').first();
  step('input de arquivo existe', (await input.count()) === 1);

  // PNG real do proprio repo, 192x192.
  await input.setInputFiles(path.resolve('public/pwa-192x192.png'));
  await page.waitForSelector('[data-testid=home-dropzone]', { timeout: 10_000 }).catch(() => {});
  step('arquivo aceito', true, 'setInputFiles nao lancou');

  // O app NAO processa sozinho: a fila enfileira e o usuario dispara.
  // Clicar em "Processar fila" e esperar a seta e o unico sinal honesto.
  await page.waitForSelector('#optimizeQueueBtn', { timeout: 20_000 }).catch(() => {});
  await page
    .locator('#optimizeQueueBtn')
    .click()
    .catch(() => {});
  const processed = await waitForProcessed(page);
  step('processamento chega a um estado terminal', processed, 'aguardou a seta de tamanho');

  const metrics = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      hasSelectorFormat: text.includes('Formato') || text.includes('Format'),
      bodyChars: text.length,
      mentionsSizes: /\d+\s?(KB|MB|B|bytes)/i.test(text),
      mentionsSaved: /(economiz|reduz|saved|%|→)/i.test(text)
    };
  });
  step('interface renderiza parametros', metrics.hasSelectorFormat);
  step('interface mostra tamanhos de arquivo', metrics.mentionsSizes, `${metrics.bodyChars} chars`);
  step('interface mostra o resultado da reducao', metrics.mentionsSaved);

  // Comparacao: precisa de um arquivo processado.
  const compareVisible = await page
    .getByRole('button', { name: /compar|compare/i })
    .first()
    .isVisible()
    .catch(() => false);
  console.log(`  info  botao de comparacao visivel: ${compareVisible}`);

  // Density toggle: the feature was implemented in the provider for months with
  // no way to reach it, and its only UI lived in an orphaned component. Prove
  // it is reachable, that it changes the list, and that it survives a reload.
  const density = { checked: false, persisted: false, changedLayout: false };
  const compactBtn = page.locator('#queueDensityCompactBtn');
  const comfortBtn = page.locator('#queueDensityComfortBtn');

  if ((await compactBtn.count()) === 0) {
    step('toggle de densidade renderiza', false, 'botao nao encontrado');
  } else {
    step('toggle de densidade renderiza', true);
    await compactBtn.click();

    const compressed = await page.locator('article').first().getAttribute('class');
    await comfortBtn.click();
    const relaxed = await page.locator('article').first().getAttribute('class');
    density.checked = true;
    density.changedLayout = compressed !== relaxed;
    step('densidade altera o layout da fila', density.changedLayout);

    await compactBtn.click();
    await page.reload({ waitUntil: 'networkidle' });
    await input.first().setInputFiles(path.resolve('public/pwa-192x192.png'));
    await page
      .locator('#queueDensityCompactBtn')
      .waitFor({ timeout: 20_000 })
      .catch(() => {});
    const pressedAfterReload = await page
      .locator('#queueDensityCompactBtn')
      .getAttribute('aria-pressed');
    density.persisted = pressedAfterReload === 'true';
    step(
      'densidade sobrevive a um reload',
      density.persisted,
      `aria-pressed=${pressedAfterReload}`
    );
    await page
      .locator('#queueDensityComfortBtn')
      .click()
      .catch(() => {});
  }

  // About: as rotas de secao sao redirects, entao medimos a pagina real.
  await page.goto(`http://${HOST}:${PORT}${BASE}#/sobre`, { waitUntil: 'networkidle' });
  step('sobre renderiza', (await page.locator('h1').count()) > 0);

  // The copy must follow the language. The compressor panel only renders once a
  // file is loaded, so this has to run in that state, not on the landing page.
  await page.goto(`http://${HOST}:${PORT}${BASE}#/`, { waitUntil: 'networkidle' });
  const htmlLang = await page.evaluate(() => document.documentElement.lang);
  step('idioma padrao do documento e pt-BR', htmlLang === 'pt-BR', htmlLang);

  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles(path.resolve('public/pwa-192x192.png'));
  await page.waitForSelector('#queueDensityComfortBtn', { timeout: 20_000 }).catch(() => {});
  const panelCopy = await page.evaluate(() => document.body.innerText);
  const portuguese = ['Ajustes', 'Qualidade', 'Formato final'].filter((word) =>
    panelCopy.includes(word)
  );
  const leaked = ['Parâmetros', 'Escala', 'Otimização', 'Balanceado'].filter((word) =>
    panelCopy.includes(word)
  );
  step('painel do compressor em portugues', portuguese.length === 3, portuguese.join('/'));
  step('nenhum rotulo hardcoded em portugues no painel', leaked.length === 0, leaked.join('/'));

  const realErrors = consoleErrors.filter((e) => !/favicon|404/i.test(e));
  step('sem erro de console', realErrors.length === 0, realErrors.slice(0, 2).join(' | '));
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}

const failed = steps.filter((s) => !s.ok);
console.log(`\n${steps.length - failed.length}/${steps.length} passos ok`);
process.exit(failed.length === 0 ? 0 : 1);
