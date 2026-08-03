import {
  applyCameraRotation,
  applyRunToProfile,
  applyScoreSubmitUI,
  clock,
  curDiff,
  holdMaxFor,
  pickBabyTarget,
  scoreSubmitState,
  setRetryAction,
  startGame,
  tick,
  upgradeCapFor,
  upgradeCost
} from './gameplay.js';
import {
  MAIN_SETTINGS_IDS,
  PAUSE_SETTINGS_IDS,
  alignMenuLbPreview,
  applyHudScale,
  applyReducedMotionClass,
  el,
  initSettingsControls,
  renderMenuLevelBadge,
  renderRunSummary,
  updateBestScoreLabel,
  updateLobbyHostInfo,
  upsEl
} from './ui.js';
import {
  TUTORIAL_STEPS,
  endTutorial,
  tutorialAdvance,
  tutorialProgress,
  tutorialStepEnter,
  tutorialStepIdx
} from './tutorial.js';
import {
  containsProfanity,
  renderDailyLeaderboard,
  renderMenuLeaderboardPreview,
  submitDailyScore,
  submitLeaderboardScore
} from './leaderboard.js';
import {
  Net,
  applyRemoteBabies,
  applyRemoteWorld,
  beginMultiplayerRound,
  handleRemoteGameOver,
  updateRemoteAvatars,
  updateRemoteBabies
} from './net.js';
import {
  buildHouse,
  label,
  packageBoxGroup
} from './house/build.js';
import {
  PLAYER_COLORS,
  buildDad,
  carrySprite,
  discardCarrying,
  poseBabyCrawl,
  poseBabySit,
  poseBabyStand,
  recolorDad,
  setCarrySprite,
  setMood,
  spawnBabies,
  thrownItems,
  updateThrownItems
} from './entities.js';
import {
  bed,
  messBlob,
  mirror,
  shower,
  sink,
  table,
  toilet
} from './house/furniture.js';
import {
  S,
  WALL_COLOR,
  WALL_H,
  WT,
  actingPlayerId,
  babies,
  blockAABBs,
  computerScreen,
  devMode,
  devSeedOverride,
  devTimeScale,
  difficulty,
  endlessMode,
  houseBounds,
  houseGroup,
  isHost,
  lastLayout,
  myId,
  myName,
  ovenPos,
  packageSpot,
  players,
  preTutorialDifficulty,
  roomCode,
  setActingPlayerId,
  setBabies,
  setComputerScreen,
  setDevSeedOverride,
  setDevTimeScale,
  setDifficulty,
  setEndlessMode,
  setHouseGroup,
  setIsHost,
  setLastLayout,
  setMyName,
  setPlayers,
  setPreTutorialDifficulty,
  setRoomCode,
  setS,
  setTasksMode,
  setTvScreen,
  solids,
  spawnBaby,
  spawnDad,
  stations,
  tasksMode,
  toys,
  tvScreen,
  wallMeshes
} from './state.js';
import {
  DAD_MAX_LEVEL,
  DAILY_DIFFICULTY_ROTATION,
  DAILY_EPOCH_MS,
  DEFAULT_KEYBINDS,
  GAME_SETTINGS_KEY,
  PROFILE_KEY,
  dadLevelForXp,
  dadLevelProgress,
  dailyDateKey,
  dailyDayIndex,
  dailyDifficulty,
  dailySeed,
  dailyStorageKey,
  defaultGameSettings,
  defaultProfile,
  gameSettings,
  getDailyResult,
  getGameSettings,
  getHighScore,
  getProfile,
  highScoreKey,
  msUntilNextUtcMidnight,
  prefersReducedMotionMQ,
  reducedMotionActive,
  saveGameSettings,
  saveProfile,
  setDailyResult,
  setHighScore,
  xpThreshold
} from './persistence.js';
import {
  Audio,
  Music
} from './audio.js';
import {
  ARM_RECOVER_MIN_FRAC,
  ARM_UPGRADE_SECONDS,
  BABY_NAMES,
  BABY_TRAITS,
  BACKPAIN_WARN_SECONDS,
  BASE_DECAY,
  BATHROOM_WARN_SECONDS,
  BATH_SECONDS,
  CARRY_ICON,
  CHOKE_WARN_SECONDS,
  CLIMBER_FALL_MUL,
  CLIMBER_OVEN_MUL,
  CLIMBER_PEN_MUL,
  CLINGY_DISTANCE,
  COSMETIC_UNLOCK_BASE,
  CRY_HISTORY_INTERVAL,
  CUDDLE_BUG_JOY_RATE,
  DIAPER_CHANGE_MAX,
  DIAPER_MACHINE_DECAY_MUL,
  DIAPER_MACHINE_POO_MUL,
  DIFFICULTIES,
  DIFF_ICON,
  DIRTY_CRAWL_RATE,
  DIRTY_CRY_THRESHOLD,
  DIRTY_DIAPER_RATE,
  DIRTY_VOMIT_ADD,
  FAVORITE_TOY_JOY_MUL,
  FAVORITE_TOY_PICK_CHANCE,
  FIREBASE_CONFIG,
  GAMEOVER_FLAVOR,
  HAZARD_ICON,
  MILESTONE_BANNER_SECONDS,
  MILESTONE_MAX,
  MILESTONE_MIN,
  MILESTONE_RETRY_SECONDS,
  MOVE_SPEED,
  NEEDS,
  NEEDS_HAZARD_ORDER,
  NEED_ICON,
  NEED_LABEL,
  OVEN_PROOF_COST,
  PACKAGES_DISAPPOINTED_THRESHOLD,
  PHASES,
  PHASE_AFTERNOON_ENDLESS_SECONDS,
  PHASE_BANNER_SECONDS,
  PHASE_DEFAULTS,
  PHASE_EVENING_SECONDS,
  PHASE_LUNCH_SECONDS,
  PHASE_MORNING_SECONDS,
  PICKY_ACCEPT_MAX,
  PICKY_ACCEPT_MIN,
  PICKY_REFUSE_MAX,
  PICKY_REFUSE_MIN,
  STARTING_POO_CAP,
  STARTING_POO_PER_LEVEL,
  STREAK_HEALTHY_THRESHOLD,
  STREAK_SCORE_CAP,
  STRETCH_BASE_COST,
  TASK_PHASE_AFFINITY,
  TASK_POOL,
  TOY_TIDY_CHOKE_BONUS,
  TOY_TIDY_COOLDOWN_SECONDS,
  TRAIT_COMBOS,
  TRAIT_KEYS,
  UPGRADES,
  UPGRADE_CAP_UNLOCK_EVERY,
  UPGRADE_LEVEL_CAP_BASE,
  UPGRADE_LEVEL_CAP_MAX,
  VOMIT_WARN_SECONDS,
  WET_CRY_MUL,
  WIN_FLAVOR,
  XP_PER_BATH,
  XP_PER_CUDDLE,
  XP_PER_DIAPER,
  XP_PER_HAZARD_HANDLED,
  XP_PER_SURVIVAL_SEC,
  XP_WIN_BONUS,
  phaseBoundaries,
  phaseIndexAt,
  rollBabyTraitSets,
  traitBadgesHtml,
  traitIconsHtml
} from './config.js';
import {
  box,
  cyl,
  disposeGroup,
  escapeHtml,
  hashStringToSeed,
  houseRng,
  makeSprite,
  mat,
  mulberry32,
  pick,
  rand,
  random0to1,
  roundRect,
  runRng,
  setHouseRng,
  setRunRng,
  shuffle,
  sph
} from './utils.js';

