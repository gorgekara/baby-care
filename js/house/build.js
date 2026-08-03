import { scene, LOOK, sun, sunTarget, BASE_VIEW, zoom, setBaseView, setZoom, applyFrustum } from '../main.js';
import {
  TOY_KINDS,
  addWallDecor,
  basket,
  bathtub,
  bed,
  blockTower,
  bookshelf,
  buildChangingGroup,
  buildFoodGroup,
  buildFridgeGroup,
  buildMopGroup,
  buildTVGroup,
  buildWorkbenchGroup,
  cabinet,
  chair,
  coatRack,
  computerDeskGroup,
  dresser,
  kitchenSink,
  lamp,
  messBlob,
  mirror,
  nightstand,
  ovenGroup,
  painting,
  plant,
  playpenGroup,
  rattle,
  shower,
  sideTable,
  sink,
  sofa,
  table,
  toilet,
  towelRack,
  wallClock,
  wallCupboard,
  wallShelfDecor,
  wardrobe,
  washingMachine
} from './furniture.js';
import {
  S,
  WALL_COLOR,
  WALL_H,
  WT,
  blockAABBs,
  houseBounds,
  houseGroup,
  lastLayout,
  ovenPos,
  packageSpot,
  setComputerScreen,
  setHouseGroup,
  setTvScreen,
  setLastLayout,
  solids,
  spawnBaby,
  spawnDad,
  stations,
  toys,
  wallMeshes
} from '../state.js';
import {
  box,
  disposeGroup,
  houseRng,
  makeSprite,
  mulberry32,
  pick,
  rand,
  random0to1,
  runRng,
  setHouseRng,
  setRunRng,
  shuffle,
  sph
} from '../utils.js';
import {
  TASK_POOL
} from '../config.js';

/* Procedural house generation: walls/windows, room layouts (rect/L/T), and buildHouse() itself. */

export function addWallMesh(m, aabb, pushAABB=true){ m.material.transparent=true; m.renderOrder=1; houseGroup.add(m); wallMeshes.push(m); if(pushAABB) blockAABBs.push(aabb); }
export function wallXSeg(z, x1, x2, y0, y1, pushAABB=true){ const cx=(x1+x2)/2, len=Math.abs(x2-x1), h=y1-y0; if(len<0.06||h<0.06) return;
  const m=box(len, h, WT, WALL_COLOR); m.position.set(cx, y0+h/2, z);
  addWallMesh(m, {minX:cx-len/2, maxX:cx+len/2, minZ:z-WT/2, maxZ:z+WT/2}, pushAABB); }
export function wallZSeg(x, z1, z2, y0, y1, pushAABB=true){ const cz=(z1+z2)/2, len=Math.abs(z2-z1), h=y1-y0; if(len<0.06||h<0.06) return;
  const m=box(WT, h, len, WALL_COLOR); m.position.set(x, y0+h/2, cz);
  addWallMesh(m, {minX:x-WT/2, maxX:x+WT/2, minZ:cz-len/2, maxZ:cz+len/2}, pushAABB); }
export function wallX(z, x1, x2){ wallXSeg(z, x1, x2, 0, WALL_H); }
export function wallZ(x, z1, z2){ wallZSeg(x, z1, z2, 0, WALL_H); }
export function carve(a, b, doors){ let segs=[[a,b]];
  doors.forEach(([d0,d1])=>{ segs=segs.flatMap(([s,e])=>{ if(d1<=s||d0>=e) return [[s,e]];
    const o=[]; if(d0>s) o.push([s,d0]); if(d1<e) o.push([d1,e]); return o; }); });
  return segs; }
export function wallXDoors(z, x1, x2, doors){ carve(x1,x2,doors).forEach(s=>wallX(z, s[0], s[1])); }
export function wallZDoors(x, z1, z2, doors){ carve(z1,z2,doors).forEach(s=>wallZ(x, s[0], s[1])); }

