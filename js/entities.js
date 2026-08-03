/* Dad + baby model builders, poses/animation, mood, carry/throw items, and spawnBabies(). */

import { box, sph, mat, makeSprite, pick, shuffle, random0to1, disposeGroup } from './utils.js';
import { label } from './house/build.js';
import { spawnDad, spawnBaby, babies, setBabies, S, myId, actingPlayerId, toys } from './state.js';
import { scene, dad, buildBabyNeedsHUD } from './main.js';
import { freshBaby, actingPlayer, actingPos } from './gameplay.js';
import { CARRY_ICON, BABY_NAMES, rollBabyTraitSets } from './config.js';
import { Audio } from './audio.js';
import { getProfile } from './persistence.js';

/* ---------- Character builders ---------- */
export function buildDad(bodyColor, legColor){
  bodyColor = bodyColor || '#4f7ad6'; legColor = legColor || '#3a4a8a';
  const g = new THREE.Group();
  const legL = box(0.42,0.9,0.42,legColor); legL.position.set(-0.26,0.45,0); g.add(legL);
  const legR = box(0.42,0.9,0.42,legColor); legR.position.set(0.26,0.45,0); g.add(legR);
  // torso/arms/head sit in their own pivot group at hip height, so a back-pain episode can bend
  // the upper body forward (rotation.x) around the hips instead of the whole figure tilting from the feet
  const HIP_Y = 0.9;
  const upper = new THREE.Group(); upper.position.y = HIP_Y; g.add(upper);
  const body = box(1.15,1.15,0.75,bodyColor); body.position.y=1.5-HIP_Y; upper.add(body);
  const armL = box(0.3,1,0.3,bodyColor); armL.position.set(-0.72,1.55-HIP_Y,0); upper.add(armL);
  const armR = box(0.3,1,0.3,bodyColor); armR.position.set(0.72,1.55-HIP_Y,0); upper.add(armR);
  const head = sph(0.55,'#f3c39a'); head.position.y=2.55-HIP_Y; upper.add(head);
  const hair = box(0.95,0.28,0.95,'#4a3320'); hair.position.y=2.95-HIP_Y; upper.add(hair);
  // simple face
  const eyeMat = mat('#222');
  [-0.2,0.2].forEach(x=>{ const e=new THREE.Mesh(new THREE.SphereGeometry(0.07,8,8),eyeMat);
    e.position.set(x,2.6-HIP_Y,0.5); upper.add(e); });
  g.userData.legL = legL; g.userData.legR = legR;
  g.userData.arms = [armL, armR];
  g.userData.body = body;
  g.userData.upper = upper;
  return g;
}
export function recolorDad(colorIdx){                            // re-tint the local avatar to match a chosen/assigned
  const c = PLAYER_COLORS[(colorIdx||0)%PLAYER_COLORS.length]; // colorIdx — dad's mesh is built once at load
  dad.userData.legL.material.color.set(c.leg);              // time and reused for every game, so switching to a
  dad.userData.legR.material.color.set(c.leg);               // multiplayer color pick needs an explicit re-tint
  dad.userData.body.material.color.set(c.body);
  dad.userData.arms[0].material.color.set(c.body);
  dad.userData.arms[1].material.color.set(c.body);
}
export function buildBaby(){                                  // blocky/low-poly to match Dad's isometric style
  const g = new THREE.Group();
  const mat0 = new THREE.Mesh(new THREE.CylinderGeometry(1.15,1.15,0.12,24), new THREE.MeshLambertMaterial({color:'#9be0d6'}));
  mat0.position.y=0.06; mat0.receiveShadow=true; g.add(mat0);

  const pose = new THREE.Group(); g.add(pose);          // re-posed each frame for crawl / walk / sit
  const skin='#ffe1b0';
  const legL=box(0.24,0.34,0.24,skin), legR=box(0.24,0.34,0.24,skin);
  const armL=box(0.17,0.3,0.17,skin), armR=box(0.17,0.3,0.17,skin);
  const body=box(0.46,0.46,0.36,skin);
  const diap=box(0.5,0.2,0.4,'#ffffff'); diap.position.y=0.42;
  const head=box(0.46,0.44,0.44,skin);
  const curl=sph(0.09,'#6b4a2a'); curl.position.set(0,0.24,0.06);
  [legL,legR,armL,armR,body,diap,head].forEach(m=>pose.add(m));
  head.add(curl);
  const cheekMat = mat('#ff9aa0');
  [-0.14,0.14].forEach(x=>{ const c=new THREE.Mesh(new THREE.SphereGeometry(0.07,8,8),cheekMat);
    c.position.set(x,-0.04,0.22); head.add(c); });
  const eyeMat = mat('#3a2b2b');
  [-0.12,0.12].forEach(x=>{ const e=new THREE.Mesh(new THREE.SphereGeometry(0.045,8,8),eyeMat);
    e.position.set(x,0.05,0.23); head.add(e); });

  g.userData = {mat:mat0, pose, body, head, legL, legR, armL, armR};
  return g;
}
// three interchangeable poses for the pose rig — swapped per-frame based on the baby's current state
export function poseBabyStand(b, phase){                       // upright toddling walk
  const sw = Math.sin(phase)*0.55;
  b.pose.rotation.x=0; b.pose.position.set(0,0,0);
  b.legL.position.set(-0.13,0.17,0); b.legL.rotation.x=sw;
  b.legR.position.set(0.13,0.17,0); b.legR.rotation.x=-sw;
  b.armL.position.set(-0.32,0.76,0); b.armL.rotation.x=-sw;
  b.armR.position.set(0.32,0.76,0); b.armR.rotation.x=sw;
  b.body.position.set(0,0.57,0); b.body.rotation.x=0;
  b.head.position.set(0,1.02,0); b.head.rotation.x=0;
}
export function poseBabyCrawl(b, phase){                        // on all fours — safe, low to the ground
  const sw = Math.sin(phase)*0.5;
  b.pose.rotation.x=0; b.pose.position.set(0,0,0);
  b.legL.position.set(-0.16,0.14,-0.16); b.legL.rotation.x=0.85+sw*0.35;
  b.legR.position.set(0.16,0.14,-0.16); b.legR.rotation.x=0.85-sw*0.35;
  b.armL.position.set(-0.2,0.16,0.22); b.armL.rotation.x=-0.85-sw*0.35;
  b.armR.position.set(0.2,0.16,0.22); b.armR.rotation.x=-0.85+sw*0.35;
  b.body.position.set(0,0.3,-0.04); b.body.rotation.x=1.3;
  b.head.position.set(0,0.32,0.34); b.head.rotation.x=0.5;
}
export function poseBabySit(b){                                  // playing, or fallen down crying
  b.pose.rotation.x=0; b.pose.position.set(0,0,0);
  b.legL.position.set(-0.2,0.1,0.2); b.legL.rotation.x=-1.1;
  b.legR.position.set(0.2,0.1,0.2); b.legR.rotation.x=-1.1;
  b.armL.position.set(-0.3,0.48,0.08); b.armL.rotation.x=0.3;
  b.armR.position.set(0.3,0.48,0.08); b.armR.rotation.x=0.3;
  b.body.position.set(0,0.4,0); b.body.rotation.x=0.12;
  b.head.position.set(0,0.84,0.03); b.head.rotation.x=0.08;
}

