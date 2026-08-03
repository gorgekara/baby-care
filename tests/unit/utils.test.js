import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import './setup.js';
import {
  mulberry32,
  random0to1,
  setHouseRng,
  setRunRng,
  rand,
  pick,
  shuffle,
  escapeHtml,
  hashStringToSeed,
} from '../../js/utils.js';

describe('mulberry32', () => {
  test('is deterministic for a given seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = [a(), a(), a()];
    const seqB = [b(), b(), b()];
    assert.deepEqual(seqA, seqB);
  });

  test('different seeds produce different sequences', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    assert.notEqual(a(), b());
  });

  test('produces values in [0, 1)', () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 50; i++) {
      const v = rng();
      assert.ok(v >= 0 && v < 1, `value ${v} out of range`);
    }
  });
});

describe('random0to1 / setHouseRng / setRunRng', () => {
  test('falls back to Math.random when no RNG stream is set', () => {
    setHouseRng(null);
    setRunRng(null);
    const v = random0to1();
    assert.ok(v >= 0 && v < 1);
  });

  test('prefers houseRng over runRng and Math.random', () => {
    setHouseRng(mulberry32(1));
    setRunRng(mulberry32(2));
    const expected = mulberry32(1)();
    const actual = random0to1();
    assert.equal(actual, expected);
    setHouseRng(null);
    setRunRng(null);
  });

  test('falls back to runRng when houseRng is cleared', () => {
    setHouseRng(null);
    setRunRng(mulberry32(99));
    const expected = mulberry32(99)();
    const actual = random0to1();
    assert.equal(actual, expected);
    setRunRng(null);
  });
});

describe('rand / pick', () => {
  test('rand stays within [a, b)', () => {
    setHouseRng(mulberry32(5));
    for (let i = 0; i < 20; i++) {
      const v = rand(10, 20);
      assert.ok(v >= 10 && v < 20, `value ${v} out of range`);
    }
    setHouseRng(null);
  });

  test('pick always returns an element of the array', () => {
    setHouseRng(mulberry32(3));
    const arr = ['a', 'b', 'c', 'd'];
    for (let i = 0; i < 20; i++) {
      assert.ok(arr.includes(pick(arr)));
    }
    setHouseRng(null);
  });
});

describe('shuffle', () => {
  test('preserves every element (same multiset, different or same order)', () => {
    setHouseRng(mulberry32(11));
    const original = [1, 2, 3, 4, 5, 6, 7, 8];
    const shuffled = shuffle(original.slice());
    assert.deepEqual([...shuffled].sort(), original);
    setHouseRng(null);
  });

  test('is deterministic under the same seeded stream', () => {
    setHouseRng(mulberry32(123));
    const a = shuffle([1, 2, 3, 4, 5]);
    setHouseRng(mulberry32(123));
    const b = shuffle([1, 2, 3, 4, 5]);
    assert.deepEqual(a, b);
    setHouseRng(null);
  });
});

describe('escapeHtml', () => {
  test('escapes the five reserved characters', () => {
    assert.equal(escapeHtml(`<script>alert("x") & 'y'</script>`),
      '&lt;script&gt;alert(&quot;x&quot;) &amp; &#39;y&#39;&lt;/script&gt;');
  });

  test('leaves plain text untouched', () => {
    assert.equal(escapeHtml('mrk'), 'mrk');
  });

  test('coerces non-strings', () => {
    assert.equal(escapeHtml(42), '42');
  });
});

describe('hashStringToSeed', () => {
  test('is deterministic for the same input', () => {
    assert.equal(hashStringToSeed('babycare-daily-2026-08-03'), hashStringToSeed('babycare-daily-2026-08-03'));
  });

  test('different inputs (usually) hash differently', () => {
    assert.notEqual(hashStringToSeed('a'), hashStringToSeed('b'));
  });

  test('returns a non-negative 32-bit integer', () => {
    const h = hashStringToSeed('babycare-daily-2026-08-03');
    assert.ok(Number.isInteger(h));
    assert.ok(h >= 0 && h <= 0xFFFFFFFF);
  });
});
