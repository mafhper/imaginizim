import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility - Color Contrast', () => {
  test('Home Page (Light Mode)', async ({ page }) => {
    await page.goto('http://127.0.0.1:5190/imaginizim/');
    // Force Light Mode
    await page.evaluate(() => {
      document.documentElement.dataset.theme = 'light';
      document.documentElement.style.colorScheme = 'light';
      if (document.body) document.body.dataset.theme = 'light';
    });
    // Wait for repaint
    await page.waitForTimeout(500);

    const accessibilityScanResults = await new AxeBuilder({ page: page as any })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    // Check for contrast violations specifically
    const contrastViolations = accessibilityScanResults.violations.filter(
      (v) => v.id === 'color-contrast'
    );
    expect(contrastViolations).toEqual([]);
  });

  test('Home Page (Dark Mode)', async ({ page }) => {
    await page.goto('http://127.0.0.1:5190/imaginizim/');
    // Force Dark Mode
    await page.evaluate(() => {
      document.documentElement.dataset.theme = 'dark';
      document.documentElement.style.colorScheme = 'dark';
      if (document.body) document.body.dataset.theme = 'dark';
    });
    await page.waitForTimeout(500);

    const accessibilityScanResults = await new AxeBuilder({ page: page as any })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const contrastViolations = accessibilityScanResults.violations.filter(
      (v) => v.id === 'color-contrast'
    );
    expect(contrastViolations).toEqual([]);
  });

  test('Compressor Workspace with Files (Dark Mode)', async ({ page }) => {
    await page.goto('http://127.0.0.1:5190/imaginizim/');

    // The workbench only exists with a file in the queue: load one and process
    // it, so the scan covers the studio, the queue tiles and the composer.
    await page.evaluate(() => {
      document.documentElement.dataset.theme = 'dark';
    });
    await page.locator('input[type=file]').first().setInputFiles('public/pwa-192x192.png');
    await page.waitForSelector('#optimizeQueueBtn', { timeout: 20_000 });
    await page.locator('#optimizeQueueBtn').click();
    await page.waitForTimeout(2500);

    const accessibilityScanResults = await new AxeBuilder({ page: page as any })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const contrastViolations = accessibilityScanResults.violations.filter(
      (v) => v.id === 'color-contrast'
    );
    expect(contrastViolations).toEqual([]);
  });

  test('About Page (Light Mode)', async ({ page }) => {
    await page.goto('http://127.0.0.1:5190/imaginizim/#/sobre');
    await page.evaluate(() => {
      document.documentElement.dataset.theme = 'light';
      document.documentElement.style.colorScheme = 'light';
      if (document.body) document.body.dataset.theme = 'light';
    });
    await page.waitForTimeout(500);

    const accessibilityScanResults = await new AxeBuilder({ page: page as any })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const contrastViolations = accessibilityScanResults.violations.filter(
      (v) => v.id === 'color-contrast'
    );
    expect(contrastViolations).toEqual([]);
  });

  test('About Page (Dark Mode)', async ({ page }) => {
    await page.goto('http://127.0.0.1:5190/imaginizim/#/sobre');
    await page.evaluate(() => {
      document.documentElement.dataset.theme = 'dark';
      document.documentElement.style.colorScheme = 'dark';
      if (document.body) document.body.dataset.theme = 'dark';
    });
    await page.waitForTimeout(500);

    const accessibilityScanResults = await new AxeBuilder({ page: page as any })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const contrastViolations = accessibilityScanResults.violations.filter(
      (v) => v.id === 'color-contrast'
    );
    expect(contrastViolations).toEqual([]);
  });
});
