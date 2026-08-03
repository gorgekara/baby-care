/* Static game-tuning data: difficulty knobs, upgrades, traits, day phases, flavor text. */

import { shuffle, escapeHtml } from './utils.js';

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCObo4xDpcIxNBCU2BRAHyM3s0jq3kGdiE",
  authDomain: "baby-care-66bea.firebaseapp.com",
  databaseURL: "https://baby-care-66bea-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "baby-care-66bea",
  storageBucket: "baby-care-66bea.firebasestorage.app",
  messagingSenderId: "1014032188493",
  appId: "1:1014032188493:web:048b3ac88f051312a1c804",
};

export const NEEDS = ['food','milk','diaper','cartoon'];
export const NEED_ICON = {food:'🍎',milk:'🍼',diaper:'👶',cartoon:'📺',mop:'🧹'};
export const BABY_NAMES = ['Milo','Ivy','Theo','Nora','Max','Luna','Leo','Zoe','Finn','Ruby','Eli','Mia',
  'Jax','Ada','Remy','Wren','Kai','Nova','Otis','Pearl','Sam','Iris','Hugo','June'];
export const NEED_LABEL = {diaper:'a clean diaper', mop:'the mop'};
export const CARRY_ICON = {food:'🍲',milk:'🍼',diaper:'🧷',mop:'🧹'};
export const BASE_DECAY = {food:2.1, milk:2.3, diaper:1.7, cartoon:2.7};
export const UPGRADES = {
  food:   {icon:'🍲', title:'Tasty Food',    desc:'Baby stays full longer (slower food drain)', base:5},
  milk:   {icon:'🍼', title:'Bigger Bottle', desc:'Less thirsty (slower milk drain)',           base:5},
  diaper: {icon:'🧷', title:'Premium Diapers',desc:'Collects more 💩 per change',                base:6},
  cartoon:{icon:'📺', title:'Fun Cartoons',   desc:'Holds attention longer (slower drain)',      base:5},
  speed:  {icon:'👟', title:'Quick Steps',   desc:'Dad moves faster around the house',          base:6},
  arms:   {icon:'💪', title:'Strong Arms',   desc:'Carry the baby longer before your arms give out', base:5},
  backpain:{icon:'💊', title:'Pain Medication', desc:'Shortens back-pain episodes and cheapens stretching at the bed', base:5},
};
export const MOVE_SPEED = 7.2;
export const DIAPER_CHANGE_MAX = 40; // diaper need must have decayed to at most this % before a change is allowed
export const ARM_UPGRADE_SECONDS = 3;    // seconds of extra hold time per Strong Arms level
export const ARM_RECOVER_MIN_FRAC = 0.2; // can't pick the baby back up until arms recover to at least this fraction
export const CHOKE_WARN_SECONDS = 1.5;   // cough + 😮 mood this long before a choking episode actually starts
export const VOMIT_WARN_SECONDS = 2;     // culprit baby goes queasy this long before the mess appears
export const BACKPAIN_WARN_SECONDS = 6;  // amber pre-warning window before a back-pain episode fires
export const BATHROOM_WARN_SECONDS = 8;  // amber pre-warning window before a bathroom urge opens
export const OVEN_PROOF_COST = 8;        // one-time 💩 cost to zero out ovenChance for the rest of the run
export const STRETCH_BASE_COST = 4;      // 💩 cost to preemptively reset nextBackPain at the bed (discounted by Pain Medication)
export const TOY_TIDY_CHOKE_BONUS = 12;  // seconds added to every baby's chokeTimer per toy-tidy action
export const TOY_TIDY_COOLDOWN_SECONDS = 20; // can't re-trigger the choke-timer bonus more often than this
export const STREAK_HEALTHY_THRESHOLD = 60; // every need on every baby must stay above this to keep the streak alive
export const STREAK_SCORE_CAP = 60;      // seconds of streak to reach the max +200% score multiplier
export const CRY_HISTORY_INTERVAL = 2;   // seconds between cry-o-meter samples kept for the end-card sparkline

