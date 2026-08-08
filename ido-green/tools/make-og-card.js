//
// Regenerates the 1200x630 social share card at www/img/og-card.jpg. 🖼️
// Rendered in headless Chrome so it picks up the same Outfit/Inter webfonts
// and oklch() design tokens the site uses.
//
// Usage:  node tools/make-og-card.js        (from the ido-green/ directory)
//         npm --prefix tests/ install       (once, for the puppeteer dependency)
//
const path = require('path');
const puppeteer = require(path.join(__dirname, '..', 'tests', 'node_modules', 'puppeteer'));

const NAME = 'Ido Green';
const TITLE = 'Co-founder &amp; CTO at Espresso Labs';
const BLURB = 'Building the future with tech &amp; AI';
const FOOTER = 'Netflix &middot; Meta &middot; JFrog &middot; Google &middot; Yahoo! Pipes';

const OUT = path.join(__dirname, '..', 'www', 'img', 'og-card.jpg');

const html = `<!doctype html>
<html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500&family=Outfit:wght@600;800&display=swap">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1200px; height: 630px; display: flex; align-items: center;
    font-family: 'Inter', system-ui, sans-serif;
    background: radial-gradient(circle at 25% 15%, oklch(20% 0.04 250), oklch(12% 0.02 240));
    color: oklch(95% 0.01 240); overflow: hidden; position: relative;
  }
  /* Accent glow, echoing the site's card treatment. */
  body::after {
    content: ''; position: absolute; right: -160px; top: -160px;
    width: 620px; height: 620px; border-radius: 50%;
    background: radial-gradient(circle, oklch(72% 0.18 200 / 0.22) 0%, transparent 70%);
  }
  .inner { padding: 0 88px; position: relative; z-index: 1; }
  .eyebrow {
    font-family: 'Outfit', sans-serif; font-weight: 600; font-size: 26px;
    letter-spacing: 0.16em; text-transform: uppercase;
    color: oklch(72% 0.18 200); margin-bottom: 26px;
  }
  h1 {
    font-family: 'Outfit', sans-serif; font-weight: 800; font-size: 104px;
    line-height: 1.02; letter-spacing: -0.035em; margin-bottom: 12px;
  }
  h1 span {
    background: linear-gradient(120deg, oklch(72% 0.18 200), oklch(68% 0.20 270));
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  }
  .title { font-size: 34px; font-weight: 500; color: oklch(88% 0.01 240); margin-bottom: 14px; }
  .blurb { font-size: 27px; color: oklch(75% 0.02 240); }
  .rule {
    width: 132px; height: 7px; border-radius: 4px; margin: 40px 0 30px;
    background: linear-gradient(90deg, oklch(72% 0.18 200), oklch(68% 0.20 270));
  }
  .footer { font-size: 22px; color: oklch(66% 0.02 240); letter-spacing: 0.01em; }
</style></head>
<body><div class="inner">
  <div class="eyebrow">ido-green.appspot.com</div>
  <h1>${NAME.split(' ')[0]} <span>${NAME.split(' ').slice(1).join(' ')}</span></h1>
  <div class="title">${TITLE}</div>
  <div class="blurb">${BLURB}</div>
  <div class="rule"></div>
  <div class="footer">${FOOTER}</div>
</div></body></html>`;

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: OUT, type: 'jpeg', quality: 92 });
  await browser.close();
  console.log('wrote', OUT);
})();
