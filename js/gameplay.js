import {
  ARM_RECOVER_MIN_FRAC,
  ARM_UPGRADE_SECONDS,
  BASE_DECAY,
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
  DIFFICULTIES,
  DIAPER_MACHINE_DECAY_MUL,
  DIAPER_MACHINE_POO_MUL,
  DIRTY_CRAWL_RATE,
  DIRTY_CRY_THRESHOLD,
  DIRTY_DIAPER_RATE,
  DIRTY_VOMIT_ADD,
  FAVORITE_TOY_JOY_MUL,
  FAVORITE_TOY_PICK_CHANCE,
  MILESTONE_BANNER_SECONDS,
  MILESTONE_MAX,
  MILESTONE_MIN,
  MILESTONE_RETRY_SECONDS,
  MOVE_SPEED,
  NEEDS,
  OVEN_PROOF_COST,
  PHASES,
  PHASE_BANNER_SECONDS,
  PICKY_ACCEPT_MAX,
  PICKY_ACCEPT_MIN,
  PICKY_REFUSE_MAX,
  PICKY_REFUSE_MIN,
  STARTING_POO_CAP,
  STARTING_POO_PER_LEVEL,
  STREAK_HEALTHY_THRESHOLD,
  STREAK_SCORE_CAP,
  STRETCH_BASE_COST,
  TOY_TIDY_CHOKE_BONUS,
  TOY_TIDY_COOLDOWN_SECONDS,
  UPGRADES,
  UPGRADE_CAP_UNLOCK_EVERY,
  UPGRADE_LEVEL_CAP_BASE,
  UPGRADE_LEVEL_CAP_MAX,
  VOMIT_WARN_SECONDS,
  WET_CRY_MUL,
  XP_PER_BATH,
  XP_PER_CUDDLE,
  XP_PER_DIAPER,
  XP_PER_HAZARD_HANDLED,
  XP_PER_SURVIVAL_SEC,
  XP_WIN_BONUS,
  phaseIndexAt
} from './config.js';
import { Audio, Music } from './audio.js';
import {
  PLAYER_COLORS,
  discardCarrying,
  poseBabyCrawl,
  poseBabySit,
  poseBabyStand,
  setCarrySprite,
  setMood,
  spawnBabies,
  updateThrownItems
} from './entities.js';
import {
  buildHouse,
  packageBoxGroup
} from './house/build.js';
import {
  bed,
  messBlob,
  shower,
  sink,
  toilet
} from './house/furniture.js';
import {
  CAM_HORIZ_DIST,
  CAM_OFFSET,
  closeShopFn,
  dad,
  endGame,
  enterHouseCommon,
  leaveToMainMenu,
  me,
  putBabyDown,
  refreshShop,
  camera,
  renderer,
  resetState,
  scene,
  updateCamera,
  zoom
} from './main.js';
import {
  Net,
  applyRemoteBabies,
  applyRemoteWorld,
  updateRemoteAvatars,
  updateRemoteBabies
} from './net.js';
import {
  dadLevelForXp,
  dailyDateKey,
  dailyDifficulty,
  dailySeed,
  gameSettings,
  getDailyResult,
  getHighScore,
  getProfile,
  reducedMotionActive,
  saveGameSettings,
  saveProfile,
  setHighScore
} from './persistence.js';
import {
  S,
  actingPlayerId,
  babies,
  blockAABBs,
  computerScreen,
  devMode,
  devSeedOverride,
  devTimeScale,
  difficulty,
  houseBounds,
  houseGroup,
  isHost,
  myId,
  ovenPos,
  packageSpot,
  players,
  roomCode,
  setActingPlayerId,
  setDifficulty,
  setIsHost,
  setPreTutorialDifficulty,
  setRoomCode,
  solids,
  stations,
  toys,
  tvScreen,
  wallMeshes
} from './state.js';
import {
  TUTORIAL_STEPS,
  tutorialAdvance,
  tutorialProgress,
  tutorialStepEnter,
  tutorialStepIdx
} from './tutorial.js';
import {
  drawMinimap,
  enterLobbyUI,
  flashCarry,
  listeningForRebind,
  openShop,
  popPoo,
  renderKeybindGrid,
  setListeningForRebind,
  toggleMute,
  togglePause,
  toggleShop,
  updateBestScoreLabel,
  updateHUD,
  wireCopyResultBtn
} from './ui.js';
import {
  box,
  disposeGroup,
  mat,
  pick,
  rand,
  random0to1
} from './utils.js';

/* Core session/gameplay logic: player stats, station interactions, baby AI, the main tick() loop. */

export function curDiff(){ return DIFFICULTIES[difficulty]; }


// ---- rare milestone moments: pure flavor, no mechanical effect beyond a tiny joy nudge — deliberately
// long, wide intervals so they read as a special surprise rather than something to plan around ----
export const RARE_EVENTS = [
  {text:b=>`🗣️ ${babyDisplayName(b)} just said their first word: "${random0to1()<0.5?'DA-DA':'MA-MA'}"! 🥹`},
  {text:b=>`💃 ${babyDisplayName(b)} is having a little dance party!`},
  {text:b=>`😂 ${babyDisplayName(b)} just burst into a fit of giggles for no reason`},
  {text:b=>`🙈 ${babyDisplayName(b)} discovered peekaboo and is delighted with themselves`},
];
export function babyDisplayName(b){ return babies.length>1 ? b.name : 'Baby'; }
// eligible = not mid-hazard and not currently miserable — a milestone should read as a nice surprise,
// not clash with a baby who's crying, choking, or otherwise having a rough moment
export function milestoneEligibleBabies(){
  return babies.filter(b=>
    !b.choking && !b.fallen && !b.burned && !b.queasy && !b.pickyRefusing &&
    b.dirty<DIRTY_CRY_THRESHOLD && NEEDS.every(k=>b.need[k]>40));
}
export function curPhase(){ return (S && S.phaseIdx!=null) ? PHASES[S.phaseIdx] : null; } // null during the tutorial
export function phaseMul(key){ const p = curPhase(); return p ? p[key] : 1; }


export function upgradeCapForLevel(lvl){
  return Math.min(UPGRADE_LEVEL_CAP_MAX, UPGRADE_LEVEL_CAP_BASE + Math.floor((lvl-1)/UPGRADE_CAP_UNLOCK_EVERY));
}
export function upgradeCapFor(){
  return roomCode ? UPGRADE_LEVEL_CAP_BASE : upgradeCapForLevel(dadLevelForXp(getProfile().xp));
}
export function startingPooBonus(){
  return Math.min(STARTING_POO_CAP, (dadLevelForXp(getProfile().xp)-1) * STARTING_POO_PER_LEVEL);
}
export function unlockedColorCount(){
  return Math.min(PLAYER_COLORS.length, COSMETIC_UNLOCK_BASE + dadLevelForXp(getProfile().xp));
}
export function actingPlayer(){ return players[actingPlayerId]; }
export function actingPos(){                                    // position/heading of whoever's acting right now
  if(actingPlayerId===myId) return {x:dad.position.x, z:dad.position.z, rotY:dad.rotation.y};
  const p = players[actingPlayerId];
  return {x:p.x, z:p.z, rotY:p.rotY};
}
export function maxLvl(k){ let m=0; for(const id in players) m=Math.max(m, (players[id].lvl[k]||0)); return m; }

export function freshBaby(pos){
  const D = curDiff();
  return {
    mesh:null,
    need:{food:100,milk:100,diaper:100,cartoon:100},
    heldBy:null,                     // playerId currently holding this baby, or null
    fallen:false, burned:false,
    choking:false, chokeDeadline:0, chokeWarned:false,
    chokeTimer: rand(D.chokeMin, D.chokeMax) + 15,  // generous grace period before the first choking risk
    penned:false, penTimer:0,
    queasy:false,                    // brief pre-vomit telegraph — see S.vomitCulprit in tick()
    target:new THREE.Vector3().copy(pos), retime:0, play:0, playingToy:null, targetIsOven:false,
    mode:'crawl', poseT:0, fallTimer:0,
    moodLast:'🙂', moodSprite:null, cryTimer:0,
    traits:[], favoriteToyRef:null,  // personality — rolled and assigned in spawnBabies()
    pickyTimer: rand(PICKY_ACCEPT_MIN, PICKY_ACCEPT_MAX), pickyRefusing:false,
    dirty:0, wet:false, bathTimer:0, // dirty climbs from vomit/overdue diapers/floor time; a bath at
  };                                 // the tub or shower (held the whole time) resets it but leaves
}                                    // the baby wet until a towel-rack follow-up

