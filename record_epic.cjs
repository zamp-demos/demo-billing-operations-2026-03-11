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

  await page.goto('file:///tmp/videos/mock_epic.html');
  await page.waitForTimeout(1500);

  // Scroll to the upload section
  await page.evaluate(() => window.scrollTo({ top: 150, behavior: 'smooth' }));
  await page.waitForTimeout(800);

  // Click the upload / submit button if present
  const btn = await page.$('button');
  if (btn) {
    await btn.hover();
    await page.waitForTimeout(600);
    await btn.click();
    await page.waitForTimeout(500);
  }

  // Animate a progress bar via JS
  await page.evaluate(() => {
    let bar = document.getElementById('upload-progress');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'upload-progress';
      bar.style.cssText = `
        position: fixed; bottom: 60px; left: 50%; transform: translateX(-50%);
        width: 520px; background: #f0f0f0; border-radius: 8px;
        overflow: hidden; height: 28px; box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        z-index: 9999;
      `;
      const fill = document.createElement('div');
      fill.id = 'progress-fill';
      fill.style.cssText = `
        height: 100%; width: 0%; background: #0066cc;
        transition: width 0.4s ease; display: flex; align-items: center;
        justify-content: center; color: white; font-size: 13px; font-weight: bold;
      `;
      fill.innerText = 'Uploading...';
      bar.appendChild(fill);
      document.body.appendChild(bar);
    }
  });
  await page.waitForTimeout(400);

  // Animate progress 0 → 100%
  for (const pct of [15, 35, 55, 70, 85, 100]) {
    await page.evaluate((p) => {
      const fill = document.getElementById('progress-fill');
      if (fill) {
        fill.style.width = p + '%';
        fill.innerText = p < 100 ? `Uploading... ${p}%` : '✓ Upload Complete';
        if (p === 100) fill.style.background = '#28a745';
      }
    }, pct);
    await page.waitForTimeout(500);
  }

  await page.waitForTimeout(800);

  // Show invoice confirmation banner
  await page.evaluate(() => {
    const banner = document.createElement('div');
    banner.innerText = '✓ Invoice INV-1234-056 submitted to EPIC — Job ID: EPIC-20250311-0042';
    banner.style.cssText = `
      position: fixed; bottom: 10px; left: 50%; transform: translateX(-50%);
      background: #155724; color: #d4edda; padding: 14px 28px;
      border-radius: 8px; font-size: 14px; font-weight: bold;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 9999; white-space: nowrap;
    `;
    document.body.appendChild(banner);
  });
  await page.waitForTimeout(2000);

  await page.waitForTimeout(400);

  // CRITICAL: close context before browser to flush video
  await context.close();

  // Find the newest .webm file written after wsj_fx_rate.webm was renamed
  const files = fs.readdirSync(outputDir)
    .filter(f => f.endsWith('.webm') && f !== 'wsj_fx_rate.webm')
    .map(f => ({ name: f, mtime: fs.statSync(path.join(outputDir, f)).mtime }))
    .sort((a, b) => b.mtime - a.mtime);

  if (files.length > 0) {
    const newest = files[0].name;
    const src = path.join(outputDir, newest);
    const dst = path.join(outputDir, 'epic_invoice_upload.webm');
    fs.renameSync(src, dst);
    console.log(`✅ epic_invoice_upload.webm written (renamed from ${newest})`);
  } else {
    console.error('❌ No .webm file found in output dir');
  }

  await browser.close();
})();