/* ============================================================
   Baby Care — isometric 3D babysitting game (entry module)
   ============================================================ */
if(!window.THREE){
  document.getElementById('intro').innerHTML =
    '<div class="card"><h1>Couldn\'t load 3D engine</h1><p>Three.js failed to load from the CDN. '+
    'Check your internet connection, or run a local server: <code>npx serve .</code></p></div>';
}

/* ---------- Firebase (online multiplayer backend — Realtime Database) ---------- */
let fbApp = null;
export let fbDb = null;
try{
  if(window.firebase){ fbApp = firebase.initializeApp(FIREBASE_CONFIG); fbDb = firebase.database(); }
}catch(e){ console.warn('Firebase init failed — multiplayer will be unavailable', e); }

/* ---------- Renderer / scene / iso camera ---------- */
const app = document.getElementById('app');
export const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
app.appendChild(renderer.domElement);

export const scene = new THREE.Scene();
scene.background = new THREE.Color('#241a38');
scene.fog = new THREE.Fog('#241a38', 120, 320);

export const CENTER = new THREE.Vector3(0, 0, 7);        // middle of the 2x3 room grid
export const LOOK = new THREE.Vector3(0, 0, -7);         // zoom-out framing target (whole home sits below the HUD)
export const CAM_OFFSET = new THREE.Vector3(40, 46, 40); // fixed isometric offset (keeps the view angle & controls constant)
export const CAM_HORIZ_DIST = Math.hypot(CAM_OFFSET.x, CAM_OFFSET.z);   // preserves the original view distance/zoom framing
applyCameraRotation();   // apply any persisted rotation from a previous session immediately at boot
export let BASE_VIEW = 82;                        // ortho size at zoom 1 (fits all rooms); recomputed by buildHouse()
export function setBaseView(v){ BASE_VIEW = v; }
export let zoom = 1, aspect = 1;
export function setZoom(v){ zoom = v; }
export let camera = new THREE.OrthographicCamera(-1,1,1,-1,0.1,400);
const camTarget = new THREE.Vector3().copy(LOOK);
export function applyFrustum(){
  const V = BASE_VIEW / zoom;
  camera.left = -V*aspect/2; camera.right = V*aspect/2;
  camera.top = V/2; camera.bottom = -V/2;
  camera.updateProjectionMatrix();
}
function resize(){
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w,h); aspect = w/h; applyFrustum();
}
window.addEventListener('resize', resize); resize();
// mouse-wheel zoom (zoom in follows the player)
renderer.domElement.addEventListener('wheel', e=>{
  e.preventDefault();
  zoom = Math.max(1, Math.min(3.2, zoom * (e.deltaY<0 ? 1.12 : 0.89)));
  applyFrustum();
}, {passive:false});
export function updateCamera(){
  const follow = Math.min(1, Math.max(0, (zoom-1)/1.3));   // 0 = whole-home overview, 1 = centred on dad
  camTarget.set(LOOK.x + (dad.position.x-LOOK.x)*follow, 0, LOOK.z + (dad.position.z-LOOK.z)*follow);
  camera.position.set(camTarget.x+CAM_OFFSET.x, CAM_OFFSET.y, camTarget.z+CAM_OFFSET.z);
  camera.lookAt(camTarget);
}

