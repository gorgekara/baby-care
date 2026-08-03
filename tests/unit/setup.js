// Minimal browser-global shims so the game's ES modules can be imported in plain Node.
// Import this FIRST (before importing anything under js/) in any unit test file that needs it —
// ESM import order guarantees these globals exist before the module-under-test's own top-level
// code runs. Only covers what's actually touched at module-evaluation time, not full DOM/THREE.

if (typeof globalThis.window === 'undefined') {
  globalThis.window = globalThis;
}

if (typeof globalThis.location === 'undefined') {
  globalThis.location = { search: '' };
}

// Just enough of THREE.Vector3 for state.js's top-level `new THREE.Vector3(...)` calls
// (ovenPos, packageSpot, spawnDad, spawnBaby) — nothing else touches THREE at import time.
class FakeVector3 {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
}

if (typeof globalThis.THREE === 'undefined') {
  globalThis.THREE = { Vector3: FakeVector3 };
}

// Tiny in-memory localStorage so persistence.js's save/get round-trips are actually testable,
// instead of every call silently hitting the try/catch fallback.
export function installFakeLocalStorage() {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); },
    clear: () => { store.clear(); },
  };
  return globalThis.localStorage;
}