// ---- bath & the dirty meter: gives the bathroom's tub/shower a real job. Fed by vomit, an overdue
// diaper, and ordinary unattended floor time; a bath (Dad braces in place, holding the baby, for
// BATH_SECONDS) resets it, but leaves the baby wet until a follow-up trip to the towel rack. ----
export const DIRTY_VOMIT_ADD = 40;        // dirty gained in one shot when this baby is the vomit culprit
export const DIRTY_DIAPER_RATE = 2.2;     // dirty/sec while a change is overdue (need.diaper <= DIAPER_CHANGE_MAX)
export const DIRTY_CRAWL_RATE = 0.6;      // dirty/sec while unattended on the floor (held/penned babies don't accrue it)
export const DIRTY_CRY_THRESHOLD = 70;    // at/above this, dirty counts toward the cry-o-meter like an empty need
export const BATH_SECONDS = 6;            // how long a bath pins Dad in place, holding the baby, once started
export const WET_CRY_MUL = 1.15;          // small cry-fill bump while wet and waiting on a towel

// ---- meta-progression: a persistent Dad Level (see getProfile()/dadLevelForXp() below) earned from
// lifetime totals, independent of any single run. Every run — win or lose — banks some XP, so a failed
// run still visibly advances something. ----
export const XP_PER_DIAPER = 2, XP_PER_CUDDLE = 1, XP_PER_BATH = 3, XP_PER_HAZARD_HANDLED = 4;
export const XP_PER_SURVIVAL_SEC = 0.1, XP_WIN_BONUS = 50;
export const UPGRADE_LEVEL_CAP_BASE = 3;  // every upgrade's level cap, at Dad Level 1
export const UPGRADE_LEVEL_CAP_MAX = 6;   // the cap the base can grow to, one Dad Level unlock at a time
export const UPGRADE_CAP_UNLOCK_EVERY = 4;// +1 to the cap every this-many Dad Levels, until UPGRADE_LEVEL_CAP_MAX
export const STARTING_POO_PER_LEVEL = 1;  // solo-only starting 💩, capped below — see startingPooBonus()
export const STARTING_POO_CAP = 10;
export const COSMETIC_UNLOCK_BASE = 5;    // outfit colors unlocked at Dad Level 1, +1 per level after that