/* ---------- Lights ---------- */
scene.add(new THREE.HemisphereLight('#fff4e6', '#3a2f55', 0.9));
export const sun = new THREE.DirectionalLight('#fff1d6', 0.9);
sun.position.set(CENTER.x+18, 40, CENTER.z+6);
sun.castShadow = true;
sun.shadow.mapSize.set(2048,2048);
export const sunTarget = new THREE.Object3D(); sunTarget.position.copy(CENTER); scene.add(sunTarget);
sun.target = sunTarget;
const sc = sun.shadow.camera;
sc.left=-38; sc.right=38; sc.top=38; sc.bottom=-38; sc.near=1; sc.far=170;
scene.add(sun);

buildHouse();                                             // very first bootstrap call, below — see the `if(S)`
                                                           // guard around its Chores Mode task-generation line
export const dad = buildDad(PLAYER_COLORS[0].body, PLAYER_COLORS[0].leg); dad.position.copy(spawnDad); scene.add(dad);

/* ---------- Materials / helpers ---------- */

/* text / emoji sprite labels */

/* ---------- Home construction: shared state & helpers ---------- */

// wall builders (added into the current houseGroup)


/* ---------- Persisted player settings (audio, accessibility, keybinds) ---------- */

/* ---------- Audio (procedural, Web Audio) ---------- */

/* ---------- Background music (player-selectable, real audio files, kept quiet) ---------- */

/* ---------- Game state ---------- */
// ---- endless-mode high score, persisted per difficulty ----

// ---- meta-progression: a small persistent profile, independent of the endless/daily leaderboards
// above (those are a single best score; this is lifetime totals that never reset). ----
// perks below are read from the LOCAL profile only and only ever applied to solo/tutorial/daily runs —
// multiplayer rounds always use the base values so a higher Dad Level never advantages one player over
// another in a shared room (cosmetics still carry over there — see freshPlayer's colorIdx default)

export function freshPlayer(name, colorIdx){
  return {
    name, colorIdx: colorIdx||0,
    poo:0, lvl:{food:0,milk:0,diaper:0,cartoon:0,speed:0,arms:0,backpain:0},
    carrying:null,                   // 'food'|'milk'|'diaper'|'mop'|null
    holdingBaby:-1,                  // index into babies[], or -1
    holdStamina:0, armsTiredTimer:0, backPainTimer:0, nextBackPain:0, slowTimer:0,
    bathroomUrge:0, nextBathroom:0,   // >0 while an urge is active (counts down to "too late")
    wetPants:false,                  // missed the toilet in time — walks slower until the washing machine fixes it
    changes:0, cuddles:0,
    hazardsHandled:0, bathsGiven:0,  // feed the lifetime profile's XP at endGame() — see applyRunToProfile()
    x:0, z:0, rotY:0,                // synced transform — read directly from `dad` for me, else from Firebase
    avatar:null,                     // remote-only: {group, nameSprite} rendered in the scene
    connected:true,
  };
}
export function me(){ return players[myId]; }

