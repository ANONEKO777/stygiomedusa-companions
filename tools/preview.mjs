// 預覽夥伴包: 在 headless 瀏覽器中以 app 相同版本的 dotLottie runtime 播放四個邊 (上下緣各兩個 `along`) 的閒置,
// hover 吐出齒輪, 含著, 吸回與減少動態, 截圖到 `preview/<id>/`. `sheet.png` 是所有截圖拼成的一張, 適合直接交給 AI 看.
//
//   npm run preview -- <資料夾 | .companion 檔> [--browser chromium|msedge|chrome] [--scale 2] [--edges right,top]
//
// `--browser chromium` (預設) 需要先 `npm run setup:browser`; msedge 或 chrome 使用電腦上已安裝的瀏覽器.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const KIT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const COMPANION_PY = join(KIT, 'tools', 'companion.py');
const ORIGIN = 'http://companion-preview.local';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.wasm': 'application/wasm', '.map': 'application/json' };
const ALL_EDGES = ['right', 'bottom', 'left', 'top'];

function parseArgs(argv) {
  const options = { source: null, browser: 'chromium', scale: 2, edges: ALL_EDGES };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--browser') options.browser = argv[++i];
    else if (arg === '--scale') options.scale = Number(argv[++i]);
    else if (arg === '--edges') options.edges = argv[++i].split(',');
    else options.source = arg;
  }
  const badEdge = options.edges.find((edge) => !ALL_EDGES.includes(edge));
  if (!options.source || badEdge || !(options.scale > 0)) {
    console.error('用法: npm run preview -- <資料夾 | .companion 檔> [--browser chromium|msedge|chrome] [--scale 2] [--edges right,top]');
    process.exit(2);
  }
  return options;
}

const uv = (...args) => execFileSync('uv', ['run', COMPANION_PY, ...args], { stdio: 'inherit' });

const options = parseArgs(process.argv.slice(2));
const source = resolve(options.source);

// 驗證不通過仍然預覽, 方便看出問題; 原因已由 validate 印出.
try {
  uv('validate', source);
} catch {
  console.warn('驗證不通過, 仍然產生預覽.');
}
const build = join(KIT, 'build', 'preview');
rmSync(build, { recursive: true, force: true });
uv('build', source, build);
const manifest = JSON.parse(readFileSync(join(build, 'companion.json'), 'utf8'));
const lottie = readFileSync(join(build, 'companion.lottie')).toString('base64');

const runtime = dirname(fileURLToPath(import.meta.resolve('@lottiefiles/dotlottie-web')));
const page404 = (route) => route.fulfill({ status: 404, body: 'not found' });

let browser;
try {
  browser = await chromium.launch({ channel: options.browser === 'chromium' ? undefined : options.browser });
} catch (error) {
  console.error(`無法啟動瀏覽器 ${options.browser}: ${error.message.split('\n')[0]}`);
  console.error('先執行 `npm run setup:browser`, 或改用已安裝的瀏覽器: `--browser msedge` 或 `--browser chrome`.');
  process.exit(1);
}

try {
  const page = await browser.newPage({ viewport: { width: 2 * manifest.canvas, height: 2 * manifest.canvas } });
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') console.warn(`[頁面] ${message.text()}`);
  });
  page.on('pageerror', (error) => console.error(`[頁面錯誤] ${error.message}`));
  await page.route(`${ORIGIN}/**`, (route) => {
    const path = new URL(route.request().url()).pathname;
    const file = path === '/' ? join(KIT, 'tools', 'preview.html') : path.startsWith('/runtime/') ? join(runtime, path.slice('/runtime/'.length)) : null;
    if (!file) return page404(route);
    try {
      return route.fulfill({ body: readFileSync(file), contentType: TYPES[extname(file)] ?? 'application/octet-stream' });
    } catch {
      return page404(route);
    }
  });
  await page.goto(`${ORIGIN}/`);
  await page.waitForFunction(() => window.ready === true);

  const result = await page.evaluate((input) => window.preview(input), {
    manifest,
    lottie,
    scale: options.scale,
    edges: options.edges,
  });

  const out = join(KIT, 'preview', manifest.id);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  const save = (name, url) => writeFileSync(join(out, name), Buffer.from(url.split(',')[1], 'base64'));
  for (const shot of result.shots) save(`${shot.view}-${shot.name}.png`, shot.png);
  save('sheet.png', result.sheet);
  const report = result.shots.map(({ png, ...shot }) => shot);
  writeFileSync(join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`已寫出 ${out}: sheet.png, ${result.shots.length} 張截圖與 report.json`);
  for (const shot of report) console.log(`  ${shot.view.padEnd(12)} ${shot.name.padEnd(9)} state ${shot.state}, bud ${shot.bud}`);
} catch (error) {
  console.error(`預覽失敗: ${error.message}`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