/* ---------- Actors ---------- */
export const PLAYER_COLORS = [                             // must exist before buildDad() is first called, below
  {body:'#d63d3d', leg:'#832121'}, {body:'#d66b3d', leg:'#833e21'},
  {body:'#d6993d', leg:'#835b21'}, {body:'#d6c73d', leg:'#837921'},
  {body:'#b7d63d', leg:'#6f8321'}, {body:'#8ad63d', leg:'#528321'},
  {body:'#5cd63d', leg:'#348321'}, {body:'#3dd64d', leg:'#21832a'},
  {body:'#3dd67a', leg:'#218348'}, {body:'#3dd6a8', leg:'#218365'},
  {body:'#3dd6d6', leg:'#218383'}, {body:'#3da8d6', leg:'#216583'},
  {body:'#3d7ad6', leg:'#214883'}, {body:'#3d4dd6', leg:'#212a83'},
  {body:'#5c3dd6', leg:'#342183'}, {body:'#8a3dd6', leg:'#522183'},
  {body:'#b73dd6', leg:'#6f2183'}, {body:'#d63dc7', leg:'#832179'},
  {body:'#d63d99', leg:'#83215b'}, {body:'#d63d6b', leg:'#83213e'},
];
// carry icon above dad's head
export let carrySprite = null;
export function setCarrySprite(txt){
  if(carrySprite){ dad.remove(carrySprite); carrySprite.material.map.dispose(); carrySprite.material.dispose(); carrySprite=null; }
  if(txt){ carrySprite = makeSprite(txt,{bg:null,font:64}); carrySprite.position.set(0,3.5,0);
    carrySprite.scale.set(1.3,1.3,1.3); carrySprite.renderOrder=10; dad.add(carrySprite); }
}
// tossed-away items: a quick arc + fade, purely cosmetic
export const thrownItems = [];
export function discardCarrying(){
  const P = actingPlayer();
  if(S.mode!=='play' || !P.carrying) return;
  const pos = actingPos();
  const spr = makeSprite(CARRY_ICON[P.carrying], {bg:null, font:60});
  spr.scale.set(1.1,1.1,1.1); spr.renderOrder=10;
  spr.position.set(pos.x, 3.3, pos.z);
  scene.add(spr);
  const ang = pos.rotY + (random0to1()-0.5)*0.6;
  thrownItems.push({mesh:spr, vx:Math.sin(ang)*3.2, vz:Math.cos(ang)*3.2, vy:4.2, life:0.9});
  Audio.error();
  P.carrying = null; if(actingPlayerId===myId) setCarrySprite(null);
}
export function updateThrownItems(dt){
  for(let i=thrownItems.length-1; i>=0; i--){
    const it = thrownItems[i];
    it.vy -= 9*dt;
    it.mesh.position.x += it.vx*dt; it.mesh.position.z += it.vz*dt; it.mesh.position.y += it.vy*dt;
    it.life -= dt;
    it.mesh.material.opacity = Math.max(0, it.life/0.9);
    if(it.life<=0 || it.mesh.position.y<0){
      scene.remove(it.mesh); it.mesh.material.map.dispose(); it.mesh.material.dispose();
      thrownItems.splice(i,1);
    }
  }
}
// baby mood sprites — one per baby, swapped in place whenever that baby's mood changes
export function setMood(b, m){ if(m===b.moodLast) return; b.moodLast=m;
  const old = b.moodSprite; b.mesh.remove(old); old.material.map.dispose(); old.material.dispose();
  b.moodSprite = makeSprite(m,{bg:null,font:80}); b.moodSprite.position.set(0,2.3,0);
  b.moodSprite.scale.set(1.5,1.5,1.5); b.moodSprite.renderOrder=10; b.mesh.add(b.moodSprite);
}
export function spawnBabies(){                                  // (re)builds the babies[] array for a fresh run
  babies.forEach(b=>{ if(b.mesh){ scene.remove(b.mesh); disposeGroup(b.mesh); } });
  setBabies([]);
  const count = Math.max(1, S.babyCount||1);
  const names = shuffle(BABY_NAMES.slice());              // unique random names, one per baby this run
  // no personality during the tutorial — it's a fixed, hands-off script and traits like Clingy or
  // Picky would fight the "nothing here can end the game" promise
  const traitSets = S.tutorial ? Array.from({length:count},()=>[]) : rollBabyTraitSets(count);
  for(let i=0;i<count;i++){
    const ang = (i/count)*Math.PI*2, off = count>1 ? 1.6 : 0;
    const pos = new THREE.Vector3(spawnBaby.x+Math.cos(ang)*off, 0, spawnBaby.z+Math.sin(ang)*off);
    const b = freshBaby(pos);
    b.name = names[i % names.length] + (i>=names.length ? ` ${Math.floor(i/names.length)+1}` : '');
    b.traits = traitSets[i];
    if(b.traits.includes('favoriteToy') && toys.length) b.favoriteToyRef = pick(toys);
    b.mesh = buildBaby(); b.mesh.position.copy(pos); scene.add(b.mesh);
    b.moodSprite = makeSprite('🙂',{bg:null,font:80}); b.moodSprite.position.set(0,2.3,0);
    b.moodSprite.scale.set(1.5,1.5,1.5); b.moodSprite.renderOrder=10; b.mesh.add(b.moodSprite);
    if(count>1){                                          // only worth labeling when there's more than one
      b.nameSprite = makeSprite(b.name, {font:32});         // to tell apart — sits well above the mood emoji
      b.nameSprite.position.set(0,3.35,0); b.nameSprite.scale.multiplyScalar(0.55); b.nameSprite.renderOrder=10;
      b.mesh.add(b.nameSprite); b.nameLast = b.name;
    }
    babies.push(b);
  }
  buildBabyNeedsHUD();
}

