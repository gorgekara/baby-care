/* Shared mutable game/session state, imported and mutated across every other module.
   Bindings that are only ever mutated in place (push, property set, .set()/.copy()) are exported
   directly as `const`. Bindings that get wholesale-reassigned somewhere in the codebase are `let`
   plus a setter function, since an ES module can only write its own bindings — every other module
   calls the setter instead of assigning the imported name directly. */

// ---- house-build state (written by house/build.js, read by entities/gameplay/ui) ----
export const WALL_H = 3.35, WT = 0.4, WALL_COLOR = '#efe4d2';
export const devMode = new URLSearchParams(location.search).get('dev')==='1';
export let devTimeScale = 1, devSeedOverride = null;
export function setDevTimeScale(v){ devTimeScale = v; }
export function setDevSeedOverride(v){ devSeedOverride = v; }

// build state — rebuilt fresh each run by buildHouse()
export const blockAABBs = [];     // everything that stops movement (walls + furniture)
export const wallMeshes = [];     // walls that fade when they'd hide the dad/baby
export const toys = [];
export const solids = [];         // furniture/station collision circles
export const stations = {};
export let tvScreen = null, computerScreen = null, houseGroup = null;
export function setTvScreen(v){ tvScreen = v; }
export function setComputerScreen(v){ computerScreen = v; }
export function setHouseGroup(v){ houseGroup = v; }
export const ovenPos = new THREE.Vector3();  // set by buildKitchen; used by the baby AI's oven hazard
export const packageSpot = new THREE.Vector3();  // set by furnishFrontDoor; where a delivered package waits on the doormat
export let lastLayout = null;              // simplified room rects set by buildHouse(); used by the pause-menu minimap
export function setLastLayout(v){ lastLayout = v; }
export const houseBounds = { X0:-23, X1:23, Z0:-8, Z1:22 };
export const spawnDad = new THREE.Vector3(0,0,3), spawnBaby = new THREE.Vector3(-13,0,1);

// ---- run/session state ----
export let S;                     // must exist (even if undefined) before buildHouse()'s very first
export function setS(v){ S = v; } // bootstrap call — see the `if(S)` guard around its Chores Mode line
export let difficulty = 'veteran';
export function setDifficulty(v){ difficulty = v; }
export let endlessMode = false;
export function setEndlessMode(v){ endlessMode = v; }
export let tasksMode = false;                                  // "Chores Mode" — a random checklist for the run
export function setTasksMode(v){ tasksMode = v; }

/* ---------- Multiplayer core: players (per-player poo/upgrades/carry state) & babies (shared) ----------
   Solo play is just the degenerate case of this model: one entry in `players` (me), `isHost` always
   true, one baby in `babies`, and no Firebase traffic — so nothing about single-player behavior changes. */
export const myId = 'p_' + Math.random().toString(36).slice(2, 10);
export let myName = 'Dad';
export function setMyName(v){ myName = v; }
export let roomCode = null;              // null = solo/local play, no networking
export function setRoomCode(v){ roomCode = v; }
export let isHost = true;                // true solo and while hosting; false for a joined non-host client
export function setIsHost(v){ isHost = v; }
export let players = {};                 // playerId -> {name,colorIdx,poo,lvl,carrying,holdingBaby,...}
export function setPlayers(v){ players = v; }
export let babies = [];                  // array of baby records (mesh + need + AI state)
export function setBabies(v){ babies = v; }
export let actingPlayerId = myId;        // whose perspective the core interaction functions run as right now
export function setActingPlayerId(v){ actingPlayerId = v; }

export let preTutorialDifficulty = null;
export function setPreTutorialDifficulty(v){ preTutorialDifficulty = v; }