export function happiness(){                                    // average across every baby's own 4-need average
  if(!babies.length) return 100;
  let s=0; babies.forEach(b=>{ let bs=0; NEEDS.forEach(k=>bs+=b.need[k]); s+=bs/NEEDS.length; });
  return s/babies.length;
}
export function decayRate(k){
  // passive drain is shared per baby, so it's slowed by whoever in the house has the best upgrade —
  // buying Tasty Food/Bigger Bottle/etc. helps every baby, not just the buyer's own actions.
  let rate = BASE_DECAY[k] * curDiff().decayMul * phaseMul('decayMul') * Math.pow(0.8, maxLvl(k));
  if(k==='food') rate *= phaseMul('foodDecayMul');   // Lunch: food drains 2x on top of the general phase rate
  return rate;
}
// Pain Medication (backpain upgrade) does double duty: it still shortens a back-pain episode once one
// hits (see the crippled-duration formula in tick()), and now also discounts the active "stretch at the
// bed" verb — so it's no longer just a passive tax-reducer once you have a real counterplay to spend it on.
export function stretchCost(player){ player = player || me(); return Math.max(1, Math.round(STRETCH_BASE_COST * Math.pow(0.8, player.lvl.backpain))); }
export function holdMaxFor(D, armsLvl){ return D.holdBase + armsLvl*ARM_UPGRADE_SECONDS; }
export function holdMax(player){ player = player || me(); return holdMaxFor(curDiff(), player.lvl.arms); }
export function upgradeCost(k, player){ player = player || me(); return UPGRADES[k].base * (player.lvl[k]+1); }
export function moveSpeed(){
  const p = me();
  let s = MOVE_SPEED * (1 + 0.15*p.lvl.speed);
  if(p.slowTimer>0) s *= 0.45;                 // slipped in a mess — walking it off
  if(p.wetPants) s *= 0.55;                    // missed the toilet — persists through the Quick Steps upgrade too
  return s;
}

/* ---------- Input ---------- */
export const keys = {};
window.addEventListener('keydown', e=>{
  const k = e.key.toLowerCase();
  if(listeningForRebind){                                // Settings' key-rebind capture takes priority over
    e.preventDefault();                                   // every other keydown handling, including Escape/pause
    gameSettings.keybinds[listeningForRebind] = k;
    saveGameSettings(gameSettings);
    setListeningForRebind(null);
    renderKeybindGrid();
    return;
  }
  if(k==='escape'){ togglePause(); return; }
  if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k)) e.preventDefault();
  keys[k]=true;
  if(S.mode!=='play' || S.paused) return;
  const kb = gameSettings.keybinds;
  if(k===kb.interact){ requestInteract(); }
  if(k===kb.hold){ requestToggleHold(); }
  if(k===kb.drop){ requestDrop(); }
  if(k===kb.shop){ toggleShop(); }
  if(k===kb.mute){ toggleMute(); }
  if(k===kb.rotateLeft){ rotateCamera(-1); }
  if(k===kb.rotateRight){ rotateCamera(1); }
});
window.addEventListener('keyup', e=>{ keys[e.key.toLowerCase()]=false; });

export const FWD = new THREE.Vector3(-1,0,-1).normalize();
export const RIGHT = new THREE.Vector3(1,0,-1).normalize();
export let camRotationSteps = gameSettings.camRotation||0;
export function applyCameraRotation(){
  const angle = Math.PI/4 + camRotationSteps*(Math.PI/2);        // base 45° (the original fixed angle) + 90°/step
  CAM_OFFSET.set(Math.cos(angle)*CAM_HORIZ_DIST, CAM_OFFSET.y, Math.sin(angle)*CAM_HORIZ_DIST);
  FWD.set(-CAM_OFFSET.x/CAM_HORIZ_DIST, 0, -CAM_OFFSET.z/CAM_HORIZ_DIST);
  RIGHT.set(-FWD.z, 0, FWD.x);                                    // +90° of FWD in the XZ plane
}
export function rotateCamera(dir){
  camRotationSteps = ((camRotationSteps + dir) % 4 + 4) % 4;
  applyCameraRotation();
  gameSettings.camRotation = camRotationSteps; saveGameSettings(gameSettings);
}

/* ---------- Interaction ----------
   Every function below runs "as" actingPlayer()/actingPos() — for the local player that's always
   myId/dad; when the host is replaying a remote player's queued action, actingPlayerId is switched
   to that player just for the duration of the call. This is what lets solo play, hosting, and being
   a guest all share the exact same gameplay logic. */

