import { test, expect } from './fixtures.js';

test('tutorial starts, advances, and can be exited back to the menu', async ({ page }) => {
  await page.goto('/index.html');
  await page.click('#menuTutorialBtn');

  await expect(page.locator('#tutorialPanel')).toBeVisible();
  await expect(page.locator('#tutorialStepNum')).toHaveText('Step 1 of 16');
  await expect(page.locator('#hud')).toBeVisible();

  await page.click('#tutorialNextBtn');
  await expect(page.locator('#tutorialStepNum')).toHaveText('Step 2 of 16');

  await page.click('#tutorialExitBtn');
  await expect(page.locator('#tutorialPanel')).toBeHidden();
  await expect(page.locator('#mainMenu')).toBeVisible();
});

test('reaching the last tutorial step offers to start a real run', async ({ page }) => {
  await page.goto('/index.html');
  await page.click('#menuTutorialBtn');

  for (let i = 0; i < 15; i++) await page.click('#tutorialNextBtn');

  await expect(page.locator('#tutorialStepNum')).toHaveText('Step 16 of 16');
  await expect(page.locator('#tutorialNextBtn')).toHaveText('Start Playing ▶');
});
