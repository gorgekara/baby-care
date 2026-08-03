/* Math/geometry helpers and the seeded RNG streams (houseRng/runRng) shared across the game. */

export let houseRng = null;
export function setHouseRng(v){ houseRng = v; }
export let runRng = null;
export function setRunRng(v){ runRng = v; }

export function mat(color, opts){ return new THREE.MeshLambertMaterial(Object.assign({color:color},opts||{})); }

export function box(w,h,d,color,em){
  const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat(color, em?{emissive:em}:null));
  m.castShadow = true; m.receiveShadow = true; return m;
}

export function cyl(rt,rb,h,color){
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,20), mat(color));
  m.castShadow=true; m.receiveShadow=true; return m;
}

export function sph(r,color){
  const m = new THREE.Mesh(new THREE.SphereGeometry(r,20,16), mat(color));
  m.castShadow=true; m.receiveShadow=true; return m;
}

export function makeSprite(text, {font=44, pad=14, bg='rgba(20,14,32,.82)', color='#fff', bold=true}={}){
  const c = document.createElement('canvas'), ctx = c.getContext('2d');
  const f = `${bold?'bold ':''}${font}px 'Trebuchet MS',sans-serif`;
  ctx.font = f;
  const w = Math.ceil(ctx.measureText(text).width) + pad*2;
  const h = font + pad*2;
  c.width = w; c.height = h;
  ctx.font = f; ctx.textBaseline='middle'; ctx.textAlign='center';
  if(bg){ ctx.fillStyle=bg; roundRect(ctx,0,0,w,h,14); ctx.fill(); }
  ctx.fillStyle = color;
  ctx.fillText(text, w/2, h/2+2);
  const tex = new THREE.CanvasTexture(c); tex.anisotropy = 4;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({map:tex, transparent:true, depthTest:false}));
  spr.scale.set(w/h*0.9, 0.9, 1);
  spr.userData.aspect = w/h;
  return spr;
}

export function roundRect(ctx,x,y,w,h,r){ ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }

export function mulberry32(seed){
  return function(){
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function random0to1(){ return houseRng ? houseRng() : (runRng ? runRng() : Math.random()); }

export const rand = (a,b)=>a+random0to1()*(b-a);

export const pick = a=>a[(random0to1()*a.length)|0];

export function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=(random0to1()*(i+1))|0; const t=a[i]; a[i]=a[j]; a[j]=t; } return a; }

export function disposeGroup(g){ g.traverse(o=>{ if(o.geometry) o.geometry.dispose();
  if(o.material){ (Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{ if(m.map) m.map.dispose(); m.dispose(); }); } }); }

export function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

export function hashStringToSeed(str){                  // deterministic 32-bit hash (djb2 variant) — not
  let h = 5381;                                   // cryptographic, just needs to be stable and well-mixed
  for(let i=0;i<str.length;i++){ h = ((h*33) ^ str.charCodeAt(i)) >>> 0; }
  return h >>> 0;
}