export function nearestBabyAt(x,z){
  let best=null, bd=Infinity, bi=-1;
  babies.forEach((b,i)=>{ const d=Math.hypot(x-b.mesh.position.x, z-b.mesh.position.z);
    if(d<bd){ bd=d; best=b; bi=i; } });
  return {baby:best, dist:bd, index:bi};
}
export function nearestBaby(){ const p=actingPos(); return nearestBabyAt(p.x,p.z); }
export function nearestStationAt(x,z){
  let best=null, bd=Infinity;
  for(const k in stations){ const s = stations[k];
    const d = Math.hypot(x-s.x, z-s.z);
    if(d < 2.6 && d < bd){ bd=d; best=k; } }
  return best;
}
export function nearestStation(){ const p=actingPos(); return nearestStationAt(p.x,p.z); }
export function nearestMess(){
  const p = actingPos();
  let best=null, bd=Infinity;
  S.messes.forEach(m=>{ const d=Math.hypot(p.x-m.x, p.z-m.z);
    if(d < 2.2 && d < bd){ bd=d; best=m; } });
  return best;
}
export function cleanMess(m){
  houseGroup.remove(m.mesh); disposeGroup(m.mesh);
  const i = S.messes.indexOf(m); if(i>=0) S.messes.splice(i,1);
  Audio.buy(); actingPlayer().hazardsHandled++;
  if(S.tutorial) tutorialProgress.mopped = true;
}
export function hasTask(key){ return S.tasksEnabled && S.tasks.some(t=>t.key===key && !t.done); }
export function completeTask(key){                              // shared, host-authoritative-by-nature since it only
  if(!S.tasksEnabled) return;                              // ever runs from inside doStation()/interact(), which
  const t = S.tasks.find(t=>t.key===key && !t.done);        // already only mutate real state on the host
  if(!t) return;
  t.done=true; Audio.chime();
  if(S.tasks.every(x=>x.done)) Audio.buy();                // a little extra flourish for finishing the whole list
}
export function nearestToyDist(){
  const p = actingPos();
  let bd = Infinity;
  toys.forEach(ty=>{ const d = Math.hypot(p.x-ty.x, p.z-ty.z); if(d<bd) bd=d; });
  return bd;
}
export function doStation(k){
  const P = actingPlayer();
  if(k==='cartoon'){ S.cartoonsOn=true; S.tvTimer=10+P.lvl.cartoon*3; Audio.chime();
    if(S.tutorial) tutorialProgress.cartoon = true;
    return; }
  if(k==='computer'){
    if(S.notification){ S.notification=false; Audio.chime(); if(S.tutorial) tutorialProgress.notif=true; } else Audio.error();
    return;
  }
  if(k==='closet'){                                    // dad bails and hides — instant, deliberate game over
    if(S.tutorial){ Audio.error(); return; }
    personLeftGame('hide'); return;
  }
  if(k==='frontdoor'){                                 // grab a delivered package before it's stolen, if one's waiting
    if(S.packageWaiting){
      S.packageWaiting=false;
      if(S.packageMesh){ houseGroup.remove(S.packageMesh); disposeGroup(S.packageMesh); S.packageMesh=null; }
      S.nextPackage = rand(curDiff().packageMin, curDiff().packageMax);  // otherwise nextPackage was
      S.joy=Math.min(1,S.joy+0.1); Audio.chime();                        // already <=0 (why one just
    } else Audio.error();                                                // arrived) and a new one would
    return;                                                              // spawn again next frame
  }
  if(k==='toilet'){
    const hadTask = hasTask('toilet');
    completeTask('toilet');                             // cleaning counts regardless of your own urge state
    if(P.bathroomUrge>0){ P.bathroomUrge=0; P.nextBathroom=rand(curDiff().bathroomMin, curDiff().bathroomMax)/phaseMul('bathroomMul');
      S.joy=Math.min(1,S.joy+0.15); Audio.chime(); }
    else if(hadTask) Audio.chime();
    else {                                              // preemptive use — no urge yet, but buys some time
      P.nextBathroom += curDiff().bathroomMin*0.5/phaseMul('bathroomMul'); Audio.chime();
    }
    return;
  }
  if(k==='bed'){
    const had=hasTask('bed');
    if(had){ completeTask('bed'); Audio.chime(); return; }
    const cost = stretchCost(P);                        // preventive verb: reset nextBackPain for 💩
    if(P.poo >= cost){ P.poo -= cost; P.nextBackPain = rand(curDiff().backPainMin, curDiff().backPainMax)/phaseMul('backpainMul'); Audio.buy(); }
    else Audio.error();
    return;
  }
  if(k==='oven'){
    const had=hasTask('oven');
    if(had){ completeTask('oven'); Audio.chime(); return; }
    if(!S.ovenProofed){                                 // preventive verb: pay once, oven hazard gone for the run
      if(P.poo >= OVEN_PROOF_COST){ P.poo -= OVEN_PROOF_COST; S.ovenProofed = true; Audio.buy(); }
      else Audio.error();
      return;
    }
    Audio.error(); return;
  }
  if(k==='sink'){ const had=hasTask('sink'); completeTask('sink'); (had?Audio.chime():Audio.error()); return; }
  if(k==='kitchensink'){ const had=hasTask('kitchensink'); completeTask('kitchensink'); (had?Audio.chime():Audio.error()); return; }
  if(k==='washer'){                                     // grab a clean pair of pants — clears the wetPants debuff
    if(P.wetPants){ P.wetPants=false; Audio.chime(); } else Audio.error();
    return;
  }
  if(k==='playpen'){
    if(P.holdingBaby<0){ Audio.error(); return; }
    const b = babies[P.holdingBaby];
    P.holdingBaby=-1; b.heldBy=null;
    b.mesh.scale.set(1,1,1); b.mesh.userData.mat.visible=true;
    b.mesh.position.set(stations.playpen.x, 0, stations.playpen.z); b.mesh.rotation.y=0;
    b.penned=true; b.penTimer=curDiff().penSeconds*(b.traits.includes('climber')?CLIMBER_PEN_MUL:1); b.fallen=false; b.burned=false;
    if(S.tutorial) tutorialProgress.penned = true;
    Audio.chime(); return;
  }
  if(k==='bath'){                                        // baby stays in Dad's arms the whole time —
    if(P.holdingBaby<0){ Audio.error(); return; }         // see the P.bathTimer/`bathing` freeze logic in tick()
    const b = babies[P.holdingBaby];
    if(b.bathTimer>0){ Audio.error(); return; }           // already bathing
    b.bathTimer = BATH_SECONDS;
    Audio.chime(); return;
  }
  if(k==='towel'){                                        // required follow-up: dries off a just-bathed baby
    if(P.holdingBaby<0){ Audio.error(); return; }
    const b = babies[P.holdingBaby];
    if(!b.wet){ Audio.error(); return; }
    b.wet = false; Audio.chime();
    if(S.tutorial) tutorialProgress.toweled = true;
    return;
  }
  if(P.holdingBaby>=0){ Audio.error(); return; }        // hands full holding baby
  P.carrying=k; if(actingPlayerId===myId) setCarrySprite(CARRY_ICON[k]); Audio.chime(); flashCarry();
}
export function deliverToBaby(b){
  const P = actingPlayer();
  if(P.carrying==='food'){
    if(b.pickyRefusing){ Audio.error(); return; }        // picky eater — milk only during a refusal stretch
    b.need.food=100; Audio.chime(); if(S.tutorial) tutorialProgress.fed=true;
  }
  else if(P.carrying==='milk'){ b.need.milk=100; Audio.chime(); if(S.tutorial) tutorialProgress.milk=true; }
  else if(P.carrying==='diaper'){
    if(b.need.diaper > DIAPER_CHANGE_MAX){ Audio.error(); return; }   // not dirty enough yet — keep the diaper
    const dirtiness = 1 - b.need.diaper/DIAPER_CHANGE_MAX;             // 0 right at the threshold, 1 when fully empty
    const traitMul = b.traits.includes('diaperMachine') ? DIAPER_MACHINE_POO_MUL : 1;
    const gained = Math.max(1, Math.round((1 + dirtiness*3) * (1 + 0.6*P.lvl.diaper) * traitMul));
    b.need.diaper=100;
    P.poo += gained; P.changes++; popPoo(gained); Audio.poo();
    if(S.tutorial) tutorialProgress.diaper=true;
  }
  P.carrying=null; if(actingPlayerId===myId) setCarrySprite(null);
}
export function interact(){                                   // core logic for the E key — see actingPlayer() note above
  const P = actingPlayer();
  const {baby:nb, dist:nd} = nearestBaby();
  if(nb && nb.choking){                                 // top priority: clear the airway
    if(nd < 2.6){ nb.choking=false; nb.chokeDeadline=0; S.joy=Math.min(1,S.joy+0.3); Audio.chime(); P.hazardsHandled++;
      if(S.tutorial) tutorialProgress.choke=true; }
    else Audio.error();
    return;
  }
  const k = nearestStation();
  const mess = nearestMess();
  if(P.carrying==='mop' && mess){ cleanMess(mess); return; }
  const near = P.holdingBaby<0 && nb && nd < 2.6;
  if(P.carrying){
    if(P.carrying!=='mop' && near){ deliverToBaby(nb); return; }
    if(k){ doStation(k); return; }                     // re-grab / toggle
    Audio.error(); return;
  }
  if(k){ doStation(k); return; }
  if(nearestToyDist()<1.8){                             // tidy toys — always available, not just in Chores Mode
    const hadTask = hasTask('toys');
    if(hadTask) completeTask('toys');
    if(S.toyTidyCooldown<=0){                           // fewer small objects around — buys the choking hazard some time
      babies.forEach(b=>{ b.chokeTimer += TOY_TIDY_CHOKE_BONUS; b.chokeWarned=false; });
      S.toyTidyCooldown = TOY_TIDY_COOLDOWN_SECONDS;
      Audio.chime();
    } else if(hadTask) Audio.chime();
    else Audio.error();                                 // tidied too recently — nothing more to do right now
    return;
  }
  Audio.error();
}

export function toggleHoldBaby(){                              // core logic for the Space key
  const P = actingPlayer();
  if(S.mode!=='play') return;
  if(P.holdingBaby>=0){
    putBabyDown(P); Audio.buy();
  } else {
    if(P.carrying){ Audio.error(); return; }           // can't hold baby with hands full
    if(P.holdStamina < holdMax(P)*ARM_RECOVER_MIN_FRAC){ Audio.error(); return; } // arms still too tired
    const {baby:nb, dist:nd, index:ni} = nearestBaby();
    if(nb && !nb.heldBy && nd < 2.9){
      if(nb.fallen || nb.burned) P.hazardsHandled++;    // scooping up a hurt baby comforts them — that's the counterplay
      P.holdingBaby=ni; nb.heldBy=actingPlayerId; P.cuddles++; nb.fallen=false; nb.burned=false; nb.penned=false; nb.queasy=false;
      nb.mesh.scale.set(0.9,0.9,0.9); nb.mesh.userData.mat.visible = false; Audio.chime();
      if(S.tutorial) tutorialProgress.held=true;
    } else Audio.error();
  }
}
/* ---------- Local dispatch: decides "run this myself" vs "ask the host to run it for me" ----------
   Solo play and hosting always run these directly (isHost is true in both cases), so their behavior
   is byte-for-byte what it always was. Only a joined non-host client takes the network branch. */
