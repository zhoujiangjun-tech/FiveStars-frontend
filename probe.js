// 用本机 Edge 跑下页面,抓 console 和 DOM 状态
const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  const logs = [];
  page.on('console', (msg) => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', (err) => logs.push(`[pageerror] ${err.message}\n${err.stack || ''}`));
  page.on('requestfailed', (req) => logs.push(`[reqfail] ${req.url()} -> ${req.failure() && req.failure().errorText}`));

  await page.setViewport({ width: 820, height: 1180 });
  await page.goto('http://localhost:4802', { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 4000));

  const info = await page.evaluate(() => {
    const root = document.getElementById('root');
    return {
      rootExists: !!root,
      rootHTML: root ? root.innerHTML.slice(0, 600) : null,
      rootHeight: root ? root.getBoundingClientRect().height : null,
      bodyHeight: document.body.getBoundingClientRect().height,
      bodyBg: getComputedStyle(document.body).backgroundColor,
      title: document.title,
    };
  });

  console.log('=== DOM INFO ===');
  console.log(JSON.stringify(info, null, 2));
  console.log('=== CONSOLE LOGS ===');
  logs.forEach(l => console.log(l));

  await browser.close();
})();