// ---- windows: a real opening (sill + lintel wall segments, full width still blocks movement) with
// an actual see-through glass pane + frame set into the gap — visible from both sides of the wall.
export const SILL_Y = 1.05, WIN_H = 1.4;
export function addWindowGlass(axis, wallCoord, cx, halfW){
  const w = halfW*2, y = SILL_Y + WIN_H/2;
  const frameColor = '#eee3d0', barT = 0.09;
  const glassMat = new THREE.MeshLambertMaterial({color:'#bcdff0', transparent:true, opacity:0.4});
  const glassGeo = axis==='X' ? new THREE.BoxGeometry(w-0.14, WIN_H-0.14, 0.04) : new THREE.BoxGeometry(0.04, WIN_H-0.14, w-0.14);
  const glass = new THREE.Mesh(glassGeo, glassMat); glass.renderOrder = 2;
  const bar = (bw,bh,bd)=>{ const m=box(bw,bh,bd,frameColor); m.renderOrder=2; return m; };
  const frameParts = [];
  if(axis==='X'){
    glass.position.set(cx, y, wallCoord);
    frameParts.push([bar(w,barT,WT+0.02), cx, y+WIN_H/2, wallCoord]);           // top
    frameParts.push([bar(w,barT,WT+0.02), cx, y-WIN_H/2, wallCoord]);           // bottom
    frameParts.push([bar(barT,WIN_H,WT+0.02), cx-w/2, y, wallCoord]);           // left
    frameParts.push([bar(barT,WIN_H,WT+0.02), cx+w/2, y, wallCoord]);           // right
    frameParts.push([bar(barT,WIN_H,WT+0.02), cx, y, wallCoord]);               // vertical mullion
    frameParts.push([bar(w,barT,WT+0.02), cx, y, wallCoord]);                   // horizontal mullion
  } else {
    glass.position.set(wallCoord, y, cx);
    frameParts.push([bar(WT+0.02,barT,w), wallCoord, y+WIN_H/2, cx]);
    frameParts.push([bar(WT+0.02,barT,w), wallCoord, y-WIN_H/2, cx]);
    frameParts.push([bar(WT+0.02,WIN_H,barT), wallCoord, y, cx-w/2]);
    frameParts.push([bar(WT+0.02,WIN_H,barT), wallCoord, y, cx+w/2]);
    frameParts.push([bar(WT+0.02,WIN_H,barT), wallCoord, y, cx]);
    frameParts.push([bar(WT+0.02,barT,w), wallCoord, y, cx]);
  }
  houseGroup.add(glass);
  frameParts.forEach(([m,x,y,z])=>{ m.position.set(x,y,z); houseGroup.add(m); });
}
// builds a wall run with real window openings cut in: solid full-height segments between windows,
// sill/lintel segments (still block movement — you can't walk through glass) framing each opening.
export function wallXWindowed(z, x1, x2, wins){
  const sorted=[...wins].sort((a,b)=>a.cx-b.cx); let cursor=x1;
  sorted.forEach(win=>{
    const wx1=Math.max(x1,win.cx-win.halfW), wx2=Math.min(x2,win.cx+win.halfW);
    if(wx2<=cursor || wx1>=x2) return;
    if(wx1>cursor) wallX(z, cursor, wx1);
    wallXSeg(z, wx1, wx2, 0, SILL_Y);
    wallXSeg(z, wx1, wx2, SILL_Y+WIN_H, WALL_H, false);
    addWindowGlass('X', z, (wx1+wx2)/2, (wx2-wx1)/2);
    cursor = wx2;
  });
  if(cursor<x2) wallX(z, cursor, x2);
}
export function wallZWindowed(x, z1, z2, wins){
  const sorted=[...wins].sort((a,b)=>a.cx-b.cx); let cursor=z1;
  sorted.forEach(win=>{
    const wz1=Math.max(z1,win.cx-win.halfW), wz2=Math.min(z2,win.cx+win.halfW);
    if(wz2<=cursor || wz1>=z2) return;
    if(wz1>cursor) wallZ(x, cursor, wz1);
    wallZSeg(x, wz1, wz2, 0, SILL_Y);
    wallZSeg(x, wz1, wz2, SILL_Y+WIN_H, WALL_H, false);
    addWindowGlass('Z', x, (wz1+wz2)/2, (wz2-wz1)/2);
    cursor = wz2;
  });
  if(cursor<z2) wallZ(x, cursor, z2);
}
// builds all 4 of a room's walls generically, regardless of the house's overall shape: its doorSide
// gets a door-width gap at the room's own center, each side listed in exteriorSides gets a real
// windowed opening (using the slot windowSlotsFor already picked, room.windowCxBySide), and any side
// that's neither — a divider against a neighboring room — gets a plain solid wall spanning the
// room's own width there. Every room calls this independently, so two rooms sharing a divider each
// build it (harmless overlap) — this is what makes the wall-building shape-agnostic: no global
// "4 sides of one big rectangle" bookkeeping, just each room closing its own 4 edges correctly.
export function buildRoomWalls(room){
  const DOOR=2.8, HD=DOOR/2;
  const winFor = side => (room.windowCxBySide && room.windowCxBySide[side]!==undefined) ? [{cx:room.windowCxBySide[side], halfW:1.2}] : [];
  ['N','S','E','W'].forEach(side=>{
    const isDoor = side===room.doorSide, isExt = (room.exteriorSides||[]).includes(side);
    if(side==='N'||side==='S'){
      const z = side==='N' ? room.minZ : room.maxZ;
      if(isDoor){ const c=(room.minX+room.maxX)/2; wallXDoors(z, room.minX, room.maxX, [[c-HD,c+HD]]); }
      else if(isExt) wallXWindowed(z, room.minX, room.maxX, winFor(side));
      else wallX(z, room.minX, room.maxX);
    } else {
      const x = side==='W' ? room.minX : room.maxX;
      if(isDoor){ const c=(room.minZ+room.maxZ)/2; wallZDoors(x, room.minZ, room.maxZ, [[c-HD,c+HD]]); }
      else if(isExt) wallZWindowed(x, room.minZ, room.maxZ, winFor(side));
      else wallZ(x, room.minZ, room.maxZ);
    }
  });
}
export function computeBounds(rects){
  let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
  rects.forEach(r=>{ minX=Math.min(minX,r.minX); maxX=Math.max(maxX,r.maxX); minZ=Math.min(minZ,r.minZ); maxZ=Math.max(maxZ,r.maxZ); });
  return {minX,maxX,minZ,maxZ};
}

export function addToy(g, x, z, baseY){ g.position.set(x, baseY, z); houseGroup.add(g); toys.push({x, z, mesh:g, baseY}); }
export function label(text, y){ const s=makeSprite(text); s.position.y=y; s.scale.multiplyScalar(0.62); s.renderOrder=10; return s; }

/* ---------- Furniture builders (footprints measured at placement) ---------- */