export function requestInteract(){
  // opening my own upgrade shop is a purely local UI panel — never needs the host or the network
  if(nearestStationAt(dad.position.x, dad.position.z)==='shop'){ openShop(); return; }
  if(isHost){ setActingPlayerId(myId); interact(); }
  else Net.sendAction('interact');
}
export function requestToggleHold(){ if(isHost){ setActingPlayerId(myId); toggleHoldBaby(); } else Net.sendAction('hold'); }
export function requestDrop(){ if(isHost){ setActingPlayerId(myId); discardCarrying(); } else Net.sendAction('drop'); }
export function requestBuy(k){ if(isHost){ setActingPlayerId(myId); buyUpgrade(k); } else Net.sendAction('buy', k); }


export function buyUpgrade(k){                                 // core logic — poo/levels are always the acting player's own
  const P = actingPlayer();
  if(P.lvl[k]>=upgradeCapFor()){ Audio.error(); return; }   // capped — see upgradeCapFor()'s Dad Level unlock
  const cost = upgradeCost(k, P);
  if(P.poo < cost){ Audio.error(); return; }
  P.poo -= cost; P.lvl[k]++;
  Audio.buy(); if(actingPlayerId===myId) refreshShop();
  if(S.tutorial) tutorialProgress.bought = true;
}

export function startGame(isTutorial, isDaily){
  if(isTutorial){ setPreTutorialDifficulty(difficulty); setDifficulty('tutorial'); }
  else if(isDaily){ setDifficulty(dailyDifficulty()); }   // same rotating difficulty for every player, every day
  setRoomCode(null); setIsHost(true);                       // solo & tutorial are always local-only
  resetState();
  S.tutorial = !!isTutorial;
  if(isTutorial){ S.endless = false; S.tasksEnabled = false; } // ignore Endless/Chores toggles during the tutorial
  if(isDaily){                                          // ignore Endless/Chores toggles here too — every
    S.endless = false; S.tasksEnabled = false;           // player's daily run needs to be the same shape
    S.dailyChallenge = true; S.dailyDateKey = dailyDateKey();
  }
  // Dad Level starting-💩 perk: a normal solo practice run only — never the tutorial (nothing to spend it
  // on) and never Daily Challenge (every player's run has to start even for the leaderboard to be fair)
  if(!isTutorial && !isDaily) players[myId].poo = startingPooBonus();
  // solo/tutorial runs still pick a fresh random seed each time (same visible behavior as before) — but
  // *picking* one means the run is reproducible, which the dev panel's seed override relies on, and which
  // the daily-challenge mode overrides with a shared date-derived seed instead, so every player's house
  // layout *and* hazard timing (buildHouse derives both from this one integer) are byte-identical
  const seed = isDaily ? dailySeed(S.dailyDateKey) : (devSeedOverride!=null ? devSeedOverride : Math.floor(Math.random()*1e9));
  buildHouse(seed);                                // fresh randomized-but-sensible room layout each run
  spawnBabies();
  enterHouseCommon();
  document.getElementById('tutorialPanel').classList.toggle('hidden', !isTutorial);
  // both would sit under the bottom-docked tutorial panel — <kbd>U</kbd> still opens the shop without the corner button
  document.getElementById('minimapHud').classList.toggle('hidden', isTutorial);
  document.querySelector('.corner').classList.toggle('hidden', isTutorial);
  if(isTutorial) tutorialStepEnter(0);
  S.mode='play';
}
export function startDailyChallenge(){                         // dailyStartBtn on #dailyScreen — bypasses the
  if(getDailyResult(dailyDateKey())) return;             // normal diff picker (fixed rotating difficulty),
  startGame(false, true);                                // like the tutorial bypasses both pickers. Guarded
}                                                         // again here since the button should already be hidden
// shared by both end cards: does this run qualify for a leaderboard entry, and what note explains why —
// endless competes for an all-time per-difficulty high score, daily challenge gets one entry per UTC day

export function scoreSubmitState(){
  if(S.endless){
    const hs = getHighScore(difficulty);
    const isNew = S.score > hs;
    if(isNew) setHighScore(difficulty, S.score);
    return {
      note: isNew ? ` · Score: ${S.score} — New High Score! 🏆` : ` · Score: ${S.score} · Best: ${hs}`,
      offer: isNew && S.score>0 && !roomCode,          // solo-only: MP rounds don't map to one player's score
      lede: '🏆 New personal best! Add your name to the leaderboard:',
      pending: {score:S.score, difficulty:S.diff, kind:'endless'},
    };
  }
  if(S.dailyChallenge){
    const already = !!getDailyResult(S.dailyDateKey);
    return {
      note: ` · Score: ${S.score}`,
      offer: !already && S.score>0 && !roomCode,
      lede: "🏆 Add your name to today's leaderboard:",
      pending: {score:S.score, dateKey:S.dailyDateKey, kind:'daily'},
    };
  }
  return {note:'', offer:false, lede:'', pending:null};
}
export function applyScoreSubmitUI(prefix, state){
  pendingScore = state.offer ? state.pending : null;
  document.getElementById(prefix+'ScoreSubmit').classList.toggle('hidden', !state.offer);
  document.getElementById(prefix+'Stepnav').classList.toggle('hidden', state.offer);
  document.getElementById(prefix+'ScoreSubmitLede').textContent = state.lede;
  document.getElementById(prefix+'ScoreNameInput').value = '';
  document.getElementById(prefix+'ScoreSubmitError').textContent = '';
}
export function applyRunToProfile(reason){                     // banks this run's totals into the lifetime profile;
  const P = me();                                        // called once, right at the top of endGame()
  const xpEarned = Math.round(
    P.changes*XP_PER_DIAPER + P.cuddles*XP_PER_CUDDLE + P.bathsGiven*XP_PER_BATH +
    P.hazardsHandled*XP_PER_HAZARD_HANDLED + S.elapsed*XP_PER_SURVIVAL_SEC +
    (reason==='win' ? XP_WIN_BONUS : 0)
  );
  const prof = getProfile();
  const beforeLvl = dadLevelForXp(prof.xp);
  prof.xp += xpEarned;
  prof.runsPlayed++;
  if(reason==='win') prof.runsSurvived++;
  prof.diaperChanges += P.changes;
  prof.cuddles += P.cuddles;
  prof.baths += P.bathsGiven;
  prof.hazardsHandled += P.hazardsHandled;
  saveProfile(prof);
  return {xpEarned, leveledUp: dadLevelForXp(prof.xp)>beforeLvl, newLevel: dadLevelForXp(prof.xp)};
}

export function personLeftGame(reason){                        // hiding in the closet: solo, or the host doing it in
  const P = actingPlayer();                               // multiplayer, ends the round for everyone as usual —
  if(P.holdingBaby>=0) putBabyDown(P);                     // but a GUEST doing it only ends their own session,
  if(!roomCode || actingPlayerId===myId){ endGame(reason); return; } // leaving everyone else's round running
  Net.setPlayerLeft(actingPlayerId, reason);
}
document.querySelectorAll('#diffPicker .diffOpt').forEach(opt=>{
  opt.addEventListener('click', ()=>{
    setDifficulty(opt.dataset.diff);
    document.querySelectorAll('#diffPicker .diffOpt').forEach(o=>o.classList.toggle('selected', o===opt));
    updateBestScoreLabel();
    Audio.buy();
  });
});

export let pendingScore = null;                                // {score,difficulty} awaiting a name to submit to the
                                                         // global leaderboard, set by endGame() when it's a new PB
export function setPendingScore(v){ pendingScore = v; }
export let retryAction = 'solo';                               // what the gameover/win primary button does next:
                                                         // 'solo' restarts immediately, 'lobby' rejoins the
                                                         // still-open room's lobby, 'menu' leaves entirely
export function setRetryAction(v){ retryAction = v; }
                                                         // (the room's already gone, e.g. host disconnected)