export function resetState(){
  const D = curDiff();
  const gameLen = endlessMode ? Infinity : D.gameLen;
  setS({
    mode:'menu',                       // menu|play|over|win
    tutorial:false,                    // true during the guided, no-pressure tutorial run
    diff: D.key,
    babyCount: 1,                       // solo/tutorial is always 1; beginMultiplayerRound() overrides this
    cry:0,
    joy:0,                             // topped up by play/cuddles; eases crying
    cartoonsOn:false, tvTimer:0,
    endless: endlessMode,               // no win-timer — plays until a lose/fired/hide condition
    dailyChallenge: false,             // set true by startGame(_, true) — same seed & difficulty for everyone
    dailyDateKey: null,                 // which day's challenge this run is (set alongside dailyChallenge)
    tasksEnabled: tasksMode, tasks:[],   // tasks[] is actually filled in by buildHouse() (needs the seed)
    gameLen: gameLen,
    timeLeft: gameLen,
    elapsed:0,                          // seconds survived — endless mode's clock and score basis
    score:0,
    phaseIdx: null,                     // 0-3 index into PHASES, or null during the tutorial (phases are off)
    phaseBounds: phaseBoundaries(gameLen), // {morningEnd,lunchEnd,eveningStart,cycleLen} for this run's length
    phaseBannerTimer: 0,                // >0 briefly after a transition, to show the phase banner
    streak:0,                          // seconds every baby's every need has stayed above STREAK_HEALTHY_THRESHOLD
    longestStreak:0,                   // best streak reached this run — shown on the end card regardless of mode
    hazardCounts:{choke:0, burn:0, fall:0, vomit:0, backpain:0, bathroom:0}, // times each hazard fired this run
    cryHistory:[],                     // cry-o-meter sampled every CRY_HISTORY_INTERVAL, for the end-card sparkline
    cryHistoryTimer:0,
    messes:[],                         // active vomit puddles {x,z,mesh,playerInside}
    vomitTimer: rand(D.vomitMin*0.5, D.vomitMax*0.5), // first throw-up comes sooner than the steady interval
    vomitCulprit: null,                // pre-selected baby shown queasy shortly before the mess appears
    ovenProofed: false,                // baby-proofed at the oven (💩) — zeroes ovenChance for the rest of the run
    toyTidyCooldown: 0,                // >0 briefly after tidying toys — keeps the choke-timer bonus from being spammed
    notifyTimer: rand(D.notifyMin*0.6, D.notifyMax*0.6), // first work notification comes a bit sooner
    notification:false,                // an unanswered work notification is pending on the computer
    notifyDeadline:0,                  // seconds left to respond before a penalty
    missedNotifyTimer:0,               // >0 briefly after a missed notification, for the HUD message
    missedCount:0,                     // total missed work notifications this run — too many and you're fired
    paused:false,                      // Esc pause menu open — freezes gameplay updates, keeps rendering
    penEscapedTimer:0,                 // >0 briefly after an escape, for the HUD message
    armsTiredTimer:0,                  // (mirrors me().armsTiredTimer at reset time; kept for the HUD)
    nextPackage: rand(D.packageMin*0.6, D.packageMax*0.6), // first delivery comes a bit sooner, like notifyTimer
    packageWaiting:false,              // a package is sitting on the doormat, waiting to be grabbed or stolen
    packageDeadline:0,                 // seconds left to grab it before it's stolen
    packageMesh:null,                  // the box mesh currently on the doormat, if any
    missedPackages:0,                  // stolen this run — enough of these sours the win message
    milestoneTimer: rand(MILESTONE_MIN*0.5, MILESTONE_MAX*0.5), // first one can come a little sooner
    milestoneBannerTimer: 0,           // >0 briefly after one fires, to show the banner
    milestoneMsg: '',                  // text of the most recent milestone, shown while the banner's up
    milestoneNonce: 0,                 // bumped each time one fires — how guests detect a new one arrived
    milestoneCount: 0,                 // total this run — shown on the end card if >0
  });
  setPlayers({}); players[myId] = freshPlayer(myName, getProfile().colorIdx);
  const P = players[myId];
  P.holdStamina = holdMaxFor(D, 0);
  P.nextBackPain = rand(D.backPainMin*0.6, D.backPainMax*0.6);
  P.nextBathroom = rand(D.bathroomMin*0.7, D.bathroomMax*0.7);
  // dispose the previous run's baby meshes here — they live directly in `scene` (not under houseGroup,
  // which buildHouse() already tears down each run), so without this they'd leak as permanent "ghost"
  // babies: spawnBabies()'s own cleanup loop runs after babies is already reset to [], too late to catch them
  babies.forEach(b=>{ if(b.mesh){ scene.remove(b.mesh); disposeGroup(b.mesh); } });
  setBabies([]);                          // (re)populated once buildHouse() has placed a spawn point
}
resetState();