/* ---------- Procedural placement helpers ---------- */
export function addProp(mesh, x, z, hx, hz, rotY){
  mesh.position.set(x,0,z); if(rotY) mesh.rotation.y=rotY; houseGroup.add(mesh);
  blockAABBs.push({minX:x-hx, maxX:x+hx, minZ:z-hz, maxZ:z+hz});
  return mesh;
}
export function addPropOriented(mesh, x, z, localHx, localHz, rotY){
  const swapped = Math.abs(Math.abs(rotY||0)-Math.PI/2) < 0.01;
  return addProp(mesh, x, z, swapped?localHz:localHx, swapped?localHx:localHz, rotY);
}
export function addStation(key, x, z, group, labelText, labelY, rotY){
  group.position.set(x, 0, z); if(rotY) group.rotation.y=rotY;
  group.add(label(labelText, labelY));
  houseGroup.add(group);
  stations[key] = {group, x, z, radius:1.9};
  solids.push({x, z, r:1.6});
  return group;
}
// every room now has exactly one door (to the hallway); all its other walls are door-free.
// outer is shuffled so different rooms don't all deterministically favor the same wall.
export function sidesFor(room){
  const inner=[room.doorSide];
  const outer=shuffle(['N','S','E','W'].filter(s=>s!==room.doorSide));
  return {outer, inner};
}
export const SIDE_ROT = {N:0, S:Math.PI, W:Math.PI/2, E:-Math.PI/2};
export function wallPos(room, side, t, out){                // t: 0..1 along the wall, out: inward distance from it
  const {minX,maxX,minZ,maxZ}=room, lerp=(a,b,u)=>a+(b-a)*u, rot=SIDE_ROT[side];
  if(side==='N') return {x:lerp(minX+1,maxX-1,t), z:minZ+out, rot};
  if(side==='S') return {x:lerp(minX+1,maxX-1,t), z:maxZ-out, rot};
  if(side==='W') return {x:minX+out, z:lerp(minZ+1,maxZ-1,t), rot};
  return {x:maxX-out, z:lerp(minZ+1,maxZ-1,t), rot};
}
export function edgeT(){ return random0to1()<0.5 ? rand(0.08,0.22) : rand(0.78,0.92); } // near a corner, clear of any doorway
// a wall-mounted decor spot: dead-center on an unused outer wall (always door-free), else a
// safe corner of an unused inner wall, else any wall's corner as a last resort. Returns .side too
// so callers can exclude it from a following call and avoid stacking two items in one spot.
export function centeredWallDecorSpot(room, excludeSides, outDist){
  const exclude = room.windowSides ? excludeSides.concat(room.windowSides) : excludeSides;
  const {outer, inner} = sidesFor(room);
  const outCandidates = outer.filter(s=>!exclude.includes(s));
  if(outCandidates.length){ const side=pick(outCandidates); return Object.assign(wallPos(room, side, 0.5, outDist), {side}); }
  const inCandidates = inner.filter(s=>!exclude.includes(s));
  if(inCandidates.length){ const side=pick(inCandidates); return Object.assign(wallPos(room, side, edgeT(), outDist), {side}); }
  // every side is either excluded or a window — fall back to whatever's least bad (not a window if possible)
  const side = pick(outer.filter(s=>!room.windowSides?.includes(s)).concat(inner)) || pick(['N','S','E','W']);
  return Object.assign(wallPos(room, side, edgeT(), outDist), {side});
}
export function addToys(room, count, spread){
  shuffle(TOY_KINDS.slice()).slice(0,count).forEach(k=>{
    addToy(k.build(), room.cx+rand(-spread,spread), room.cz+rand(-spread,spread), k.base);
  });
}
export function addRug(room, color, frac){
  const rug=new THREE.Mesh(new THREE.CircleGeometry(Math.min(room.w,room.h)*frac, 32), new THREE.MeshLambertMaterial({color}));
  rug.rotation.x=-Math.PI/2; rug.position.set(room.cx, 0.02, room.cz); rug.receiveShadow=true; houseGroup.add(rug);
}
// per-room window placement: one slot per exterior side (so corner rooms get more than one),
// preferring a centered spot but avoiding the room's main furniture wall/spot when it's the only
// exterior side available. Returns {side, cx} — cx is the world coordinate along that wall (X for
// N/S runs, Z for W/E runs) — for buildHouse to carve a real opening into the actual wall run.
export function windowSlotsFor(room){
  const sides = room.exteriorSides;
  if(!sides || !sides.length) return [];
  return sides.map(side=>{
    const t = (side===room.primarySide && room.primaryT!==undefined)
      ? (room.primaryT<0.5 ? rand(0.7,0.86) : rand(0.14,0.3))
      : 0.5;
    const p = wallPos(room, side, t, 0);
    return {side, cx: (side==='N'||side==='S') ? p.x : p.z};
  });
}
// scatters 1-2 random paintings around a room's walls (never called for the bathroom)
export function scatterPaintings(room){
  const frameColors=['#6a4f32','#8a7052','#3a2f24','#5a4630','#7a5aa0'];
  const artColors=['#e8c68a','#9fc7e0','#d98a9a','#f5d0e0','#c9a0dc','#7ed957','#ffd58a'];
  const n = random0to1()<0.5 ? 1 : 2;
  const used = room.primarySide ? [room.primarySide] : [];
  for(let i=0;i<n;i++){
    const spot = centeredWallDecorSpot(room, used, 0.08);
    addWallDecor(painting(pick(frameColors), pick(artColors)), spot.x, spot.z, rand(1.7,2.3), spot.rot);
    used.push(spot.side);
  }
}
export function bathroomTileMaterial(room){
  const c=document.createElement('canvas'); c.width=64; c.height=64;
  const ctx=c.getContext('2d');
  ctx.fillStyle='#eef6f9'; ctx.fillRect(0,0,64,64);
  ctx.fillStyle='#7fb0c9'; ctx.fillRect(0,0,31,31); ctx.fillRect(32,32,31,31);
  ctx.strokeStyle='#4d7690'; ctx.lineWidth=3;
  ctx.strokeRect(1,1,62,62);
  ctx.beginPath(); ctx.moveTo(32,0); ctx.lineTo(32,64); ctx.moveTo(0,32); ctx.lineTo(64,32); ctx.stroke();
  const tex=new THREE.CanvasTexture(c);
  tex.wrapS=tex.wrapT=THREE.RepeatWrapping; tex.magFilter=THREE.NearestFilter;
  tex.repeat.set(Math.max(1,Math.round(room.w/1.6)), Math.max(1,Math.round(room.h/1.6)));
  return new THREE.MeshLambertMaterial({map:tex});
}

