import {
  ARM_RECOVER_MIN_FRAC,
  BACKPAIN_WARN_SECONDS,
  BATHROOM_WARN_SECONDS,
  CARRY_ICON,
  COSMETIC_UNLOCK_BASE,
  DIAPER_CHANGE_MAX,
  DIFFICULTIES,
  DIFF_ICON,
  DIRTY_CRY_THRESHOLD,
  GAMEOVER_FLAVOR,
  HAZARD_ICON,
  NEEDS,
  NEEDS_HAZARD_ORDER,
  NEED_ICON,
  NEED_LABEL,
  OVEN_PROOF_COST,
  TASK_PHASE_AFFINITY,
  UPGRADES,
  traitIconsHtml
} from './config.js';
import { Audio, Music } from './audio.js';
import { Net } from './net.js';
import {
  PLAYER_COLORS,
  recolorDad
} from './entities.js';
import {
  curPhase,
  happiness,
  hasTask,
  holdMax,
  interact,
  keys,
  nearestBabyAt,
  nearestMess,
  nearestStationAt,
  nearestToyDist,
  pendingScore,
  requestBuy,
  setPendingScore,
  startDailyChallenge,
  startGame,
  startingPooBonus,
  stretchCost,
  unlockedColorCount,
  upgradeCapForLevel
} from './gameplay.js';
import {
  label
} from './house/build.js';
import {
  bed,
  sink,
  toilet
} from './house/furniture.js';
import {
  containsProfanity,
  renderDailyLeaderboard,
  submitDailyScore,
  submitLeaderboardScore
} from './leaderboard.js';
import {
  closeShopFn,
  dad,
  leaveToMainMenu,
  me,
  refreshShop,
  shopEl,
  showMenuScreen,
  zoom
} from './main.js';
import {
  dadLevelProgress,
  dailyDateKey,
  dailyDifficulty,
  gameSettings,
  getDailyResult,
  getHighScore,
  getProfile,
  msUntilNextUtcMidnight,
  reducedMotionActive,
  saveGameSettings,
  saveProfile
} from './persistence.js';
import {
  S,
  babies,
  difficulty,
  endlessMode,
  isHost,
  lastLayout,
  myId,
  myName,
  players,
  roomCode,
  setDifficulty,
  setEndlessMode,
  setMyName,
  setTasksMode,
  tasksMode,
  toys
} from './state.js';
import {
  makeSprite,
  pick
} from './utils.js';

/* HUD, minimap, shop, settings, and menu-screen DOM rendering. */

export function updateBestScoreLabel(){ const el2=document.getElementById('bestScoreLabel'); if(el2) el2.textContent = getHighScore(difficulty); }

export const el = {
  babyBars:[], cryFill:document.getElementById('cryFill'), cryPct:document.getElementById('cryPct'),
  cryWrap:document.querySelector('.crywrap'),
  hap:document.getElementById('hapVal'), poo:document.getElementById('pooVal'),
  time:document.getElementById('timeVal'), prompt:document.getElementById('prompt'),
  carry:document.getElementById('carry'), topbar:document.getElementById('topbar'),
  workAlert:document.getElementById('workAlert'), chokeAlert:document.getElementById('chokeAlert'),
  backPainAlert:document.getElementById('backPainAlert'), bathroomAlert:document.getElementById('bathroomAlert'),
  packageAlert:document.getElementById('packageAlert'),
  ovenAlert:document.getElementById('ovenAlert'), phaseBanner:document.getElementById('phaseBanner'),
  milestoneBanner:document.getElementById('milestoneBanner'),
  mpPlayerHud:document.getElementById('mpPlayerHud'), tasksHud:document.getElementById('tasksHud'),
  timeLabel:document.getElementById('timeLabel'), scoreStat:document.getElementById('scoreStat'), scoreVal:document.getElementById('scoreVal'),
  streakStat:document.getElementById('streakStat'), streakVal:document.getElementById('streakVal'),
  phaseStat:document.getElementById('phaseStat'), phaseIcon:document.getElementById('phaseIcon'), phaseLabel:document.getElementById('phaseLabel'),
};

export function flashCarry(){ el.carry.classList.remove('flash'); void el.carry.offsetWidth; el.carry.classList.add('flash'); }
export function popPoo(n){ el.poo.classList.remove('flash'); void el.poo.offsetWidth; el.poo.classList.add('flash');
  showFloatPoo(n); }
export function showFloatPoo(n){ /* subtle: reuse prompt line briefly */ }

/* ---------- Shop ---------- */

export const upsEl = document.getElementById('ups');
export function buildShopRows(){
  upsEl.innerHTML='';
  Object.keys(UPGRADES).forEach(k=>{
    const u = UPGRADES[k];
    const row = document.createElement('div'); row.className='up';
    row.innerHTML =
      `<div class="ico">${u.icon}</div>
       <div class="info"><div class="t">${u.title}</div><div class="d">${u.desc}</div>
         <div class="lv" data-lv="${k}"></div></div>
       <button class="buy" data-buy="${k}"></button>`;
    upsEl.appendChild(row);
  });
  upsEl.querySelectorAll('[data-buy]').forEach(btn=>{
    btn.addEventListener('click', ()=>requestBuy(btn.getAttribute('data-buy')));
  });
}

export function openShop(){ if(S.mode!=='play') return; buildShopRows(); refreshShop(); shopEl.classList.remove('hidden'); }

export function toggleShop(){ shopEl.classList.contains('hidden') ? openShop() : closeShopFn(); }
document.getElementById('shopBtn').addEventListener('click', openShop);
document.getElementById('closeShop').addEventListener('click', closeShopFn);

/* ---------- Mute ---------- */
export function toggleMute(){
  const m = !Audio.muted;
  Audio.setMuted(m); Music.setMuted(m);
  document.getElementById('muteBtn').textContent = m?'🔇':'🔊';
}
document.getElementById('muteBtn').addEventListener('click', toggleMute);