// isometric movement basis (screen-up = toward far corner) — mutated in place by applyCameraRotation()
// when the player rotates the view with rotateLeft/rotateRight, so both stay derived from CAM_OFFSET
// (declared far above, near the camera setup) rather than drifting out of sync with it
export function putBabyDown(player){                          // shared by voluntary put-down and forced (arms-tired) drop
  player = player || me();
  const b = babies[player.holdingBaby];
  if(!b) return;
  const local = player===me();
  const px = local?dad.position.x:player.x, pz = local?dad.position.z:player.z, pr = local?dad.rotation.y:player.rotY;
  player.holdingBaby=-1; b.heldBy=null;
  b.mesh.scale.set(1,1,1);
  b.mesh.position.set(px - Math.sin(pr)*1.1, 0, pz - Math.cos(pr)*1.1);
  b.mesh.userData.mat.visible = true;
  pickBabyTarget(b); b.mode='crawl';                    // safe grace period right after being set back down
}
/* ---------- HUD refs ---------- */
export function buildBabyNeedsHUD(){                          // one compact 4-bar cluster per baby (labeled once >1)
  const container = document.getElementById('babyNeeds');
  container.innerHTML = '';
  const side = babies.length>4;                          // many babies: vertical list, top-left, instead of
  container.classList.toggle('side', side);              // crowding the centered topbar
  // .babyNeeds.side uses position:fixed to anchor to the real top-left of the SCREEN, but #topbar (its
  // normal home) sets a CSS transform for its own centering — and a transform ancestor turns position:fixed
  // right back into position:absolute relative to itself. So while in "side" mode, physically move the
  // element out to #hud (untransformed) instead of just toggling the class; move it back for the normal case
  const topbar = document.getElementById('topbar'), hud = document.getElementById('hud');
  if(side && container.parentElement!==hud) hud.appendChild(container);
  else if(!side && container.parentElement!==topbar) topbar.insertBefore(container, topbar.firstChild);
  el.babyBars = [];
  const multi = babies.length>1;
  babies.forEach((b,i)=>{
    const cluster = document.createElement('div'); cluster.className = 'babyCluster'+(multi?' multi':'');
    let html = multi ? `<div class="babyClusterLabel">${b.name||('👶'+(i+1))}</div>` : '';
    if(b.traits && b.traits.length){
      html += `<div class="traitBadges">${traitBadgesHtml(b.traits)}</div>`;
    }
    NEEDS.forEach(k=>{
      html += `<div class="needMini" data-k="${k}"><div class="lblMini">${NEED_ICON[k]}</div><div class="barMini"><i></i></div></div>`;
    });
    // dirty meter — same bar visual as the other four, but inverted: it starts empty and fills UP as
    // the baby gets messier, so the "low is bad, flashing" convention below is flipped to "high is bad"
    html += `<div class="needMini" data-k="dirty"><div class="lblMini">🧼</div><div class="barMini"><i></i></div></div>`;
    cluster.innerHTML = html;
    container.appendChild(cluster);
    const bars = {label: cluster.querySelector('.babyClusterLabel')};
    NEEDS.forEach(k=>{
      const n = cluster.querySelector(`[data-k="${k}"]`);
      bars[k] = {fill:n.querySelector('.barMini>i'), bar:n.querySelector('.barMini')};
    });
    const dn = cluster.querySelector('[data-k="dirty"]');
    bars.dirty = {fill:dn.querySelector('.barMini>i'), bar:dn.querySelector('.barMini')};
    el.babyBars.push(bars);
  });
}

export const shopEl = document.getElementById('shop');
export function refreshShop(){
  const P = me();
  const cap = upgradeCapFor();
  document.getElementById('shopPoo').textContent = '💩 '+P.poo;
  Object.keys(UPGRADES).forEach(k=>{
    const cost = upgradeCost(k, P);
    const atCap = P.lvl[k]>=cap;
    upsEl.querySelector(`[data-lv="${k}"]`).textContent = `Level ${P.lvl[k]} / ${cap}`;
    const b = upsEl.querySelector(`[data-buy="${k}"]`);
    b.textContent = atCap ? 'MAX' : `💩 ${cost}`;
    b.disabled = atCap || P.poo < cost;
  });
}
export function closeShopFn(){ shopEl.classList.add('hidden'); }
if(prefersReducedMotionMQ && prefersReducedMotionMQ.addEventListener) prefersReducedMotionMQ.addEventListener('change', applyReducedMotionClass);
initSettingsControls(MAIN_SETTINGS_IDS);
initSettingsControls(PAUSE_SETTINGS_IDS);
document.getElementById('pauseHelpToggleBtn').addEventListener('click', ()=>{
  const isHidden = document.getElementById('pauseHelpDetail').classList.toggle('hidden');
  document.getElementById('pauseHelpToggleBtn').textContent = isHidden ? '▶ How does this work?' : '▼ Hide details';
});
let lastEndReason = null;                                 // most recent reason passed to endGame() — feeds Copy Result

