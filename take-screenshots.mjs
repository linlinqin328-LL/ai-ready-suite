import { chromium } from "playwright";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const marketDir = path.resolve(__dirname, ".market-assets");

const pages = [
  { name: "screenshot-assessment", label: "评估报告" },
  { name: "screenshot-audit", label: "审计报告" },
  { name: "screenshot-scout", label: "侦察报告" },
];

const outputDir = "/Users/huolongguo/.codex/visualizations/2026/07/19/019f7c48-b399-7a81-8852-4e43c3070a54";

const browser = await chromium.launch({ headless: true });
console.log("Browser launched");

for (const p of pages) {
  const filePath = path.resolve(marketDir, `${p.name}.html`);
  const url = `file://${filePath}`;
  console.log(`Navigating to: ${url}`);
  const context = await browser.newContext({
    viewport: { width: 800, height: 600 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "load", timeout: 15000 });
  await page.waitForTimeout(500);
  const pageHeight = await page.evaluate(() => document.body.scrollHeight);
  await page.setViewportSize({ width: 800, height: Math.min(pageHeight, 800) });
  await page.waitForTimeout(300);
  const outputPath = `${outputDir}/${p.name}.png`;
  await page.screenshot({ path: outputPath, fullPage: false });
  await context.close();
  console.log(`${p.label} → ${outputPath}`);
}

await browser.close();
console.log("All screenshots done!");
