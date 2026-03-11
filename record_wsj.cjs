const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const outputDir = '/tmp/billing-ops-demo/public/data/';
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    recordVideo: {
      dir: outputDir,
      size: { width: 1280, height: 800 }
    }
  });

  const page = await context.newPage();

  await page.goto('file:///tmp/videos/mock_wsj.html');
  await page.waitForTimeout(1500);

  // Scroll to show the FX rates table
  await page.evaluate(() => window.scrollTo({ top: 200, behavior: 'smooth' }));
  await page.waitForTimeout(1000);

  // Highlight EUR/USD row
  await page.evaluate(() => {
    const rows = document.querySelectorAll('table tr');
    rows.forEach(row => {
      if (row.innerText && row.innerText.includes('EUR/USD')) {
        row.style.background = '#fff3cd';
        row.style.transition = 'background 0.5s';
      }
    });
  });
  await page.waitForTimeout(1200);

  // Highlight GBP/USD row
  await page.evaluate(() => {
    const rows = document.querySelectorAll('table tr');
    rows.forEach(row => {
      if (row.innerText && row.innerText.includes('GBP/USD')) {
        row.style.background = '#cce5ff';
        row.style.transition = 'background 0.5s';
      }
    });
  });
  await page.waitForTimeout(1200);

  // Scroll down further
  await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'smooth' }));
  await page.waitForTimeout(1000);

  // Highlight JPY/USD row
  await page.evaluate(() => {
    const rows = document.querySelectorAll('table tr');
    rows.forEach(row => {
      if (row.innerText && row.innerText.includes('JPY/USD')) {
        row.style.background = '#d4edda';
        row.style.transition = 'background 0.5s';
      }
    });
  });
  await page.waitForTimeout(1200);

  // Show a "Rates captured" banner
  await page.evaluate(() => {
    const banner = document.createElement('div');
    banner.innerText = '✓ FX Rates Captured — 12 currencies extracted';
    banner.style.cssText = `
      position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
      background: #28a745; color: white; padding: 14px 32px;
      border-radius: 8px; font-size: 16px; font-weight: bold;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2); z-index: 9999;
    `;
    document.body.appendChild(banner);
  });
  await page.waitForTimeout(2000);

  await page.waitForTimeout(500);

  // CRITICAL: close context before browser to flush video
  await context.close();

  // Find the newest .webm file in output dir
  const files = fs.readdirSync(outputDir)
    .filter(f => f.endsWith('.webm'))
    .map(f => ({ name: f, mtime: fs.statSync(path.join(outputDir, f)).mtime }))
    .sort((a, b) => b.mtime - a.mtime);

  if (files.length > 0) {
    const newest = files[0].name;
    const src = path.join(outputDir, newest);
    const dst = path.join(outputDir, 'wsj_fx_rate.webm');
    fs.renameSync(src, dst);
    console.log(`✅ wsj_fx_rate.webm written (renamed from ${newest})`);
  } else {
    console.error('❌ No .webm file found in output dir');
  }

  await browser.close();
})();