/* ---------- Flow ---------- */
export function enterHouseCommon(){                            // shared teardown/setup used by every game-start path
  dad.position.copy(spawnDad); dad.rotation.y=0;
  dad.userData.arms[0].rotation.x=0; dad.userData.arms[1].rotation.x=0;
  recolorDad(me().colorIdx);                            // solo/tutorial always reset to colorIdx 0 via
                                                         // resetState(); multiplayer keeps whatever was picked
  setCarrySprite(null);
  thrownItems.forEach(it=>{ scene.remove(it.mesh); it.mesh.material.map.dispose(); it.mesh.material.dispose(); });
  thrownItems.length = 0;
  tvScreen.material.emissive.set('#101318');
  computerScreen.material.emissive.set('#153a6b');
  document.getElementById('intro').classList.add('hidden');
  document.getElementById('gameover').classList.add('hidden');
  document.getElementById('win').classList.add('hidden');
  closeShopFn();
  Audio.start(); Music.start();
}
export function endGame(reason){                              // 'win' | 'lose' | 'hide'
  S.mode = reason==='win' ? 'win' : 'over';
  lastEndReason = reason;
  closeShopFn();
  Music.setIntensity(0);                                // ease back to the base volume/tempo once play stops
  const P = me();
  // MP round ended with the room still alive → offer to rejoin its lobby instead of an outright restart;
  // a daily-challenge run's primary button goes to the menu instead of silently starting a normal run
  // (which would otherwise be the most obvious way to route around the one-run-per-day limit)
  setRetryAction(roomCode ? 'lobby' : (S.dailyChallenge ? 'menu' : 'solo'));
  const mins = Math.floor(S.elapsed/60), secs = Math.round(S.elapsed%60);
  const diffLabel = DIFFICULTIES[S.diff].label;
  // scoreSubmitState() checks "already played today" via getDailyResult() — must run before
  // setDailyResult() below overwrites that check's answer with this very run's own result
  const state = scoreSubmitState();
  if(S.dailyChallenge){
    setDailyResult(S.dailyDateKey, {score:S.score, elapsed:Math.floor(S.elapsed), poo:P.poo, reason, ts:Date.now()});
  }
  // Dad Level profile: every real run banks XP toward it, win or lose — the tutorial doesn't (nothing
  // "real" happened). See applyRunToProfile() for what counts.
  const profResult = S.tutorial ? null : applyRunToProfile(reason);
  const xpNote = profResult
    ? `⭐ +${profResult.xpEarned} XP` + (profResult.leveledUp ? ` — Dad Level ${profResult.newLevel}! 🎉` : ` (Dad Level ${profResult.newLevel})`)
    : '';
  if(reason==='win'){
    const wf = S.missedPackages >= PACKAGES_DISAPPOINTED_THRESHOLD ? WIN_FLAVOR.disappointed : WIN_FLAVOR.proud;
    document.getElementById('winIcon').textContent = wf.icon;
    document.getElementById('winTitle').textContent = wf.title;
    document.getElementById('winBody').innerHTML = wf.body;
    const packageNote = S.missedPackages>0 ? ` · 📦 ${S.missedPackages} package${S.missedPackages===1?'':'s'} stolen` : '';
    document.getElementById('winStats').textContent =
      `${diffLabel} · Diapers changed: ${P.changes} · Poo banked: 💩${P.poo}${packageNote}${state.note}`;
    document.getElementById('winBtn').textContent = roomCode ? 'Back to Lobby ↻' : (S.dailyChallenge ? '🚪 Back to Menu' : 'Play Again ↻');
    applyScoreSubmitUI('win', state);
    renderRunSummary('win');
    document.getElementById('winXp').textContent = xpNote;
    document.getElementById('win').classList.remove('hidden');
  } else {
    const f = GAMEOVER_FLAVOR[reason];
    document.getElementById('goIcon').textContent = f.icon;
    document.getElementById('goTitle').textContent = f.title;
    document.getElementById('goBody').textContent = f.body;
    const missedNote = reason==='fired' ? ` · ${S.missedCount} missed message${S.missedCount===1?'':'s'}` : '';
    document.getElementById('goStats').textContent =
      `${diffLabel} · You lasted ${mins}m ${secs}s · ${P.changes} diaper change${P.changes===1?'':'s'}${missedNote}${state.note}.`;
    document.getElementById('retryBtn').textContent = roomCode ? 'Back to Lobby ↻' : (S.dailyChallenge ? '🚪 Back to Menu' : 'Try Again ↻');
    document.getElementById('goQuitBtn').classList.toggle('hidden', !!S.dailyChallenge); // retryBtn already
    applyScoreSubmitUI('go', state);                                                     // goes to the menu —
                                                                                          // showing both is redundant
    renderRunSummary('go');
    document.getElementById('goXp').textContent = xpNote;
    document.getElementById('gameover').classList.remove('hidden');
  }
  if(roomCode && isHost) Net.setGameOver(reason);         // let every guest's client know the round is over
}
export function showMenuScreen(id){
  ['mainMenu','helpScreen','settingsScreen','aboutScreen','profileScreen','dailyScreen','modeScreen','diffScreen','mpChoiceScreen','mpJoinScreen','mpLobbyScreen'].forEach(mid=>{
    document.getElementById(mid).classList.toggle('hidden', mid!==id);
  });
  // the main menu carries its own always-visible Dad Level bar + endless-leaderboard preview —
  // refresh both every time it comes back on screen, not just once at boot
  if(id==='mainMenu'){ renderMenuLevelBadge(); renderMenuLeaderboardPreview(); alignMenuLbPreview(); }
}
// menuLeft and menuRight are independent flex columns (see the CSS comment above .menuCard), so nothing
// declarative ties the leaderboard preview's top to Play's — measure it for real and set margin-top to
// match, instead of guessing a magic-number offset that'd drift the next time either column's content changes
export function leaveToMainMenu(){                             // shared "abandon the current run" used by Quit
  S.paused = false;                                       // (pause menu, gameover/win screens) and by
  document.getElementById('pauseMenu').classList.add('hidden'); // leaving a lobby/room — routes through
  if(S.tutorial){ endTutorial(false); return; }           // the proper tutorial/MP teardown either way
  if(roomCode){
    if(isHost) Net.setGameOver('hostleft');
    Net.leaveRoom();
  }
  S.mode = 'menu';
  closeShopFn();
  Music.setIntensity(0);
  document.getElementById('gameover').classList.add('hidden');
  document.getElementById('win').classList.add('hidden');
  document.getElementById('intro').classList.remove('hidden');
  showMenuScreen('mainMenu');
}
export function onMetaChange(m){
  if(m.state==='playing' && S.mode!=='play') beginMultiplayerRound(m);
  else if(m.state==='ended') handleRemoteGameOver(m);
  else if(m.state==='lobby') updateLobbyHostInfo(m);
}
export function renderLobbyPlayers(snap){
  // defensive re-assertion: only the host should ever see Start Game, even if some earlier state was stale
  document.getElementById('mpStartBtn').classList.toggle('hidden', !isHost);
  document.getElementById('mpWaitNote').classList.toggle('hidden', isHost);
  const ids = Object.keys(snap);
  document.getElementById('mpPlayerList').innerHTML = ids.map(id=>{
    const p = snap[id], colors = PLAYER_COLORS[(p.colorIdx||0)%PLAYER_COLORS.length];
    return `<div><span style="display:inline-block;width:10px;height:10px;border-radius:50%;`+
           `background:${colors.body};margin-right:8px"></span>${p.name||'Player'}${id===myId?' (you)':''}</div>`;
  }).join('') || '<div style="opacity:.6">Waiting for players…</div>';
}
export function renderColorPicker(snap){
  const el = document.getElementById('mpColorPicker'); if(!el) return;
  const usedByOthers = new Set();
  let conflictOwner = null;
  Object.keys(snap).forEach(id=>{
    if(id===myId) return;
    usedByOthers.add(snap[id].colorIdx);
    if(snap[id].colorIdx===me().colorIdx) conflictOwner = id;
  });
  // Two players can end up picking the same color at nearly the same instant. Resolve deterministically —
  // whoever has the lexicographically smaller id keeps the color, the other silently moves to a free one —
  // so every client converges on "no two alike" without needing a Firebase transaction.
  if(conflictOwner!==null && conflictOwner<myId){
    let free=0; while(usedByOthers.has(free) && free<PLAYER_COLORS.length-1) free++;
    me().colorIdx = free; Net.setMyColor(free);
  }
  const myColorIdx = me().colorIdx;
  el.innerHTML = PLAYER_COLORS.map((c,i)=>{
    const taken = usedByOthers.has(i) && i!==myColorIdx;
    const selected = i===myColorIdx;
    return `<div class="colorSwatch${selected?' selected':''}${taken?' taken':''}" data-idx="${i}" `+
           `style="background:${c.body}" title="${taken?'Already taken':''}"></div>`;
  }).join('');
  el.querySelectorAll('.colorSwatch:not(.taken)').forEach(sw=>{
    sw.addEventListener('click', ()=>{
      const idx = +sw.dataset.idx; if(idx===me().colorIdx) return;
      el.querySelectorAll('.colorSwatch').forEach(x=>x.classList.remove('selected'));
      sw.classList.add('selected');
      me().colorIdx = idx; Net.setMyColor(idx); Audio.buy();
    });
  });
}

