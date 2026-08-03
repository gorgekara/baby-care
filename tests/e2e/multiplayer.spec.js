import { test, expect } from './fixtures.js';

// Hits the project's real Firebase Realtime Database (no emulator/test config wired up) — creates
// a small, harmless, throwaway room. This is the same tradeoff accepted when this flow was
// verified manually during the modularization refactor, and it's exactly where real wiring bugs
// (missing exports, module-load-order crashes) were actually found, so it's worth keeping.

test('hosting a lobby renders a room code and player list, then starts and quits a round', async ({ page }) => {
  await page.goto('/index.html');
  await page.click('#menuMultiplayerBtn');
  await expect(page.locator('#mpChoiceScreen')).toBeVisible();

  await page.click('#mpHostBtn');
  await expect(page.locator('#mpLobbyScreen')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('#mpRoomCodeLabel')).toHaveText(/^[A-Z0-9]{5}$/);
  await expect(page.locator('#mpPlayerList')).toContainText('(you)');

  await page.click('#mpStartBtn');
  await expect(page.locator('#hud')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('#mpPlayerHud')).toBeVisible();

  await page.keyboard.press('Escape');
  await page.click('#pauseQuitBtn');
  await expect(page.locator('#mainMenu')).toBeVisible();
});