// ---- baby personality: 1-2 seeded traits per baby so runs on the same difficulty stop feeling
// interchangeable. Every trait leans on a system that already exists rather than inventing a new one. ----
export const CLINGY_DISTANCE = 9;        // units from Dad before a clingy baby starts fussing, held or not
export const CLIMBER_OVEN_MUL = 2.2;     // multiplies the oven-approach chance in pickBabyTarget()
export const CLIMBER_FALL_MUL = 0.55;    // multiplies the walk-mode fall timer range — trips more often
export const CLIMBER_PEN_MUL = 0.55;     // multiplies playpen dwell time — escapes sooner
export const PICKY_ACCEPT_MIN = 35, PICKY_ACCEPT_MAX = 65;   // seconds between refusal stretches
export const PICKY_REFUSE_MIN = 15, PICKY_REFUSE_MAX = 28;   // seconds a refusal stretch lasts
export const FAVORITE_TOY_JOY_MUL = 2;   // joy-gain multiplier while playing with the favorite toy specifically
export const FAVORITE_TOY_PICK_CHANCE = 0.6; // how often pickBabyTarget() prefers it over a random toy
export const DIAPER_MACHINE_DECAY_MUL = 1.6; // diaper need drains this much faster
export const DIAPER_MACHINE_POO_MUL = 1.4;   // and pays out this much more 💩 per change
export const CUDDLE_BUG_JOY_RATE = 0.4;      // joy/sec gained just from holding a cuddle-bug baby
export const BABY_TRAITS = {
  clingy:       {icon:'🥺', label:'Clingy',        desc:'Fusses when Dad wanders too far away'},
  climber:      {icon:'🧗', label:'Climber',       desc:'More prone to oven mishaps and trips; escapes the playpen sooner'},
  picky:        {icon:'🥣', label:'Picky Eater',   desc:'Refuses food for stretches — lean on milk instead'},
  favoriteToy:  {icon:'🧸', label:'Favorite Toy',  desc:'One particular toy soothes them twice as well'},
  diaperMachine:{icon:'🧷', label:'Diaper Machine',desc:'Dirties diapers faster, but pays out more 💩 per change'},
  cuddleBug:    {icon:'🥰', label:'Cuddle Bug',    desc:'Builds happiness just from being held'},
};
export const TRAIT_KEYS = Object.keys(BABY_TRAITS);
// every 1-trait and 2-trait combination, precomputed once; rollBabyTraitSets() shuffles this list
// with the seeded RNG and hands out unique combos so a multi-baby round never rolls the same
// personality twice (21 possible combos comfortably covers the 8-baby multiplayer cap)
export const TRAIT_COMBOS = (()=>{
  const combos = TRAIT_KEYS.map(k=>[k]);
  for(let i=0;i<TRAIT_KEYS.length;i++) for(let j=i+1;j<TRAIT_KEYS.length;j++) combos.push([TRAIT_KEYS[i],TRAIT_KEYS[j]]);
  return combos;
})();
export function rollBabyTraitSets(count){
  const shuffled = shuffle(TRAIT_COMBOS.slice());
  const picks = [];
  for(let i=0;i<count;i++) picks.push(shuffled[i % shuffled.length]);
  return picks;
}
export function traitIconsHtml(traits){ return (traits||[]).map(k=>BABY_TRAITS[k].icon).join(''); }
// each trait gets its own hoverable badge with a custom CSS tooltip (not just a native `title`,
// which is slow to appear, tiny, and easy to miss on a small HUD icon) showing that trait's own
// name+description — clearer than one combined tooltip for a baby with two traits at once
export function traitBadgesHtml(traits){
  return (traits||[]).map(k=>{
    const t = BABY_TRAITS[k];
    return `<span class="traitBadge" data-tt="${escapeHtml(t.label+': '+t.desc)}">${t.icon}</span>`;
  }).join('');
}

// ---- difficulty: picked on the intro screen, locked in for the run ----
export const DIFFICULTIES = {
  first:   {key:'first', label:'First Born', gameLen:225,
    decayMul:0.80, cryFillMul:0.75, cryDrainMul:1.15, vomitMin:100, vomitMax:155,
    walkChance:0.26, fallMin:7, fallMax:15, needStart:{food:95,milk:92,diaper:95,cartoon:88},
    holdBase:13, holdRecoverMul:1.3, ovenChance:0.03, penSeconds:27,
    notifyMin:38, notifyMax:60, notifyWindow:20, notifyPenalty:14, fireLimit:4,
    backPainMin:140, backPainMax:210, backPainCrippleBase:1.9,
    chokeMin:58, chokeMax:92, chokeWindow:10,
    bathroomMin:135, bathroomMax:195, bathroomWindow:30,
    packageMin:100, packageMax:170, packageWindow:24, dirtyMul:0.7},
  veteran: {key:'veteran', label:"Been There, Done That", gameLen:285,
    decayMul:1.12, cryFillMul:1.12, cryDrainMul:0.9, vomitMin:80, vomitMax:130,
    walkChance:0.4, fallMin:5, fallMax:10, needStart:{food:92,milk:85,diaper:90,cartoon:78},
    holdBase:8.5, holdRecoverMul:1.18, ovenChance:0.06, penSeconds:19,
    notifyMin:26, notifyMax:44, notifyWindow:14, notifyPenalty:19, fireLimit:3,
    backPainMin:104, backPainMax:160, backPainCrippleBase:3.0,
    chokeMin:45, chokeMax:74, chokeWindow:7.5,
    bathroomMin:98, bathroomMax:150, bathroomWindow:24,
    packageMin:80, packageMax:140, packageWindow:19, dirtyMul:1},
  king:    {key:'king', label:'King', gameLen:345,
    decayMul:1.55, cryFillMul:1.5, cryDrainMul:0.65, vomitMin:60, vomitMax:95,
    walkChance:0.55, fallMin:3, fallMax:7, needStart:{food:78,milk:72,diaper:80,cartoon:62},
    holdBase:5, holdRecoverMul:1.05, ovenChance:0.10, penSeconds:13,
    notifyMin:16, notifyMax:30, notifyWindow:9, notifyPenalty:24, fireLimit:3,
    backPainMin:68, backPainMax:116, backPainCrippleBase:4.3,
    chokeMin:33, chokeMax:54, chokeWindow:6,
    bathroomMin:74, bathroomMax:115, bathroomWindow:19,
    packageMin:60, packageMax:110, packageWindow:14, dirtyMul:1.4},
  // practice mode: needs never decay and no random hazard can fire — every mechanic is either
  // explained as plain text or triggered deliberately by the tutorial script, at the player's own pace
  tutorial: {key:'tutorial', label:'Tutorial', gameLen:Infinity,
    decayMul:0, cryFillMul:0, cryDrainMul:1, vomitMin:9999, vomitMax:9999,
    walkChance:0, fallMin:9999, fallMax:9999, needStart:{food:100,milk:100,diaper:100,cartoon:100},
    holdBase:40, holdRecoverMul:1.3, ovenChance:0, penSeconds:60,
    notifyMin:9999, notifyMax:9999, notifyWindow:9999, notifyPenalty:0, fireLimit:9999,
    backPainMin:9999, backPainMax:9999, backPainCrippleBase:0,
    chokeMin:9999, chokeMax:9999, chokeWindow:9999,
    bathroomMin:9999, bathroomMax:9999, bathroomWindow:9999,
    packageMin:9999, packageMax:9999, packageWindow:9999, dirtyMul:0},
};