export function returnToLobby(){                               // "Try Again"/"Play Again" in multiplayer — stays in
  if(isHost) Net.reopenLobby();                         // the same room so everyone can see each other, change
  S.paused = false;                                     // difficulty/color, and start a fresh round together
  document.getElementById('pauseMenu').classList.add('hidden');
  S.mode = 'menu';
  closeShopFn();
  document.getElementById('gameover').classList.add('hidden');
  document.getElementById('win').classList.add('hidden');
  document.getElementById('intro').classList.remove('hidden');
  enterLobbyUI(isHost, roomCode);                       // re-assert host-only controls (Start Game etc.) —
}                                                        // don't rely on the background listener to catch it
export function handleRetry(){
  if(retryAction==='lobby'){ returnToLobby(); return; }
  if(retryAction==='menu'){ leaveToMainMenu(); return; }
  startGame(false);
}
document.getElementById('retryBtn').addEventListener('click', handleRetry);
document.getElementById('winBtn').addEventListener('click', handleRetry);
document.getElementById('goQuitBtn').addEventListener('click', leaveToMainMenu);
wireCopyResultBtn('winCopyBtn', ()=>'win');
wireCopyResultBtn('goCopyBtn', ()=>lastEndReason);

export function collide(px, pz, radius){
  // furniture (circles)
  for(const s of solids){
    const dx=px-s.x, dz=pz-s.z, d=Math.hypot(dx,dz), min=s.r+radius;
    if(d<min && d>1e-4){ px = s.x + dx/d*min; pz = s.z + dz/d*min; }
  }
  // walls & furniture (circle vs axis-aligned box); doorway gaps are simply absent walls
  for(const w of blockAABBs){
    const cx=Math.max(w.minX,Math.min(px,w.maxX)), cz=Math.max(w.minZ,Math.min(pz,w.maxZ));
    const dx=px-cx, dz=pz-cz, d=Math.hypot(dx,dz);
    if(d<radius){
      if(d>1e-4){ px=cx+dx/d*radius; pz=cz+dz/d*radius; }
      else {                                            // center inside wall: push out nearest edge
        const tL=px-w.minX, tR=w.maxX-px, tD=pz-w.minZ, tU=w.maxZ-pz, mn=Math.min(tL,tR,tD,tU);
        if(mn===tL) px=w.minX-radius; else if(mn===tR) px=w.maxX+radius;
        else if(mn===tD) pz=w.minZ-radius; else pz=w.maxZ+radius;
      }
    }
  }
  return [px,pz];
}

/* ---------- Main loop ---------- */

export const clock = new THREE.Clock();
export let walkPhase = 0;

// baby crawling AI — one independent copy of this state lives on each babies[] record (b.target/b.mode/...)
export function holderTransform(pid){                            // wherever the given player currently is (local or synced)
  if(pid===myId) return {x:dad.position.x, z:dad.position.z, rotY:dad.rotation.y};
  const p = players[pid]; return p ? {x:p.x, z:p.z, rotY:p.rotY} : {x:0,z:0,rotY:0};
}
export function babyHappiness(b){ let s=0; NEEDS.forEach(k=>s+=b.need[k]); return s/NEEDS.length; }
// clingy trait: fusses whenever Dad wanders far away, regardless of how full its needs are. Distance is
// computed against the host's own position only — the same known simplification the old noise system
// used, since remote players' positions aren't tracked closely enough for this yet.
export function clingyDistressed(b){
  return b.traits.includes('clingy') && !b.heldBy && !b.fallen && !b.burned && !b.choking && !b.penned
    && Math.hypot(b.mesh.position.x-dad.position.x, b.mesh.position.z-dad.position.z) > CLINGY_DISTANCE;
}
export function pickBabyTarget(b){
  b.retime = 3 + random0to1()*3;
  b.play = 0; b.playingToy = null; b.targetIsOven = false;
  const D = curDiff();
  const isClimber = b.traits.includes('climber');
  b.mode = random0to1() < D.walkChance ? 'walk' : 'crawl'; // crawling is the safe default; walking is occasional and riskier
  if(b.mode==='walk') b.fallTimer = rand(D.fallMin, D.fallMax)/phaseMul('fallMul')*(isClimber?CLIMBER_FALL_MUL:1);
  if(!S.ovenProofed && random0to1() < D.ovenChance*phaseMul('ovenMul')*(isClimber?CLIMBER_OVEN_MUL:1)){ // rare: baby toddles straight for the hot oven — dangerous!
    b.target.copy(ovenPos); b.targetIsOven = true;
  } else if(toys.length && random0to1() < 0.55){           // head to a toy and play
    const ty = (b.favoriteToyRef && random0to1()<FAVORITE_TOY_PICK_CHANCE) ? b.favoriteToyRef : toys[(random0to1()*toys.length)|0];
    b.target.set(ty.x + (random0to1()-0.5)*0.8, 0, ty.z + (random0to1()-0.5)*0.8);
    b.playingToy = ty;
  } else {                                                  // wander nearby
    b.target.set(b.mesh.position.x + (random0to1()-0.5)*11, 0, b.mesh.position.z + (random0to1()-0.5)*11);
  }
  b.target.x = Math.max(houseBounds.X0+1.5, Math.min(houseBounds.X1-1.5, b.target.x));
  b.target.z = Math.max(houseBounds.Z0+1.5, Math.min(houseBounds.Z1-1.5, b.target.z));
}
// host-authoritative: full sim for one baby (movement/hazards/mood); returns {crying,playing,empties} for
// the shared cry-o-meter aggregation. Non-host clients never call this — they just render synced state.
export function updateBabyAI(b, dt, t){
  let playing = false;
  if(b.heldBy){
    const h = holderTransform(b.heldBy);
    const bob = Math.abs(Math.sin(walkPhase))*0.05;
    b.mesh.position.set(h.x + Math.sin(h.rotY)*0.55, 1.15+bob, h.z + Math.cos(h.rotY)*0.55);
    b.mesh.rotation.y = h.rotY;
    poseBabySit(b.mesh.userData);
    if(b.traits.includes('cuddleBug')) S.joy = Math.min(1, S.joy + CUDDLE_BUG_JOY_RATE*dt);
  } else if(b.fallen || b.burned){                                          // hurt — frozen & crying till picked up
    b.mesh.position.y *= 0.9; poseBabySit(b.mesh.userData);
  } else if(b.penned){                                                      // safe in the playpen — counts down to an escape
    b.mesh.position.y *= 0.9; poseBabySit(b.mesh.userData);
    b.penTimer -= dt;
    if(b.penTimer <= 0){ b.penned=false; S.penEscapedTimer=2.5; Audio.error(); pickBabyTarget(b); b.mode='crawl'; }
  } else if(b.choking){                                                     // frozen, choking — needs its airway cleared
    b.mesh.position.y *= 0.9; poseBabySit(b.mesh.userData);
  } else {
    b.dirty = Math.min(100, b.dirty + DIRTY_CRAWL_RATE*curDiff().dirtyMul*dt); // unattended floor time adds up
    const toT = new THREE.Vector3(b.target.x-b.mesh.position.x, 0, b.target.z-b.mesh.position.z);
    const distT = toT.length();
    b.retime -= dt;
    if(b.play<=0 && (b.retime<=0 || distT<0.6)){
      if(b.playingToy && distT<1.6){ b.play = 2 + random0to1()*2; Audio.giggle(); }  // arrived at a toy
      else pickBabyTarget(b);
    }
    if(b.play>0){
      b.play -= dt; playing = true;
      const joyMul = (b.favoriteToyRef && b.playingToy===b.favoriteToyRef) ? FAVORITE_TOY_JOY_MUL : 1;
      S.joy = Math.min(1, S.joy + 0.5*dt*joyMul);
      b.mesh.position.y = 0.15 + Math.abs(Math.sin(t*10))*0.12;             // happy bounce
      b.mesh.rotation.y += dt*2.5;
      poseBabySit(b.mesh.userData);
      if(b.playingToy){                                                     // baby scoots the toy around while playing
        const ty = b.playingToy;
        if(ty.driftAngle===undefined) ty.driftAngle = random0to1()*Math.PI*2;
        ty.driftAngle += (random0to1()-0.5)*1.4*dt;
        ty.x = Math.max(houseBounds.X0+1, Math.min(houseBounds.X1-1, ty.x + Math.cos(ty.driftAngle)*0.55*dt));
        ty.z = Math.max(houseBounds.Z0+1, Math.min(houseBounds.Z1-1, ty.z + Math.sin(ty.driftAngle)*0.55*dt));
        ty.mesh.position.x = ty.x; ty.mesh.position.z = ty.z;
      }
      if(b.play<=0) pickBabyTarget(b);
    } else if(distT>0.5){
      toT.normalize();
      const spd = b.mode==='walk' ? 2.2 : 1.6;
      let bx = b.mesh.position.x + toT.x*spd*dt, bz = b.mesh.position.z + toT.z*spd*dt;
      [bx,bz] = collide(bx,bz,0.5);
      b.mesh.position.x = bx; b.mesh.position.z = bz;
      b.mesh.rotation.y = Math.atan2(toT.x, toT.z);
      if(b.targetIsOven && Math.hypot(bx-ovenPos.x, bz-ovenPos.z) < 1.6){    // got close enough to touch it — ouch
        b.burned = true; b.targetIsOven = false; Audio.cry(); S.hazardCounts.burn++;
      }
      b.poseT += dt*(b.mode==='walk'?9:7);
      if(b.mode==='walk'){
        poseBabyStand(b.mesh.userData, b.poseT);
        b.mesh.position.y = Math.abs(Math.sin(b.poseT))*0.06;
        b.fallTimer -= dt;                                                  // walking is risky — it might trip
        if(b.fallTimer<=0){ b.fallen=true; Audio.cry(); S.hazardCounts.fall++; }
      } else {
        poseBabyCrawl(b.mesh.userData, b.poseT);
        b.mesh.position.y = Math.abs(Math.sin(b.poseT))*0.04;               // crawl bob
      }
    } else { b.mesh.position.y *= 0.7; }
  }
  // an overdue diaper gets messier the longer it's left, regardless of held/penned/etc state
  if(b.need.diaper <= DIAPER_CHANGE_MAX) b.dirty = Math.min(100, b.dirty + DIRTY_DIAPER_RATE*curDiff().dirtyMul*dt);
  // mood + cry wobble + breathing — mirrors the original single-baby logic, per baby
  const bHp = babyHappiness(b);
  const bEmpties = NEEDS.filter(k=>b.need[k]<=0.5).length;
  const bCrying = bEmpties>0 || b.fallen || b.burned || clingyDistressed(b) || b.dirty>=DIRTY_CRY_THRESHOLD;
  setMood(b, b.choking ? '😵' : b.chokeWarned ? '😮' : b.queasy ? '🤢' : b.pickyRefusing ? '🙅'
    : bCrying && !b.heldBy ? '😭' : b.heldBy ? '🥰' : playing ? '🥳'
    : bHp>70 ? '😄' : bHp>40 ? '🙂' : '😟');
  if(bCrying && !b.heldBy){
    b.cryTimer -= dt; if(b.cryTimer<=0){ Audio.cry(); b.cryTimer=1.1; }
    const wobble = reducedMotionActive() ? 0 : Math.sin(t*30)*0.06;
    b.mesh.userData.body.position.x = wobble; b.mesh.userData.head.position.x = wobble;
  } else {
    b.cryTimer = 0; b.mesh.userData.body.position.x *= 0.8; b.mesh.userData.head.position.x *= 0.8;
  }
  b.mesh.userData.body.scale.y = 0.8 + Math.sin(t*2)*0.02;
  return {crying:bCrying, playing, empties:bEmpties};
}

