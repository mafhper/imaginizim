import { test } from '@playwright/test';

const BREAKPOINTS = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'laptop', width: 1024, height: 768 },
  { name: 'desktop', width: 1440, height: 900 }
];

const PAGES = [
  { name: 'home', url: 'http://127.0.0.1:4321/imaginizim/' },
  { name: 'about', url: 'http://127.0.0.1:4321/imaginizim/sobre' }
];

test.describe('Header Responsiveness', () => {
  for (const pageInfo of PAGES) {
    for (const breakpoint of BREAKPOINTS) {
      test(`Screenshot ${pageInfo.name} - ${breakpoint.name}`, async ({ page }) => {
        await page.setViewportSize({ width: breakpoint.width, height: breakpoint.height });
        await page.goto(pageInfo.url);
        // Wait for potential animations
        await page.waitForTimeout(1000);

        await page.screenshot({
          path: `./artifacts/header_${pageInfo.name}_${breakpoint.name}.png`,
          fullPage: false,
          clip: { x: 0, y: 0, width: breakpoint.width, height: 200 }
        });
      });
    }
  }
});