export const TASK_POOL = [                                       // each ties to a real station so completing it is
  {key:'bed', icon:'🛏️', label:'Tidy the bed'},           // just "walk over and press E" like everything else
  {key:'oven', icon:'🍱', label:'Get lunch out of the oven'},
  {key:'toilet', icon:'🚽', label:'Clean the toilet'},
  {key:'sink', icon:'🚿', label:'Clean the sink'},
  {key:'kitchensink', icon:'🍽️', label:'Clean the kitchen sink'},
  {key:'toys', icon:'🧸', label:'Put away the toys'},      // the one exception — any toy will do, no station
  {key:'bath', icon:'🛁', label:'Give the baby a bath'},   // the other exception — needs holdingBaby>=0 first
];
// which day phase each chore is thematically "in season" during — Chores Mode uses this to sort the
// current phase's matching chore to the top of the checklist rather than changing which chores exist
export const TASK_PHASE_AFFINITY = {bed:'morning', sink:'morning', oven:'lunch', kitchensink:'lunch',
  toys:'afternoon', toilet:'evening', bath:'evening'};

// ---- day phases: same knobs as DIFFICULTIES, reweighted across four labeled stretches of the run.
// Boundaries are absolute seconds (not fractions of gameLen) so Morning and Lunch feel the same length
// regardless of difficulty; Afternoon absorbs whatever's left before the fixed-length Evening, so shorter
// runs get a shorter afternoon and longer ones get a longer breather. Endless mode has no natural end, so
// it reuses the same Morning/Lunch boundaries with a flat Afternoon length instead, then repeats forever.
export const PHASE_MORNING_SECONDS = 70;
export const PHASE_LUNCH_SECONDS = 60;
export const PHASE_EVENING_SECONDS = 60;      // always the run's last 60s of real time — "mom's 60s out"
export const PHASE_AFTERNOON_ENDLESS_SECONDS = 90;  // endless mode's stand-in Afternoon length (no "time left" to anchor off)
export const PHASE_BANNER_SECONDS = 4.5;      // how long the transition banner stays up

export const MILESTONE_MIN = 90, MILESTONE_MAX = 220;
export const MILESTONE_RETRY_SECONDS = 12;    // recheck soon (not a full interval) if no baby was eligible
export const MILESTONE_BANNER_SECONDS = 5;

export const PHASE_DEFAULTS = {decayMul:1, foodDecayMul:1, ovenMul:1, notifyMul:1, cryFillMul:1,
  vomitMul:1, chokeMul:1, fallMul:1, backpainMul:1, bathroomMul:1};