// fade walls that sit between the camera and any dad/baby so they never hide the action
export function updateWallFade(dt){
  const k = Math.min(1, dt*10);
  // camDir is "toward the camera" in the XZ plane, scaled by √2 (undoing FWD's unit-length normalization)
  // so the dot product below reproduces the exact same numbers — and the same tuned 0.5/6 thresholds —
  // that the original hard-coded `(dx)+(dz)` sum produced at the default (unrotated) view; generalizing
  // it this way means the fade keeps working correctly after rotateCamera() changes the view angle
  const camDirX = -FWD.x*Math.SQRT2, camDirZ = -FWD.z*Math.SQRT2;
  const pts = [dad.position];
  babies.forEach(b=>{ if(b.mesh) pts.push(b.mesh.position); });
  for(const id in players){ if(id!==myId && players[id].avatar) pts.push(players[id].avatar.group.position); }
  for(const m of wallMeshes){
    let target = 1;
    for(const p of pts){
      const dx = m.position.x - p.x, dz = m.position.z - p.z;
      const front = dx*camDirX + dz*camDirZ;   // >0: wall is on the camera side of the character
      const horiz = Math.hypot(dx, dz);
      if(front > 0.5 && horiz < 6){ target = Math.min(target, 0.16 + 0.5*(horiz/6)); }
    }
    m.material.opacity += (target - m.material.opacity) * k;
  }
}

