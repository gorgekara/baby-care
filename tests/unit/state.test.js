import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import './setup.js';
import {
  difficulty, setDifficulty,
  endlessMode, setEndlessMode,
  tasksMode, setTasksMode,
  isHost, setIsHost,
  roomCode, setRoomCode,
  myName, setMyName,
  actingPlayerId, setActingPlayerId,
  players, setPlayers,
  babies, setBabies,
  S, setS,
  lastLayout, setLastLayout,
  houseGroup, setHouseGroup,
  tvScreen, setTvScreen,
  computerScreen, setComputerScreen,
  devTimeScale, setDevTimeScale,
  devSeedOverride, setDevSeedOverride,
  preTutorialDifficulty, setPreTutorialDifficulty,
  myId,
  blockAABBs, wallMeshes, toys, solids, stations,
  houseBounds, spawnDad, spawnBaby,
} from '../../js/state.js';
import * as state from '../../js/state.js';

// Each setter reassigns a module-level `let` — the only way another module can ever change it,
// since ES module imports are read-only bindings. Regression coverage for exactly the class of bug
// hit during the refactor (a direct `x = value` on an imported binding throws at runtime).
describe('setters actually update their exported binding', () => {
  test('setDifficulty', () => {
    setDifficulty('king');
    assert.equal(state.difficulty, 'king');
    setDifficulty('veteran');
    assert.equal(state.difficulty, 'veteran');
  });

  test('setEndlessMode / setTasksMode', () => {
    setEndlessMode(true);
    assert.equal(state.endlessMode, true);
    setTasksMode(true);
    assert.equal(state.tasksMode, true);
    setEndlessMode(false);
    setTasksMode(false);
    assert.equal(state.endlessMode, false);
    assert.equal(state.tasksMode, false);
  });

  test('setIsHost / setRoomCode', () => {
    setIsHost(false);
    setRoomCode('ABCDE');
    assert.equal(state.isHost, false);
    assert.equal(state.roomCode, 'ABCDE');
    setIsHost(true);
    setRoomCode(null);
  });

  test('setMyName', () => {
    setMyName('Remy');
    assert.equal(state.myName, 'Remy');
  });

  test('setActingPlayerId defaults to myId and can be reassigned', () => {
    assert.equal(actingPlayerId, myId, 'initial acting player is always yourself');
    setActingPlayerId('other-player');
    assert.equal(state.actingPlayerId, 'other-player');
    setActingPlayerId(myId);
  });

  test('setPlayers / setBabies replace the whole collection', () => {
    setPlayers({ [myId]: { name: 'Dad' } });
    assert.deepEqual(state.players, { [myId]: { name: 'Dad' } });
    setBabies([{ name: 'Nora' }]);
    assert.deepEqual(state.babies, [{ name: 'Nora' }]);
  });

  test('setS replaces the run-state object wholesale', () => {
    assert.equal(S, undefined, 'S starts undefined until resetState() runs');
    const fakeRun = { mode: 'play', score: 0 };
    setS(fakeRun);
    assert.equal(state.S, fakeRun);
  });

  test('setLastLayout / setHouseGroup / setTvScreen / setComputerScreen', () => {
    const layout = { bounds: {}, rooms: [], halls: [] };
    setLastLayout(layout);
    assert.equal(state.lastLayout, layout);

    const group = { fake: 'THREE.Group' };
    setHouseGroup(group);
    assert.equal(state.houseGroup, group);

    setTvScreen('tv-mesh');
    setComputerScreen('computer-mesh');
    assert.equal(state.tvScreen, 'tv-mesh');
    assert.equal(state.computerScreen, 'computer-mesh');
  });

  test('setDevTimeScale / setDevSeedOverride', () => {
    setDevTimeScale(4);
    setDevSeedOverride(12345);
    assert.equal(state.devTimeScale, 4);
    assert.equal(state.devSeedOverride, 12345);
  });

  test('setPreTutorialDifficulty', () => {
    setPreTutorialDifficulty('king');
    assert.equal(state.preTutorialDifficulty, 'king');
    setPreTutorialDifficulty(null);
    assert.equal(state.preTutorialDifficulty, null);
  });
});

describe('initial values', () => {
  test('myId is a non-empty, stable string generated once at import time', () => {
    assert.equal(typeof myId, 'string');
    assert.ok(myId.startsWith('p_'));
    assert.equal(myId, state.myId, 'importing twice does not regenerate it');
  });

  test('mutate-in-place collections start empty', () => {
    assert.deepEqual(blockAABBs, []);
    assert.deepEqual(wallMeshes, []);
    assert.deepEqual(toys, []);
    assert.deepEqual(solids, []);
    assert.deepEqual(stations, {});
  });

  test('houseBounds has the expected shape', () => {
    assert.deepEqual(Object.keys(houseBounds).sort(), ['X0', 'X1', 'Z0', 'Z1']);
  });

  test('spawnDad / spawnBaby are distinct positions', () => {
    assert.notDeepEqual({ x: spawnDad.x, z: spawnDad.z }, { x: spawnBaby.x, z: spawnBaby.z });
  });
});

describe('const collections are mutated in place, not reassigned', () => {
  test('pushing onto blockAABBs is visible via the same import elsewhere', () => {
    const before = blockAABBs.length;
    blockAABBs.push({ minX: 0, maxX: 1, minZ: 0, maxZ: 1 });
    assert.equal(state.blockAABBs.length, before + 1);
    blockAABBs.length = before; // clean up for other tests in this process
  });
});