/* ---------- Room-type furnishing plans ---------- */
export function buildLiving(room){
  const {outer, inner} = sidesFor(room);
  const sofaSide = outer[0], sofaT = edgeT();
  let p = wallPos(room, sofaSide, sofaT, 0.6);
  addPropOriented(sofa(pick(['#c96f6f','#7fa8c9','#d0a56a'])), p.x, p.z, 1.4, 0.75, p.rot);
  const paintT = sofaT<0.5 ? rand(0.58,0.72) : rand(0.28,0.42);
  p = wallPos(room, sofaSide, paintT, 0.08);
  addWallDecor(painting(pick(['#6a4f32','#8a7052','#3a2f24']), pick(['#e8c68a','#9fc7e0','#d98a9a'])), p.x, p.z, 2.0, p.rot);

  const tvSide = outer[1] || pick(inner);
  p = wallPos(room, tvSide, edgeT(), 0.5);
  const tv = buildTVGroup(); setTvScreen(tv.userData.screen);
  addStation('cartoon', p.x, p.z, tv, '📺 TV', 3.4, p.rot);

  const plantSide = pick(inner.length?inner:outer), plantT = edgeT();
  p = wallPos(room, plantSide, plantT, 0.5);
  addProp(plant(), p.x, p.z, 0.4, 0.4);
  const tableT = plantT<0.5 ? rand(0.6,0.75) : rand(0.25,0.4);
  p = wallPos(room, plantSide, tableT, 0.55);
  addProp(sideTable(pick(['#a9743f','#8a6a45'])), p.x, p.z, 0.35, 0.35);

  const spot = centeredWallDecorSpot(room, [sofaSide], 0.22);
  addWallDecor(wallShelfDecor([pick(['#c0392b','#2e86c1']), pick(['#27ae60','#e67e22']), '#f5ede0']), spot.x, spot.z, 1.7, spot.rot);

  const rackSide = pick(inner.length?inner:outer);
  p = wallPos(room, rackSide, edgeT(), 0.4);
  addProp(coatRack(), p.x, p.z, 0.32, 0.32);

  const penSpot = centeredWallDecorSpot(room, [sofaSide, tvSide, plantSide], 1.4);
  addStation('playpen', penSpot.x, penSpot.z, playpenGroup(), '🔒 Playpen', 2.3, penSpot.rot);

  addRug(room, '#e08fae', 0.22);
  addToys(room, 3, Math.min(room.w,room.h)*0.2);
  room.primarySide=sofaSide; room.primaryT=sofaT;
}
export function buildKitchen(room){
  const {outer, inner} = sidesFor(room);
  const wallSide = outer[0];
  // guarantee a real-world minimum gap between the counter stations, not just fractional wall
  // position — on a small room's counter wall, two independently-random fractions can land close
  // enough that interacting with one also puts the other in range (nearestStationAt() then just
  // picks whichever happens to be closer), making it hard to target either one precisely. Capped
  // by wallLen so four slots always fit even on the shortest possible kitchen wall.
  const wallLen = (wallSide==='N'||wallSide==='S') ? (room.maxX-room.minX-2) : (room.maxZ-room.minZ-2);
  const kitchenGapT = Math.min(2.8, wallLen/4.5) / wallLen;
  const foodT = rand(0.06,0.16);
  const sinkT = Math.max(rand(0.22,0.32), foodT + kitchenGapT);
  const cabinetT = Math.max(rand(0.4,0.56), sinkT + kitchenGapT);
  const fridgeT = Math.min(0.94, Math.max(rand(0.84,0.94), cabinetT + kitchenGapT));
  let p = wallPos(room, wallSide, foodT, 0.7);
  addStation('food', p.x, p.z, buildFoodGroup(), '🍎 Kitchen', 2.7, p.rot);
  p = wallPos(room, wallSide, sinkT, 0.55);
  const sinkMesh = kitchenSink();
  addPropOriented(sinkMesh, p.x, p.z, 0.55, 0.34, p.rot);
  sinkMesh.add(label('🍽️ Sink', 1.3));
  stations.kitchensink = {group: sinkMesh, x: p.x, z: p.z, radius: 1.9};  // manual registration, see oven note above
  p = wallPos(room, wallSide, cabinetT, 0.65);
  addProp(cabinet(pick(['#c9a45a','#b98b52','#9a7a4a'])), p.x, p.z, 0.78, 0.3, p.rot);
  p = wallPos(room, wallSide, fridgeT, 0.65);
  addStation('milk', p.x, p.z, buildFridgeGroup(), '🍼 Fridge', 3.5, p.rot);

  // upper cupboards mounted above the food/cabinet counters — wall decor, no collision
  const cupC = pick(['#f3ede0','#d8c9a8','#c9d8d0']);
  p = wallPos(room, wallSide, foodT, 0.12);
  addWallDecor(wallCupboard(cupC), p.x, p.z, 2.15, p.rot);
  p = wallPos(room, wallSide, cabinetT, 0.12);
  addWallDecor(wallCupboard(cupC), p.x, p.z, 2.15, p.rot);

  addProp(table(1.8,1.3,'#b98b52'), room.cx, room.cz, 0.9, 0.65);
  addProp(chair('#d0a56a'), room.cx, room.cz-1.1, 0.35, 0.35);
  addProp(chair('#d0a56a'), room.cx, room.cz+1.1, 0.35, 0.35, Math.PI);

  const plantSide = pick(inner.length?inner:outer);
  p = wallPos(room, plantSide, edgeT(), 0.45);
  addProp(plant(), p.x, p.z, 0.4, 0.4);

  let spot = centeredWallDecorSpot(room, [wallSide], 0.07);
  const clockSide = spot.side;
  addWallDecor(wallClock(), spot.x, spot.z, 2.1, spot.rot);
  spot = centeredWallDecorSpot(room, [wallSide, clockSide], 0.22);
  const shelfSide = spot.side;
  addWallDecor(wallShelfDecor(['#ffffff', '#8fd3ff', pick(['#e5533d','#7fa8c9'])]), spot.x, spot.z, 1.85, spot.rot);

  // the oven — a hazard: an unsupervised baby that wanders over to it will get burned (see pickBabyTarget)
  const ovenSpot = centeredWallDecorSpot(room, [wallSide, clockSide, shelfSide], 0.65);
  const ov = ovenGroup();
  addPropOriented(ov, ovenSpot.x, ovenSpot.z, 0.65, 0.6, ovenSpot.rot);
  ov.add(label('🔥 Oven', 2.1));
  ovenPos.set(ovenSpot.x, 0, ovenSpot.z);
  // registered as an interactable station too (for the "get lunch out" chore) — but manually, not via
  // addStation(), so its existing oriented collision box above isn't replaced with a generic circle
  stations.oven = {group: ov, x: ovenSpot.x, z: ovenSpot.z, radius: 1.9};

  room.primarySide=wallSide; room.primaryT=0.5;                 // food+cabinet+fridge span most of this wall
}
export function buildBedroom(room){
  const {outer, inner} = sidesFor(room);
  const bedSide = outer[0];
  let p = wallPos(room, bedSide, 0.5, 2.25);
  const bedMesh = bed();
  addPropOriented(bedMesh, p.x, p.z, 1.5, 2.25, p.rot);
  bedMesh.add(label('🛏️ Bed', 1.3));
  stations.bed = {group: bedMesh, x: p.x, z: p.z, radius: 1.9};  // manual registration, see oven note above

  const paint = wallPos(room, bedSide, 0.5, 0.08);
  addWallDecor(painting(pick(['#6a4f32','#3a2f24']), pick(['#c9a0dc','#9fc7e0','#e8c68a'])), paint.x, paint.z, 2.35, paint.rot);

  const tangent = {x:Math.cos(p.rot), z:-Math.sin(p.rot)};
  addProp(nightstand(pick(['#8a6ab0','#b08a6a','#6a8a9a'])), p.x+tangent.x*2.0, p.z+tangent.z*2.0, 0.35, 0.28, p.rot);

  const s2 = outer[1] || pick(inner);
  p = wallPos(room, s2, edgeT(), 0.55);
  addStation('closet', p.x, p.z, wardrobe(pick(['#7a5aa0','#9a6a44','#6a8a9a'])), '🚪 Closet', 3.3, p.rot);

  const dresserSide = pick(inner.length?inner:outer);
  p = wallPos(room, dresserSide, edgeT(), 0.55);
  addPropOriented(dresser(pick(['#8a6ab0','#b08a6a'])), p.x, p.z, 1.1, 0.55, p.rot);

  const lampSide = pick(['N','S','E','W'].filter(s=>s!==bedSide));
  p = wallPos(room, lampSide, edgeT(), 0.5);
  addProp(lamp(), p.x, p.z, 0.45, 0.45);

  addRug(room, pick(['#e8c68a','#9fc7e0']), 0.2);
  room.primarySide=bedSide; room.primaryT=0.5;
}
export function buildOffice(room){
  const {outer, inner} = sidesFor(room);
  const deskSide = outer[0], deskT = edgeT();
  let p = wallPos(room, deskSide, deskT, 0.65);
  const desk = computerDeskGroup(); setComputerScreen(desk.userData.screen);
  addStation('computer', p.x, p.z, desk, '💻 Computer', 2.5, p.rot);
  const chairSpot = wallPos(room, deskSide, deskT, 1.55);          // facing back toward the desk
  addPropOriented(chair('#5a6a8a'), chairSpot.x, chairSpot.z, 0.35, 0.35, chairSpot.rot + Math.PI);

  const shelfSide = outer[1] || pick(inner);
  p = wallPos(room, shelfSide, edgeT(), 0.65);
  addPropOriented(bookshelf(pick(['#9a6a44','#7a8a6a'])), p.x, p.z, 0.35, 0.9, p.rot);

  const cabinetSide = pick(inner.length?inner:outer);
  p = wallPos(room, cabinetSide, edgeT(), 0.55);
  addPropOriented(cabinet(pick(['#8a97a8','#9a8a70'])), p.x, p.z, 0.78, 0.3, p.rot);

  const plantSide = pick(['N','S','E','W'].filter(s=>s!==deskSide));
  p = wallPos(room, plantSide, edgeT(), 0.45);
  addProp(plant(), p.x, p.z, 0.4, 0.4);

  const sofaSpot = centeredWallDecorSpot(room, [deskSide, shelfSide, cabinetSide], 0.6);
  addPropOriented(sofa(pick(['#7fa8c9','#c96f6f','#8a97a8'])), sofaSpot.x, sofaSpot.z, 1.4, 0.75, sofaSpot.rot);

  const spot = centeredWallDecorSpot(room, [deskSide, shelfSide, sofaSpot.side], 0.2);
  addWallDecor(wallShelfDecor([pick(['#c0392b','#2e86c1']), pick(['#27ae60','#e67e22']), '#f5ede0']), spot.x, spot.z, 1.85, spot.rot);

  addRug(room, '#9fb8e0', 0.24);
  room.primarySide=deskSide; room.primaryT=deskT;
}
export function buildNursery(room){
  const {outer, inner} = sidesFor(room);
  const changeSide = outer[0], changeT = edgeT();
  let p = wallPos(room, changeSide, changeT, 0.7);
  addStation('diaper', p.x, p.z, buildChangingGroup(), '👶 Changing', 2.7, p.rot);

  const shopSide = outer[1] || pick(inner);
  p = wallPos(room, shopSide, edgeT(), 0.65);
  addStation('shop', p.x, p.z, buildWorkbenchGroup(), '🛠️ Workbench', 2.7, p.rot);

  const chairSide = pick(inner.length?inner:outer);
  p = wallPos(room, chairSide, edgeT(), 0.4);
  addProp(chair('#a9d0c6'), p.x, p.z, 0.35, 0.35);

  let spot = centeredWallDecorSpot(room, [changeSide, shopSide], 0.2);
  addWallDecor(wallShelfDecor(['#ffffff','#ffd58a','#a0e3a0']), spot.x, spot.z, 1.6, spot.rot);
  spot = centeredWallDecorSpot(room, [changeSide, shopSide, spot.side], 0.08);
  addWallDecor(painting(pick(['#a86f92','#8fd3ff']), pick(['#ffe1b0','#f7d9e6'])), spot.x, spot.z, 1.9, spot.rot);

  addRug(room, '#f7d9e6', 0.18);
  room.primarySide=changeSide; room.primaryT=changeT;
}
export function buildBathroom(room){
  const {outer, inner} = sidesFor(room);
  const wetSide = outer[0], wetT = edgeT();
  let p = wallPos(room, wetSide, wetT, 0.8);
  // whichever of tub/shower the room's size picked, it's a real interactive station now (the bath —
  // registered manually, same reasoning as the oven/bed/sink: addPropOriented already gives it a
  // properly oriented collision box, so addStation()'s generic circular one would be wrong for it
  let bathGroup, bathHx, bathHz;
  if(room.area < 105){ bathGroup = shower(); bathHx=0.65; bathHz=0.7; }
  else { bathGroup = bathtub(); bathHx=1.55; bathHz=0.85; }
  addPropOriented(bathGroup, p.x, p.z, bathHx, bathHz, p.rot);
  bathGroup.add(label('🛁 Bath', 2.15));
  stations.bath = {group: bathGroup, x: p.x, z: p.z, radius: 1.9};

  const sinkSide = outer[1] || pick(inner);
  const sinkT = edgeT();
  p = wallPos(room, sinkSide, sinkT, 0.45);
  const sinkMesh = sink();
  addPropOriented(sinkMesh, p.x, p.z, 0.55, 0.45, p.rot);
  sinkMesh.add(label('🚿 Sink', 1.4));
  stations.sink = {group: sinkMesh, x: p.x, z: p.z, radius: 1.9};  // manual registration, see oven note above
  const pm = wallPos(room, sinkSide, sinkT, 0.24);   // clear of the wall's own thickness (WT=0.4, ±0.2) so it's actually visible
  const mir = mirror(); mir.position.set(pm.x, 1.55, pm.z); mir.rotation.y = pm.rot; houseGroup.add(mir);

  const toiletSide = pick(inner.length?inner:outer);
  p = wallPos(room, toiletSide, edgeT(), 0.7);
  addStation('toilet', p.x, p.z, toilet(), '🚽 Toilet', 1.5, p.rot);

  const mopT = sinkT<0.5 ? rand(0.72,0.88) : rand(0.12,0.28);
  p = wallPos(room, sinkSide, mopT, 0.4);
  addStation('mop', p.x, p.z, buildMopGroup(), '🧹 Mop', 2.2, p.rot);

  // washing machine — sits in the gap between the sink and mop corners on the same wall; grab clean
  // pants here to shed the wetPants slow-walk debuff from missing the toilet in time
  p = wallPos(room, sinkSide, rand(0.42,0.58), 0.5);
  addStation('washer', p.x, p.z, washingMachine(), '🧺 Washer', 1.5, p.rot);

  // opposite corner from the bath (edgeT() alone could land in the same corner and end up too close
  // to precisely target — same class of issue fixed for the kitchen counter)
  const towelT = wetT<0.5 ? rand(0.78,0.92) : rand(0.08,0.22);
  const towel = wallPos(room, wetSide, towelT, 0.05);
  const towelGroup = towelRack();
  addWallDecor(towelGroup, towel.x, towel.z, 1.3, towel.rot);
  towelGroup.add(label('🧺 Towel', 0.55));
  stations.towel = {group: towelGroup, x: towel.x, z: towel.z, radius: 1.9};

  const spot = centeredWallDecorSpot(room, [wetSide, sinkSide], 0.2);
  addWallDecor(wallShelfDecor(['#ffffff','#bcdff0','#f5ede0']), spot.x, spot.z, 1.7, spot.rot);

  addRug(room, '#e6f4fb', 0.14);
  room.primarySide=wetSide; room.primaryT=wetT;
}
export const ROOM_RANK = ['bathroom','office','nursery','kitchen','bedroom','living']; // ascending size rank
export const ROOM_TYPES = {
  bathroom:{floor:'#a9cfe0', build:buildBathroom},
  office:  {floor:'#e0c8a4', build:buildOffice},
  nursery: {floor:'#bcd7cf', build:buildNursery},
  kitchen: {floor:'#d9c39a', build:buildKitchen},
  bedroom: {floor:'#c3b2dd', build:buildBedroom},
  living:  {floor:'#c9a97e', build:buildLiving},
};