export let netSyncTimer = 0;
export function tick(){
  const dt = Math.min(clock.getDelta(), 0.05) * (devMode ? devTimeScale : 1);
  const t = clock.elapsedTime;

  // camera gentle sway idle only? keep static. update actors.
  if(S.mode==='play' && !S.paused){
    const P = me();
    // ---- day phase: which of Morning/Lunch/Afternoon/Evening we're in, derived from elapsed run time.
    // Host-authoritative (guests receive it via pushWorldSnapshot/applyRemoteWorld) since S.elapsed
    // itself only advances on the host; skipped during the tutorial, which leaves phaseIdx null so
    // every phaseMul() lookup elsewhere falls back to a neutral 1x — old tutorial behavior, untouched.
    if(isHost && !S.tutorial){
      const newPhaseIdx = phaseIndexAt(S.elapsed, S.phaseBounds);
      if(newPhaseIdx !== S.phaseIdx){
        S.phaseIdx = newPhaseIdx;
        S.phaseBannerTimer = PHASE_BANNER_SECONDS;
        Audio.chime();
      }
    }
    // ---- dad movement (always local — every client only ever drives its own avatar) ----
    const dir = new THREE.Vector3();
    const kb = gameSettings.keybinds;
    if(keys[kb.up]||keys['arrowup']) dir.add(FWD);
    if(keys[kb.down]||keys['arrowdown']) dir.sub(FWD);
    if(keys[kb.right]||keys['arrowright']) dir.add(RIGHT);
    if(keys[kb.left]||keys['arrowleft']) dir.sub(RIGHT);
    // bathing pins Dad exactly like back pain does, but it's read off the *baby's* own bathTimer
    // (synced to every client via applyRemoteBabies) rather than a player field, so the freeze lands
    // correctly on whichever client is actually holding the baby mid-bath, host or guest
    const heldBaby = P.holdingBaby>=0 ? babies[P.holdingBaby] : null;
    const bathing = !!(heldBaby && heldBaby.bathTimer>0);
    const crippled = P.backPainTimer>0 || bathing;
    const moving = dir.lengthSq()>0 && !crippled;
    if(moving){
      dir.normalize();
      const spd = moveSpeed();
      let nx = dad.position.x + dir.x*spd*dt, nz = dad.position.z + dir.z*spd*dt;
      [nx,nz] = collide(nx,nz,0.55);
      dad.position.x = nx; dad.position.z = nz;
      dad.rotation.y = Math.atan2(dir.x, dir.z);
      walkPhase += dt*12*(spd/MOVE_SPEED);
    } else { walkPhase *= 0.8; }
    const sw = Math.sin(walkPhase)*0.5*(moving?1:0);
    dad.userData.legL.rotation.x = sw; dad.userData.legR.rotation.x = -sw;
    dad.position.y = Math.abs(Math.sin(walkPhase))*0.06*(moving?1:0);
    if(P.holdingBaby>=0){ dad.userData.arms[0].rotation.x = -1.15; dad.userData.arms[1].rotation.x = -1.15; }
    else { dad.userData.arms[0].rotation.x = -sw; dad.userData.arms[1].rotation.x = sw; }
    // hunched-over pose while the back is seized up, easing in/out of the bend rather than snapping
    const bendTarget = crippled ? 0.45 : 0;
    dad.userData.upper.rotation.x += (bendTarget - dad.userData.upper.rotation.x) * Math.min(1, dt*7);

    // ---- babies: full AI/hazard simulation runs on the host only; guests just render synced state ----
    if(isHost){
      let anyPlaying=false, anyCrying=false, empties=0;
      babies.forEach(b=>{
        const r = updateBabyAI(b, dt, t);
        if(r.playing) anyPlaying=true;
        if(r.crying) anyCrying=true;
        empties += r.empties;
      });
      toys.forEach(ty=>{ const active = babies.find(b=>b.playingToy===ty && b.play>0);
        ty.mesh.position.y = ty.baseY + (active && !reducedMotionActive() ? Math.abs(Math.sin(t*10))*0.15 : 0); });
      S.joy = Math.max(0, S.joy - 0.06*dt);
      if(S.penEscapedTimer>0) S.penEscapedTimer = Math.max(0, S.penEscapedTimer-dt);
      if(S.toyTidyCooldown>0) S.toyTidyCooldown = Math.max(0, S.toyTidyCooldown-dt);

      // ---- bath: counts down on the baby it was started on; wraps up automatically once it hits zero ----
      babies.forEach(b=>{
        if(b.bathTimer>0){
          b.bathTimer = Math.max(0, b.bathTimer-dt);
          if(b.bathTimer<=0){
            b.dirty=0; b.wet=true;
            if(players[b.heldBy]) players[b.heldBy].bathsGiven++;   // whoever's holding them gets the credit
            if(hasTask('bath')) completeTask('bath');
            if(S.tutorial) tutorialProgress.bathed = true;
            Audio.chime();
          }
        }
      });
    }

    // ---- arm stamina: drains while holding a baby, recovers while not, forces a put-down at empty ----
    // (simulated locally for every client's own player; the actual release always routes through the
    // host, same as a voluntary put-down, so the shared "who's holding this baby" stays consistent)
    if(P.holdingBaby>=0){
      if(!bathing){                      // braced against the tub, not actively carrying — arms get a break
        P.holdStamina = Math.max(0, P.holdStamina - dt);
        if(P.holdStamina<=0){
          P.armsTiredTimer=2.5; Audio.error();
          if(isHost){ setActingPlayerId(myId); putBabyDown(P); } else { Net.sendAction('hold'); P.holdStamina = holdMax(P)*0.05; }
        }
      }
    } else {
      P.holdStamina = Math.min(holdMax(P), P.holdStamina + dt*curDiff().holdRecoverMul);
    }
    if(P.armsTiredTimer>0) P.armsTiredTimer = Math.max(0, P.armsTiredTimer-dt);

    // ---- back pain: random episodes freeze movement for a few seconds; Pain Medication shortens them ----
    // (simulated locally per player — purely personal, doesn't touch any shared state; skipped in the tutorial)
    if(!S.tutorial){
      if(P.backPainTimer>0){
        P.backPainTimer = Math.max(0, P.backPainTimer-dt);
      } else {
        P.nextBackPain -= dt;
        if(P.nextBackPain<=0){
          const Dbp = curDiff();
          P.backPainTimer = Math.max(0.5, Dbp.backPainCrippleBase * Math.pow(0.75, P.lvl.backpain));
          P.nextBackPain = rand(Dbp.backPainMin, Dbp.backPainMax)/phaseMul('backpainMul');
          Audio.error(); S.hazardCounts.backpain++;
          if(P.holdingBaby>=0){                     // can't keep hold of the baby through a back spasm
            if(isHost){ setActingPlayerId(myId); putBabyDown(P); } else { Net.sendAction('hold'); }
          }
        }
      }
    }

    // ---- bathroom: a rare personal urge — reach the toilet before time's up or it's an awkward miss ----
    // (per-player, like back pain — no shared state touched, so it never needs to disagree with a guest)
    if(!S.tutorial){
      if(P.bathroomUrge>0){
        P.bathroomUrge -= dt;
        if(P.bathroomUrge<=0){ P.bathroomUrge=0; P.wetPants=true; Audio.error(); }  // walks slower until they
                                                                                     // grab clean pants from the washer
      } else {
        P.nextBathroom -= dt;
        if(P.nextBathroom<=0){ P.bathroomUrge = curDiff().bathroomWindow; Audio.error(); S.hazardCounts.bathroom++; }
      }
    }

    if(isHost){
      // ---- work notifications: the computer pings now and then; answer within the window or take a cry penalty ----
      // (in the tutorial the script triggers one directly, with no countdown penalty)
      if(!S.tutorial){
        const dNotify = curDiff();
        const notifyMul = phaseMul('notifyMul');            // 0 in Morning/Lunch — pings cluster in the Afternoon instead
        if(S.notification){
          S.notifyDeadline -= dt;
          if(S.notifyDeadline <= 0){
            S.notification=false; S.missedNotifyTimer=2.5; S.missedCount++;
            S.cry = Math.min(100, S.cry + dNotify.notifyPenalty); Audio.error();
            S.notifyTimer = rand(dNotify.notifyMin, dNotify.notifyMax)/(notifyMul||1);
            if(S.missedCount >= dNotify.fireLimit){ endGame('fired'); }
          }
        } else if(notifyMul>0){
          S.notifyTimer -= dt;
          if(S.notifyTimer <= 0){
            S.notification=true; S.notifyDeadline=dNotify.notifyWindow;
            S.notifyTimer = rand(dNotify.notifyMin, dNotify.notifyMax)/notifyMul;   // primed for the one after this
            Audio.chime();
          }
        }
        if(S.missedNotifyTimer>0) S.missedNotifyTimer = Math.max(0, S.missedNotifyTimer-dt);
      }

      // ---- rare package delivery: grab it off the doormat before it's stolen ----
      if(!S.tutorial){
        const dPkg = curDiff();
        if(S.packageWaiting){
          S.packageDeadline -= dt;
          if(S.packageDeadline <= 0){
            S.packageWaiting=false; S.missedPackages++; Audio.error();
            if(S.packageMesh){ houseGroup.remove(S.packageMesh); disposeGroup(S.packageMesh); S.packageMesh=null; }
            S.nextPackage = rand(dPkg.packageMin, dPkg.packageMax);
          }
        } else {
          S.nextPackage -= dt;
          if(S.nextPackage <= 0){
            S.packageWaiting=true; S.packageDeadline=dPkg.packageWindow;
            S.packageMesh = packageBoxGroup();
            S.packageMesh.position.copy(packageSpot);
            houseGroup.add(S.packageMesh);
            Audio.doorbell();  // distinct from the work-ping chime — recognizable without reading the HUD
          }
        }
      }

      // ---- occasional throw-up: leaves a mess only the mop can clean (any unheld baby might be the culprit) ----
      if(!S.tutorial){
        S.vomitTimer -= dt;
        // telegraph: pick the culprit early and show it queasy, rather than the mess just appearing
        if(!S.vomitCulprit && S.vomitTimer < VOMIT_WARN_SECONDS && S.messes.length < 3){
          const candidates = babies.filter(b=>!b.heldBy);
          if(candidates.length){ S.vomitCulprit = pick(candidates); S.vomitCulprit.queasy = true; }
        }
        if(S.vomitTimer <= 0){
          let b = (S.vomitCulprit && !S.vomitCulprit.heldBy) ? S.vomitCulprit : null;
          if(!b){                                    // culprit got picked up mid-warning — fall back
            const candidates = babies.filter(x=>!x.heldBy);
            if(candidates.length) b = pick(candidates);
          }
          if(S.messes.length < 3 && b){
            const mx = Math.max(houseBounds.X0+1, Math.min(houseBounds.X1-1, b.mesh.position.x + rand(-0.5,0.5)));
            const mz = Math.max(houseBounds.Z0+1, Math.min(houseBounds.Z1-1, b.mesh.position.z + rand(-0.5,0.5)));
            const mesh = messBlob(); mesh.position.set(mx, 0.01, mz); houseGroup.add(mesh);
            S.messes.push({x:mx, z:mz, mesh, playerInside:false});
            S.hazardCounts.vomit++;
            b.dirty = Math.min(100, b.dirty + DIRTY_VOMIT_ADD);
            b.queasy = false;
            Audio.error();
          }
          if(S.vomitCulprit) S.vomitCulprit.queasy = false;
          S.vomitCulprit = null;
          S.vomitTimer = rand(curDiff().vomitMin, curDiff().vomitMax)/phaseMul('vomitMul');
        }
      }

      // ---- rare milestone moments: pure flavor (first words, a little dance, a giggle fit...) — no
      // mechanical effect beyond a small joy nudge, just a nice surprise every so often ----
      if(!S.tutorial){
        S.milestoneTimer -= dt;
        if(S.milestoneTimer <= 0){
          const eligible = milestoneEligibleBabies();
          if(eligible.length){
            const b = pick(eligible), event = pick(RARE_EVENTS);
            S.milestoneMsg = event.text(b);
            S.milestoneBannerTimer = MILESTONE_BANNER_SECONDS;
            S.milestoneNonce++;
            S.milestoneCount++;
            S.joy = Math.min(1, S.joy + 0.15);
            Audio.giggle();
            S.milestoneTimer = rand(MILESTONE_MIN, MILESTONE_MAX);
          } else {
            S.milestoneTimer = MILESTONE_RETRY_SECONDS;   // nobody eligible right now — check back soon, not a full interval
          }
        }
      }

      // ---- choking hazard: an unattended baby on the floor might swallow something small ----
      if(!S.tutorial){
        babies.forEach(b=>{
          if(!b.heldBy && !b.penned && !b.fallen && !b.burned && !b.choking){
            b.chokeTimer -= dt;
            if(!b.chokeWarned && b.chokeTimer < CHOKE_WARN_SECONDS){       // telegraph: a cough before it happens
              b.chokeWarned = true; Audio.cough();
            }
            if(b.chokeTimer<=0){
              const Dck = curDiff();
              b.choking = true; b.chokeDeadline = Dck.chokeWindow; Audio.cry(); S.hazardCounts.choke++;
              b.chokeTimer = rand(Dck.chokeMin, Dck.chokeMax)/phaseMul('chokeMul');
              b.chokeWarned = false;                                      // ready to warn again next cycle
            }
          }
          if(b.choking){ b.chokeDeadline -= dt; if(b.chokeDeadline<=0){ endGame('choke'); } }
        });
      }

      // ---- needs decay, per baby ----
      babies.forEach(b=>{
        NEEDS.forEach(k=>{
          if(k==='cartoon' && S.cartoonsOn) b.need.cartoon = Math.min(100, b.need.cartoon + 22*dt);
          else{
            const traitMul = (k==='diaper' && b.traits.includes('diaperMachine')) ? DIAPER_MACHINE_DECAY_MUL : 1;
            b.need[k] = Math.max(0, b.need[k] - decayRate(k)*traitMul*dt);
          }
        });
      });
      if(S.cartoonsOn){ S.tvTimer -= dt; if(S.tvTimer<=0) S.cartoonsOn=false; }

      // ---- picky eater: periodically refuses food for a stretch, milk-only until it passes ----
      babies.forEach(b=>{
        if(!b.traits.includes('picky')) return;
        b.pickyTimer -= dt;
        if(b.pickyTimer<=0){
          b.pickyRefusing = !b.pickyRefusing;
          b.pickyTimer = b.pickyRefusing ? rand(PICKY_REFUSE_MIN, PICKY_REFUSE_MAX) : rand(PICKY_ACCEPT_MIN, PICKY_ACCEPT_MAX);
        }
      });

      // ---- crying / cry-o-meter (eased by play joy and by cuddling; scaled by difficulty) ----
      const diffCry = curDiff();
      const anyCryingUnsoothed = babies.some(b=>{
        const empty = NEEDS.some(k=>b.need[k]<=0.5);
        return (empty || b.fallen || b.burned || clingyDistressed(b) || b.dirty>=DIRTY_CRY_THRESHOLD) && !b.heldBy;
      });
      const totalEmpties = babies.reduce((s,b)=>s + NEEDS.filter(k=>b.need[k]<=0.5).length
        + (clingyDistressed(b)?1:0) + (b.dirty>=DIRTY_CRY_THRESHOLD?1:0), 0);
      const anyoneHolding = Object.values(players).some(p=>p.holdingBaby>=0);
      const anyWet = babies.some(b=>b.wet);          // small compounding penalty, not a standalone trigger
      if(totalEmpties>0 || babies.some(b=>b.fallen||b.burned)){
        let fill = (3.5 + totalEmpties*3) * (1 - 0.4*S.joy) * diffCry.cryFillMul * phaseMul('cryFillMul') * (anyWet?WET_CRY_MUL:1);
        if(!anyCryingUnsoothed){ fill *= 0.5; S.cry = Math.max(0, S.cry - 3.5*diffCry.cryDrainMul*dt); }
        S.cry = Math.min(100, S.cry + fill*dt);
      } else {
        S.cry = Math.max(0, S.cry - (13 + S.joy*8 + (anyoneHolding?6:0))*diffCry.cryDrainMul*dt);
      }

      // ---- timer / win / lose ---- (none of this applies during the tutorial — it can't be won or lost)
      if(!S.tutorial){
        S.elapsed += dt;

        // ---- care streak: every need on every baby above a healthy floor keeps it running; one empty resets it ----
        const allNeedsHealthy = babies.every(b=>NEEDS.every(k=>b.need[k] > STREAK_HEALTHY_THRESHOLD));
        if(allNeedsHealthy){ S.streak += dt; if(S.streak > S.longestStreak) S.longestStreak = S.streak; }
        else S.streak = 0;

        if(S.endless || S.dailyChallenge){          // daily challenge is time-limited but still scored, so
          const streakMul = 1 + Math.min(2, S.streak/STREAK_SCORE_CAP);  // up to +200% for a long clean streak
          S.score = Math.floor((Math.floor(S.elapsed) + me().poo*3) * streakMul);  // its leaderboard has a number to rank by
        }
        if(!S.endless){                              // endless has no win-timer; a daily run does, same as normal
          S.timeLeft -= dt;
          if(S.timeLeft<=0){ S.timeLeft=0; endGame('win'); }
        }
        if(S.cry>=100){ endGame('lose'); }
      }
    }
    tvScreen.material.emissive.set(S.cartoonsOn ? '#7fd0ff' : '#101318');           // visual, runs for everyone
    computerScreen.material.emissive.set(S.notification ? '#ff5c3d' : '#153a6b');   // visual, runs for everyone

    // ---- cry-o-meter sparkline sample, for the end-of-run summary — runs on every client off its own
    // locally-known S.cry (host computes it, guests receive it via applyRemoteWorld), so it needs no
    // extra network payload of its own
    if(!S.tutorial){
      S.cryHistoryTimer -= dt;
      if(S.cryHistoryTimer<=0){ S.cryHistory.push(S.cry); S.cryHistoryTimer = CRY_HISTORY_INTERVAL; }
      if(S.phaseBannerTimer>0) S.phaseBannerTimer = Math.max(0, S.phaseBannerTimer-dt);
      if(S.milestoneBannerTimer>0) S.milestoneBannerTimer = Math.max(0, S.milestoneBannerTimer-dt);
    }

    // ---- stepping in a mess: drop whatever you're carrying and slip (walk slower for a few seconds) ----
    S.messes.forEach(m=>{
      const inside = Math.hypot(dad.position.x-m.x, dad.position.z-m.z) < 0.55;
      if(inside && !m.playerInside){
        P.slowTimer = 5; Audio.error();
        if(P.carrying){ if(isHost){ setActingPlayerId(myId); discardCarrying(); } else { Net.sendAction('drop'); } }
      }
      m.playerInside = inside;
      if(m.mesh && m.mesh.userData.marker) m.mesh.userData.marker.position.y = 0.85 + Math.sin(t*4)*0.08; // bob, catches the eye
    });
    if(P.slowTimer>0) P.slowTimer = Math.max(0, P.slowTimer-dt);

    // ---- tutorial: auto-advance once the player actually performs the demonstrated action ----
    if(S.tutorial){
      const step = TUTORIAL_STEPS[tutorialStepIdx];
      if(step && step.auto && step.auto()) tutorialAdvance();
    }

    // ---- multiplayer networking: throttled sync of my own transform + (host-only) the shared world ----
    if(roomCode){
      netSyncTimer -= dt;
      if(netSyncTimer<=0){ netSyncTimer=0.12; Net.pushMyTransform(); if(isHost) Net.pushWorldSnapshot(); }
      updateRemoteAvatars(dt);
      if(!isHost) updateRemoteBabies(dt);
    }

    Music.setIntensity(S.cry/100);   // panic used to be a red bar alone — now the music swells with it too
    updateHUD();
    drawMinimap();
  }

  updateCamera();
  updateWallFade(dt);
  updateThrownItems(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

/* ---------- HUD update ---------- */

