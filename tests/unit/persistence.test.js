import { test, describe, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeLocalStorage } from './setup.js';
import {
  xpThreshold,
  dadLevelForXp,
  dadLevelProgress,
  DAD_MAX_LEVEL,
  defaultGameSettings,
  getGameSettings,
  saveGameSettings,
  getHighScore,
  setHighScore,
  defaultProfile,
  getProfile,
  saveProfile,
  dailyDateKey,
  dailyDayIndex,
  dailyDifficulty,
  DAILY_DIFFICULTY_ROTATION,
  dailySeed,
  msUntilNextUtcMidnight,
  dailyStorageKey,
  getDailyResult,
  setDailyResult,
} from '../../js/persistence.js';

before(() => installFakeLocalStorage());
beforeEach(() => installFakeLocalStorage()); // fresh store per test — no cross-test bleed

describe('dad level math', () => {
  test('xpThreshold grows monotonically with level', () => {
    let prev = -1;
    for (let lvl = 1; lvl <= DAD_MAX_LEVEL; lvl++) {
      const t = xpThreshold(lvl);
      assert.ok(t > prev, `xpThreshold(${lvl})=${t} did not increase from ${prev}`);
      prev = t;
    }
  });

  test('dadLevelForXp(0) is level 1', () => {
    assert.equal(dadLevelForXp(0), 1);
  });

  test('dadLevelForXp advances exactly at each threshold', () => {
    const t2 = xpThreshold(2);
    assert.equal(dadLevelForXp(t2 - 1), 1);
    assert.equal(dadLevelForXp(t2), 2);
  });

  test('dadLevelForXp never exceeds DAD_MAX_LEVEL', () => {
    assert.equal(dadLevelForXp(Number.MAX_SAFE_INTEGER), DAD_MAX_LEVEL);
  });

  test('dadLevelProgress reports a completed fraction within [0,1]', () => {
    const p = dadLevelProgress(xpThreshold(3) + 5);
    assert.ok(p.frac >= 0 && p.frac <= 1);
    assert.equal(p.maxed, false);
  });

  test('dadLevelProgress reports maxed at the level cap', () => {
    const p = dadLevelProgress(Number.MAX_SAFE_INTEGER);
    assert.equal(p.lvl, DAD_MAX_LEVEL);
    assert.equal(p.maxed, true);
    assert.equal(p.frac, 1);
  });
});

describe('game settings persistence', () => {
  test('getGameSettings returns defaults when nothing is stored', () => {
    assert.deepEqual(getGameSettings(), defaultGameSettings());
  });

  test('saveGameSettings + getGameSettings round-trips', () => {
    const s = defaultGameSettings();
    s.musicVol = 0.5;
    s.keybinds.interact = 'f';
    saveGameSettings(s);
    const loaded = getGameSettings();
    assert.equal(loaded.musicVol, 0.5);
    assert.equal(loaded.keybinds.interact, 'f');
  });

  test('getGameSettings backfills missing keybinds from defaults (old save shape)', () => {
    localStorage.setItem('babycare_settings_v1', JSON.stringify({ musicVol: 0.2, keybinds: { interact: 'f' } }));
    const loaded = getGameSettings();
    assert.equal(loaded.keybinds.interact, 'f', 'explicit override kept');
    assert.equal(loaded.keybinds.hold, defaultGameSettings().keybinds.hold, 'missing keybind backfilled');
  });

  test('getGameSettings falls back to defaults on corrupt JSON', () => {
    localStorage.setItem('babycare_settings_v1', '{not json');
    assert.deepEqual(getGameSettings(), defaultGameSettings());
  });
});

describe('high score persistence', () => {
  test('getHighScore is 0 when nothing is stored', () => {
    assert.equal(getHighScore('veteran'), 0);
  });

  test('setHighScore + getHighScore round-trips per difficulty', () => {
    setHighScore('veteran', 842);
    setHighScore('king', 199);
    assert.equal(getHighScore('veteran'), 842);
    assert.equal(getHighScore('king'), 199);
    assert.equal(getHighScore('first'), 0, 'difficulties do not bleed into each other');
  });
});

describe('profile persistence', () => {
  test('getProfile returns defaults when nothing is stored', () => {
    assert.deepEqual(getProfile(), defaultProfile());
  });

  test('saveProfile + getProfile round-trips', () => {
    const p = defaultProfile();
    p.xp = 500;
    p.runsPlayed = 3;
    saveProfile(p);
    const loaded = getProfile();
    assert.equal(loaded.xp, 500);
    assert.equal(loaded.runsPlayed, 3);
  });
});

describe('daily challenge date/seed math', () => {
  test('dailyDateKey formats a known UTC date as YYYY-MM-DD', () => {
    const d = new Date(Date.UTC(2026, 7, 3, 23, 59, 59)); // Aug 3 2026, late in the UTC day
    assert.equal(dailyDateKey(d), '2026-08-03');
  });

  test('dailyDateKey pads single-digit month/day', () => {
    const d = new Date(Date.UTC(2026, 0, 5));
    assert.equal(dailyDateKey(d), '2026-01-05');
  });

  test('dailyDayIndex increases by exactly 1 per UTC day', () => {
    const d1 = new Date(Date.UTC(2026, 7, 3));
    const d2 = new Date(Date.UTC(2026, 7, 4));
    assert.equal(dailyDayIndex(d2) - dailyDayIndex(d1), 1);
  });

  test('dailyDifficulty cycles through DAILY_DIFFICULTY_ROTATION in order', () => {
    const base = dailyDayIndex(new Date(Date.UTC(2026, 7, 3)));
    for (let i = 0; i < DAILY_DIFFICULTY_ROTATION.length; i++) {
      const d = new Date(Date.UTC(2026, 7, 3 + i));
      const expected = DAILY_DIFFICULTY_ROTATION[((base + i) % DAILY_DIFFICULTY_ROTATION.length + DAILY_DIFFICULTY_ROTATION.length) % DAILY_DIFFICULTY_ROTATION.length];
      assert.equal(dailyDifficulty(d), expected);
    }
  });

  test('dailyDifficulty is the same for everyone on the same UTC day, regardless of time', () => {
    const morning = new Date(Date.UTC(2026, 7, 3, 1, 0, 0));
    const night = new Date(Date.UTC(2026, 7, 3, 23, 0, 0));
    assert.equal(dailyDifficulty(morning), dailyDifficulty(night));
  });

  test('dailySeed is deterministic for the same date key', () => {
    assert.equal(dailySeed('2026-08-03'), dailySeed('2026-08-03'));
    assert.notEqual(dailySeed('2026-08-03'), dailySeed('2026-08-04'));
  });

  test('msUntilNextUtcMidnight is always within one day', () => {
    const ms = msUntilNextUtcMidnight();
    assert.ok(ms > 0 && ms <= 86400000);
  });

  test('daily result save/get round-trips per date, keyed independently', () => {
    const result = { score: 123, elapsed: 200, poo: 5, reason: 'win', ts: Date.now() };
    setDailyResult('2026-08-03', result);
    assert.deepEqual(getDailyResult('2026-08-03'), result);
    assert.equal(getDailyResult('2026-08-04'), null, 'a different day has no result yet');
  });

  test('dailyStorageKey is stable for a given date key', () => {
    assert.equal(dailyStorageKey('2026-08-03'), dailyStorageKey('2026-08-03'));
    assert.notEqual(dailyStorageKey('2026-08-03'), dailyStorageKey('2026-08-04'));
  });
});