/* ---------- Dev tools (?dev=1) ----------
   Local-only debugging aids: time-scale, seed override, force-firing each hazard, direct need/cry
   sliders, and instant win/lose/fired. All mutations are host-only (isHost is always true solo). */
if(devMode){
  document.getElementById('devPanel').classList.remove('hidden');

  const tsInput = document.getElementById('devTimeScale'), tsVal = document.getElementById('devTimeScaleVal');
  tsInput.addEventListener('input', ()=>{ setDevTimeScale(+tsInput.value); tsVal.textContent = devTimeScale.toFixed(2)+'×'; });

  const seedInput = document.getElementById('devSeedInput'), seedShown = document.getElementById('devSeedShown');
  seedInput.addEventListener('change', ()=>{
    const v = seedInput.value.trim();
    setDevSeedOverride(v ? (+v|0) : null);
  });

  document.getElementById('devCloseBtn').addEventListener('click', ()=>document.getElementById('devPanel').classList.add('hidden'));

  document.getElementById('devHazardBtns').addEventListener('click', e=>{
    const btn = e.target.closest('[data-hazard]');
    if(!btn || S.mode!=='play' || !isHost) return;
    const liveBaby = ()=>babies.find(b=>!b.heldBy && !b.fallen && !b.burned && !b.penned && !b.choking) || babies[0];
    switch(btn.dataset.hazard){
      case 'vomit':    S.vomitTimer = 0; break;
      case 'choke':    { const b=liveBaby(); if(b) b.chokeTimer = 0; break; }
      case 'oven':     { const b=liveBaby(); if(b){ b.burned=true; Audio.cry(); } break; }
      case 'fall':     { const b=liveBaby(); if(b){ b.fallen=true; Audio.cry(); } break; }
      case 'backpain': me().nextBackPain = 0; break;
      case 'bathroom': me().nextBathroom = 0; break;
      case 'notify':   S.notifyTimer = 0; break;
      case 'package':  S.nextPackage = 0; break;
    }
  });

  function rebuildDevNeedSliders(){
    const wrap = document.getElementById('devNeedSliders');
    wrap.innerHTML = babies.map((b,i)=>NEEDS.map(k=>
      `<div class="devRow"><label>${b.name||('👶'+(i+1))} ${NEED_ICON[k]}</label>
        <input type="range" min="0" max="100" step="1" value="${b.need[k]}" data-baby="${i}" data-need="${k}">
        <span>${Math.round(b.need[k])}</span></div>`).join('')).join('');
    wrap.querySelectorAll('input').forEach(inp=>{
      inp.addEventListener('input', ()=>{
        const b = babies[+inp.dataset.baby]; if(!b) return;
        b.need[inp.dataset.need] = +inp.value;
        inp.nextElementSibling.textContent = inp.value;
      });
    });
  }
  document.getElementById('devRefreshBtn').addEventListener('click', rebuildDevNeedSliders);

  const crySlider = document.getElementById('devCrySlider'), cryVal = document.getElementById('devCryVal');
  crySlider.addEventListener('input', ()=>{ S.cry = +crySlider.value; cryVal.textContent = crySlider.value; });

  document.getElementById('devWinBtn').addEventListener('click', ()=>{ if(S.mode==='play') endGame('win'); });
  document.getElementById('devLoseBtn').addEventListener('click', ()=>{ if(S.mode==='play') endGame('lose'); });
  document.getElementById('devFiredBtn').addEventListener('click', ()=>{ if(S.mode==='play') endGame('fired'); });

  // keep the seed readout and (while playing) the need sliders fresh without a manual refresh click
  setInterval(()=>{
    seedShown.textContent = (S && S.seed!=null) ? S.seed : '—';
    if(S && S.mode==='play' && document.getElementById('devNeedSliders').children.length !== babies.length*NEEDS.length){
      rebuildDevNeedSliders();
    }
  }, 500);
}

updateBestScoreLabel();
renderMenuLevelBadge(); renderMenuLeaderboardPreview(); alignMenuLbPreview();  // main menu is visible by
                                                          // default at boot — showMenuScreen('mainMenu')
                                                          // is never called for it
Audio.setSfxVolume(gameSettings.sfxVol); Music.setVolume(gameSettings.musicVol);
applyHudScale(); applyReducedMotionClass();
tick();
