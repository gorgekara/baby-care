/* Small furniture-group builders — each returns a self-contained THREE.Group for one item. */

import { mat, box, cyl, sph, makeSprite, rand, pick } from '../utils.js';
import { houseGroup } from '../state.js';

export function sofa(c){ const g=new THREE.Group();
  const base=box(2.6,0.6,1.1,c); base.position.y=0.4; g.add(base);
  const back=box(2.6,0.8,0.3,c); back.position.set(0,0.8,-0.4); g.add(back);
  [-1.15,1.15].forEach(x=>{ const a=box(0.3,0.7,1.1,c); a.position.set(x,0.55,0); g.add(a); }); return g; }
export function table(w,d,c){ const g=new THREE.Group();
  const top=box(w,0.18,d,c); top.position.y=0.9; g.add(top);
  const hw=w/2-0.2, hd=d/2-0.2;
  [[-hw,-hd],[hw,-hd],[-hw,hd],[hw,hd]].forEach(([x,z])=>{ const l=box(0.16,0.9,0.16,'#7a5c3a'); l.position.set(x,0.45,z); g.add(l); }); return g; }
export function chair(c){ const g=new THREE.Group();
  const s=box(0.7,0.12,0.7,c); s.position.y=0.55; g.add(s);
  const b=box(0.7,0.7,0.12,c); b.position.set(0,0.9,-0.3); g.add(b);
  [[-0.28,-0.28],[0.28,-0.28],[-0.28,0.28],[0.28,0.28]].forEach(([x,z])=>{ const l=box(0.1,0.55,0.1,'#6a4f32'); l.position.set(x,0.27,z); g.add(l); }); return g; }
export function plant(){ const g=new THREE.Group();
  const pot=cyl(0.35,0.28,0.5,'#b5654a'); pot.position.y=0.25; g.add(pot);
  const f=sph(0.55,'#4f9d5a'); f.position.y=0.95; f.scale.y=1.3; g.add(f); return g; }
export function bookshelf(c){ const g=new THREE.Group();
  const body=box(1.8,2.6,0.6,c); body.position.y=1.3; g.add(body);
  [0.5,1.2,1.9].forEach(y=>{ const s=box(1.7,0.08,0.55,'#e6d6b8'); s.position.y=y; g.add(s); });
  ['#c0392b','#2e86c1','#27ae60','#e67e22'].forEach((bc,i)=>{ const bk=box(0.16,0.5,0.4,bc); bk.position.set(-0.6+i*0.34,1.55,0); g.add(bk); }); return g; }
export function bed(){ const g=new THREE.Group();
  const frame=box(3,0.5,4.2,'#8a6a45'); frame.position.y=0.35; g.add(frame);
  const m=box(2.8,0.4,4,'#f0e6d2'); m.position.y=0.75; g.add(m);
  const pillow=box(2.4,0.25,0.8,'#ffffff'); pillow.position.set(0,0.95,-1.4); g.add(pillow);
  const head=box(3,1.1,0.3,'#6f5436'); head.position.set(0,0.9,-2.05); g.add(head); return g; }
export function wardrobe(c){ const g=new THREE.Group();
  const body=box(2,3,1,c); body.position.y=1.5; g.add(body);
  const split=box(0.06,2.8,1.02,'#5a4630'); split.position.y=1.5; g.add(split);
  [-0.5,0.5].forEach(x=>{ const h=box(0.1,0.3,0.1,'#d8c088'); h.position.set(x,1.5,0.55); g.add(h); }); return g; }
export function dresser(c){ const g=new THREE.Group();
  const body=box(2.2,1.3,1,c); body.position.y=0.65; g.add(body);
  [0.4,0.95].forEach(y=>{ const d=box(2,0.4,0.06,'#e6d6b8'); d.position.set(0,y,0.52); g.add(d); }); return g; }
export function bathtub(){ const g=new THREE.Group();
  const shell=box(3,0.9,1.6,'#ffffff'); shell.position.y=0.55; g.add(shell);
  const water=box(2.6,0.1,1.2,'#8fd3ff'); water.position.y=0.95; g.add(water); return g; }
export function toilet(){ const g=new THREE.Group();
  const base=cyl(0.42,0.34,0.7,'#ffffff'); base.position.y=0.35; g.add(base);
  const seat=cyl(0.5,0.5,0.15,'#f2f2f2'); seat.position.y=0.72; g.add(seat);
  const tank=box(0.9,0.9,0.32,'#ffffff'); tank.position.set(0,0.9,-0.5); g.add(tank); return g; }