export function buildFrontDoorGroup(){ const g=new THREE.Group();
  const frame=box(1.7,2.7,0.16,'#6a4f32'); frame.position.y=1.35; g.add(frame);
  const panel=box(1.3,2.35,0.08,'#7a2f2f'); panel.position.set(0,1.28,0.06); g.add(panel);
  const knob=sph(0.06,'#e8d08a'); knob.position.set(0.42,1.2,0.15); g.add(knob);
  const rug=box(1.5,0.04,0.55,'#c9a24b'); rug.position.set(0,0.02,0.55); g.add(rug);
  return g; }
export function packageBoxGroup(){ const g=new THREE.Group();     // a delivery on the doormat — grab it before it's stolen
  const b=box(0.55,0.5,0.55,'#c9a06a'); b.position.y=0.25; g.add(b);
  const tapeA=box(0.6,0.03,0.1,'#eee4cd'); tapeA.position.y=0.51; g.add(tapeA);
  const tapeB=box(0.1,0.03,0.6,'#eee4cd'); tapeB.position.y=0.51; g.add(tapeB);
  const tapeFront=box(0.1,0.52,0.03,'#eee4cd'); tapeFront.position.set(0,0.25,0.28); g.add(tapeFront);
  return g; }
// a runner rug per hallway segment, oriented along whichever axis that segment is longer on
export function furnishHalls(halls){
  halls.forEach(h=>{
    const w=h.maxX-h.minX, d=h.maxZ-h.minZ, vertical=d>=w;
    const rw = vertical ? Math.min(w-1.5,3.2) : Math.max(w-4,1);
    const rd = vertical ? Math.max(d-4,1) : Math.min(d-1.5,3.2);
    if(rw>0.4 && rd>0.4){
      const runner=box(rw,0.03,rd,'#b06a54');
      runner.position.set((h.minX+h.maxX)/2, 0.02, (h.minZ+h.maxZ)/2); houseGroup.add(runner);
    }
  });
}
export function furnishFrontDoor(layout){
  const fd = layout.frontDoor;
  const doorGroup = buildFrontDoorGroup();
  addStation('frontdoor', fd.x, fd.z, doorGroup, '🚪 Front Door', 3.2, fd.rotY);
  // mirror the door on the outside face of the same wall so it reads as a front door from outside too
  {
    const outsideDoor = buildFrontDoorGroup();
    outsideDoor.position.set(fd.outX, 0, fd.outZ); outsideDoor.rotation.y = fd.outRotY;
    houseGroup.add(outsideDoor);
  }
  // doormat spot for a delivered package — a step in from the door, toward the hallway (spawnDad's direction)
  const dx = layout.spawnDad.x-fd.x, dz = layout.spawnDad.z-fd.z, dlen = Math.hypot(dx,dz)||1;
  packageSpot.set(fd.x + dx/dlen*1.1, 0, fd.z + dz/dlen*1.1);
}

