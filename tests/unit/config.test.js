import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import './setup.js';
import {
  DIFFICULTIES,
  BABY_TRAITS,
  TRAIT_KEYS,
  TRAIT_COMBOS,
  rollBabyTraitSets,
  traitIconsHtml,
  traitBadgesHtml,
  PHASES,
  PHASE_DEFAULTS,
  phaseBoundaries,
  phaseIndexAt,
  NEEDS,
  BASE_DECAY,
  UPGRADES,
  TASK_POOL,
  TASK_PHASE_AFFINITY,
} from '../../js/config.js';

describe('DIFFICULTIES', () => {
  test('every difficulty exposes the same knob set as veteran', () => {
    const expectedKeys = Object.keys(DIFFICULTIES.veteran).sort();
    for (const [name, d] of Object.entries(DIFFICULTIES)) {
      assert.deepEqual(Object.keys(d).sort(), expectedKeys, `${name} is missing/adds knobs vs veteran`);
    }
  });

  test('key field matches its own map key', () => {
    for (const [name, d] of Object.entries(DIFFICULTIES)) {
      assert.equal(d.key, name);
    }
  });

  test('min/max ranges are never inverted', () => {
    for (const [name, d] of Object.entries(DIFFICULTIES)) {
      assert.ok(d.vomitMin <= d.vomitMax, `${name} vomitMin > vomitMax`);
      assert.ok(d.fallMin <= d.fallMax, `${name} fallMin > fallMax`);
      assert.ok(d.chokeMin <= d.chokeMax, `${name} chokeMin > chokeMax`);
      assert.ok(d.bathroomMin <= d.bathroomMax, `${name} bathroomMin > bathroomMax`);
      assert.ok(d.packageMin <= d.packageMax, `${name} packageMin > packageMax`);
      assert.ok(d.backPainMin <= d.backPainMax, `${name} backPainMin > backPainMax`);
    }
  });
});

describe('BABY_TRAITS / trait combos', () => {
  test('TRAIT_KEYS matches BABY_TRAITS keys', () => {
    assert.deepEqual(TRAIT_KEYS.sort(), Object.keys(BABY_TRAITS).sort());
  });

  test('every trait has an icon, label, and desc', () => {
    for (const [key, t] of Object.entries(BABY_TRAITS)) {
      assert.ok(t.icon, `${key} missing icon`);
      assert.ok(t.label, `${key} missing label`);
      assert.ok(t.desc, `${key} missing desc`);
    }
  });

  test('TRAIT_COMBOS has every single trait plus every unique pair, no duplicates', () => {
    const n = TRAIT_KEYS.length;
    assert.equal(TRAIT_COMBOS.length, n + (n * (n - 1)) / 2);
    const seen = new Set();
    for (const combo of TRAIT_COMBOS) {
      const key = [...combo].sort().join(',');
      assert.ok(!seen.has(key), `duplicate combo: ${key}`);
      seen.add(key);
      for (const trait of combo) assert.ok(TRAIT_KEYS.includes(trait));
    }
  });

  test('rollBabyTraitSets returns one combo per baby, all valid', () => {
    const sets = rollBabyTraitSets(4);
    assert.equal(sets.length, 4);
    for (const combo of sets) {
      assert.ok(TRAIT_COMBOS.some(c => c.length === combo.length && c.every(t => combo.includes(t))));
    }
  });

  test('rollBabyTraitSets never repeats a combo when count <= TRAIT_COMBOS.length', () => {
    const sets = rollBabyTraitSets(8); // multiplayer cap; well under TRAIT_COMBOS.length
    const keys = sets.map(c => [...c].sort().join(','));
    assert.equal(new Set(keys).size, keys.length, 'a personality combo repeated within one roll');
  });

  test('traitIconsHtml concatenates each trait icon', () => {
    const html = traitIconsHtml(['clingy', 'cuddleBug']);
    assert.equal(html, BABY_TRAITS.clingy.icon + BABY_TRAITS.cuddleBug.icon);
  });

  test('traitIconsHtml handles undefined/empty traits', () => {
    assert.equal(traitIconsHtml(undefined), '');
    assert.equal(traitIconsHtml([]), '');
  });

  test('traitBadgesHtml escapes label/desc into the tooltip attribute', () => {
    const html = traitBadgesHtml(['clingy']);
    assert.match(html, /class="traitBadge"/);
    assert.match(html, /data-tt="/);
    assert.match(html, new RegExp(BABY_TRAITS.clingy.icon));
  });
});

describe('day phases', () => {
  test('PHASES entries are fully backfilled with PHASE_DEFAULTS', () => {
    for (const p of PHASES) {
      for (const key of Object.keys(PHASE_DEFAULTS)) {
        assert.ok(key in p, `phase ${p.key} missing default ${key}`);
      }
    }
  });

  test('phaseBoundaries: timed run cycleLen equals gameLen', () => {
    const b = phaseBoundaries(285);
    assert.equal(b.cycleLen, 285);
    assert.ok(b.morningEnd < b.lunchEnd);
    assert.ok(b.lunchEnd <= b.eveningStart);
    assert.ok(b.eveningStart <= b.cycleLen);
  });

  test('phaseBoundaries: endless (Infinity) produces a finite repeating cycle', () => {
    const b = phaseBoundaries(Infinity);
    assert.ok(Number.isFinite(b.cycleLen));
    assert.ok(b.eveningStart < b.cycleLen);
  });

  test('phaseIndexAt buckets elapsed time into the right phase across a timed run', () => {
    const b = phaseBoundaries(285);
    assert.equal(phaseIndexAt(0, b), 0, 'start of run should be morning');
    assert.equal(phaseIndexAt(b.morningEnd - 1, b), 0);
    assert.equal(phaseIndexAt(b.morningEnd, b), 1, 'morningEnd boundary should tip into lunch');
    assert.equal(phaseIndexAt(b.lunchEnd, b), 2);
    assert.equal(phaseIndexAt(b.eveningStart, b), 3);
    assert.equal(phaseIndexAt(b.cycleLen - 1, b), 3, 'last second of the run should be evening');
  });

  test('phaseIndexAt wraps forever for endless mode', () => {
    const b = phaseBoundaries(Infinity);
    const first = phaseIndexAt(5, b);
    const wrapped = phaseIndexAt(5 + b.cycleLen * 3, b);
    assert.equal(first, wrapped);
  });
});

describe('needs / upgrades / tasks cross-references', () => {
  test('every NEED has a BASE_DECAY entry', () => {
    for (const need of NEEDS) assert.ok(need in BASE_DECAY, `${need} missing from BASE_DECAY`);
  });

  test('every NEED has a matching upgrade', () => {
    for (const need of NEEDS) assert.ok(need in UPGRADES, `${need} missing from UPGRADES`);
  });

  test('every task in TASK_POOL has a phase affinity pointing at a real phase', () => {
    const validPhases = new Set(PHASES.map(p => p.key));
    for (const task of TASK_POOL) {
      assert.ok(task.key in TASK_PHASE_AFFINITY, `${task.key} missing from TASK_PHASE_AFFINITY`);
      assert.ok(validPhases.has(TASK_PHASE_AFFINITY[task.key]), `${task.key} points at an unknown phase`);
    }
  });
});