export function sink(){ const g=new THREE.Group();
  const ped=cyl(0.28,0.32,1,'#ffffff'); ped.position.y=0.5; g.add(ped);
  const basin=box(1,0.4,0.8,'#ffffff'); basin.position.y=1.05; g.add(basin); return g; }
export function washingMachine(){ const g=new THREE.Group();      // front-loader — grab clean pants here to shed wetPants
  const body=box(0.85,1.0,0.75,'#e8ecef'); body.position.y=0.5; g.add(body);
  const doorRing=cyl(0.32,0.32,0.07,'#8a97a0'); doorRing.rotation.x=Math.PI/2; doorRing.position.set(0,0.48,0.39); g.add(doorRing);
  const doorGlass=cyl(0.24,0.24,0.03,'#3a4650'); doorGlass.rotation.x=Math.PI/2; doorGlass.position.set(0,0.48,0.42); g.add(doorGlass);
  const panel=box(0.85,0.14,0.06,'#d3dade'); panel.position.set(0,0.98,0.35); g.add(panel);
  [-0.28,-0.14,0,0.14].forEach(x=>{ const btn=cyl(0.03,0.03,0.04,'#8a97a0'); btn.rotation.x=Math.PI/2; btn.position.set(x,0.98,0.39); g.add(btn); });
  return g; }
export function lamp(){ const g=new THREE.Group();
  const pole=cyl(0.06,0.06,1.8,'#555'); pole.position.y=0.9; g.add(pole);
  const shade=cyl(0.45,0.3,0.5,'#ffe6a0'); shade.position.y=1.9; g.add(shade); return g; }
export function mirror(){ const g=new THREE.Group();
  const frame=box(0.9,1.1,0.08,'#8a7052'); g.add(frame);
  const glass=box(0.74,0.94,0.02,'#bfe3f0'); glass.position.z=0.05; g.add(glass); return g; }
export function shower(){ const g=new THREE.Group();
  const tray=cyl(0.62,0.62,0.12,'#dfeef5'); tray.position.y=0.06; g.add(tray);
  const pole=cyl(0.05,0.05,2.1,'#9fb3bb'); pole.position.set(0,1.1,-0.5); g.add(pole);
  const head=cyl(0.16,0.1,0.12,'#9fb3bb'); head.position.set(0,2.05,-0.5); g.add(head);
  const gA=box(0.06,1.9,1.3,'#bcdff0'); gA.material.transparent=true; gA.material.opacity=0.5; gA.position.set(-0.62,0.95,0); g.add(gA);
  const gB=box(1.3,1.9,0.06,'#bcdff0'); gB.material.transparent=true; gB.material.opacity=0.5; gB.position.set(0,0.95,-0.62); g.add(gB);
  return g; }
export function blockTower(){ const g=new THREE.Group();
  ['#e5533d','#f2c14e','#4f9dde'].forEach((c,i)=>{ const b=box(0.5,0.5,0.5,c); b.position.y=0.25+i*0.5; g.add(b); }); return g; }
export function rattle(){ const g=new THREE.Group();
  const s=cyl(0.08,0.08,0.7,'#c9a24b'); s.position.y=0.35; g.add(s);
  const k=sph(0.28,'#8ed1e6'); k.position.y=0.8; g.add(k); return g; }
export const TOY_KINDS = [
  {build:blockTower, base:0}, {build:()=>sph(0.5,'#ff6b97'), base:0.5},
  {build:rattle, base:0}, {build:()=>sph(0.45,'#7ed957'), base:0.45},
];
export function buildFoodGroup(){ const g=new THREE.Group();
  const counter=box(2.4,1.1,1.2,'#b56b3d'); counter.position.y=0.55; g.add(counter);
  const top=box(2.5,0.16,1.3,'#e9d8b8'); top.position.y=1.18; g.add(top);
  const pot=cyl(0.35,0.3,0.4,'#5a5a66'); pot.position.set(-0.5,1.45,0); g.add(pot);
  const plate=cyl(0.4,0.4,0.06,'#fff'); plate.position.set(0.55,1.29,0); g.add(plate);
  const food=sph(0.2,'#ff6b3d'); food.scale.y=0.6; food.position.set(0.55,1.4,0); g.add(food);
  return g; }
