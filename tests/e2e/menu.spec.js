import { test, expect } from './fixtures.js';

test('main menu loads with no console errors and shows the leaderboard preview', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e));
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });

  await page.goto('/index.html');

  await expect(page.locator('#mainMenu')).toBeVisible();
  await expect(page.locator('#menuPlayBtn')).toBeVisible();
  // the endless-leaderboard preview always renders something — either real rows or the
  // "unavailable" fallback — never stays stuck on the initial "Loading…" placeholder
  await expect(page.locator('#menuLbList')).not.toHaveText(/Loading…/, { timeout: 10_000 });

  expect(errors, `console errors on load: ${errors.join('\n')}`).toEqual([]);
});

test('Settings screen renders the keybind grid and volume sliders', async ({ page }) => {
  await page.goto('/index.html');
  await page.click('#menuSettingsBtn');

  await expect(page.locator('#settingsScreen')).toBeVisible();
  await expect(page.locator('#keybindGrid button').first()).toBeVisible();
  await expect(page.locator('#sfxVolSlider')).toBeVisible();
  await expect(page.locator('#hudScaleSlider')).toBeVisible();

  await page.click('#settingsBackBtn');
  await expect(page.locator('#mainMenu')).toBeVisible();
});

test('Profile screen renders the Dad Level badge', async ({ page }) => {
  await page.goto('/index.html');
  await page.click('#menuLevelBar');
  await expect(page.locator('#profileScreen')).toBeVisible();
  await expect(page.locator('#profileLevelBadge')).toBeVisible();
  await page.click('#profileBackBtn');
  await expect(page.locator('#mainMenu')).toBeVisible();
});
