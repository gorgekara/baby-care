import { test, expect } from './fixtures.js';

// Direct regression coverage for a real bug found during the modularization refactor: the mode
// picker's click handler used to raw-assign the imported `endlessMode`/`tasksMode` state bindings
// instead of calling their setters, which threw at runtime the moment either tile was clicked.

test('selecting Endless Mode actually switches the HUD to endless framing', async ({ page }) => {
  await page.goto('/index.html');
  await page.click('#menuPlayBtn');

  const endlessTile = page.locator('#modePicker .diffOpt[data-mode="endless"]');
  await endlessTile.click();
  await expect(endlessTile).toHaveClass(/selected/);

  await page.click('#modeNextBtn');
  await page.click('#startBtn');

  await expect(page.locator('#hud')).toBeVisible();
  await expect(page.locator('#timeLabel')).toHaveText('Survived');
});

test('selecting Chores Mode actually switches to a checklist run', async ({ page }) => {
  await page.goto('/index.html');
  await page.click('#menuPlayBtn');

  const choresTile = page.locator('#modePicker .diffOpt[data-mode="chores"]');
  await choresTile.click();
  await expect(choresTile).toHaveClass(/selected/);

  await page.click('#modeNextBtn');
  await page.click('#startBtn');

  await expect(page.locator('#hud')).toBeVisible();
  await expect(page.locator('#tasksHud')).toBeVisible();
});

test('Normal mode is the default and needs no tile click', async ({ page }) => {
  await page.goto('/index.html');
  await page.click('#menuPlayBtn');
  await expect(page.locator('#modePicker .diffOpt[data-mode="normal"]')).toHaveClass(/selected/);
});