export function buildFridgeGroup(){ const g=new THREE.Group();
  const fr=box(1.4,3,1.2,'#eef3f6'); fr.position.y=1.5; g.add(fr);
  const seam=box(1.42,0.06,1.22,'#cdd6da'); seam.position.y=1.7; g.add(seam);
  const h1=box(0.1,0.5,0.1,'#9aa6ab'); h1.position.set(0.55,2.3,0.62); g.add(h1);
  const h2=box(0.1,0.5,0.1,'#9aa6ab'); h2.position.set(0.55,1.1,0.62); g.add(h2);
  return g; }
export function buildTVGroup(){ const g=new THREE.Group();
  const stand=box(2,0.7,0.9,'#6b5a48'); stand.position.y=0.35; g.add(stand);
  const post=box(0.3,0.7,0.3,'#40342a'); post.position.y=1.0; g.add(post);
  const screen=box(2.6,1.6,0.12,'#20242e','#101318'); screen.position.y=2.1; g.add(screen);
  const frame=box(2.9,1.9,0.08,'#2a2f3a'); frame.position.set(0,2.1,-0.05); g.add(frame);
  g.userData.screen=screen; return g; }
export function buildChangingGroup(){ const g=new THREE.Group();
  const tbl=box(2.2,1.2,1.3,'#c98fb0'); tbl.position.y=0.6; g.add(tbl);
  const pad=box(2,0.3,1.1,'#8fd3ff'); pad.position.y=1.35; g.add(pad);
  const rail=box(2.2,0.5,0.1,'#a86f92'); rail.position.set(0,1.6,-0.6); g.add(rail);
  const stack=box(0.5,0.4,0.5,'#fff'); stack.position.set(0.7,1.7,0); g.add(stack);
  return g; }
export function buildWorkbenchGroup(){ const g=new THREE.Group();
  const bench=box(2.4,1.1,1.2,'#7a6a52'); bench.position.y=0.55; g.add(bench);
  const top=box(2.5,0.16,1.3,'#9a8768'); top.position.y=1.18; g.add(top);
  const vise=box(0.4,0.4,0.4,'#5a5a66'); vise.position.set(-0.7,1.4,0); g.add(vise);
  const handle=box(0.6,0.14,0.14,'#c0392b'); handle.position.set(0.6,1.35,0); handle.rotation.z=0.5; g.add(handle);
  const head2=box(0.16,0.34,0.3,'#888'); head2.position.set(0.78,1.55,0); g.add(head2);
  return g; }
export function playpenGroup(){ const g=new THREE.Group();               // pack-n-play style pen: a padded fabric bumper
  const R = 1.15;                                                  // under a low, barely-there mesh wall — reads as
  const mat0=cyl(R,R,0.06,'#fdf3e0'); mat0.position.y=0.03; g.add(mat0); // a baby product, not a solid drum
  const bumperH=0.4, bumperY=0.06+bumperH/2;
  const bumper=cyl(R+0.05,R+0.05,bumperH,'#ff9fb3'); bumper.position.y=bumperY; g.add(bumper); // padded fabric side
  for(let i=0;i<6;i++){ const ang=i/6*Math.PI*2;                   // alternating cream panels read as stitched
    const panel=box(0.55,bumperH*0.72,0.05,'#fff1e6');              // fabric segments rather than a plain barrel
    panel.position.set(Math.cos(ang)*(R+0.08), bumperY, Math.sin(ang)*(R+0.08));
    panel.rotation.y = -ang; g.add(panel);
  }
  const railColor='#e8b23a', postY0=0.06+bumperH;
  for(let i=0;i<8;i++){ const ang=i/8*Math.PI*2;
    const post=cyl(0.04,0.04,0.34,railColor); post.position.set(Math.cos(ang)*(R+0.02),postY0+0.17,Math.sin(ang)*(R+0.02)); g.add(post); }
  const railTop=cyl(R+0.04,R+0.04,0.06,railColor); railTop.position.y=postY0+0.37; g.add(railTop);
  const net=cyl(R+0.02,R+0.02,0.3,'#ffffff'); net.material.transparent=true; net.material.opacity=0.16; net.position.y=postY0+0.17; g.add(net);
  return g; }