/* ---------- Pause menu (Esc): music, help, and a 2D house map ---------- */
export const pauseMenuEl = document.getElementById('pauseMenu');
export function syncMusicPickers(){                          // keeps every music picker (pause menu + settings) in sync
  document.querySelectorAll('.musicPicker .diffOpt').forEach(o=>o.classList.toggle('selected', o.dataset.music===Music.current));
}
export function togglePause(){
  if(S.mode!=='play') return;
  if(!shopEl.classList.contains('hidden')){ closeShopFn(); return; }
  S.paused = !S.paused;
  if(S.paused){ syncMusicPickers(); syncSettingsScreen(PAUSE_SETTINGS_IDS); drawMinimap(); pauseMenuEl.classList.remove('hidden'); }
  else { pauseMenuEl.classList.add('hidden'); }
}
document.getElementById('resumeBtn').addEventListener('click', togglePause);
document.querySelectorAll('.musicPicker .diffOpt').forEach(opt=>{
  opt.addEventListener('click', ()=>{
    Music.setTrack(opt.dataset.music);
    syncMusicPickers();
    Audio.buy();
  });
});

/* ---------- Settings screen: volume sliders, HUD scale, reduced motion, key rebinding ---------- */
export function applyHudScale(){                              // `zoom` (not `transform`) so absolutely/fixed
  const h = document.getElementById('hud');             // positioned HUD children keep their own corner
  if(h) h.style.zoom = gameSettings.hudScale;            // anchoring instead of drifting from a transform-origin
}
// toggled on <body> so any CSS (e.g. .reducedMotion .barMini.low>i) can react without a per-element flag;
// re-applied whenever the OS-level media query changes, not just the manual Settings toggle
export function applyReducedMotionClass(){ document.body.classList.toggle('reducedMotion', reducedMotionActive()); }

export const KEYBIND_LABELS = {up:'Move Up', down:'Move Down', left:'Move Left', right:'Move Right',
  interact:'Interact', hold:'Pick Up / Put Down', drop:'Drop Item', shop:'Open Shop', mute:'Mute',
  rotateLeft:'Rotate Camera ◀', rotateRight:'Rotate Camera ▶'};
export function keyDisplayName(k){ return k===' ' ? 'Space' : k.toUpperCase(); }
export let listeningForRebind = null;                          // action name currently waiting on a keypress, or null
export function setListeningForRebind(v){ listeningForRebind = v; }
// The exact same settings (volume, keybinds, accessibility) are offered in two places — the main
// menu's Settings screen and the in-run Esc pause menu — so every function here is parameterized by
// element id instead of hard-coding one screen's ids, and gets wired/synced twice (see the two
// SETTINGS_UI_IDS-shaped calls below) rather than duplicating this logic per screen.
export function renderKeybindGrid(containerId){
  const el = document.getElementById(containerId);
  el.innerHTML = Object.keys(KEYBIND_LABELS).map(action=>
    `<div class="keybindRow"><span class="keybindLabel">${KEYBIND_LABELS[action]}</span>
     <button class="keybindBtn" data-action="${action}">${keyDisplayName(gameSettings.keybinds[action])}</button></div>`
  ).join('');
  el.querySelectorAll('.keybindBtn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      if(listeningForRebind) return;                     // one rebind capture at a time
      listeningForRebind = btn.dataset.action;
      btn.textContent = '…'; btn.classList.add('listening');
    });
  });
}
export function initSettingsControls(ids){
  const musicSlider = document.getElementById(ids.music), sfxSlider = document.getElementById(ids.sfx),
        hudScaleSlider = document.getElementById(ids.hud), reducedMotionToggle = document.getElementById(ids.reduced);
  musicSlider.addEventListener('input', ()=>{
    gameSettings.musicVol = +musicSlider.value/100; Music.setVolume(gameSettings.musicVol); saveGameSettings(gameSettings);
  });
  sfxSlider.addEventListener('input', ()=>{
    gameSettings.sfxVol = +sfxSlider.value/100; Audio.setSfxVolume(gameSettings.sfxVol); saveGameSettings(gameSettings);
  });
  hudScaleSlider.addEventListener('input', ()=>{
    gameSettings.hudScale = +hudScaleSlider.value/100; applyHudScale(); saveGameSettings(gameSettings);
  });
  reducedMotionToggle.addEventListener('change', ()=>{
    gameSettings.reducedMotion = reducedMotionToggle.checked; saveGameSettings(gameSettings);
    applyReducedMotionClass();
  });
}
export function syncSettingsScreen(ids){
  document.getElementById(ids.music).value = Math.round(gameSettings.musicVol*100);
  document.getElementById(ids.sfx).value = Math.round(gameSettings.sfxVol*100);
  document.getElementById(ids.hud).value = Math.round(gameSettings.hudScale*100);
  document.getElementById(ids.reduced).checked = gameSettings.reducedMotion;
  renderKeybindGrid(ids.keybindGrid);
}
export const MAIN_SETTINGS_IDS = {music:'musicVolSlider', sfx:'sfxVolSlider', hud:'hudScaleSlider',
  reduced:'reducedMotionToggle', keybindGrid:'keybindGrid'};
export const PAUSE_SETTINGS_IDS = {music:'pauseMusicVolSlider', sfx:'pauseSfxVolSlider', hud:'pauseHudScaleSlider',
  reduced:'pauseReducedMotionToggle', keybindGrid:'pauseKeybindGrid'};