export const PHASES = [
  {key:'morning', label:'Morning', icon:'🌅',
    decayMul:1.15, notifyMul:0,
    banner:'🌅 Morning — needs drain fast, but work stays quiet for now'},
  {key:'lunch', label:'Lunch', icon:'🍽️',
    foodDecayMul:2, ovenMul:3.2, notifyMul:0,
    banner:'🍽️ Lunchtime — food drains fast and the oven is a real danger now'},
  {key:'afternoon', label:'Afternoon', icon:'🕑',
    decayMul:0.85, ovenMul:0.4, notifyMul:2.5,
    banner:'🕑 Afternoon — a bit of a breather, but every ping you dodged this morning piles up now'},
  {key:'evening', label:'Evening', icon:'🌆',
    decayMul:1.3, ovenMul:1.4, notifyMul:1.2, cryFillMul:1.2,
    vomitMul:1.3, chokeMul:1.3, fallMul:1.3, backpainMul:1.3, bathroomMul:1.3,
    banner:"🌆 Evening — everything at once. Mom's almost home!"},
].map(p=>({...PHASE_DEFAULTS, ...p}));
export function phaseBoundaries(gameLen){
  const morningEnd = PHASE_MORNING_SECONDS;
  const lunchEnd = morningEnd + PHASE_LUNCH_SECONDS;
  if(!isFinite(gameLen)){                       // endless: fixed repeating cycle, Afternoon gets a flat length
    const eveningStart = lunchEnd + PHASE_AFTERNOON_ENDLESS_SECONDS;
    return {morningEnd, lunchEnd, eveningStart, cycleLen: eveningStart + PHASE_EVENING_SECONDS};
  }
  const eveningStart = Math.max(lunchEnd, gameLen - PHASE_EVENING_SECONDS); // Afternoon fills whatever's left
  return {morningEnd, lunchEnd, eveningStart, cycleLen: gameLen};
}
export function phaseIndexAt(elapsed, b){
  const t = elapsed % b.cycleLen;                       // no-op for timed runs; wraps forever for endless
  if(t < b.morningEnd) return 0;
  if(t < b.lunchEnd) return 1;
  if(t < b.eveningStart) return 2;
  return 3;
}

export const DIFF_ICON = {first:'🍼', veteran:'😅', king:'👑'};

export const HAZARD_ICON = {vomit:'🤢', choke:'😵', burn:'🔥', fall:'🤕', backpain:'💥', bathroom:'🚽'};

export const NEEDS_HAZARD_ORDER = ['choke','burn','fall','vomit','backpain','bathroom'];

export const GAMEOVER_FLAVOR = {
  lose: {icon:'📞😱', title:'You called Mommy!',
    body:"The crying got to be too much and you had to phone Mom for backup. She's not thrilled she had to leave her shopping…"},
  hide: {icon:'🙈🚪', title:'You Hid in the Closet!',
    body:"The baby needed you and you climbed in with the sweaters instead. The crying didn't stop — you just stopped listening. You're a coward."},
  fired: {icon:'💻📤', title:"You've Been Fired!",
    body:"Too many missed messages and your boss finally had enough — you're let go, mid-shift, with a baby on your hip. Remote work and babysitting don't mix as well as you thought."},
  choke: {icon:'🚑😰', title:'The Baby Choked!',
    body:"You didn't clear the airway in time. Panicked, you're rushing to the ER — Mom is going to want a very long explanation for this one."},
};
export const PACKAGES_DISAPPOINTED_THRESHOLD = 2;  // this many stolen packages sours an otherwise-clean win
export const WIN_FLAVOR = {
  proud: {icon:'🎉🏠', title:"Mom's Home!",
    body:"You did it — you kept the baby happy the whole time. Mom walks in with the groceries and finds a calm, content little one. <b>Dad of the year.</b>"},
  disappointed: {icon:'🏠😕', title:"Mom's Home... Sort Of",
    body:"You kept the baby alive and happy, sure — but Mom also came home to an empty porch and a stack of \"where's my package?\" emails. <b>Dad of the year, minus a few stars.</b>"},
};

