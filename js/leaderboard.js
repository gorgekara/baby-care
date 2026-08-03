/* Firebase leaderboard reads/writes (endless + daily) and the main-menu leaderboard preview. */

import { fbDb } from './main.js';
import { escapeHtml } from './utils.js';
import { DIFFICULTIES, DIFF_ICON } from './config.js';
import { dailyDateKey } from './persistence.js';

// ---- endless-mode global leaderboard (Firebase Realtime Database, top 12) ----
export const PROFANITY_LIST = ['fuck','shit','bitch','asshole','bastard','cunt','dick','pussy','piss',
  'slut','whore','nigger','nigga','fag','faggot','retard','rape','cock','twat','wank','damn','hell'];
export function containsProfanity(s){
  const norm = s.toLowerCase().replace(/[^a-z]/g,'');
  return PROFANITY_LIST.some(w=>norm.includes(w));
}
export async function submitLeaderboardScore(name, score, diffKey){
  if(!fbDb) throw new Error('offline');
  await fbDb.ref('leaderboard').push({name, score, difficulty:diffKey, ts:Date.now()});
}
export async function fetchLeaderboardTop(n){
  if(!fbDb) return null;
  const snap = await fbDb.ref('leaderboard').orderByChild('score').limitToLast(n).once('value');
  const rows = [];
  snap.forEach(child=>{ rows.push(child.val()); });
  rows.sort((a,b)=>b.score-a.score);
  return rows;
}

// ---- daily seed challenge: same date -> same seed -> same house AND same hazard timing for everyone,
// since buildHouse(seed) already derives both houseRng and runRng from one shared integer seed ----

// ---- daily challenge's own leaderboard branch — same shape as the endless one, scoped per date so
// different days' (different-difficulty) runs never get compared against each other ----
export function dailyLeaderboardPath(dateKey){ return `dailyLeaderboard/${dateKey||dailyDateKey()}`; }
export async function submitDailyScore(name, score, dateKey){
  if(!fbDb) throw new Error('offline');
  await fbDb.ref(dailyLeaderboardPath(dateKey)).push({name, score, ts:Date.now()});
}
export async function fetchDailyLeaderboardTop(n, dateKey){
  if(!fbDb) return null;
  const snap = await fbDb.ref(dailyLeaderboardPath(dateKey)).orderByChild('score').limitToLast(n).once('value');
  const rows = [];
  snap.forEach(child=>{ rows.push(child.val()); });
  rows.sort((a,b)=>b.score-a.score);
  return rows;
}
export async function renderDailyLeaderboard(){
  const el = document.getElementById('dailyLeaderboardList');
  if(!el) return;
  el.innerHTML = '<div class="lbEmpty">Loading…</div>';
  let rows;
  try{ rows = await fetchDailyLeaderboardTop(12); }catch(e){ rows = null; }
  if(!rows){ el.innerHTML = '<div class="lbEmpty">Leaderboard unavailable right now — check your connection.</div>'; return; }
  if(!rows.length){ el.innerHTML = '<div class="lbEmpty">No scores yet today — be the first! 🏆</div>'; return; }
  el.innerHTML = rows.map((r,i)=>`<div class="lbRow">
      <div class="lbRank">${i+1}</div>
      <div class="lbName">${escapeHtml(r.name||'Dad')}</div>
      <div class="lbScore">${r.score}</div>
    </div>`).join('');
}

/* ---------- Multiplayer core: players (per-player poo/upgrades/carry state) & babies (shared) ----------
   Solo play is just the degenerate case of this model: one entry in `players` (me), `isHost` always
   true, one baby in `babies`, and no Firebase traffic — so nothing about single-player behavior changes. */

export const SAMPLE_LEADERBOARD_SCORES = [
  {name:'mrk', score:842, difficulty:'king'},
  {name:'sleepydad', score:715, difficulty:'king'},
  {name:'J.R.', score:604, difficulty:'veteran'},
  {name:'toddlerwrangler', score:588, difficulty:'king'},
  {name:'kt', score:471, difficulty:'veteran'},
  {name:'Priya', score:390, difficulty:'king'},
  {name:'nightshift', score:322, difficulty:'veteran'},
  {name:'B', score:265, difficulty:'first'},
  {name:'dadbod', score:198, difficulty:'veteran'},
  {name:'Theo', score:143, difficulty:'first'},
];
export async function renderMenuLeaderboardPreview(){
  const el2 = document.getElementById('menuLbList');
  el2.innerHTML = '<div class="lbEmpty">Loading…</div>';
  let rows;
  try{ rows = await fetchLeaderboardTop(10); }catch(e){ rows = null; }
  if(!rows){ el2.innerHTML = '<div class="lbEmpty">Leaderboard unavailable right now.</div>'; return; }
  const blended = rows.concat(SAMPLE_LEADERBOARD_SCORES).sort((a,b)=>b.score-a.score).slice(0,10);
  el2.innerHTML = blended.map((r,i)=>`<div class="lbRow">
      <div class="lbRank">${i+1}</div>
      <div class="lbDiff" title="${(DIFFICULTIES[r.difficulty]||{label:''}).label}">${DIFF_ICON[r.difficulty]||'🍼'}</div>
      <div class="lbName">${escapeHtml(r.name||'Dad')}</div>
      <div class="lbScore">${r.score}</div>
    </div>`).join('');
}

