import { test, expect } from './fixtures.js';

// ?dev=1 unlocks the dev panel's instant Win/Lose/Fired buttons — the fast, synchronous way to
// reach the end-of-run screens without waiting out a real timer.
const DEV_URL = '/index.html?dev=1';

async function startNormalRun(page) {
  await page.goto(DEV_URL);
  await page.click('#menuPlayBtn');
  await page.click('#modeNextBtn'); // Normal is selected by default
  await page.click('#startBtn'); // veteran ("Been There, Done That") is selected by default
  await expect(page.locator('#hud')).toBeVisible();
}

test('starting a Normal run renders the HUD and the house', async ({ page }) => {
  await startNormalRun(page);
  await expect(page.locator('#timeVal')).toBeVisible();
  await expect(page.locator('#timeLabel')).toHaveText('Mom back in');
  await expect(page.locator('#babyNeeds')).toBeVisible();
  await expect(page.locator('canvas').first()).toBeVisible();
});

test('dev-panel Win reaches the win screen with a run summary', async ({ page }) => {
  await startNormalRun(page);
  await page.click('#devWinBtn');

  await expect(page.locator('#win')).toBeVisible();
  await expect(page.locator('#winTitle')).toHaveText(/Mom's Home/);
  await expect(page.locator('#winStats')).toBeVisible();
  await expect(page.locator('#winXp')).toContainText('XP');
});

test('dev-panel Lose reaches the game-over screen with a run summary', async ({ page }) => {
  await startNormalRun(page);
  await page.click('#devLoseBtn');

  await expect(page.locator('#gameover')).toBeVisible();
  await expect(page.locator('#goTitle')).toHaveText(/Mommy/);
  await expect(page.locator('#goStats')).toBeVisible();
});

test('dev-panel Fired reaches the game-over screen', async ({ page }) => {
  await startNormalRun(page);
  await page.click('#devFiredBtn');

  await expect(page.locator('#gameover')).toBeVisible();
  await expect(page.locator('#goTitle')).toHaveText(/Fired/);
});

test('the upgrade shop opens mid-run and lists upgrade rows', async ({ page }) => {
  await startNormalRun(page);
  await page.click('#shopBtn');
  await expect(page.locator('#shop')).toBeVisible();
  await expect(page.locator('#ups .up').first()).toBeVisible();
  await expect(page.locator('#ups .up')).toHaveCount(7); // one row per UPGRADES entry
  await page.click('#closeShop');
  await expect(page.locator('#shop')).toBeHidden();
});
