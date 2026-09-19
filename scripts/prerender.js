// Post-build step: renders the built SPA in a headless browser and bakes the
// fully-rendered #root markup back into dist/index.html.
//
// Why: this is a client-only React app (no SSR). Search engines that execute
// JS are fine, but many AI agents / crawlers (and simple `curl`-style fetches)
// only read the raw HTML response and never run the bundle, so they'd only
// ever see the empty <div id="root"></div> plus the small hidden fallback
// blurb. Baking the real rendered content in means those consumers get the
// actual page, while real browsers still hydrate and get the interactive app.
import { readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import handler from 'serve-handler';
import puppeteer from 'puppeteer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '..', 'dist');
const PORT = 4173;

async function main() {
  const server = createServer((req, res) => handler(req, res, { public: distDir }));
  await new Promise((resolve) => server.listen(PORT, resolve));

  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    const page = await browser.newPage();
    page.on('pageerror', (err) => console.error('[prerender] page error:', err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') console.error('[prerender] console error:', msg.text());
    });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0', timeout: 60000 });
    // Give React a moment to finish its initial render pass. We deliberately
    // don't scroll to trigger framer-motion's viewport reveal animations —
    // the goal here is raw text availability for crawlers, not pixel-perfect
    // visuals, and the underlying text nodes are present either way (only
    // their opacity/transform styling differs).
    await new Promise((r) => setTimeout(r, 800));

    const rootHtml = await page.evaluate(() => document.getElementById('root')?.outerHTML ?? null);
    if (!rootHtml) {
      throw new Error('#root element was not found in the rendered page.');
    }

    const indexPath = path.join(distDir, 'index.html');
    const html = readFileSync(indexPath, 'utf-8');
    const prerendered = html.replace(
      /<div id="root"><\/div>/,
      rootHtml
    );

    if (prerendered === html) {
      throw new Error('Could not find <div id="root"></div> placeholder in dist/index.html to replace.');
    }

    writeFileSync(indexPath, prerendered);
    console.log('Prerendered content baked into dist/index.html');
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((err) => {
  console.error('Prerender failed:', err);
  process.exit(1);
});