/* ---------- house layouts: each picks its own room/hallway geometry and hands back a uniform
   {cells, halls, buildHallWalls, frontDoor, spawnDad} contract that buildHouse() consumes generically.
   Every room in `cells` is a plain rectangle (minX/maxX/minZ/maxZ/doorSide/exteriorSides/cx/cz/w/h) —
   the room-type builders (buildKitchen etc.) already only ever look at a room's own rectangle, so they
   work unchanged no matter which layout placed them. `halls` are hallway floor rects (1 for a straight
   spine, more for a bend/branch/ring). `buildHallWalls()` builds any exterior wall that belongs to the
   hallway itself rather than to a room (e.g. a corridor's dead-end cap) — called once, after room walls. */
export function makeCell(minX,maxX,minZ,maxZ,doorSide,exteriorSides){
  return {minX,maxX,minZ,maxZ,doorSide,exteriorSides,cx:(minX+maxX)/2,cz:(minZ+maxZ)/2,w:maxX-minX,h:maxZ-minZ};
}
// the classic layout: one straight N-S hallway spine, 3 rows of rooms flanking it on both sides
export function layoutRect(){
  const Lw=rand(9,12), Rw=rand(9,12), Hw=rand(5.5,7.5);
  const rowH=[rand(10,14), rand(10,14), rand(10,14)];
  const X0=-(Lw+Hw+Rw)/2, Z0=-3;
  const xB=[X0, X0+Lw, X0+Lw+Hw, X0+Lw+Hw+Rw];
  const zB=[Z0, Z0+rowH[0], Z0+rowH[0]+rowH[1], Z0+rowH[0]+rowH[1]+rowH[2]];
  const cells=[];
  for(let r=0;r<3;r++){
    const leftExt=['W']; if(r===0) leftExt.push('N'); if(r===2) leftExt.push('S');
    const rightExt=['E']; if(r===0) rightExt.push('N'); if(r===2) rightExt.push('S');
    cells.push(makeCell(xB[0],xB[1],zB[r],zB[r+1],'E',leftExt));
    cells.push(makeCell(xB[2],xB[3],zB[r],zB[r+1],'W',rightExt));
  }
  const hall = {minX:xB[1],maxX:xB[2],minZ:zB[0],maxZ:zB[3]};
  function buildHallWalls(){
    wallXWindowed(zB[0], xB[1], xB[2], [{cx:(xB[1]+xB[2])/2, halfW:1.2}]);   // hallway's own north dead end
    wallX(zB[3], xB[1], xB[2]);                                             // hallway's own south end — the front door goes here
  }
  const cx=(xB[1]+xB[2])/2;
  const frontDoor = {x:cx, z:zB[3]-0.6, rotY:Math.PI, outX:cx, outZ:zB[3]+0.35, outRotY:0};
  return { cells, halls:[hall], buildHallWalls, frontDoor, spawnDad:{x:cx, z:zB[3]-3.4} };
}
// L-shape: a vertical wing (rooms on the west side) bends 90° at its foot into a horizontal wing
// (rooms on the south side) — a real corner turn in the corridor, not just a resized room
export function layoutL(){
  const Hw=rand(5.5,7.5), Lw=rand(9,12), footDepth=rand(9,12);
  const rowH=[rand(10,14), rand(10,14), rand(10,14)];
  const footW=[rand(9,12), rand(9,12), rand(9,12)];
  const hx0=0, hx1=hx0+Hw, Z0=-3;
  const zA=[Z0, Z0+rowH[0], Z0+rowH[0]+rowH[1], Z0+rowH[0]+rowH[1]+rowH[2]];
  const Z1=zA[3], Z2=Z1+Hw;
  const xB=[hx0, hx0+footW[0], hx0+footW[0]+footW[1], hx0+footW[0]+footW[1]+footW[2]];
  const xEnd=xB[3];

  const cells=[];
  for(let r=0;r<3;r++){
    const ext=['W']; if(r===0) ext.push('N'); if(r===2) ext.push('S');
    cells.push(makeCell(hx0-Lw, hx0, zA[r], zA[r+1], 'E', ext));
  }
  for(let c=0;c<3;c++){
    const ext=['S']; if(c===0) ext.push('W'); if(c===2) ext.push('E');
    cells.push(makeCell(xB[c], xB[c+1], Z2, Z2+footDepth, 'N', ext));
  }
  const hallA={minX:hx0,maxX:hx1,minZ:Z0,maxZ:Z1}, hallB={minX:hx0,maxX:xEnd,minZ:Z1,maxZ:Z2};
  function buildHallWalls(){
    wallXWindowed(Z0, hx0, hx1, [{cx:(hx0+hx1)/2, halfW:1.2}]);          // wing A's north cap
    wallZWindowed(hx1, Z0, Z1, [{cx:(Z0+Z1)/2, halfW:1.2}]);             // wing A's east wall (opposite the rooms)
    wallZWindowed(hx0, Z1, Z2, []);                                      // inner concave corner
    wallXWindowed(Z1, hx1, xEnd, [{cx:(hx1+xEnd)/2, halfW:1.2}]);        // wing B's north wall (opposite the rooms)
    wallZWindowed(xEnd, Z1, Z2, []);                                     // wing B's east end cap
  }
  const fz=(Z1+Z2)/2;
  const frontDoor = {x:xEnd-0.6, z:fz, rotY:-Math.PI/2, outX:xEnd+0.35, outZ:fz, outRotY:Math.PI/2};
  return { cells, halls:[hallA,hallB], buildHallWalls, frontDoor, spawnDad:{x:xEnd-3.4, z:fz} };
}
// T-shape: a wide crossbar (rooms on the north side) with a stem hallway (rooms on the west side)
// dropping from its middle — a proper 3-way corridor junction, not a resized end row
export function layoutT(){
  const Hw=rand(5.5,7.5), Lw=rand(9,12), crossDepth=rand(9,12);
  const stemRowH=[rand(10,14), rand(10,14)];
  const crossW=[rand(9,12), rand(9,12), rand(9,12), rand(9,12)];
  const XcrossLeft=0;
  const xC=[XcrossLeft]; crossW.forEach(w=>xC.push(xC[xC.length-1]+w));
  const XcrossRight=xC[4];
  const Ztop0=-3, Ztop1=Ztop0+crossDepth, ZhallEnd=Ztop1+Hw;
  const stemCx=(XcrossLeft+XcrossRight)/2, hx0=stemCx-Hw/2, hx1=stemCx+Hw/2;
  const zS=[ZhallEnd, ZhallEnd+stemRowH[0], ZhallEnd+stemRowH[0]+stemRowH[1]];
  const Zbottom=zS[2];

  const cells=[];
  for(let c=0;c<4;c++){
    const ext=['N']; if(c===0) ext.push('W'); if(c===3) ext.push('E');
    cells.push(makeCell(xC[c], xC[c+1], Ztop0, Ztop1, 'S', ext));
  }
  for(let r=0;r<2;r++){
    const ext=['W']; if(r===1) ext.push('S');
    cells.push(makeCell(hx0-Lw, hx0, zS[r], zS[r+1], 'E', ext));
  }
  const hallCross={minX:XcrossLeft,maxX:XcrossRight,minZ:Ztop1,maxZ:ZhallEnd};
  const hallStem={minX:hx0,maxX:hx1,minZ:ZhallEnd,maxZ:Zbottom};
  function buildHallWalls(){
    wallXWindowed(ZhallEnd, XcrossLeft, hx0, [{cx:(XcrossLeft+hx0)/2, halfW:1.2}]);
    wallXWindowed(ZhallEnd, hx1, XcrossRight, [{cx:(hx1+XcrossRight)/2, halfW:1.2}]);
    wallZWindowed(XcrossLeft, Ztop1, ZhallEnd, [{cx:(Ztop1+ZhallEnd)/2, halfW:1.2}]);
    wallZWindowed(XcrossRight, Ztop1, ZhallEnd, [{cx:(Ztop1+ZhallEnd)/2, halfW:1.2}]);
    wallZWindowed(hx1, ZhallEnd, Zbottom, [{cx:(ZhallEnd+Zbottom)/2, halfW:1.2}]);
    wallX(Zbottom, hx0, hx1);                                             // stem south cap — front door goes here, no window
  }
  const fx=(hx0+hx1)/2;
  const frontDoor = {x:fx, z:Zbottom-0.6, rotY:Math.PI, outX:fx, outZ:Zbottom+0.35, outRotY:0};
  return { cells, halls:[hallCross,hallStem], buildHallWalls, frontDoor, spawnDad:{x:fx, z:Zbottom-3.4} };
}
/* ---------- buildHouse(): randomized-but-sensible layout, rebuilt each run ---------- */
// A central hallway spine runs the full depth of the house; every room opens onto it through
// exactly one door (so bedroom/bathroom/etc. are single-door private rooms, not a maze of
// doors to every neighbor), and the hallway ends at a front door out of the house.
export const HOUSE_LAYOUTS = {rect:layoutRect, L:layoutL, T:layoutT};
export function buildHouse(seed){
  // in multiplayer every client calls buildHouse(seed) with the same host-picked seed, so everyone
  // gets byte-for-byte identical rooms/furniture/collision — houseRng is only live for this call
  setHouseRng((seed!==undefined && seed!==null) ? mulberry32(seed) : null);
  // distinct stream from houseRng (XORed constant) so the two don't tick in lockstep; stays live after
  // this function returns, unlike houseRng, since gameplay hazard rolls happen for the whole run
  setRunRng((seed!==undefined && seed!==null) ? mulberry32((seed ^ 0x5bd1e995) >>> 0) : null);
  if(houseGroup){ scene.remove(houseGroup); disposeGroup(houseGroup); }
  setHouseGroup(new THREE.Group()); scene.add(houseGroup);
  blockAABBs.length=0; wallMeshes.length=0; toys.length=0; solids.length=0;
  for(const k in stations) delete stations[k];
  setTvScreen(null);

  const shapeKind = pick(['rect','L','T']);
  const layout = HOUSE_LAYOUTS[shapeKind]();
  const { cells, halls, buildHallWalls, frontDoor, spawnDad:spawnDadPos } = layout;

  // smallest cell gets the smallest-rank room type (bathroom), largest gets the largest (living) — every run, regardless of shape or which slot it lands in
  cells.forEach(c=>{ c.area = c.w*c.h; });
  const byArea=[...cells].sort((a,b)=>a.area-b.area);
  byArea.forEach((cell,i)=>{ cell.type=ROOM_RANK[i]; });

  cells.forEach(room=>{
    const mat0 = room.type==='bathroom' ? bathroomTileMaterial(room) : new THREE.MeshLambertMaterial({color:ROOM_TYPES[room.type].floor});
    const f=new THREE.Mesh(new THREE.PlaneGeometry(room.w, room.h), mat0);
    f.rotation.x=-Math.PI/2; f.position.set(room.cx,0,room.cz); f.receiveShadow=true; houseGroup.add(f);
  });
  halls.forEach(h=>{
    const hf=new THREE.Mesh(new THREE.PlaneGeometry(h.maxX-h.minX, h.maxZ-h.minZ), new THREE.MeshLambertMaterial({color:'#d8c9a3'}));
    hf.rotation.x=-Math.PI/2; hf.position.set((h.minX+h.maxX)/2,0,(h.minZ+h.maxZ)/2); hf.receiveShadow=true; houseGroup.add(hf);
  });

  // furniture goes in before the walls are built: each room-type builder sets room.primarySide/primaryT,
  // which the window placement below needs to avoid hanging a window over the main furniture — nothing
  // here depends on the wall meshes existing yet.
  cells.forEach(room=>{ ROOM_TYPES[room.type].build(room); });

  // one window slot per exterior side, recorded on the room (room.windowCxBySide for wall-building,
  // room.windowSides so any decor placed afterwards — paintings, shelves, clocks — steers clear of it).
  cells.forEach(room=>{
    const slots = windowSlotsFor(room);
    room.windowSides = slots.map(s=>s.side);
    room.windowCxBySide = {};
    slots.forEach(s=>{ room.windowCxBySide[s.side] = s.cx; });
  });

  cells.forEach(room=>{ if(room.type!=='bathroom') scatterPaintings(room); });

  // every room closes its own 4 sides (door/window/divider) — see buildRoomWalls — then the layout
  // adds whatever exterior wall belongs to the hallway itself rather than to any one room.
  cells.forEach(buildRoomWalls);
  buildHallWalls();

  furnishHalls(halls);
  furnishFrontDoor(layout);

  const bounds = computeBounds(cells.concat(halls));
  houseBounds.X0=bounds.minX; houseBounds.X1=bounds.maxX; houseBounds.Z0=bounds.minZ; houseBounds.Z1=bounds.maxZ;
  const livingRoom = cells.find(c=>c.type==='living');
  spawnBaby.set(livingRoom.cx, 0, livingRoom.cz);
  spawnDad.set(spawnDadPos.x, 0, spawnDadPos.z);

  const midX=(bounds.minX+bounds.maxX)/2, midZ=(bounds.minZ+bounds.maxZ)/2;
  const totalW=bounds.maxX-bounds.minX, totalD=bounds.maxZ-bounds.minZ;
  LOOK.set(midX, 0, midZ);
  setBaseView(Math.max(totalW, totalD) * 1.7);   // generous — shapes vary in aspect ratio, so fit the larger dimension with headroom
  setZoom(2.1); applyFrustum();          // start zoomed in on the player, not the whole-house overview
  sunTarget.position.set(midX, 0, midZ);
  sun.position.set(midX+18, 40, midZ+6);

  setLastLayout({                        // simplified room/hallway rects, for the pause-menu minimap
    bounds,
    rooms: cells.map(c=>({minX:c.minX, maxX:c.maxX, minZ:c.minZ, maxZ:c.maxZ, type:c.type})),
    halls: halls.map(h=>({minX:h.minX, maxX:h.maxX, minZ:h.minZ, maxZ:h.maxZ})),
  });
  // Chores Mode: pick the run's task list here, still inside the seeded RNG window, so every client in a
  // multiplayer room ends up with the byte-for-byte same checklist from the same shared seed. Guarded
  // because buildHouse()'s very first, top-level call (building the main-menu background) runs before
  // resetState() has ever given S a real value.
  if(S) S.tasks = S.tasksEnabled ? shuffle(TASK_POOL.slice()).slice(0, Math.min(4, TASK_POOL.length)).map(t=>({...t, done:false})) : [];
  if(S) S.seed = seed;              // stashed for the dev panel / a future "copy seed" share action
  setHouseRng(null);   // done — layout randomness goes back to Math.random; runRng (gameplay) stays live
}

