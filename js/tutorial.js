/* Guided tutorial walkthrough: step content, step-advance flow, and the practice-run mess spawner. */

import { houseBounds, houseGroup, S, babies, preTutorialDifficulty, setPreTutorialDifficulty, setDifficulty } from './state.js';
import { dad, me, putBabyDown, showMenuScreen } from './main.js';
import { messBlob } from './house/furniture.js';
import { disposeGroup } from './utils.js';
import { Audio } from './audio.js';

export let tutorialStepIdx = 0;
export const tutorialProgress = {};             // flags set by gameplay hooks; each step's own auto() reads one of them
export function spawnTutorialMess(){                          // a single mess to practice mopping, right by the player
  const mx = Math.max(houseBounds.X0+1, Math.min(houseBounds.X1-1, dad.position.x + 1.5));
  const mz = Math.max(houseBounds.Z0+1, Math.min(houseBounds.Z1-1, dad.position.z + 1.5));
  const mesh = messBlob(); mesh.position.set(mx, 0.01, mz); houseGroup.add(mesh);
  S.messes.push({x:mx, z:mz, mesh, playerInside:false});
}
export const TUTORIAL_STEPS = [
  { text:"Welcome! This is a completely safe practice run — nothing here can end the game. Use "+
         "<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> (or arrow keys) to walk Dad around the house. "+
         "Press <b>Next</b> whenever you're ready to move on." },
  { text:"🍎 <b>Food:</b> Walk to the kitchen counter and press <kbd>E</kbd> to grab food, then walk it "+
         "over to the baby and press <kbd>E</kbd> again to feed them.",
    auto:()=>tutorialProgress.fed },
  { text:"🍼 <b>Milk:</b> Grab a bottle from the fridge the same way, then bring it to the baby.",
    auto:()=>tutorialProgress.milk },
  { text:"👶 <b>Diapers:</b> I've made the diaper nice and dirty for practice. Grab a diaper at the "+
         "changing table and bring it to the baby to change them — this is how you earn 💩 poo.",
    onEnter:()=>{ babies[0].need.diaper = 20; },
    auto:()=>tutorialProgress.diaper },
  { text:"📺 <b>Cartoons:</b> Walk up to the TV and press <kbd>E</kbd> to turn it on — it keeps the baby entertained.",
    auto:()=>tutorialProgress.cartoon },
  { text:"💪 <b>Holding the baby:</b> Get close to the baby and press <kbd>Space</kbd> to pick them up — "+
         "watch the stamina bar appear. Your arms tire out over time (upgradeable later), so press "+
         "<kbd>Space</kbd> again to put the baby back down.",
    auto:()=>tutorialProgress.held },
  { text:"🔒 <b>Playpen:</b> Pick the baby up again, carry them to the 🔒 playpen, and press <kbd>E</kbd> to "+
         "place them inside. It's a safe way to free up your hands for a little while — they'll climb out "+
         "on their own eventually.",
    auto:()=>tutorialProgress.penned },
  { text:"🛁 <b>Baths:</b> Babies get dirty — spit-up, an overdue diaper, or just crawling around (watch the "+
         "🧼 meter on their HUD). I've made this one good and dirty. Pick them back up, carry them to the "+
         "🛁 bath, and press <kbd>E</kbd> — you'll be braced in place for a few seconds, but the baby's "+
         "completely safe. Afterwards, carry them straight to the 🧺 towel rack to dry off — that part's "+
         "required too, or they stay wet.",
    onEnter:()=>{ babies[0].penned=false; babies[0].dirty=80; },
    auto:()=>tutorialProgress.toweled },
  { text:"🧹 <b>Messes:</b> I've left a little mess nearby — babies do that sometimes! Only the 🧹 mop can "+
         "clean it up. Grab the mop and press <kbd>E</kbd> on the mess.",
    onEnter:()=>spawnTutorialMess(),
    auto:()=>tutorialProgress.mopped },
  { text:"💻 <b>Work:</b> You're still on the clock while babysitting — I've triggered a work message now. "+
         "Walk to the computer and press <kbd>E</kbd> to reply. Take your time.",
    onEnter:()=>{ S.notification=true; S.notifyDeadline=9999; },
    auto:()=>tutorialProgress.notif },
  { text:"🚨 <b>Choking:</b> An unattended baby on the floor can occasionally swallow something small. I've "+
         "triggered that now too — walk over and press <kbd>E</kbd> to clear the airway. No rush here, but "+
         "in a real run you'd need to hurry!",
    onEnter:()=>{ if(me().holdingBaby>=0) putBabyDown(); babies[0].choking=true; babies[0].chokeDeadline=9999; },
    auto:()=>tutorialProgress.choke },
  { text:"🤕 <b>Back pain:</b> Randomly, Dad's back can seize up and freeze him in place for a few seconds. "+
         "Buy 💊 Pain Medication at the workbench to shorten it. (Not triggering it right now — just "+
         "something to watch for out there!)" },
  { text:"🔥🚪 <b>Hazards to avoid:</b> An unattended baby that wanders to the 🔥 oven gets burned. And "+
         "whatever you do, never hide in the 🚪 closet — it instantly ends a real game!" },
  { text:"📦 <b>Packages:</b> Every so often a delivery gets left at the 🚪 front door — walk over and press "+
         "<kbd>E</kbd> to bring it in before it's stolen. Miss too many in a real run and Mom notices the "+
         "empty boxes on the porch." },
  { text:"💩 <b>Upgrades:</b> Diaper changes bank 💩 poo. I've topped up your balance — press <kbd>U</kbd> "+
         "or visit the 🛠️ workbench and buy an upgrade.",
    onEnter:()=>{ me().poo = Math.max(me().poo, 20); },
    auto:()=>tutorialProgress.bought },
  { text:"🏆 <b>Winning & losing:</b> Unlike here, a real run keeps score. The longer the baby cries, the "+
         "higher the 😭 cry-o-meter climbs. If that meter ever "+
         "fills up completely, Mom gets a panicked phone call and it's game over. Keep it under control until "+
         "the clock runs out (or, in Endless Mode, for as long as you can) and you win instead.<br><br>"+
         "That's the whole job! Press <b>Start Playing</b> below to pick a difficulty and begin your first "+
         "real shift." },
];
export function tutorialStepEnter(i){
  // clear out any demo-only state a skipped step left dangling (e.g. clicking Next past the work
  // message or choking demo without actually resolving it) so leaving a step always leaves it clean
  S.notification = false;
  if(babies[0]){ babies[0].choking = false; babies[0].chokeDeadline = 0; }
  if(S.messes.length) S.messes.slice().forEach(m=>{ houseGroup.remove(m.mesh); disposeGroup(m.mesh); });
  S.messes.length = 0;
  tutorialStepIdx = i;
  for(const k in tutorialProgress) delete tutorialProgress[k];
  const step = TUTORIAL_STEPS[i];
  if(step.onEnter) step.onEnter();
  document.getElementById('tutorialStepNum').textContent = `Step ${i+1} of ${TUTORIAL_STEPS.length}`;
  document.getElementById('tutorialText').innerHTML = step.text;
  document.getElementById('tutorialNextBtn').textContent = (i===TUTORIAL_STEPS.length-1) ? 'Start Playing ▶' : 'Next ▶';
}
export function tutorialAdvance(){
  if(tutorialStepIdx >= TUTORIAL_STEPS.length-1){ endTutorial(true); return; }
  Audio.chime();
  tutorialStepEnter(tutorialStepIdx+1);
}
export function endTutorial(goToPlay){
  S.mode='menu';
  document.getElementById('tutorialPanel').classList.add('hidden');
  setDifficulty(preTutorialDifficulty || 'veteran'); setPreTutorialDifficulty(null);
  document.getElementById('intro').classList.remove('hidden');
  showMenuScreen(goToPlay ? 'diffScreen' : 'mainMenu');
}
document.getElementById('tutorialNextBtn').addEventListener('click', tutorialAdvance);
document.getElementById('tutorialExitBtn').addEventListener('click', ()=>endTutorial(false));