export function computerDeskGroup(){ const g=new THREE.Group();          // the office job Dad's supposed to be doing while babysitting
  const desk=box(1.8,0.9,0.9,'#8a6a45'); desk.position.y=0.45; g.add(desk);
  const top=box(1.9,0.08,1.0,'#c9a877'); top.position.y=0.94; g.add(top);
  const stand=box(0.12,0.3,0.12,'#333'); stand.position.set(0,1.1,-0.2); g.add(stand);
  const monitor=box(0.9,0.6,0.06,'#20242e','#153a6b'); monitor.position.set(0,1.35,-0.2); g.add(monitor);
  const keyboard=box(0.5,0.05,0.2,'#e8e0c8'); keyboard.position.set(0,0.99,0.15); g.add(keyboard);
  const mug=cyl(0.1,0.08,0.14,'#e5533d'); mug.position.set(0.65,1.03,0.2); g.add(mug);
  g.userData.screen = monitor;
  return g; }
export function ovenGroup(){ const g=new THREE.Group();                  // hazard: baby can wander into it and get burned
  const body=box(1.3,1.6,1.2,'#3a3a3f'); body.position.y=0.8; g.add(body);
  const top=box(1.34,0.08,1.24,'#57575f'); top.position.y=1.62; g.add(top);
  const door=box(1.0,1.0,0.08,'#20222a'); door.position.set(0,0.62,0.62); g.add(door);
  const glow=box(0.62,0.5,0.02,'#ff8a3d','#ff5c1a'); glow.position.set(0,0.62,0.67); g.add(glow);
  const handle=box(0.7,0.09,0.09,'#999'); handle.position.set(0,1.28,0.63); g.add(handle);
  [-0.35,0.35].forEach(x=>{ const dial=cyl(0.08,0.08,0.05,'#ccc'); dial.rotation.x=Math.PI/2; dial.position.set(x,1.5,0.62); g.add(dial); });
  return g; }

/* ---------- Extra floor props & wall decor (fills rooms out, no-collision items don't block movement) ---------- */
export function sideTable(c){ const g=new THREE.Group();
  const top=box(0.6,0.08,0.6,c); top.position.y=0.55; g.add(top);
  [[-0.24,-0.24],[0.24,-0.24],[-0.24,0.24],[0.24,0.24]].forEach(([x,z])=>{ const l=box(0.07,0.55,0.07,'#6a4f32'); l.position.set(x,0.275,z); g.add(l); }); return g; }
export function nightstand(c){ const g=new THREE.Group();
  const body=box(0.7,0.7,0.55,c); body.position.y=0.35; g.add(body);
  const knob=sph(0.04,'#e6d6a8'); knob.position.set(0,0.35,0.29); g.add(knob); return g; }
export function cabinet(c){ const g=new THREE.Group();
  const body=box(1.5,1.0,0.55,c); body.position.y=0.5; g.add(body);
  const top=box(1.55,0.06,0.6,'#e9d8b8'); top.position.y=1.03; g.add(top);
  [-0.32,0.32].forEach(x=>{ const h=box(0.05,0.05,0.06,'#8a8a8a'); h.position.set(x,0.5,0.3); g.add(h); }); return g; }
export function wallCupboard(c){ const g=new THREE.Group();          // upper kitchen cabinet, mounted above the counter —
  const body=box(1.3,0.8,0.42,c); g.add(body);                 // wall decor (no collision), so it floats at addWallDecor's y
  const seam=box(0.03,0.8,0.02,'#3a2f24'); seam.position.z=0.21; g.add(seam); // door split down the middle
  [-0.3,0.3].forEach(x=>{ const h=box(0.05,0.05,0.06,'#8a8a8a'); h.position.set(x,-0.28,0.23); g.add(h); });
  return g; }
export function kitchenSink(){ const g=new THREE.Group();            // free-standing basin unit, purely decorative
  const cab=box(1.1,0.85,0.6,'#e9e2d0'); cab.position.y=0.425; g.add(cab);
  const counter=box(1.18,0.06,0.68,'#c9c2b0'); counter.position.y=0.88; g.add(counter);
  const basin=box(0.8,0.16,0.42,'#b9c4c9'); basin.position.y=0.9; g.add(basin);
  const tap=cyl(0.03,0.03,0.4,'#9aa6ab'); tap.position.set(0,1.1,-0.2); g.add(tap);
  const spout=cyl(0.025,0.025,0.22,'#9aa6ab'); spout.rotation.x=Math.PI/2; spout.position.set(0,1.28,-0.11); g.add(spout);
  return g; }
