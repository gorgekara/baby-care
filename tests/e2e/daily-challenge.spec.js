import { test, expect } from './fixtures.js';

test('Daily Challenge screen renders today’s date and difficulty, then starts a run', async ({ page }) => {
  await page.goto('/index.html');
  await page.click('#menuPlayBtn');
  await page.click('#dailyModeOption');

  await expect(page.locator('#dailyScreen')).toBeVisible();
  await expect(page.locator('#dailyDateLabel')).not.toBeEmpty();
  await expect(page.locator('#dailyDiffLabel')).not.toBeEmpty();
  await expect(page.locator('#dailyCountdown')).toContainText('Resets in');

  await page.click('#dailyStartBtn');
  await expect(page.locator('#hud')).toBeVisible();
});

test('Daily Challenge can only be played once per day (result box appears on return)', async ({ page }) => {
  await page.goto('/index.html?dev=1');
  await page.click('#menuPlayBtn');
  await page.click('#dailyModeOption');
  await page.click('#dailyStartBtn');
  await expect(page.locator('#hud')).toBeVisible();

  await page.click('#devWinBtn');
  await expect(page.locator('#win')).toBeVisible();
  await page.click('#winBtn'); // "Play Again" on a daily run leaves to the main menu (retryAction:'menu')
  await expect(page.locator('#mainMenu')).toBeVisible();

  // going back to Daily Challenge should now show today's already-banked result, not the start button
  await page.click('#menuPlayBtn');
  await page.click('#dailyModeOption');
  await expect(page.locator('#dailyResultBox')).toBeVisible();
});