export const ROOM_MAP_LABEL = {bathroom:'🚿', office:'💻', nursery:'🍼', kitchen:'🍎', bedroom:'🛏️', living:'🛋️'};
export function drawMinimap(){
  const canvas = document.getElementById('minimapCanvas');
  if(!canvas || !lastLayout) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.fillStyle = '#241a38'; ctx.fillRect(0,0,W,H);
  const {bounds, rooms, halls} = lastLayout;
  const houseW = bounds.maxX-bounds.minX, houseD = bounds.maxZ-bounds.minZ, pad=8;
  const scale = Math.min((W-pad*2)/houseW, (H-pad*2)/houseD);
  const ox = (W - houseW*scale)/2, oy = (H - houseD*scale)/2;
  const mapX = wx => ox + (wx - bounds.minX)*scale, mapZ = wz => oy + (wz - bounds.minZ)*scale;
  const roomColor = {bathroom:'#4a7a9a', office:'#9a7a4a', nursery:'#4a9a72', kitchen:'#9a8a4a', bedroom:'#6a4a9a', living:'#9a5a4a'};
  ctx.fillStyle = '#3a3050';
  halls.forEach(hall=>{
    ctx.fillRect(mapX(hall.minX), mapZ(hall.minZ), (hall.maxX-hall.minX)*scale, (hall.maxZ-hall.minZ)*scale);
  });
  rooms.forEach(r=>{
    const x=mapX(r.minX), z=mapZ(r.minZ), w=(r.maxX-r.minX)*scale, h=(r.maxZ-r.minZ)*scale;
    ctx.fillStyle = roomColor[r.type]||'#666';
    ctx.fillRect(x,z,w,h);
    ctx.strokeStyle='#1a1626'; ctx.lineWidth=1.5; ctx.strokeRect(x,z,w,h);
    ctx.font='12px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(ROOM_MAP_LABEL[r.type]||'', x+w/2, z+h/2);
  });
  babies.forEach(b=>{
    ctx.beginPath(); ctx.fillStyle='#ff9ec7'; ctx.arc(mapX(b.mesh.position.x), mapZ(b.mesh.position.z), 5, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle='#fff'; ctx.lineWidth=1.5; ctx.stroke();
  });
  for(const id in players){
    const p = players[id]; if(!p.connected) continue;
    const px = id===myId ? dad.position.x : p.x, pz = id===myId ? dad.position.z : p.z;
    ctx.beginPath(); ctx.fillStyle=PLAYER_COLORS[p.colorIdx%PLAYER_COLORS.length].body;
    ctx.arc(mapX(px), mapZ(pz), 6, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle='#fff'; ctx.lineWidth=1.5; ctx.stroke();
  }
}

export function drawCrySparkline(canvas){                       // the cry-o-meter's shape over the whole run
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0,0,W,H);
  const data = S.cryHistory;
  if(data.length<2) return;                               // too short a run to plot anything meaningful
  ctx.beginPath();
  data.forEach((v,i)=>{
    const x = i/(data.length-1)*W, y = H - (v/100)*H;
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  });
  ctx.strokeStyle = '#ff6b8a'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.lineTo(W,H); ctx.lineTo(0,H); ctx.closePath();
  ctx.fillStyle = 'rgba(255,107,138,.18)'; ctx.fill();
}

export function hazardSummaryLine(){
  return 'Hazards faced — ' + NEEDS_HAZARD_ORDER.map(k=>`${HAZARD_ICON[k]} ${S.hazardCounts[k]}`).join('  ');
}
export function babyTraitsSummaryLine(){
  const withTraits = babies.filter(b=>b.traits && b.traits.length);
  if(!withTraits.length) return '';
  return withTraits.map(b=>`${b.name||'Baby'} ${traitIconsHtml(b.traits)}`).join('  ·  ');
}
export function renderRunSummary(prefix){                        // shared between the win and game-over cards
  const canvas = document.getElementById(prefix+'Sparkline');
  if(canvas) drawCrySparkline(canvas);
  document.getElementById(prefix+'Hazards').textContent = hazardSummaryLine();
  document.getElementById(prefix+'Extra').textContent =
    `😌 Longest calm streak: ${Math.round(S.longestStreak)}s` +
    (S.milestoneCount>0 ? ` · 🌟 ${S.milestoneCount} milestone${S.milestoneCount===1?'':'s'}` : '');
  document.getElementById(prefix+'Traits').textContent = babyTraitsSummaryLine();
}
export function buildShareText(reason){                          // plain-text summary + URL for the Copy Result button
  const P = me();
  const diffLabel = DIFFICULTIES[S.diff].label;
  const mins = Math.floor(S.elapsed/60), secs = Math.round(S.elapsed%60);
  const lines = [`👶 Baby Care: Dad's on Duty — ${diffLabel}`];
  lines.push(reason==='win' ? `🎉 Made it — Mom's home!` : `${GAMEOVER_FLAVOR[reason].icon} Lasted ${mins}m ${secs}s`);
  if(S.endless) lines.push(`🏆 Score: ${S.score}`);
  lines.push(`😌 Longest calm streak: ${Math.round(S.longestStreak)}s · 💩 ${P.poo} · 👶 ${P.changes} changes`);
  lines.push(hazardSummaryLine());
  const traitsLine = babyTraitsSummaryLine();
  if(traitsLine) lines.push(traitsLine);
  lines.push(location.href.split('?')[0].split('#')[0]);
  return lines.join('\n');
}
export function wireCopyResultBtn(btnId, reasonFn){
  const btn = document.getElementById(btnId);
  const original = btn.textContent;
  btn.addEventListener('click', ()=>{
    const text = buildShareText(reasonFn());
    const flash = ()=>{ btn.textContent='✅ Copied!'; setTimeout(()=>{ btn.textContent=original; }, 1400); };
    if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(flash).catch(()=>fallbackCopyText(text, flash));
    else fallbackCopyText(text, flash);
  });
}

export let gameMode = 'normal';                             // 'normal' | 'endless' | 'chores' — set on modeScreen,
document.querySelectorAll('#modePicker .diffOpt').forEach(opt=>{ // translated into endlessMode/tasksMode below.
  opt.addEventListener('click', ()=>{                             // Daily Challenge lives outside this picker
    gameMode = opt.dataset.mode;                                   // entirely now — see #dailyModeOption
    document.querySelectorAll('#modePicker .diffOpt').forEach(o=>o.classList.toggle('selected', o===opt));
    setEndlessMode(gameMode==='endless');
    setTasksMode(gameMode==='chores');
    Audio.buy();
  });
});

export function alignMenuLbPreview(){
  const play = document.getElementById('menuPlayBtn'), right = document.getElementById('menuRight'),
        preview = document.getElementById('menuLbPreview');
  if(!play || !right || !preview) return;
  preview.style.marginTop = Math.max(0, play.getBoundingClientRect().top - right.getBoundingClientRect().top) + 'px';
}
window.addEventListener('resize', ()=>{
  if(!document.getElementById('mainMenu').classList.contains('hidden')) alignMenuLbPreview();
});
document.getElementById('menuPlayBtn').addEventListener('click', ()=>showMenuScreen('modeScreen'));
document.getElementById('menuSettingsBtn').addEventListener('click', ()=>{ syncMusicPickers(); syncSettingsScreen(MAIN_SETTINGS_IDS); showMenuScreen('settingsScreen'); });
document.getElementById('menuHelpBtn').addEventListener('click', ()=>showMenuScreen('helpScreen'));
document.getElementById('menuAboutBtn').addEventListener('click', ()=>showMenuScreen('aboutScreen'));
// the Dad Level bar at the top of the main menu IS the entry point to the profile/details screen now
// — there's no separate "Profile" menu button any more
document.getElementById('menuLevelBar').addEventListener('click', ()=>{ showMenuScreen('profileScreen'); renderProfileScreen(); });
document.getElementById('profileBackBtn').addEventListener('click', ()=>showMenuScreen('mainMenu'));
export function renderMenuLevelBadge(){
  const prof = getProfile();
  const prog = dadLevelProgress(prof.xp);
  document.getElementById('menuLevelText').textContent = prog.maxed ? `Level ${prog.lvl} (Max)` : `Level ${prog.lvl}`;
  document.getElementById('menuLevelXpFill').style.width = (prog.frac*100)+'%';
  document.getElementById('menuLevelColorDot').style.background = PLAYER_COLORS[prof.colorIdx%PLAYER_COLORS.length].body;
}
// Placeholder rows so a brand-new install's leaderboard preview doesn't read as empty/dead — purely
// cosmetic, client-side only, and never written to Firebase. Blended with real scores and re-sorted,
// so they're self-obsoleting: as real players post better scores, these get pushed off the top 10 and
// quietly stop showing up, with no code change needed later.
export function renderProfileScreen(){
  const prof = getProfile();
  const prog = dadLevelProgress(prof.xp);
  document.getElementById('profileLevelBadge').textContent = prog.maxed ? `Level ${prog.lvl} (Max)` : `Level ${prog.lvl}`;
  document.getElementById('profileXpLabel').textContent = prog.maxed ? `${prof.xp} XP` : `${prog.cur} / ${prog.need}`;
  document.getElementById('profileXpFill').style.width = (prog.frac*100)+'%';
  document.getElementById('profileMaxedNote').textContent = prog.maxed ? "Maxed out — thanks for all the shifts, Dad." : '';
  document.getElementById('profileRuns').textContent = prof.runsPlayed;
  document.getElementById('profileWins').textContent = prof.runsSurvived;
  document.getElementById('profileDiapers').textContent = prof.diaperChanges;
  document.getElementById('profileCuddles').textContent = prof.cuddles;
  document.getElementById('profileBaths').textContent = prof.baths;
  document.getElementById('profileHazards').textContent = prof.hazardsHandled;
  document.getElementById('profileUnlocksNote').textContent =
    `🛠️ Upgrade cap: Level ${upgradeCapForLevel(prog.lvl)} (solo) · Starting 💩: ${startingPooBonus()} (solo)`;
  renderProfileColorPicker(prof);
}
export function renderProfileColorPicker(prof){
  const el2 = document.getElementById('profileColorPicker');
  const unlocked = unlockedColorCount();
  el2.innerHTML = PLAYER_COLORS.map((c,i)=>{
    const locked = i>=unlocked;
    const selected = i===prof.colorIdx;
    return `<div class="colorSwatch${selected?' selected':''}${locked?' taken':''}" data-idx="${i}" `+
           `style="background:${c.body}" title="${locked?`Unlocks at Dad Level ${i-COSMETIC_UNLOCK_BASE+1}`:''}"></div>`;
  }).join('');
  el2.querySelectorAll('.colorSwatch:not(.taken)').forEach(sw=>{
    sw.addEventListener('click', ()=>{
      const idx = +sw.dataset.idx; if(idx===prof.colorIdx) return;
      prof.colorIdx = idx; saveProfile(prof);
      if(!roomCode){ players[myId].colorIdx = idx; recolorDad(idx); }  // instant preview; MP keeps its own slot
      renderProfileColorPicker(prof);
      Audio.buy();
    });
  });
}
document.getElementById('menuTutorialBtn').addEventListener('click', ()=>startGame(true));
document.getElementById('dailyBackBtn').addEventListener('click', ()=>showMenuScreen('modeScreen'));
document.getElementById('dailyStartBtn').addEventListener('click', startDailyChallenge);
export function renderDailyScreen(){
  const dateKey = dailyDateKey();
  const diff = DIFFICULTIES[dailyDifficulty()];
  document.getElementById('dailyDateLabel').textContent = `Today: ${dateKey} (UTC)`;
  document.getElementById('dailyDiffLabel').textContent = `${DIFF_ICON[diff.key]||'🍼'} ${diff.label}`;
  const result = getDailyResult(dateKey);
  document.getElementById('dailyResultBox').classList.toggle('hidden', !result);
  document.getElementById('dailyStartBtn').classList.toggle('hidden', !!result);
  if(result){
    const m = Math.floor(result.elapsed/60), s = result.elapsed%60;
    const outcomeLabel = result.reason==='win' ? 'Survived the whole shift!' : (GAMEOVER_FLAVOR[result.reason]||{title:'Run ended'}).title;
    document.getElementById('dailyResultStats').textContent =
      `${outcomeLabel} · Score: ${result.score} · Lasted ${m}m ${s}s · 💩${result.poo}`;
  }
  renderDailyLeaderboard();
  updateDailyCountdown();
}
export function updateDailyCountdown(){
  const el2 = document.getElementById('dailyCountdown');
  if(!el2 || document.getElementById('dailyScreen').classList.contains('hidden')) return;
  const msLeft = msUntilNextUtcMidnight();
  const h = Math.floor(msLeft/3600000), m = Math.floor((msLeft%3600000)/60000), s = Math.floor((msLeft%60000)/1000);
  el2.textContent = `Resets in ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}
setInterval(updateDailyCountdown, 1000);
document.getElementById('helpBackBtn').addEventListener('click', ()=>showMenuScreen('mainMenu'));
document.getElementById('settingsBackBtn').addEventListener('click', ()=>showMenuScreen('mainMenu'));
document.getElementById('aboutBackBtn').addEventListener('click', ()=>showMenuScreen('mainMenu'));
document.getElementById('modeBackBtn').addEventListener('click', ()=>showMenuScreen('mainMenu'));
document.getElementById('modeNextBtn').addEventListener('click', ()=>{
  document.getElementById('bestScoreNote').classList.toggle('hidden', !endlessMode);
  updateBestScoreLabel();
  showMenuScreen('diffScreen');
});
// standalone, one-click entry point — Daily Challenge never needed a difficulty pick anyway, so skip
// straight to its own screen instead of routing through the mode picker + a relabeled Next button
document.getElementById('dailyModeOption').addEventListener('click', ()=>{
  Audio.buy();
  showMenuScreen('dailyScreen'); renderDailyScreen();
});
document.getElementById('diffBackBtn').addEventListener('click', ()=>showMenuScreen('modeScreen'));
document.getElementById('startBtn').addEventListener('click', ()=>startGame(false));

export function dismissScoreSubmit(prefix){
  setPendingScore(null);
  document.getElementById(prefix+'ScoreSubmit').classList.add('hidden');
  document.getElementById(prefix+'Stepnav').classList.remove('hidden');
}
export function wireScoreSubmitForm(prefix){                    // shared between the game-over and win cards
  document.getElementById(prefix+'ScoreSkipBtn').addEventListener('click', ()=>dismissScoreSubmit(prefix));
  document.getElementById(prefix+'ScoreSubmitBtn').addEventListener('click', async ()=>{
    const errEl = document.getElementById(prefix+'ScoreSubmitError');
    const name = document.getElementById(prefix+'ScoreNameInput').value.trim();
    if(!pendingScore) return;
    if(!name){ errEl.textContent = 'Enter a name first.'; return; }
    if(containsProfanity(name)){ errEl.textContent = 'Please choose a different name.'; return; }
    const btn = document.getElementById(prefix+'ScoreSubmitBtn');
    btn.disabled = true; btn.textContent = 'Saving…';
    try{
      if(pendingScore.kind==='daily') await submitDailyScore(name, pendingScore.score, pendingScore.dateKey);
      else await submitLeaderboardScore(name, pendingScore.score, pendingScore.difficulty);
      dismissScoreSubmit(prefix);
    }catch(e){
      errEl.textContent = "Couldn't save right now — check your connection and try again.";
    }
    btn.disabled = false; btn.textContent = 'Save Score 🏆';
  });
}
wireScoreSubmitForm('go');
wireScoreSubmitForm('win');
document.getElementById('pauseQuitBtn').addEventListener('click', leaveToMainMenu);

/* ---------- Multiplayer: Firebase-backed lobby (host/join, difficulty + baby count, player list) ----------
   Host-authoritative, no dedicated server: the host's own tab runs the exact same simulation solo play
   always has (need decay, baby AI, hazards, cry-o-meter, timer), just generalized over N babies, and
   streams a throttled snapshot to Firebase. Every other client only ever reads that snapshot — they
   never simulate the shared world themselves. See resilient-spinning-liskov.md for the full design. */

export function mpNameValue(){ return (document.getElementById('mpNameInput').value||'').trim().slice(0,16) || 'Dad'; }
document.getElementById('menuMultiplayerBtn').addEventListener('click', ()=>showMenuScreen('mpChoiceScreen'));
document.getElementById('mpChoiceBackBtn').addEventListener('click', ()=>showMenuScreen('mainMenu'));
document.getElementById('mpJoinBackBtn').addEventListener('click', ()=>showMenuScreen('mpChoiceScreen'));
document.getElementById('mpLeaveBtn').addEventListener('click', ()=>{
  if(isHost) Net.setGameOver('hostleft');
  Net.leaveRoom(); showMenuScreen('mainMenu');
});
document.getElementById('mpHostBtn').addEventListener('click', async ()=>{
  if(!Net.available()){ alert("Multiplayer is unavailable right now — couldn't reach the server."); return; }
  setMyName(mpNameValue());
  try{ const code = await Net.hostCreate(myName); enterLobbyUI(true, code); }
  catch(e){ alert('Could not create a room. Please try again.'); console.error(e); }
});
document.getElementById('mpJoinBtn').addEventListener('click', ()=>showMenuScreen('mpJoinScreen'));
document.getElementById('mpJoinConfirmBtn').addEventListener('click', async ()=>{
  const errEl = document.getElementById('mpJoinError'); errEl.textContent='';
  if(!Net.available()){ errEl.textContent='Multiplayer is unavailable right now.'; return; }
  const code = (document.getElementById('mpCodeInput').value||'').trim().toUpperCase();
  if(code.length<4){ errEl.textContent='Enter a valid room code.'; return; }
  setMyName(mpNameValue());
  try{ await Net.join(code, myName); enterLobbyUI(false, code); }
  catch(e){ errEl.textContent="Couldn't find that room."; }
});
export function enterLobbyUI(hosting, code){
  document.getElementById('mpRoomCodeLabel').textContent = code;
  document.getElementById('mpHostControls').classList.toggle('hidden', !hosting);
  document.getElementById('mpNonHostNote').classList.toggle('hidden', hosting);
  document.getElementById('mpStartBtn').classList.toggle('hidden', !hosting);
  document.getElementById('mpWaitNote').classList.toggle('hidden', hosting);
  showMenuScreen('mpLobbyScreen');
}
document.querySelectorAll('#mpDiffPicker .diffOpt').forEach(opt=>{
  opt.addEventListener('click', ()=>{
    if(!isHost) return;
    document.querySelectorAll('#mpDiffPicker .diffOpt').forEach(o=>o.classList.toggle('selected', o===opt));
    Net.setDifficulty(opt.dataset.diff); Audio.buy();
  });
});
document.querySelectorAll('#mpBabyCountPicker .diffOpt').forEach(opt=>{
  opt.addEventListener('click', ()=>{
    if(!isHost) return;
    document.querySelectorAll('#mpBabyCountPicker .diffOpt').forEach(o=>o.classList.toggle('selected', o===opt));
    Net.setBabyCount(+opt.dataset.babies); Audio.buy();
  });
});
document.querySelectorAll('#mpTasksToggle .diffOpt').forEach(opt=>{
  opt.addEventListener('click', ()=>{
    if(!isHost) return;
    const on = !opt.classList.contains('selected');
    opt.classList.toggle('selected', on);
    Net.setTasksMode(on); Audio.buy();
  });
});
document.getElementById('mpStartBtn').addEventListener('click', ()=>Net.startGameFromHost());
export function fallbackCopyText(text, cb){
  const ta = document.createElement('textarea');
  ta.value = text; ta.style.position='fixed'; ta.style.opacity='0';
  document.body.appendChild(ta); ta.focus(); ta.select();
  try{ document.execCommand('copy'); cb(); }catch(e){}
  document.body.removeChild(ta);
}
document.getElementById('mpCopyCodeBtn').addEventListener('click', ()=>{
  const code = document.getElementById('mpRoomCodeLabel').textContent;
  const btn = document.getElementById('mpCopyCodeBtn');
  const flash = ()=>{ btn.textContent='✅'; setTimeout(()=>{ btn.textContent='📋'; }, 1400); };
  if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(flash).catch(()=>fallbackCopyText(code, flash));
  else fallbackCopyText(code, flash);
});

export function updateLobbyHostInfo(meta){
  if(isHost || S.mode==='play') return;                 // host's own clicks already reflect locally
  if(meta.difficulty) document.querySelectorAll('#mpDiffPicker .diffOpt').forEach(o=>o.classList.toggle('selected', o.dataset.diff===meta.difficulty));
  if(meta.babyCount) document.querySelectorAll('#mpBabyCountPicker .diffOpt').forEach(o=>o.classList.toggle('selected', +o.dataset.babies===meta.babyCount));
  document.querySelectorAll('#mpTasksToggle .diffOpt').forEach(o=>o.classList.toggle('selected', !!meta.tasksMode));
}

/* ---------- Tutorial: a guided, no-pressure walkthrough of every mechanic, at the player's own pace ---------- */

/* ---------- Collisions ---------- */

export let mpPlayerHudSig = '';
export function updateMpPlayerHud(){                            // top-right roster during a multiplayer round —
  const hud = el.mpPlayerHud;                              // just names + color dots, not full lobby detail
  if(!roomCode){ hud.classList.add('hidden'); return; }
  hud.classList.remove('hidden');
  const ids = Object.keys(players).filter(id=>players[id].connected!==false);
  const sig = ids.map(id=>`${id}:${players[id].name}:${players[id].colorIdx}`).join('|');
  if(sig===mpPlayerHudSig) return;                          // skip the rebuild when nothing actually changed
  mpPlayerHudSig = sig;
  hud.innerHTML = ids.map(id=>{
    const p = players[id], c = PLAYER_COLORS[(p.colorIdx||0)%PLAYER_COLORS.length];
    return `<div class="mpPlayerRow"><span class="mpPlayerDot" style="background:${c.body}"></span>`+
           `${p.name||'Player'}${id===myId?' (you)':''}</div>`;
  }).join('');
}
export let tasksHudSig = '';
export function updateTasksHud(){                                // top-right checklist for a Chores Mode run
  const hud = el.tasksHud;
  if(!S.tasksEnabled || !S.tasks.length){ hud.classList.add('hidden'); return; }
  hud.classList.remove('hidden');
  const phaseKey = curPhase() ? curPhase().key : null;      // sort the current phase's matching chore to the
  const sig = S.tasks.map(t=>`${t.key}:${t.done}`).join('|') + '|' + phaseKey; // top, rather than reordering
  if(sig===tasksHudSig) return;                             // the pool itself (keeps multiplayer sync untouched)
  tasksHudSig = sig;
  const doneCount = S.tasks.filter(t=>t.done).length;
  const sorted = S.tasks.slice().sort((a,b)=>
    (TASK_PHASE_AFFINITY[b.key]===phaseKey) - (TASK_PHASE_AFFINITY[a.key]===phaseKey));
  hud.innerHTML = `<h4>📋 Chores ${doneCount}/${S.tasks.length}</h4>` + sorted.map(t=>{
    const inSeason = !t.done && TASK_PHASE_AFFINITY[t.key]===phaseKey;
    return `<div class="taskRow${t.done?' done':''}${inSeason?' inSeason':''}">${t.done?'✅':t.icon}<span>${t.label}</span></div>`;
  }).join('');
}
export function updateHUD(){
  const P = me();
  updateMpPlayerHud();
  updateTasksHud();
  babies.forEach((b,i)=>{
    const bars = el.babyBars[i]; if(!bars) return;
    if(bars.label && b.name && bars.label.textContent!==b.name) bars.label.textContent = b.name;
    if(b.nameSprite && b.name && b.name!==b.nameLast){        // a guest's own initial name guess gets
      b.mesh.remove(b.nameSprite);                             // replaced by the host's authoritative one
      b.nameSprite.material.map.dispose(); b.nameSprite.material.dispose(); // once the first snapshot lands —
      b.nameSprite = makeSprite(b.name, {font:32});              // rebuild the sprite texture to match
      b.nameSprite.position.set(0,3.35,0); b.nameSprite.scale.multiplyScalar(0.55); b.nameSprite.renderOrder=10;
      b.mesh.add(b.nameSprite); b.nameLast = b.name;
    }
    NEEDS.forEach(k=>{
      const v = b.need[k];
      bars[k].fill.style.width = v+'%';
      bars[k].bar.classList.toggle('low', v<=20);
      bars[k].bar.title = `${NEED_ICON[k]} ${Math.round(v)}%`;    // colorblind-safe readout — the bar itself
    });                                                            // is too narrow for a permanent numeric label
    bars.dirty.fill.style.width = b.dirty+'%';
    bars.dirty.bar.classList.toggle('low', b.dirty>=DIRTY_CRY_THRESHOLD);
    bars.dirty.bar.title = `🧼 ${Math.round(b.dirty)}%`;
  });
  el.cryFill.style.width = S.cry+'%';
  el.cryPct.textContent = Math.round(S.cry)+'%';
  el.cryWrap.classList.toggle('show', S.cry>0);
  if(S.notification){
    el.workAlert.textContent = S.tutorial ? `💻 Work message! Walk to the computer and press E to reply (no rush)`
                                           : `💻 Work message! Reply within ${Math.ceil(S.notifyDeadline)}s`;
    el.workAlert.classList.add('show');
  } else el.workAlert.classList.remove('show');
  const babyLabel = b => babies.length>1 ? b.name : 'Baby';
  const chokingBaby = babies.find(b=>b.choking);
  if(chokingBaby){
    el.chokeAlert.textContent = S.tutorial ? `🚨 Practice: clear the airway — walk to the baby and press E (no rush)`
                                            : `🚨 ${babyLabel(chokingBaby)}'s choking! Clear the airway within ${Math.ceil(chokingBaby.chokeDeadline)}s!`;
    el.chokeAlert.classList.add('show');
  } else el.chokeAlert.classList.remove('show');
  if(P.backPainTimer>0){
    el.backPainAlert.textContent = `🤕 Back seized up! Frozen in place (${P.backPainTimer.toFixed(1)}s)`;
    el.backPainAlert.classList.remove('warn'); el.backPainAlert.classList.add('show');
  } else if(!S.tutorial && P.nextBackPain < BACKPAIN_WARN_SECONDS){
    el.backPainAlert.textContent = `🤕 Your back's starting to twinge... stretch it out at the bed?`;
    el.backPainAlert.classList.add('warn'); el.backPainAlert.classList.add('show');
  } else el.backPainAlert.classList.remove('show');
  if(P.bathroomUrge>0){
    el.bathroomAlert.textContent = `🚽 Gotta go! Reach the toilet within ${Math.ceil(P.bathroomUrge)}s`;
    el.bathroomAlert.classList.remove('warn'); el.bathroomAlert.classList.add('show');
  } else if(!S.tutorial && P.nextBathroom < BATHROOM_WARN_SECONDS){
    el.bathroomAlert.textContent = `🚽 Feeling a little pressure... maybe go now?`;
    el.bathroomAlert.classList.add('warn'); el.bathroomAlert.classList.add('show');
  } else el.bathroomAlert.classList.remove('show');
  if(S.packageWaiting){
    el.packageAlert.textContent = `📦 A package was delivered! Grab it before it's stolen (${Math.ceil(S.packageDeadline)}s)`;
    el.packageAlert.classList.add('show');
  } else el.packageAlert.classList.remove('show');
  if(babies.some(b=>b.targetIsOven)){
    el.ovenAlert.textContent = `🔥 ${babies.length>1?'A baby is':'Baby is'} heading for the oven!`;
    el.ovenAlert.classList.add('show');
  } else el.ovenAlert.classList.remove('show');
  const phase = curPhase();
  if(phase){
    el.phaseStat.style.display = '';
    el.phaseIcon.textContent = phase.icon;
    el.phaseLabel.textContent = phase.label;
  } else el.phaseStat.style.display = 'none';
  if(phase && S.phaseBannerTimer>0){
    el.phaseBanner.textContent = phase.banner;
    el.phaseBanner.classList.add('show');
  } else el.phaseBanner.classList.remove('show');
  if(S.milestoneBannerTimer>0){
    el.milestoneBanner.textContent = S.milestoneMsg;
    el.milestoneBanner.classList.add('show');
  } else el.milestoneBanner.classList.remove('show');
  const hp = happiness();
  el.hap.textContent = hp>70?'😄':hp>40?'🙂':hp>15?'😟':'😢';
  el.poo.textContent = '💩 '+P.poo;
  if(S.tutorial){
    el.time.textContent = '∞';
    el.timeLabel.textContent = 'Practice run';
    el.scoreStat.style.display = 'none';
    el.streakStat.style.display = 'none';
  } else if(S.endless){
    const m = Math.floor(S.elapsed/60), s = Math.floor(S.elapsed%60);
    el.time.textContent = m+':'+String(s).padStart(2,'0');
    el.timeLabel.textContent = 'Survived';
    el.scoreStat.style.display = '';
    el.scoreVal.textContent = S.score;
    el.streakStat.style.display = '';
    el.streakVal.textContent = Math.floor(S.streak)+'s';
  } else {
    const m = Math.floor(S.timeLeft/60), s = Math.floor(S.timeLeft%60);
    el.time.textContent = m+':'+String(s).padStart(2,'0');
    el.timeLabel.textContent = 'Mom back in';
    el.scoreStat.style.display = S.dailyChallenge ? '' : 'none';
    if(S.dailyChallenge) el.scoreVal.textContent = S.score;
    el.streakStat.style.display = S.dailyChallenge ? '' : 'none';
    if(S.dailyChallenge) el.streakVal.textContent = Math.floor(S.streak)+'s';
  }

  // interaction prompt — always evaluated against MY OWN position/state, targeting the nearest baby to me
  const k = nearestStationAt(dad.position.x, dad.position.z);
  const mess = nearestMess();
  const {baby:nb, dist:nbd} = nearestBabyAt(dad.position.x, dad.position.z);
  const near = P.holdingBaby<0 && nb && nbd < 2.6;
  let msg = '';
  if(nb && nb.choking){
    if(S.tutorial){
      msg = near ? `🚨 Practice: clear the airway — <kbd>E</kbd>` : `🚨 Head over to the baby to practice clearing its airway`;
    } else {
      msg = near ? `🚨 ${babyLabel(nb)}'s choking! Clear the airway — <kbd>E</kbd> (${Math.ceil(nb.chokeDeadline)}s)`
                 : `🚨 ${babyLabel(nb)} is choking on something! Get there now! (${Math.ceil(nb.chokeDeadline)}s)`;
    }
  } else if(P.backPainTimer>0){
    msg = '';                                    // the top alertsArea banner already covers this — no duplicate here
  } else if(k==='closet'){
    msg = '🚪 Hide in the closet? Ends the game — <kbd>E</kbd>';
  } else if(k==='frontdoor' && S.packageWaiting){
    msg = `📦 Grab the package before it's stolen — <kbd>E</kbd> (${Math.ceil(S.packageDeadline)}s)`;
  } else if(nb && (nb.fallen || nb.burned) && P.holdingBaby<0){
    const hurtMsg = nb.burned ? `🔥 ${babyLabel(nb)} got burned on the oven!` : `😢 ${babyLabel(nb)} fell!`;
    const hurtMsgFar = nb.burned ? `🔥 ${babyLabel(nb)} got burned and is crying — go comfort them!` : `😢 ${babyLabel(nb)} fell and is crying — go pick them up!`;
    msg = near ? `${hurtMsg} Pick them up — <kbd>Space</kbd>` : hurtMsgFar;
  } else if(P.holdingBaby>=0){
    if(k==='cartoon') msg = (S.cartoonsOn?'Cartoons playing':'Turn on cartoons')+' — <kbd>E</kbd> · put baby down <kbd>Space</kbd>';
    else if(k==='shop') msg = 'Open upgrades <kbd>E</kbd> · put baby down <kbd>Space</kbd>';
    else if(k==='playpen') msg = '🔒 Put the baby in the playpen — <kbd>E</kbd> · put baby down <kbd>Space</kbd>';
    else if(k==='bath') msg = babies[P.holdingBaby].bathTimer>0
      ? `🛁 Bathing... (${babies[P.holdingBaby].bathTimer.toFixed(1)}s)`
      : '🛁 Give the baby a bath — <kbd>E</kbd>';
    else if(k==='towel') msg = babies[P.holdingBaby].wet ? '🧺 Dry them off — <kbd>E</kbd>' : '';
    else if(k==='computer') msg = S.notification ? '💻 Reply to the work message — <kbd>E</kbd> · put baby down <kbd>Space</kbd>' : 'Hands full! Put the baby down first — <kbd>Space</kbd>';
    else if(k) msg = 'Hands full! Put the baby down first — <kbd>Space</kbd>';
    else msg = 'Cuddling the baby 🥰 — put down with <kbd>Space</kbd>';
  } else if(P.carrying==='mop'){
    msg = (mess ? '🧹 Clean up the mess — <kbd>E</kbd>' : 'Carrying the mop — find a mess to clean') + ' · <kbd>Q</kbd> drop';
  } else if(P.carrying){
    if(near){
      if(P.carrying==='diaper' && nb.need.diaper > DIAPER_CHANGE_MAX) msg = `Diaper's not dirty enough yet (${Math.round(nb.need.diaper)}%) · <kbd>Q</kbd> drop`;
      else if(P.carrying==='food' && nb.pickyRefusing) msg = `🙅 ${babyLabel(nb)} won't touch food right now — try milk · <kbd>Q</kbd> drop`;
      else msg = (P.carrying==='diaper'?'Change the diaper':'Give the '+P.carrying)+' — <kbd>E</kbd> · <kbd>Q</kbd> drop';
    }
    else msg = `Bring the ${CARRY_ICON[P.carrying]} to the baby — <kbd>Q</kbd> to drop it`;
  } else {
    const armsTired = P.holdStamina < holdMax(P)*ARM_RECOVER_MIN_FRAC;
    if(near && armsTired) msg = '😩 Arms too tired to pick up the baby — give them a moment';
    else if(near) msg = 'Pick up the baby — <kbd>Space</kbd>';
    else if(k==='playpen') msg = '';
    else if(k==='bath') msg = '';
    else if(k==='towel') msg = '';
    else if(k==='shop') msg = 'Open the <kbd>U</kbd>pgrade workbench — <kbd>E</kbd>';
    else if(k==='cartoon') msg = (S.cartoonsOn?'Cartoons playing':'Turn on cartoons')+' — <kbd>E</kbd>';
    else if(k==='computer') msg = S.notification ? '💻 Reply to the work message — <kbd>E</kbd>' : '';
    else if(k==='toilet') msg = P.bathroomUrge>0 ? '🚽 Go now — <kbd>E</kbd>' : (hasTask('toilet') ? '🧽 Clean the toilet — <kbd>E</kbd>' : '🚽 Go now, just in case — <kbd>E</kbd>');
    else if(k==='closet') msg = 'Hide in the closet (ends your shift) — <kbd>E</kbd>';
    else if(k==='frontdoor') msg = '';
    else if(k==='bed') msg = hasTask('bed') ? '🛏️ Tidy the bed — <kbd>E</kbd>' : `🧘 Stretch your back (💩${stretchCost(P)}) — <kbd>E</kbd>`;
    else if(k==='oven') msg = hasTask('oven') ? '🍱 Grab lunch from the oven — <kbd>E</kbd>' : (!S.ovenProofed ? `🔒 Baby-proof the oven (💩${OVEN_PROOF_COST}) — <kbd>E</kbd>` : '');
    else if(k==='sink') msg = hasTask('sink') ? '🚿 Clean the sink — <kbd>E</kbd>' : '';
    else if(k==='kitchensink') msg = hasTask('kitchensink') ? '🍽️ Clean the kitchen sink — <kbd>E</kbd>' : '';
    else if(k==='washer') msg = P.wetPants ? '🧺 Grab clean pants — <kbd>E</kbd>' : '';
    else if(k) msg = `Grab ${NEED_ICON[k]} ${NEED_LABEL[k]||k} — <kbd>E</kbd>`;
    else if(nearestToyDist()<1.8) msg = hasTask('toys') ? '🧸 Put away the toys — <kbd>E</kbd>'
      : (S.toyTidyCooldown<=0 ? '🧸 Tidy small toys, safer for baby — <kbd>E</kbd>' : '');
    else if(mess) msg = '🤢 Ew, a mess — go grab the 🧹 mop';
    else if(P.armsTiredTimer>0) msg = '😩 Your arms gave out — the baby slipped down!';
    else if(S.penEscapedTimer>0) msg = '👶 A baby escaped the playpen!';
    else if(S.missedNotifyTimer>0) msg = '😤 You missed a work message — not great, boss noticed.';
  }
  el.prompt.innerHTML = msg;
  el.prompt.classList.toggle('show', !!msg);

  // carry / holding indicator
  if(P.holdingBaby>=0){
    const pct = Math.max(0, Math.min(100, P.holdStamina/holdMax(P)*100));
    el.carry.innerHTML = `💪 Carrying: 👶 baby<div class="staminaBar${pct<25?' low':''}"><i style="width:${pct}%"></i></div>`;
    el.carry.classList.add('show');
  }
  else if(P.carrying){ el.carry.innerHTML = 'Carrying: '+CARRY_ICON[P.carrying]+' '+P.carrying; el.carry.classList.add('show'); }
  else if(P.wetPants){ el.carry.innerHTML = '💦 Wet pants! Walking slower — find the 🧺 washer'; el.carry.classList.add('show'); }
  else if(P.slowTimer>0){ el.carry.innerHTML = '🐌 Slipped! Walking slower...'; el.carry.classList.add('show'); }
  else if(nb && nb.penned && nbd<2.6){ el.carry.innerHTML = `🔒 Baby in playpen: ${Math.ceil(nb.penTimer)}s`; el.carry.classList.add('show'); }
  else el.carry.classList.remove('show');

  if(!shopEl.classList.contains('hidden')) refreshShop();
}