export function basket(c){ const g=new THREE.Group();
  const b=cyl(0.32,0.26,0.4,c); b.position.y=0.2; g.add(b); return g; }
export function coatRack(){ const g=new THREE.Group();
  const pole=cyl(0.05,0.05,1.7,'#6a4f32'); pole.position.y=0.85; g.add(pole);
  const base=cyl(0.32,0.32,0.06,'#4a3a24'); base.position.y=0.03; g.add(base);
  [0,2.1,4.2].forEach(ang=>{ const h=box(0.2,0.05,0.05,'#3a2a1a'); h.position.set(Math.cos(ang)*0.15,1.45,Math.sin(ang)*0.15); h.rotation.y=ang; g.add(h); }); return g; }
export function painting(fc, ac){ const g=new THREE.Group();
  const frame=box(0.95,0.72,0.06,fc); g.add(frame);
  const art=box(0.76,0.54,0.02,ac); art.position.z=0.035; g.add(art); return g; }
export function wallClock(){ const g=new THREE.Group();
  const rim=cyl(0.3,0.3,0.05,'#3a2f24'); rim.rotation.x=Math.PI/2; g.add(rim);
  const face=cyl(0.26,0.26,0.03,'#f5ede0'); face.rotation.x=Math.PI/2; face.position.z=0.02; g.add(face);
  const hand=box(0.03,0.16,0.02,'#2a2a2a'); hand.position.set(0,0.05,0.05); g.add(hand); return g; }
export function wallShelfDecor(colors){ const g=new THREE.Group();
  const plank=box(1.3,0.06,0.26,'#8a6a45'); g.add(plank);
  colors.forEach((c,i)=>{ const h=rand(0.2,0.32); const b=box(0.18,h,0.18,c); b.position.set(-0.44+i*0.3,0.03+h/2,0); g.add(b); });
  return g; }
export function towelRack(){ const g=new THREE.Group();
  const bar=cyl(0.03,0.03,0.7,'#c9c2b4'); bar.rotation.z=Math.PI/2; g.add(bar);
  const towel=box(0.5,0.55,0.05,pick(['#8fd3ff','#ffd58a','#c9a0dc'])); towel.position.set(0,-0.32,0.05); g.add(towel); return g; }
export function addWallDecor(mesh, x, z, y, rotY){ mesh.position.set(x,y,z); if(rotY) mesh.rotation.y=rotY; houseGroup.add(mesh); return mesh; }
export function buildMopGroup(){ const g=new THREE.Group();
  const bucket=cyl(0.32,0.26,0.5,'#7fa8c9'); bucket.position.y=0.25; g.add(bucket);
  const rim=cyl(0.34,0.34,0.05,'#5a7a9a'); rim.position.y=0.5; g.add(rim);
  const water=cyl(0.28,0.28,0.04,'#bcdff0'); water.position.y=0.49; g.add(water);
  const stick=cyl(0.04,0.04,1.5,'#c9a24b'); stick.position.set(0.22,1.05,0); stick.rotation.z=0.18; g.add(stick);
  const head=box(0.3,0.26,0.12,'#e8e0c8'); head.position.set(0.28,0.32,0); head.rotation.z=0.18; g.add(head);
  return g; }
export function messBlob(){ const g=new THREE.Group();                       // extra-visible: bright puddle + floating marker
  const c1='#c3e04a', c2='#8fa02a', c3='#eef5a8';
  const puddle=new THREE.Mesh(new THREE.CircleGeometry(0.6,20), new THREE.MeshLambertMaterial({color:c1,emissive:c1,emissiveIntensity:0.25}));
  puddle.rotation.x=-Math.PI/2; puddle.position.y=0.015; g.add(puddle);
  const b1=sph(0.4,c1); b1.scale.y=0.22; b1.position.set(0,0.08,0); g.add(b1);
  const b2=sph(0.24,c2); b2.scale.y=0.2; b2.position.set(0.32,0.06,0.16); g.add(b2);
  const b3=sph(0.18,c3); b3.scale.y=0.18; b3.position.set(-0.26,0.06,0.18); g.add(b3);
  const shine=sph(0.09,'#ffffff'); shine.position.set(-0.1,0.17,-0.06); g.add(shine);
  const marker=makeSprite('🤢',{bg:null,font:46}); marker.position.y=0.85; marker.scale.multiplyScalar(0.85); marker.renderOrder=10;
  g.add(marker); g.userData.marker=marker;
  return g; }

