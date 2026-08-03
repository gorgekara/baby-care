/* localStorage-backed settings, meta-progression profile, and daily-challenge date/seed helpers. */

import { hashStringToSeed } from './utils.js';

export const GAME_SETTINGS_KEY = 'babycare_settings_v1';
export const DEFAULT_KEYBINDS = {up:'w', down:'s', left:'a', right:'d', interact:'e', hold:' ', drop:'q',
  shop:'u', mute:'m', rotateLeft:'[', rotateRight:']'};
export function defaultGameSettings(){
  return {musicVol:0.14, sfxVol:0.9, reducedMotion:false, hudScale:1, camRotation:0, keybinds:Object.assign({},DEFAULT_KEYBINDS)};
}
export function getGameSettings(){
  try{
    const raw = localStorage.getItem(GAME_SETTINGS_KEY);
    if(!raw) return defaultGameSettings();
    const parsed = JSON.parse(raw);
    return Object.assign(defaultGameSettings(), parsed, {keybinds:Object.assign({},DEFAULT_KEYBINDS,parsed.keybinds||{})});
  }catch(e){ return defaultGameSettings(); }
}
export function saveGameSettings(s){ try{ localStorage.setItem(GAME_SETTINGS_KEY, JSON.stringify(s)); }catch(e){} }
export let gameSettings = getGameSettings();
// prefers-reduced-motion is an OS-level signal, but a manual Settings toggle can also force it on
// regardless of that — matched against with OR, never overridden back off by the OS setting alone
export const prefersReducedMotionMQ = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
export function reducedMotionActive(){ return gameSettings.reducedMotion || (prefersReducedMotionMQ && prefersReducedMotionMQ.matches); }

export function highScoreKey(difficulty){ return `babycare_hs_${difficulty}`; }
export function getHighScore(difficulty){ try{ return +(localStorage.getItem(highScoreKey(difficulty))||0); }catch(e){ return 0; } }
export function setHighScore(difficulty, v){ try{ localStorage.setItem(highScoreKey(difficulty), String(v)); }catch(e){} }

export const PROFILE_KEY = 'babycare_profile_v1';
export function defaultProfile(){
  return {xp:0, runsPlayed:0, runsSurvived:0, diaperChanges:0, cuddles:0, baths:0, hazardsHandled:0, colorIdx:0};
}
export function getProfile(){
  try{ const raw = localStorage.getItem(PROFILE_KEY); return raw ? Object.assign(defaultProfile(), JSON.parse(raw)) : defaultProfile(); }
  catch(e){ return defaultProfile(); }
}
export function saveProfile(p){ try{ localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); }catch(e){} }
export const DAD_MAX_LEVEL = 20;
export function xpThreshold(lvl){ return Math.round(60 * lvl * lvl); }   // lifetime XP needed to REACH this level
export function dadLevelForXp(xp){
  let lvl=1; while(lvl<DAD_MAX_LEVEL && xp>=xpThreshold(lvl+1)) lvl++; return lvl;
}
export function dadLevelProgress(xp){                                    // {lvl, cur, need, frac, maxed} for a progress bar
  const lvl = dadLevelForXp(xp);
  if(lvl>=DAD_MAX_LEVEL) return {lvl, cur:1, need:1, frac:1, maxed:true};
  const prev = lvl===1?0:xpThreshold(lvl), next = xpThreshold(lvl+1);
  return {lvl, cur:xp-prev, need:next-prev, frac:(xp-prev)/(next-prev), maxed:false};
}

export const DAILY_DIFFICULTY_ROTATION = ['first','veteran','king'];  // which DIFFICULTIES key each day rotates to
export const DAILY_EPOCH_MS = Date.UTC(2024,0,1);                     // arbitrary fixed reference point — day 0
export function dailyDateKey(d){                        // 'YYYY-MM-DD' in UTC — stable across every player's timezone
  d = d || new Date();
  return d.getUTCFullYear()+'-'+String(d.getUTCMonth()+1).padStart(2,'0')+'-'+String(d.getUTCDate()).padStart(2,'0');
}
export function dailyDayIndex(d){                       // whole UTC days since DAILY_EPOCH_MS — drives the rotation
  d = d || new Date();
  const utcMidnight = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.floor((utcMidnight - DAILY_EPOCH_MS) / 86400000);
}
export function dailyDifficulty(d){                     // same rotation for every player, no per-player randomness
  const n = DAILY_DIFFICULTY_ROTATION.length;
  const idx = ((dailyDayIndex(d) % n) + n) % n;  // defensive: stays in range even before the epoch
  return DAILY_DIFFICULTY_ROTATION[idx];
}
export function dailySeed(dateKey){ return hashStringToSeed('babycare-daily-'+(dateKey||dailyDateKey())); }
export function msUntilNextUtcMidnight(){
  const now = new Date();
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()+1);
  return next - now.getTime();
}
export function dailyStorageKey(dateKey){ return `babycare_daily_${dateKey||dailyDateKey()}`; }
export function getDailyResult(dateKey){                // {score,elapsed,poo,reason,ts}, or null if not played yet
  try{ const raw = localStorage.getItem(dailyStorageKey(dateKey)); return raw ? JSON.parse(raw) : null; }
  catch(e){ return null; }
}
export function setDailyResult(dateKey, result){
  try{ localStorage.setItem(dailyStorageKey(dateKey), JSON.stringify(result)); }catch(e){}
}

